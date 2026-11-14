-- Migration: 20261104_rate_limits.sql
-- Description: Serverless-safe persistent rate limiting table and atomic increment RPC
-- Secures PIN verification attempts and media upload URL generation across serverless instances

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for window cleanup and fast expiry queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_expires ON public.rate_limits (window_expires_at);

-- RLS: deny all public, anon, and authenticated access
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all public access to rate_limits" ON public.rate_limits;
CREATE POLICY "Deny all public access to rate_limits"
    ON public.rate_limits
    FOR ALL
    USING (false);

-- Restrict table grants strictly to service_role
REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limits FROM anon;
REVOKE ALL ON TABLE public.rate_limits FROM authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

-- Atomic increment function:
-- Upserts a rate limit record. If the record doesn't exist or its window has expired,
-- it resets attempts to 1 and sets a new window.
-- If the window is still active, it atomically increments attempts by 1.
CREATE OR REPLACE FUNCTION public.rate_limit_increment(
    p_key TEXT,
    p_window_ms BIGINT
)
RETURNS TABLE (
    attempts INTEGER,
    window_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_new_window TIMESTAMPTZ := v_now + make_interval(secs => (p_window_ms::float / 1000.0));
    v_result_attempts INTEGER;
    v_result_expires TIMESTAMPTZ;
BEGIN
    INSERT INTO public.rate_limits (key, attempts, window_expires_at, updated_at)
    VALUES (p_key, 1, v_new_window, v_now)
    ON CONFLICT (key) DO UPDATE SET
        attempts = CASE
            WHEN rate_limits.window_expires_at < v_now THEN 1
            ELSE rate_limits.attempts + 1
        END,
        window_expires_at = CASE
            WHEN rate_limits.window_expires_at < v_now THEN v_new_window
            ELSE rate_limits.window_expires_at
        END,
        updated_at = v_now;

    SELECT r.attempts, r.window_expires_at
    INTO v_result_attempts, v_result_expires
    FROM public.rate_limits r
    WHERE r.key = p_key;

    RETURN QUERY SELECT v_result_attempts, v_result_expires;
END;
$$;

-- Restrict RPC execution strictly to service_role
REVOKE ALL ON FUNCTION public.rate_limit_increment(TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_increment(TEXT, BIGINT) FROM anon;
REVOKE ALL ON FUNCTION public.rate_limit_increment(TEXT, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_increment(TEXT, BIGINT) TO service_role;

