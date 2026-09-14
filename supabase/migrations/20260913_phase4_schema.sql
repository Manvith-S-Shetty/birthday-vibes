-- Phase 4 Supabase Database & Security Migration Script

-- 1. Create experiences table
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_session_token TEXT NOT NULL,
  slug TEXT UNIQUE,
  recipient_name TEXT NOT NULL,
  birthday_date TEXT,
  theme_id TEXT NOT NULL DEFAULT 'midnight-cinema',
  personal_message TEXT DEFAULT '',
  pin_hash TEXT,
  pin_salt TEXT,
  is_pin_protected BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published')),
  current_step TEXT NOT NULL DEFAULT 'recipient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_experiences_slug ON experiences(slug);
CREATE INDEX IF NOT EXISTS idx_experiences_creator ON experiences(creator_session_token);
CREATE INDEX IF NOT EXISTS idx_experiences_status ON experiences(status);

-- 2. Create media table
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_experience_sort ON media(experience_id, sort_order);

-- 3. Create music table
CREATE TABLE IF NOT EXISTS music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'curated',
  source_url TEXT,
  track_id TEXT,
  title TEXT,
  artist TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_music_experience ON music(experience_id);

-- 4. Create experience_moments table
CREATE TABLE IF NOT EXISTS experience_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  moment_type TEXT NOT NULL,
  config_json JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moments_experience_sort ON experience_moments(experience_id, sort_order);

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE music ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_moments ENABLE ROW LEVEL SECURITY;

-- 5a. Experiences RLS Policies
CREATE POLICY "Public published locked cover read" ON experiences
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Creator draft read" ON experiences
  FOR SELECT
  USING (creator_session_token = current_setting('request.headers')::json->>'x-creator-token');

CREATE POLICY "Creator draft insert" ON experiences
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Creator draft update" ON experiences
  FOR UPDATE
  USING (creator_session_token = current_setting('request.headers')::json->>'x-creator-token');

-- 5b. Private Tables (media, music, moments) - SELECT disabled for anon client
-- Allowed ONLY via server-side service role client after PIN verification.
CREATE POLICY "Disable anon direct media access" ON media
  FOR SELECT USING (false);

CREATE POLICY "Disable anon direct music access" ON music
  FOR SELECT USING (false);

CREATE POLICY "Disable anon direct moments access" ON experience_moments
  FOR SELECT USING (false);

-- 6. Private Supabase Storage Bucket Configuration
INSERT INTO storage.buckets (id, name, public)
VALUES ('experience-media', 'experience-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;
