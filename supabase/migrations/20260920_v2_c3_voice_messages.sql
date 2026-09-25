-- Phase V2-C.3: Supabase Database Contract for Voice Messages

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create voice_messages table
CREATE TABLE IF NOT EXISTS voice_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID UNIQUE NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  storage_path VARCHAR(512) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  duration_ms INTEGER NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_voice_messages_duration CHECK (duration_ms > 0 AND duration_ms <= 180000),
  CONSTRAINT check_voice_messages_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  CONSTRAINT check_voice_messages_mime_type CHECK (length(trim(mime_type)) > 0),
  CONSTRAINT check_voice_messages_storage_path CHECK (length(trim(storage_path)) > 0)
);

-- 2. Create index on experience_id
CREATE INDEX IF NOT EXISTS idx_voice_messages_experience_id
ON voice_messages(experience_id);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

-- 4. Deny-by-default Policy for anonymous/public SELECT
-- Application / server-side service role client will handle access in V2-C.4.
CREATE POLICY "Disable anon direct voice_messages access" ON voice_messages
  FOR SELECT USING (false);
