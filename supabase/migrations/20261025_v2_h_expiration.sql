-- ==============================================================================
-- Migration: Phase V2-H — Experience Expiration & Automatic Cleanup
-- Target Table: public.experiences
--
-- Safety Guarantees:
-- 1. Non-destructive: Uses ADD COLUMN IF NOT EXISTS.
-- 2. Backward Compatible: Existing published experiences have expires_at = NULL
--    and expiration_option = 'never', keeping them permanent and accessible.
-- 3. Check Constraint: Ensures expiration_option only holds valid supported options.
-- 4. Indexing: Creates a partial index on expires_at for efficient cleanup queries.
-- ==============================================================================

-- 1. Add expiration columns to experiences table
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiration_option TEXT NOT NULL DEFAULT 'never';

-- 2. Constrain expiration_option to valid supported values ('7d', '30d', '1y', 'never')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_expiration_option'
  ) THEN
    ALTER TABLE public.experiences
      ADD CONSTRAINT check_expiration_option
      CHECK (expiration_option IN ('7d', '30d', '1y', 'never'));
  END IF;
END $$;

-- 3. Partial index on non-null expires_at for fast cron cleanup queries & server verification
CREATE INDEX IF NOT EXISTS idx_experiences_expires_at
  ON public.experiences(expires_at)
  WHERE expires_at IS NOT NULL;

-- 4. Index on status to optimize cleanup scans targeting expired status
CREATE INDEX IF NOT EXISTS idx_experiences_status_expires
  ON public.experiences(status, expires_at);
