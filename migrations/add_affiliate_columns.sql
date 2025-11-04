-- Migration: Add affiliate referral columns to users table
-- Run this SQL directly on your database, or use Alembic migration

-- Add referral_code_used column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(50);

-- Add referred_by_affiliate_id column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referred_by_affiliate_id INTEGER;

-- Add index on referral_code_used
CREATE INDEX IF NOT EXISTS ix_users_referral_code_used ON users(referral_code_used);

-- Add index on referred_by_affiliate_id
CREATE INDEX IF NOT EXISTS ix_users_referred_by_affiliate_id ON users(referred_by_affiliate_id);

-- Add foreign key constraint (if affiliates table exists)
-- Note: This will only work if the affiliates table already exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliates') THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_referred_by_affiliate 
        FOREIGN KEY (referred_by_affiliate_id) REFERENCES affiliates(id);
    END IF;
END $$;

