-- Phase 4.5 Security Hardened Database Schema & RLS Policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Experiences Table
CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(128) UNIQUE NOT NULL,
    creator_token_hash VARCHAR(256) NOT NULL, -- SHA-256 hash of creator secret (NEVER raw secret)
    recipient_name VARCHAR(256) NOT NULL,
    birthday_date DATE,
    theme_id VARCHAR(64) NOT NULL DEFAULT 'midnight-cinema',
    cover_style VARCHAR(64) DEFAULT 'classic',
    personal_message TEXT,
    pin_hash VARCHAR(512), -- PBKDF2 derived key hex
    pin_salt VARCHAR(128), -- Unique 64-byte salt hex
    is_pin_protected BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
    current_step VARCHAR(32) DEFAULT 'recipient',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid lookup & authorization checks
CREATE INDEX IF NOT EXISTS idx_experiences_slug ON experiences(slug);
CREATE INDEX IF NOT EXISTS idx_experiences_creator_token_hash ON experiences(creator_token_hash);
CREATE INDEX IF NOT EXISTS idx_experiences_status ON experiences(status);

-- 2. Media Table (Photos / Videos)
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Relative path in private bucket
    mime_type VARCHAR(64) NOT NULL,
    file_size INTEGER NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'image',
    caption TEXT,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_experience_id ON media(experience_id);

-- 3. Music Table
CREATE TABLE IF NOT EXISTS music (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL DEFAULT 'curated', -- 'curated' | 'custom'
    source_url TEXT,
    track_id VARCHAR(128),
    title VARCHAR(256),
    artist VARCHAR(256),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_music_experience_id ON music(experience_id);

-- 4. Experience Moments Table
CREATE TABLE IF NOT EXISTS experience_moments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    moment_type VARCHAR(64) NOT NULL,
    title VARCHAR(256),
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moments_experience_id ON experience_moments(experience_id);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE music ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_moments ENABLE ROW LEVEL SECURITY;

-- Anonymous SELECT policy for published experiences cover metadata
CREATE POLICY "Public cover metadata read for published experiences"
    ON experiences FOR SELECT
    USING (status = 'published');

-- Block direct anonymous INSERT/UPDATE/DELETE on tables
-- Modifying operations must go through Next.js Server Actions / API routes
-- using service-role authorization after verifying creator_token_hash.
CREATE POLICY "No direct public insert on experiences"
    ON experiences FOR INSERT
    WITH CHECK (false);

CREATE POLICY "No direct public update on experiences"
    ON experiences FOR UPDATE
    USING (false);

CREATE POLICY "No direct public delete on experiences"
    ON experiences FOR DELETE
    USING (false);

--------------------------------------------------------------------------------
-- STORAGE BUCKET CONFIGURATION
--------------------------------------------------------------------------------

-- Insert private storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'experience-media',
    'experience-media',
    false, -- STRICTLY PRIVATE BUCKET
    20971520, -- 20MB Max
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 20971520;
