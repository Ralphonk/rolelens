import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import multer from "multer";
import bcrypt from "bcryptjs";
import { PDFParse } from "pdf-parse";
import { ZodError } from "zod";
import { db } from "./db.js";
import {
  createSession,
  clearSession,
  requireUser,
  secret,
  type AuthedRequest,
} from "./auth.js";
import {
  credentials,
  registration,
  resumeSchema,
  analysisSchema,
} from "./validation.js";
import { analyzeResume } from "./ai.js";
import { passwordResetRouter } from "./password-reset.js";
const app = express();
app.disable("x-powered-by");
// Render terminates public connections at its edge and forwards the client IP.
// Trust that proxy chain so security middleware does not treat every visitor as
// the same Render host or reject the forwarded headers.
if (process.env.NODE_ENV === "production") app.set("trust proxy", true);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    const allowed = process.env.APP_ORIGIN || "http://127.0.0.1:3002";
    if (origin !== allowed) {
      res.status(403).json({ error: "Request origin is not allowed." });
      return;
    }
  }
  next();
});
const limit = (max: number, minutes: number) =>
  rateLimit({
    windowMs: minutes * 60000,
    limit: max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) =>
      ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown"),
    message: { error: "Too many requests. Please wait and try again." },
  });
app.use("/api", limit(120, 15));
app.use("/api/auth/password-reset", passwordResetRouter);
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    databaseConfigured: !!process.env.DATABASE_URL,
    aiConfigured: !!process.env.GEMINI_API_KEY?.trim(),
  }),
);
app.post("/api/auth/register", limit(5, 15), async (req, res) => {
  const input = registration.parse(req.body);
  secret();
  if (Buffer.byteLength(input.password, "utf8") > 72) {
    res.status(400).json({ error: "Password must be no more than 72 bytes." });
    return;
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await db().user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true },
    });
    await createSession(res, user.id);
    res.status(201).json(user);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      res
        .status(409)
        .json({ error: "Unable to create this account. Try signing in." });
      return;
    }
    throw e;
  }
});
app.post("/api/auth/login", limit(10, 15), async (req, res) => {
  const input = credentials.parse(req.body);
  if (Buffer.byteLength(input.password, "utf8") > 72) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  const user = await db().user.findUnique({ where: { email: input.email } });
  const valid = await bcrypt.compare(
    input.password,
    user?.passwordHash ||
      "$2b$12$123456789012345678901uSwtMgSFSLdj63MqRTxDVmGj.5Xa4mbgq",
  );
  if (!user || !valid) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  await createSession(res, user.id);
  res.json({ id: user.id, name: user.name, email: user.email });
});
app.get("/api/auth/me", requireUser, async (req: AuthedRequest, res) => {
  const user = await db().user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    res.status(401).json({ error: "Please sign in again." });
    return;
  }
  res.json(user);
});
app.post("/api/auth/logout", requireUser, async (req: AuthedRequest, res) => {
  await db().session.deleteMany({
    where: { id: req.sessionId, userId: req.userId },
  });
  clearSession(res);
  res.json({ ok: true });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
app.post(
  "/api/parse",
  limit(8, 15),
  upload.single("file"),
  async (req, res) => {
    const file = req.file;
    if (!file || file.buffer.subarray(0, 5).toString() !== "%PDF-") {
      res.status(400).json({ error: "Please upload a valid PDF file." });
      return;
    }
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      const text = result.text.trim();
      if (text.length < 50) {
        res.status(422).json({
          error:
            "No readable resume text found. Scanned PDFs need OCR; paste the text instead.",
        });
        return;
      }
      if (text.length > 20000) {
        res.status(422).json({
          error:
            "This PDF has too much text. Paste only the relevant resume content (up to 20,000 characters).",
        });
        return;
      }
      res.json({
        name:
          file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 180) ||
          "Resume.pdf",
        text,
      });
    } catch {
      res.status(422).json({
        error:
          "This PDF could not be read. Try an unencrypted, text-based PDF or paste the text.",
      });
    } finally {
      await parser.destroy();
    }
  },
);
app.get("/api/resumes", requireUser, async (req: AuthedRequest, res) =>
  res.json(
    await db().resume.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ),
);
app.post("/api/resumes", requireUser, async (req: AuthedRequest, res) => {
  const input = resumeSchema.parse(req.body);
  res
    .status(201)
    .json(
      await db().resume.create({ data: { ...input, userId: req.userId! } }),
    );
});
app.delete("/api/resumes/:id", requireUser, async (req: AuthedRequest, res) => {
  const result = await db().resume.deleteMany({
    where: { id: String(req.params.id), userId: req.userId },
  });
  if (!result.count) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  res.json({ ok: true });
});
app.get("/api/analyses", requireUser, async (req: AuthedRequest, res) => {
  const rows = await db().analysis.findMany({
    where: { userId: req.userId },
    include: { job: { select: { title: true, company: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(rows.map(({ job, ...a }) => ({ ...a, ...job })));
});
app.delete(
  "/api/analyses/:id",
  requireUser,
  async (req: AuthedRequest, res) => {
    const analysis = await db().analysis.findFirst({
      where: { id: String(req.params.id), userId: req.userId },
      select: { id: true, jobId: true },
    });
    if (!analysis) {
      res.status(404).json({ error: "Match report not found." });
      return;
    }
    await db().$transaction(async (tx) => {
      await tx.analysis.delete({ where: { id: analysis.id } });
      await tx.job.deleteMany({
        where: {
          id: analysis.jobId,
          userId: req.userId,
          analyses: { none: {} },
        },
      });
    });
    res.json({ ok: true });
  },
);
app.post(
  "/api/analyses",
  requireUser,
  limit(5, 60),
  async (req: AuthedRequest, res) => {
    const input = analysisSchema.parse(req.body);
    if (
      input.resumeId &&
      !(await db().resume.findFirst({
        where: { id: input.resumeId, userId: req.userId },
      }))
    ) {
      res.status(404).json({ error: "Resume not found." });
      return;
    }
    const result = await analyzeResume(input.resumeText, input.description);
    const analysis = await db().$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          userId: req.userId!,
          title: input.title,
          company: input.company,
          description: input.description,
        },
      });
      return tx.analysis.create({
        data: {
          userId: req.userId!,
          resumeId: input.resumeId,
          jobId: job.id,
          result: JSON.parse(JSON.stringify(result)),
        },
      });
    });
    res
      .status(201)
      .json({ ...analysis, title: input.title, company: input.company });
  },
);
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: error.issues[0]?.message || "Please check your inputs.",
      });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: "Upload one PDF no larger than 5 MB." });
      return;
    }
    const e = error as { status?: number; message?: string; code?: string };
    if (e.status === 503 || e.status === 502) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    if (e.status === 413 || e.status === 400) {
      res.status(e.status).json({ error: "Invalid or oversized request." });
      return;
    }
    console.error("Request failed", e.code || "internal_error");
    res.status(503).json({
      error:
        "Service unavailable. Check the server configuration and try again.",
    });
  },
);
const port = Number(process.env.API_PORT || 4002);
app.listen(
  port,
  process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log("RoleLens API listening on port " + port),
);
