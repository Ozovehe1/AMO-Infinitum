-- CreateTable: User
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateTable: ManagerAuth
CREATE TABLE "ManagerAuth" (
    "id" SERIAL NOT NULL,
    "passwordHash" TEXT NOT NULL,
    CONSTRAINT "ManagerAuth_pkey" PRIMARY KEY ("id")
);

-- Seed owner user (instrumentation.ts will replace the hash on first startup)
INSERT INTO "User" ("email", "username", "passwordHash", "role", "onboarded")
VALUES ('abdulcosman01@gmail.com', 'abdul', 'SEED_REQUIRED', 'owner', true);

-- Seed manager auth placeholder
INSERT INTO "ManagerAuth" ("passwordHash") VALUES ('SEED_REQUIRED');

-- Add nullable userId columns
ALTER TABLE "Post" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Category" ADD COLUMN "userId" INTEGER;
ALTER TABLE "Subscriber" ADD COLUMN "userId" INTEGER;

-- Backfill all existing rows to owner (id=1)
UPDATE "Post" SET "userId" = 1;
UPDATE "Category" SET "userId" = 1;
UPDATE "Subscriber" SET "userId" = 1;

-- Make userId NOT NULL
ALTER TABLE "Post" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Subscriber" ALTER COLUMN "userId" SET NOT NULL;

-- Add FK constraints
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Post: replace global slug unique with per-user unique
DROP INDEX "Post_slug_key";
CREATE UNIQUE INDEX "Post_userId_slug_key" ON "Post"("userId", "slug");

-- Category: replace global name/slug uniques with per-user uniques
DROP INDEX "Category_name_key";
DROP INDEX "Category_slug_key";
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE UNIQUE INDEX "Category_userId_slug_key" ON "Category"("userId", "slug");

-- Subscriber: replace global email unique with per-user unique
DROP INDEX "Subscriber_email_key";
CREATE UNIQUE INDEX "Subscriber_userId_email_key" ON "Subscriber"("userId", "email");

-- SiteSettings: change PK from key-only to (userId, key)
ALTER TABLE "SiteSettings" ADD COLUMN "userId" INTEGER;
UPDATE "SiteSettings" SET "userId" = 1;
ALTER TABLE "SiteSettings" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "SiteSettings" DROP CONSTRAINT "SiteSettings_pkey";
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("userId", "key");
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old Admin table (replaced by User)
DROP TABLE "Admin";
