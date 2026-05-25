ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verifyToken" TEXT;
CREATE UNIQUE INDEX "User_verifyToken_key" ON "User"("verifyToken");
-- Existing users (Abdul) are pre-verified
UPDATE "User" SET "emailVerified" = true WHERE "role" = 'owner';
