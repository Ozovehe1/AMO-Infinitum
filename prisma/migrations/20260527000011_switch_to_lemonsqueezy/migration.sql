-- Switch billing provider from Paystack to Lemon Squeezy
-- Drops Paystack-specific columns and adds Lemon Squeezy equivalents.
-- The plan, subscriptionStatus, and subscriptionEndsAt columns are unchanged.

-- Drop unique index on paystackCustomerCode (created by @unique in schema)
DROP INDEX IF EXISTS "User_paystackCustomerCode_key";

-- Remove Paystack columns
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "paystackCustomerCode",
  DROP COLUMN IF EXISTS "paystackSubscriptionCode",
  DROP COLUMN IF EXISTS "paystackEmailToken";

-- Add Lemon Squeezy columns
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lsCustomerId"     TEXT,
  ADD COLUMN IF NOT EXISTS "lsSubscriptionId" TEXT;
