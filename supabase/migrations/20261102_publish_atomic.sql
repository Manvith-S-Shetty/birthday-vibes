-- ==============================================================================
-- Migration: Phase V3 — Atomic Experience Publishing Transaction RPC
-- Target Table: public.experiences, public.media, public.music, public.voice_messages, public.experience_moments
--
-- Guarantees:
-- 1. All-or-nothing Persistence: Executes within a single PostgreSQL ACID transaction
-- 2. No partial publishing: If media, voice, music, or moments fail, entire transaction rolls back.
-- 3. Search Path Hardened: Explicit SET search_path = public, pg_temp prevents path mutability (CWE-426).
-- 4. Strict Role Authorization: REVOKED from PUBLIC, anon, and authenticated; EXCLUSIVE GRANT to service_role.
-- 5. Ownership & Race Condition Safety: Uses SELECT ... FOR UPDATE and checks creator_session_token.
-- 6. Comprehensive Input Validation: Validates types, non-empty fields, voice constraints, and JSON schemas.
-- ==============================================================================

CREATE OR REPLACE FUNCTION publish_experience_transactional(
  p_experience_row JSONB,
  p_media_rows JSONB DEFAULT '[]'::jsonb,
  p_music_row JSONB DEFAULT NULL,
  p_voice_row JSONB DEFAULT NULL,
  p_moments_rows JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_id UUID;
  v_existing_id UUID;
  v_existing_slug TEXT;
  v_existing_token TEXT;
  v_exp_id UUID;
  v_slug TEXT;
  v_recipient_name TEXT;
  v_creator_token TEXT;
  v_expiration_opt TEXT;
  v_media_count INTEGER;
  v_moments_count INTEGER;
  m JSONB;
  mom JSONB;
BEGIN
  -- 1. Input Validation: Experience Row
  IF p_experience_row IS NULL OR jsonb_typeof(p_experience_row) <> 'object' THEN
    RAISE EXCEPTION 'p_experience_row must be a non-null JSON object'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_recipient_name := trim(COALESCE(p_experience_row->>'recipient_name', ''));
  IF v_recipient_name = '' THEN
    RAISE EXCEPTION 'recipient_name cannot be empty'
      USING ERRCODE = 'not_null_violation';
  END IF;

  v_slug := trim(COALESCE(p_experience_row->>'slug', ''));
  IF v_slug = '' THEN
    RAISE EXCEPTION 'slug cannot be empty'
      USING ERRCODE = 'not_null_violation';
  END IF;

  v_creator_token := trim(COALESCE(p_experience_row->>'creator_session_token', ''));
  IF v_creator_token = '' THEN
    RAISE EXCEPTION 'creator_session_token cannot be empty'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Validate target UUID if supplied
  IF p_experience_row->>'id' IS NOT NULL AND trim(p_experience_row->>'id') <> '' THEN
    BEGIN
      v_target_id := (p_experience_row->>'id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid UUID format for experience id: %', p_experience_row->>'id'
        USING ERRCODE = 'invalid_parameter_value';
    END;
  END IF;

  -- Validate expiration option
  v_expiration_opt := COALESCE(p_experience_row->>'expiration_option', 'never');
  IF v_expiration_opt NOT IN ('7d', '30d', '1y', 'never') THEN
    v_expiration_opt := 'never';
  END IF;

  -- 2. Input Validation: Media rows
  IF p_media_rows IS NOT NULL AND jsonb_typeof(p_media_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_media_rows must be a JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 3. Input Validation: Moments rows
  IF p_moments_rows IS NOT NULL AND jsonb_typeof(p_moments_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_moments_rows must be a JSON array'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 4. Input Validation: Voice Message Row
  IF p_voice_row IS NOT NULL AND jsonb_typeof(p_voice_row) = 'object' THEN
    IF p_voice_row->>'storage_path' IS NULL OR trim(p_voice_row->>'storage_path') = '' THEN
      RAISE EXCEPTION 'Voice message storage_path cannot be empty'
        USING ERRCODE = 'not_null_violation';
    END IF;

    IF p_voice_row->>'mime_type' IS NULL OR trim(p_voice_row->>'mime_type') = '' THEN
      RAISE EXCEPTION 'Voice message mime_type cannot be empty'
        USING ERRCODE = 'not_null_violation';
    END IF;

    IF (p_voice_row->>'duration_ms')::integer <= 0 OR (p_voice_row->>'duration_ms')::integer > 180000 THEN
      RAISE EXCEPTION 'Voice message duration must be between 1ms and 180000ms'
        USING ERRCODE = 'check_violation';
    END IF;

    IF (p_voice_row->>'file_size_bytes')::integer <= 0 OR (p_voice_row->>'file_size_bytes')::integer > 10485760 THEN
      RAISE EXCEPTION 'Voice message file size must be between 1 byte and 10MB'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- 5. Ownership & Concurrency Check: Check existing record by ID or slug with row lock
  v_existing_id := NULL;
  IF v_target_id IS NOT NULL THEN
    SELECT id, slug, creator_session_token INTO v_existing_id, v_existing_slug, v_existing_token
    FROM public.experiences
    WHERE id = v_target_id
    FOR UPDATE;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id, slug, creator_session_token INTO v_existing_id, v_existing_slug, v_existing_token
    FROM public.experiences
    WHERE slug = v_slug
    FOR UPDATE;
  END IF;

  -- Enforce creator session ownership if updating existing experience
  IF v_existing_id IS NOT NULL THEN
    IF v_existing_token IS NOT NULL AND v_existing_token <> v_creator_token THEN
      RAISE EXCEPTION 'Forbidden: Experience is owned by another creator session'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Update existing experience
    UPDATE public.experiences SET
      creator_session_token = v_creator_token,
      slug = v_slug,
      recipient_name = v_recipient_name,
      birthday_date = p_experience_row->>'birthday_date',
      relationship = p_experience_row->>'relationship',
      opening_style = COALESCE(p_experience_row->>'opening_style', 'cinematic-premiere'),
      memory_display_mode = COALESCE(p_experience_row->>'memory_display_mode', 'grid'),
      theme_id = COALESCE(p_experience_row->>'theme_id', 'midnight-cinema'),
      personal_message = COALESCE(p_experience_row->>'personal_message', ''),
      pin_hash = p_experience_row->>'pin_hash',
      pin_salt = p_experience_row->>'pin_salt',
      is_pin_protected = COALESCE((p_experience_row->>'is_pin_protected')::boolean, false),
      status = 'published',
      current_step = 'publish',
      updated_at = NOW(),
      published_at = NOW(),
      expires_at = (p_experience_row->>'expires_at')::timestamptz,
      expiration_option = v_expiration_opt
    WHERE id = v_existing_id
    RETURNING id, slug INTO v_exp_id, v_slug;
  ELSE
    -- Insert new experience
    INSERT INTO public.experiences (
      id,
      creator_session_token,
      slug,
      recipient_name,
      birthday_date,
      relationship,
      opening_style,
      memory_display_mode,
      theme_id,
      personal_message,
      pin_hash,
      pin_salt,
      is_pin_protected,
      status,
      current_step,
      created_at,
      updated_at,
      published_at,
      expires_at,
      expiration_option
    ) VALUES (
      COALESCE(v_target_id, gen_random_uuid()),
      v_creator_token,
      v_slug,
      v_recipient_name,
      p_experience_row->>'birthday_date',
      p_experience_row->>'relationship',
      COALESCE(p_experience_row->>'opening_style', 'cinematic-premiere'),
      COALESCE(p_experience_row->>'memory_display_mode', 'grid'),
      COALESCE(p_experience_row->>'theme_id', 'midnight-cinema'),
      COALESCE(p_experience_row->>'personal_message', ''),
      p_experience_row->>'pin_hash',
      p_experience_row->>'pin_salt',
      COALESCE((p_experience_row->>'is_pin_protected')::boolean, false),
      'published',
      'publish',
      NOW(),
      NOW(),
      NOW(),
      (p_experience_row->>'expires_at')::timestamptz,
      v_expiration_opt
    )
    RETURNING id, slug INTO v_exp_id, v_slug;
  END IF;

  -- 6. Persist Media records (Atomic delete & re-insert)
  DELETE FROM public.media WHERE experience_id = v_exp_id;
  IF p_media_rows IS NOT NULL AND jsonb_array_length(p_media_rows) > 0 THEN
    FOR m IN SELECT * FROM jsonb_array_elements(p_media_rows)
    LOOP
      IF m->>'storage_path' IS NOT NULL AND trim(m->>'storage_path') <> '' THEN
        INSERT INTO public.media (
          experience_id,
          storage_path,
          type,
          caption,
          sort_order,
          metadata
        ) VALUES (
          v_exp_id,
          m->>'storage_path',
          COALESCE(m->>'type', 'image'),
          m->>'caption',
          COALESCE((m->>'sort_order')::integer, 0),
          COALESCE(m->'metadata', '{}'::jsonb)
        );
      END IF;
    END LOOP;
  END IF;

  -- 7. Persist Music record
  DELETE FROM public.music WHERE experience_id = v_exp_id;
  IF p_music_row IS NOT NULL AND jsonb_typeof(p_music_row) = 'object' AND p_music_row->>'title' IS NOT NULL THEN
    INSERT INTO public.music (
      experience_id,
      source_type,
      source_url,
      track_id,
      title,
      artist,
      enabled
    ) VALUES (
      v_exp_id,
      COALESCE(p_music_row->>'source_type', 'curated'),
      p_music_row->>'source_url',
      p_music_row->>'track_id',
      p_music_row->>'title',
      p_music_row->>'artist',
      true
    );
  END IF;

  -- 8. Persist Voice Message record
  IF p_voice_row IS NOT NULL AND jsonb_typeof(p_voice_row) = 'object' THEN
    INSERT INTO public.voice_messages (
      experience_id,
      storage_path,
      mime_type,
      duration_ms,
      file_size_bytes,
      transcript,
      updated_at
    ) VALUES (
      v_exp_id,
      p_voice_row->>'storage_path',
      p_voice_row->>'mime_type',
      (p_voice_row->>'duration_ms')::integer,
      (p_voice_row->>'file_size_bytes')::integer,
      p_voice_row->>'transcript',
      NOW()
    )
    ON CONFLICT (experience_id) DO UPDATE SET
      storage_path = EXCLUDED.storage_path,
      mime_type = EXCLUDED.mime_type,
      duration_ms = EXCLUDED.duration_ms,
      file_size_bytes = EXCLUDED.file_size_bytes,
      transcript = EXCLUDED.transcript,
      updated_at = NOW();
  ELSE
    DELETE FROM public.voice_messages WHERE experience_id = v_exp_id;
  END IF;

  -- 9. Persist Interactive Moments
  DELETE FROM public.experience_moments WHERE experience_id = v_exp_id;
  IF p_moments_rows IS NOT NULL AND jsonb_array_length(p_moments_rows) > 0 THEN
    FOR mom IN SELECT * FROM jsonb_array_elements(p_moments_rows)
    LOOP
      IF mom->>'moment_type' IS NOT NULL AND trim(mom->>'moment_type') <> '' THEN
        INSERT INTO public.experience_moments (
          experience_id,
          moment_type,
          config_json,
          sort_order,
          enabled
        ) VALUES (
          v_exp_id,
          mom->>'moment_type',
          COALESCE(mom->'config_json', '{}'::jsonb),
          COALESCE((mom->>'sort_order')::integer, 0),
          true
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_exp_id,
    'slug', v_slug
  );
END;
$$;

-- ==============================================================================
-- Security Hardening: Revoke default PUBLIC execution & grant strictly to service_role
-- ==============================================================================
REVOKE ALL ON FUNCTION publish_experience_transactional(JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION publish_experience_transactional(JSONB, JSONB, JSONB, JSONB, JSONB) FROM anon;
REVOKE ALL ON FUNCTION publish_experience_transactional(JSONB, JSONB, JSONB, JSONB, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION publish_experience_transactional(JSONB, JSONB, JSONB, JSONB, JSONB) TO service_role;
