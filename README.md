# RoleLens

A separate full-stack resume-to-job matcher. Shortlist is not modified or connected.

## Stack

Next.js + React + TypeScript, Tailwind CSS, shadcn-style Button and Radix Dialog, Express REST API, PostgreSQL + Prisma, bcrypt + JWT cookies backed by revocable sessions, Multer + pdf-parse, Google Gemini API structured outputs, Recharts, Vitest, Playwright, Docker and GitHub Actions.

## Run locally

Node.js 24 is recommended.

1. `npm ci`
2. Copy `.env.example` to `.env`. Do not commit it.
3. `npm run db:generate`
4. `npm run dev`
5. Open http://127.0.0.1:3002. API: http://127.0.0.1:4002.

Local keyword preview and PDF extraction work without database or Gemini credentials. A sample can be loaded from the workspace. Demo reports are not stored or presented as AI reports.

## Enable real accounts and AI

Use a NEW Neon/PostgreSQL database, not the Shortlist database. Set `DATABASE_URL`.
Alternatively, `docker compose up -d` creates a local development database using the sample URL (development credentials only).
Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and put it in `JWT_SECRET`.
Run `npm run db:migrate`.
Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (default `gemini-3.1-flash-lite`). API billing/account access is separate from a ChatGPT subscription.
Restart both servers after environment changes.
Use exactly `APP_ORIGIN` in the browser so same-origin checks pass.

## Architecture

- `src/components/`: workspace, evidence report, auth modal, analytics and UI primitives.
- `shared/matching.ts`: deterministic score calculation and explicitly limited demo matching.
- `server/index.ts`: Express REST routes, upload limits, request validation.
- `server/auth.ts`: signed HttpOnly cookies plus database sessions, logout revocation.
- `server/ai.ts`: structured extraction, untrusted-document instructions, no model-generated percentage.
- `prisma/`: relational schema and versioned migration.

Next.js proxies `/api/*` to Express via `API_INTERNAL_URL`. This keeps browser cookies same-origin.

## Scoring

Skills 50%, experience 25%, keywords 15%, education 10%.
Each assessed category is the percentage of its extracted requirements supported by the resume.
Unspecified categories are excluded and weights normalized. No evidence yields zero.
AI extraction is not deterministic and may be wrong even though score arithmetic is deterministic.
This is advisory document comparison, not an ATS score, hiring decision, or prediction.
Demo mode checks a limited vocabulary only; it never silently substitutes for failed AI requests.

## Data handling

PDFs are processed in memory, limited to 5 MB, and not retained as files. Only text-based PDFs are supported; no OCR.
Text is stored only on Save resume. Job descriptions and result evidence are stored when an authenticated user explicitly runs AI analysis.
AI analysis requires a consent checkbox before sending text to Gemini. Free-tier inputs may be used to improve Google products. Use sample or anonymized resumes, not sensitive personal data. Review Google's API terms before enabling real-user uploads.
Ownership is checked on every private record operation. JWTs are not kept in localStorage. Passwords are bcrypt-hashed.
No API keys, credentials or complete resume text are logged.
The first version does not include email verification, password recovery, or original-PDF downloads.

## Verification

`npm run typecheck`, `npm test`, `npm run build`.
`npx playwright install chromium` then `npm run test:e2e`.
CI runs these checks. Real PostgreSQL/AI end-to-end checks require configured credentials.

## Deploy later

No deployment or GitHub push is performed automatically.

- Vercel: deploy this directory with Next.js; set `API_INTERNAL_URL` to your HTTPS Express service.
- Railway/Render: run `npm ci && npm run db:generate && npx tsc -p server/tsconfig.json`, then `node dist/server/index.js`; set `API_PORT` to the provider's port.
- Set backend `APP_ORIGIN` to the exact public frontend origin, `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY`.
- Run `npm run db:migrate` once as a release step.
- Dockerfile runs both servers; Docker Compose currently provides only the development database.

Before a public production launch: configure a trusted proxy/IP strategy and shared rate-limit store, add per-account AI quotas and cost monitoring, isolate PDF parsing with process/memory/time limits, add email verification/recovery, automate data retention/deletion, and complete database-backed security tests. Current in-memory rate limits are per process and intentionally do not trust client-supplied forwarding headers.
