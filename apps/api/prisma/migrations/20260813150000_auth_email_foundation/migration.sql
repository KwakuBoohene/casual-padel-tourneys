-- Auth foundation: email verification clocks, magic-link tokens, password envelopes (no hash).

ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailVerificationDueAt" TIMESTAMP(3);

CREATE TYPE "MagicLinkPurpose" AS ENUM ('LOGIN', 'VERIFY', 'RESET');

CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "MagicLinkPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");
CREATE INDEX "MagicLinkToken_userId_idx" ON "MagicLinkToken"("userId");

ALTER TABLE "MagicLinkToken"
  ADD CONSTRAINT "MagicLinkToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OpaqueRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "envelope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpaqueRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpaqueRecord_userId_key" ON "OpaqueRecord"("userId");

ALTER TABLE "OpaqueRecord"
  ADD CONSTRAINT "OpaqueRecord_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
