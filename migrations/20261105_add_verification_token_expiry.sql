-- Add nullable expiry metadata without changing existing account state.
-- Existing tokens have no known issue time; they must be reissued through
-- POST /api/auth/resend-verification after this migration is applied.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;

-- Give existing unverified users with outstanding links a 24-hour grace period.
UPDATE users
SET verification_token_expires = NOW() + INTERVAL '24 hours'
WHERE is_verified = false
  AND verification_token IS NOT NULL
  AND verification_token_expires IS NULL;
