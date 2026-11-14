import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

export interface AuditLogEntry {
  id?: string;
  actor: string;
  action: string;
  target_id?: string | null;
  target_type?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  status?: "success" | "failure";
  created_at?: string;
}

// In-memory fallback ring buffer for resiliency (holds last 500 audit entries)
const inMemoryAuditBuffer: AuditLogEntry[] = [];
const MAX_BUFFER_SIZE = 500;

/**
 * Strips any potential sensitive keys (passwords, PINs, auth secrets)
 * before persisting to audit logs.
 */
function sanitizeDetails(details?: Record<string, any>): Record<string, any> {
  if (!details) return {};
  const cleaned: Record<string, any> = {};
  const forbiddenPatterns = [
    /pin/i,
    /pass/i,
    /secret/i,
    /token/i,
    /salt/i,
    /hash/i,
    /key/i,
  ];

  for (const [key, value] of Object.entries(details)) {
    const isSensitive = forbiddenPatterns.some((pattern) => pattern.test(key));
    if (isSensitive) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      cleaned[key] = sanitizeDetails(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Securely records an administrative audit log.
 * Logs to PostgreSQL via Supabase service-role, falling back to in-memory buffer if table is pending.
 */
export async function logAdminActivity(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  const safeEntry: AuditLogEntry = {
    id: entry.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    actor: entry.actor || "admin",
    action: entry.action,
    target_id: entry.target_id || null,
    target_type: entry.target_type || null,
    details: sanitizeDetails(entry.details),
    ip_address: entry.ip_address || null,
    user_agent: entry.user_agent ? entry.user_agent.substring(0, 255) : null,
    status: entry.status || "success",
    created_at: timestamp,
  };

  // Add to in-memory buffer
  inMemoryAuditBuffer.unshift(safeEntry);
  if (inMemoryAuditBuffer.length > MAX_BUFFER_SIZE) {
    inMemoryAuditBuffer.pop();
  }

  // Attempt database write via service role
  if (isSupabaseConfigured()) {
    try {
      const { error } = await (supabaseAdminClient as any)
        .from("admin_audit_logs")
        .insert({
          actor: safeEntry.actor,
          action: safeEntry.action,
          target_id: safeEntry.target_id,
          target_type: safeEntry.target_type,
          details: safeEntry.details,
          ip_address: safeEntry.ip_address,
          user_agent: safeEntry.user_agent,
          status: safeEntry.status,
          created_at: safeEntry.created_at,
        });

      if (error) {
        // Table may not have been migrated yet in production
        console.warn("[AdminAuditLog] DB insert skipped or table pending:", error.message);
      }
    } catch (err: any) {
      console.warn("[AdminAuditLog] Error recording audit log to DB:", err.message);
    }
  }
}

/**
 * Retrieves audit logs for the security view with optional pagination and filters.
 */
export async function getAdminAuditLogs(options?: {
  limit?: number;
  offset?: number;
  action?: string;
  targetId?: string;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  if (isSupabaseConfigured()) {
    try {
      let query = (supabaseAdminClient as any)
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (options?.action) {
        query = query.eq("action", options.action);
      }
      if (options?.targetId) {
        query = query.eq("target_id", options.targetId);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (!error && data) {
        return {
          logs: data as AuditLogEntry[],
          total: count ?? data.length,
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to in-memory buffer
  let filtered = [...inMemoryAuditBuffer];
  if (options?.action) {
    filtered = filtered.filter((l) => l.action === options.action);
  }
  if (options?.targetId) {
    filtered = filtered.filter((l) => l.target_id === options.targetId);
  }

  return {
    logs: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

/**
 * For testing: clears the in-memory audit log buffer.
 */
export function _clearAuditBufferForTesting(): void {
  inMemoryAuditBuffer.length = 0;
}
