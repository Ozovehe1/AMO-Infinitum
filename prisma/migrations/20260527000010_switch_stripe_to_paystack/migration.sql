-- Drop Stripe columns, add Paystack columns
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "stripeCustomerId",
  DROP COLUMN IF EXISTS "stripeSubscriptionId",
  ADD COLUMN "paystackCustomerCode"    TEXT,
  ADD COLUMN "paystackSubscriptionCode" TEXT,
  ADD COLUMN "paystackEmailToken"      TEXT;

-- Unique index on paystackCustomerCode
CREATE UNIQUE INDEX IF NOT EXISTS "User_paystackCustomerCode_key" ON "User"("paystackCustomerCode");
