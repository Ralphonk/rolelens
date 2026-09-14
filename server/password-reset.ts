import { Router } from "express";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { db } from "./db.js";
import { clearSession, secret } from "./auth.js";
import { deliveryDiagnostic, sendBrevoCode } from "./brevo-email.js";
import { resetEmailTemplate } from "./reset-email-template.js";

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const resetSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(10).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 bytes."),
});
const digest = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
export const invalidCode = "Invalid or expired code. Request a new code if needed.";
const message = "If an account exists for this email, a verification code has been sent.";
export const passwordResetRouter = Router();
passwordResetRouter.use(rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many attempts. Try again in 15 minutes." } }));

passwordResetRouter.post("/request", rateLimit({ windowMs: 15 * 60_000, limit: 5, message: { error: "Too many requests. Try again in 15 minutes." } }), async (req, res) => {
  const { email } = emailSchema.parse(req.body);
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  const provider = process.env.EMAIL_PROVIDER || "smtp";
  const configured = provider === "brevo"
    ? process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim()
    : provider === "smtp" && SMTP_HOST && SMTP_USER && SMTP_PASS && EMAIL_FROM;
  if (!configured) {
    res.status(503).json({ error: "Password reset email is not configured. Please try later." }); return;
  }
  const emailKey = digest(`email:${email}`);
  const otp = String(randomInt(100000, 1000000));
  const otpHash = digest(`${emailKey}:${otp}`);
  const now = new Date();
  const user = await db().user.findUnique({ where: { email }, select: { id: true } });
  // Atomic cooldown claim prevents parallel resends from issuing multiple valid codes.
  const claimed = await db().$executeRaw`
    INSERT INTO "PasswordReset" ("emailKey", "userId", "otpHash", "expiresAt", "sentAt", "attempts")
    VALUES (${emailKey}, ${user?.id ?? null}, ${otpHash}, ${new Date(+now + 600_000)}, ${now}, 0)
    ON CONFLICT ("emailKey") DO UPDATE SET "userId" = EXCLUDED."userId", "otpHash" = EXCLUDED."otpHash",
    "expiresAt" = EXCLUDED."expiresAt", "sentAt" = EXCLUDED."sentAt", "attempts" = 0, "tokenHash" = NULL, "tokenExpiresAt" = NULL
    WHERE "PasswordReset"."sentAt" <= ${new Date(+now - 60_000)}`;
  if (claimed && user) {
    const transport = provider === "smtp" ? nodemailer.createTransport({ host: SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000 }) : undefined;
    try {
      if (provider === "brevo") await sendBrevoCode(email, otp);
      else await transport!.sendMail({ from: EMAIL_FROM, to: email, ...resetEmailTemplate(otp) });
    } catch (error) {
      console.error("Password reset email delivery failed.", { provider, ...deliveryDiagnostic(error) });
      await db().passwordReset.updateMany({ where: { emailKey, otpHash }, data: { expiresAt: now } });
      // Do not expose account existence or SMTP credentials in responses/logs.
    } finally { transport?.close(); }
  }
  res.json({ message, retryAfter: 60 });
});

passwordResetRouter.post("/verify", async (req, res) => {
  const { email, code } = emailSchema.extend({ code: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const emailKey = digest(`email:${email}`);
  const row = await db().passwordReset.findUnique({ where: { emailKey } });
  if (!row || row.expiresAt <= new Date() || row.attempts >= 5 || row.tokenHash) {
    res.status(400).json({ error: invalidCode }); return;
  }
  const claimed = await db().passwordReset.updateMany({ where: { emailKey, otpHash: row.otpHash, attempts: row.attempts, tokenHash: null, expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } } });
  if (!claimed.count || !timingSafeEqual(Buffer.from(row.otpHash, "hex"), Buffer.from(digest(`${emailKey}:${code}`), "hex")) || !row.userId) {
    res.status(400).json({ error: invalidCode }); return;
  }
  const token = randomBytes(32).toString("hex");
  const verified = await db().passwordReset.updateMany({ where: { emailKey, otpHash: row.otpHash, tokenHash: null, expiresAt: { gt: new Date() } }, data: { tokenHash: digest(token), tokenExpiresAt: new Date(Date.now() + 600_000), expiresAt: new Date() } });
  if (!verified.count) { res.status(400).json({ error: invalidCode }); return; }
  res.json({ token });
});

passwordResetRouter.post("/complete", async (req, res) => {
  const { token, password } = resetSchema.parse(req.body);
  const tokenHash = digest(token);
  const row = await db().passwordReset.findUnique({ where: { tokenHash } });
  const fail = () => res.status(400).json({ error: "Reset session expired. Request a new code." });
  if (!row?.userId || !row.tokenExpiresAt || row.tokenExpiresAt <= new Date()) { fail(); return; }
  const user = await db().user.findUnique({ where: { id: row.userId } });
  if (!user) { fail(); return; }
  if (await bcrypt.compare(password, user.passwordHash)) { res.status(400).json({ error: "Choose a password different from your current password." }); return; }
  const passwordHash = await bcrypt.hash(password, 12);
  const completed = await db().$transaction(async tx => {
    const consumed = await tx.passwordReset.deleteMany({ where: { emailKey: row.emailKey, tokenHash, tokenExpiresAt: { gt: new Date() } } });
    if (!consumed.count) return false;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    return true;
  });
  if (!completed) { fail(); return; }
  clearSession(res);
  res.json({ message: "Password updated. Sign in with your new password." });
});
