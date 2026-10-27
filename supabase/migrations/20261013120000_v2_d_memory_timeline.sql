-- Migration: Add memory display mode to experiences table
ALTER TABLE public.experiences
ADD COLUMN IF NOT EXISTS memory_display_mode TEXT NOT NULL DEFAULT 'grid';

-- Constrain memory_display_mode to valid identifiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_memory_display_mode'
  ) THEN
    ALTER TABLE public.experiences
    ADD CONSTRAINT check_memory_display_mode
    CHECK (memory_display_mode IN ('grid', 'polaroid', 'timeline'));
  END IF;
END $$;
