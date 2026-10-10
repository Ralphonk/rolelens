CREATE TABLE "PendingRegistration" (
  "email" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0
);
