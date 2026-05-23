-- Add soft-delete support: unsubscribedAt instead of hard delete
ALTER TABLE "Subscriber" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);
