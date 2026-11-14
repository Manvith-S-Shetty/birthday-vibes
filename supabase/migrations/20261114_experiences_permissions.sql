-- ==============================================================================
-- Migration: Phase V4 — Fix Table Permissions and RLS Hardening for experiences & child tables
-- Target Tables: public.experiences, public.media, public.music, public.experience_moments, public.voice_messages
--
-- Background & Root Cause:
-- 1. Migration 20260913_phase4_schema.sql enabled Row Level Security (RLS) on experiences and child tables,
--    but omitted explicit GRANT statements for PostgreSQL roles (service_role, anon, authenticated).
-- 2. In PostgreSQL, table-level privileges (GRANT) are evaluated BEFORE Row Level Security policies.
--    When table-level privileges are absent for service_role, queries immediately fail with:
--    "42501 (insufficient_privilege): permission denied for table experiences"
--
-- Security Architecture & Least-Privilege Design:
-- 1. service_role (Server-side Next.js runtime via supabaseAdminClient):
--    - Server endpoints (creator publishing, preview URLs, draft ownership anchoring, PIN unlock verification,
--      protected payload retrieval, and expiration cleanup) require full administrative access.
--    - Granted ALL on public.experiences, media, music, experience_moments, voice_messages.
--
-- 2. anon & authenticated (Direct client / PostgREST queries):
--    - Tampering Prevention: All INSERT, UPDATE, DELETE permissions are REVOKED.
--    - Column-Level Security on public.experiences:
--      GRANT SELECT only on safe public cover & presentation columns:
--      (id, slug, recipient_name, birthday_date, theme_id, is_pin_protected, status,
--       current_step, created_at, updated_at, published_at, relationship, opening_style,
--       memory_display_mode, expires_at, expiration_option)
--      EXCLUDING sensitive columns: pin_hash, pin_salt, creator_session_token, personal_message.
--    - Row Level Security (RLS) on public.experiences:
--      Anon/authenticated can ONLY view published experiences:
--      status = 'published' AND (expires_at IS NULL OR expires_at > now()).
--      Drafts, ready/unpublished experiences, and expired experiences return 0 rows.
--    - Child Tables (media, music, experience_moments, voice_messages):
--      Explicitly denied for anon/authenticated (USING (false)).
--      Private media & voice audio are accessible only via server-generated signed URLs after PIN unlock.
-- ==============================================================================

-- 1. Ensure Row Level Security is enabled on all tables
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;

-- 2. Grant full administrative privileges to service_role on application tables
GRANT ALL ON TABLE public.experiences TO service_role;
GRANT ALL ON TABLE public.media TO service_role;
GRANT ALL ON TABLE public.music TO service_role;
GRANT ALL ON TABLE public.experience_moments TO service_role;
GRANT ALL ON TABLE public.voice_messages TO service_role;

-- 3. Restrict anon and authenticated roles
-- Revoke all direct write and table-wide permissions
REVOKE ALL ON TABLE public.experiences FROM anon, authenticated;
REVOKE ALL ON TABLE public.media FROM anon, authenticated;
REVOKE ALL ON TABLE public.music FROM anon, authenticated;
REVOKE ALL ON TABLE public.experience_moments FROM anon, authenticated;
REVOKE ALL ON TABLE public.voice_messages FROM anon, authenticated;

-- Grant SELECT only on safe public columns of public.experiences
GRANT SELECT (
  id,
  slug,
  recipient_name,
  birthday_date,
  theme_id,
  is_pin_protected,
  status,
  current_step,
  created_at,
  updated_at,
  published_at,
  relationship,
  opening_style,
  memory_display_mode,
  expires_at,
  expiration_option
) ON TABLE public.experiences TO anon, authenticated;

-- 4. Harden Row Level Security (RLS) Policies on public.experiences
DROP POLICY IF EXISTS "Public published locked cover read" ON public.experiences;
DROP POLICY IF EXISTS "Public published experiences select" ON public.experiences;
DROP POLICY IF EXISTS "Creator draft read" ON public.experiences;
DROP POLICY IF EXISTS "Creator draft insert" ON public.experiences;
DROP POLICY IF EXISTS "Creator draft update" ON public.experiences;

-- Public read policy: strictly published experiences, active (not expired)
CREATE POLICY "Public published experiences select" ON public.experiences
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND (expires_at IS NULL OR expires_at > now())
  );

-- 5. Explicitly deny direct SELECT on private child tables for anon/authenticated
DROP POLICY IF EXISTS "Disable anon direct media access" ON public.media;
CREATE POLICY "Disable anon direct media access" ON public.media
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Disable anon direct music access" ON public.music;
CREATE POLICY "Disable anon direct music access" ON public.music
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Disable anon direct moments access" ON public.experience_moments;
CREATE POLICY "Disable anon direct moments access" ON public.experience_moments
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Disable anon direct voice_messages access" ON public.voice_messages;
CREATE POLICY "Disable anon direct voice_messages access" ON public.voice_messages
  FOR SELECT
  TO anon, authenticated
  USING (false);

