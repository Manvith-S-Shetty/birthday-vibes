-- ==============================================================================
-- Migration: Phase Admin â€” Admin Audit Logs & Administrative Infrastructure
-- Target Table: public.admin_audit_logs
--
-- Safety Guarantees:
-- 1. Non-destructive: Uses CREATE TABLE IF NOT EXISTS.
-- 2. Strictly isolated: Row Level Security enabled.
-- 3. Accessible ONLY by service_role (server-side Next.js admin client).
-- 4. Direct anon and authenticated access strictly revoked (no public leaks).
-- ==============================================================================

-- 1. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for efficient administrative auditing and filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON public.admin_audit_logs(actor);

-- 3. Row Level Security Configuration
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Grant full administrative privileges exclusively to service_role
GRANT ALL ON TABLE public.admin_audit_logs TO service_role;

-- 5. Revoke all privileges from anon and authenticated roles
REVOKE ALL ON TABLE public.admin_audit_logs FROM anon, authenticated;

-- 6. Deny-by-default RLS policy for anon and authenticated clients
DROP POLICY IF EXISTS "Disable anon direct admin_audit_logs access" ON public.admin_audit_logs;
CREATE POLICY "Disable anon direct admin_audit_logs access" ON public.admin_audit_logs
  FOR ALL
  TO anon, authenticated
  USING (false);
