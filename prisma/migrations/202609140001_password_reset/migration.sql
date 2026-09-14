CREATE TABLE "PasswordReset" (
  "emailKey" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "tokenHash" TEXT,
  "tokenExpiresAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
