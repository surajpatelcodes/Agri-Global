-- Migration: Add idempotency protection for duplicate credit submissions
-- Created: 2025-12-16
-- Purpose: Prevent duplicate credit records caused by multiple form submissions

-- Add idempotency_key column to credits table
ALTER TABLE credits ADD COLUMN IF NOT EXISTS idempotency_key UUID;
-- Create unique index to prevent duplicate submissions
-- Only applies to non-null keys (existing records without keys are unaffected)
CREATE UNIQUE INDEX IF NOT EXISTS idx_credits_idempotency_key 
ON credits(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN credits.idempotency_key IS 
'Unique key to prevent duplicate credit submissions. Generated per form session.';

-- Similarly add protection for payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key 
ON payments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN payments.idempotency_key IS 
'Unique key to prevent duplicate payment submissions. Generated per form session.';

