-- Phase V2-G: Personalization & Opening Styles Schema Migration
-- Adds relationship and opening_style columns to the experiences table.

ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS opening_style TEXT NOT NULL DEFAULT 'cinematic-premiere';

-- Index for opening styles
CREATE INDEX IF NOT EXISTS idx_experiences_opening_style ON experiences(opening_style);
