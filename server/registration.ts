import { Router } from "express";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "./db.js";
import { createSession, secret } from "./auth.js";
import { registration } from "./validation.js";
import { deliveryDiagnostic, sendBrevoCode } from "./brevo-email.js";
import { registrationEmailTemplate } from "./reset-email-template.js";

const digest = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
export const registrationRouter = Router();
registrationRouter.use(rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));

registrationRouter.post("/request", rateLimit({ windowMs: 15 * 60_000, limit: 5 }), async (req, res) => {
  const input = registration.parse(req.body);
  if (Buffer.byteLength(input.password, "utf8") > 72) {
    res.status(400).json({ error: "Password must be no more than 72 bytes." }); return;
  }
  const provider = process.env.EMAIL_PROVIDER || "smtp";
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  const configured = provider === "brevo"
    ? process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim()
    : provider === "smtp" && SMTP_HOST && SMTP_USER && SMTP_PASS && EMAIL_FROM;
  if (!configured) { res.status(503).json({ error: "Signup email is not configured. Please try later." }); return; }
  if (await db().user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    res.status(409).json({ error: "Unable to create this account. Try signing in." }); return;
  }
  const code = String(randomInt(100000, 1000000));
  const otpHash = digest(`${input.email}:${code}`);
  const now = new Date();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const claimed = await db().$executeRaw`
    INSERT INTO "PendingRegistration" ("email", "name", "passwordHash", "otpHash", "expiresAt", "sentAt", "attempts")
    VALUES (${input.email}, ${input.name}, ${passwordHash}, ${otpHash}, ${new Date(+now + 600_000)}, ${now}, 0)
    ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name", "passwordHash" = EXCLUDED."passwordHash",
      "otpHash" = EXCLUDED."otpHash", "expiresAt" = EXCLUDED."expiresAt", "sentAt" = EXCLUDED."sentAt", "attempts" = 0
    WHERE "PendingRegistration"."sentAt" <= ${new Date(+now - 60_000)}`;
  if (!claimed) { res.status(429).json({ error: "Please wait a minute before requesting another code." }); return; }
  const transport = provider === "smtp" ? nodemailer.createTransport({ host: SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000 }) : undefined;
  try {
    if (provider === "brevo") await sendBrevoCode(input.email, code, "registration");
    else await transport!.sendMail({ from: EMAIL_FROM, to: input.email, ...registrationEmailTemplate(code) });
  } catch (error) {
    console.error("Signup email delivery failed.", { provider, ...deliveryDiagnostic(error) });
    await db().pendingRegistration.deleteMany({ where: { email: input.email, otpHash } });
    res.status(503).json({ error: "Unable to send a verification code. Please try again." }); return;
  } finally { transport?.close(); }
  res.json({ message: "Verification code sent.", retryAfter: 60 });
});

registrationRouter.post("/verify", async (req, res) => {
  const { email, code } = z.object({ email: z.email().max(254).transform(value => value.trim().toLowerCase()), code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const invalid = () => res.status(400).json({ error: "Invalid or expired code. Request a new code if needed." });
  const row = await db().pendingRegistration.findUnique({ where: { email } });
  if (!row || row.expiresAt <= new Date() || row.attempts >= 5) { invalid(); return; }
  const claimed = await db().pendingRegistration.updateMany({ where: { email, otpHash: row.otpHash, attempts: row.attempts, expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } } });
  if (!claimed.count || !timingSafeEqual(Buffer.from(row.otpHash, "hex"), Buffer.from(digest(`${email}:${code}`), "hex"))) { invalid(); return; }
  try {
    const user = await db().$transaction(async tx => {
      const consumed = await tx.pendingRegistration.deleteMany({ where: { email, otpHash: row.otpHash, expiresAt: { gt: new Date() } } });
      if (!consumed.count) return null;
      return tx.user.create({ data: { name: row.name, email, passwordHash: row.passwordHash }, select: { id: true, name: true, email: true, avatarDataUrl: true } });
    });
    if (!user) { invalid(); return; }
    await createSession(res, user.id);
    res.status(201).json(user);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") { res.status(409).json({ error: "Unable to create this account. Try signing in." }); return; }
    throw error;
  }
});
