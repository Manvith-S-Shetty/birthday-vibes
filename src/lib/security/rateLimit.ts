import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
  unavailable?: boolean;
}

export interface RecordAttemptResult {
  success: boolean;
  unavailable?: boolean;
}

export class RateLimiterUnavailableError extends Error {
  constructor(message: string = "Rate limiter service is temporarily unavailable.") {
    super(message);
    this.name = "RateLimiterUnavailableError";
  }
}

interface RateLimitRecord {
  attempts: number;
  resetTime: number;
  lockoutTime: number;
}

const attemptStore = new Map<string, RateLimitRecord>();
const genericMemoryStore = new Map<string, { count: number; resetTime: number }>();

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// In-memory fallback implementations (dev & test only)
function checkPinRateLimitMemory(key: string): RateLimitResult {
  const now = Date.now();
  const record = attemptStore.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS, retryAfterMs: 0 };
  }

  if (now > record.resetTime) {
    attemptStore.delete(key);
    return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS, retryAfterMs: 0 };
  }

  if (record.attempts >= PIN_MAX_ATTEMPTS) {
    const retryAfterMs = record.resetTime - now;
    return { allowed: false, remainingAttempts: 0, retryAfterMs };
  }

  return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS - record.attempts, retryAfterMs: 0 };
}

function recordFailedPinAttemptMemory(key: string): void {
  const now = Date.now();
  const record = attemptStore.get(key);

  if (!record || now > record.resetTime) {
    attemptStore.set(key, {
      attempts: 1,
      resetTime: now + PIN_WINDOW_MS,
      lockoutTime: 0,
    });
    return;
  }

  const updatedAttempts = record.attempts + 1;
  attemptStore.set(key, {
    attempts: updatedAttempts,
    resetTime: record.resetTime,
    lockoutTime: updatedAttempts >= PIN_MAX_ATTEMPTS ? record.resetTime : 0,
  });
}

function resetPinRateLimitMemory(key: string): void {
  attemptStore.delete(key);
}

function consumeRateLimitMemory(
  key: string,
  windowMs: number,
  maxAttempts: number
): RateLimitResult {
  const now = Date.now();
  const record = genericMemoryStore.get(key);

  if (!record || now > record.resetTime) {
    genericMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterMs: 0 };
  }

  record.count += 1;
  if (record.count > maxAttempts) {
    return { allowed: false, remainingAttempts: 0, retryAfterMs: Math.max(0, record.resetTime - now) };
  }

  return { allowed: true, remainingAttempts: Math.max(0, maxAttempts - record.count), retryAfterMs: 0 };
}

/**
 * Check if the given PIN verification attempt is allowed.
 * In production: fails closed if persistent rate limiter is unavailable or errors.
 * In development/test: falls back to in-memory store.
 */
export async function checkPinRateLimit(
  key: string
): Promise<RateLimitResult> {
  const prod = isProduction();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabaseAdminClient as any)
        .from("rate_limits")
        .select("attempts, window_expires_at")
        .eq("key", key)
        .maybeSingle();

      if (!error) {
        if (!data) {
          return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS, retryAfterMs: 0 };
        }

        const now = Date.now();
        const expiresAt = new Date(data.window_expires_at).getTime();

        if (now >= expiresAt) {
          return { allowed: true, remainingAttempts: PIN_MAX_ATTEMPTS, retryAfterMs: 0 };
        }

        if (data.attempts >= PIN_MAX_ATTEMPTS) {
          const retryAfterMs = Math.max(0, expiresAt - now);
          return { allowed: false, remainingAttempts: 0, retryAfterMs };
        }

        return {
          allowed: true,
          remainingAttempts: Math.max(0, PIN_MAX_ATTEMPTS - data.attempts),
          retryAfterMs: 0,
        };
      }

      console.error("[rateLimit] Persistent PIN check database error:", error.message);
      if (prod) {
        return { allowed: false, remainingAttempts: 0, retryAfterMs: 0, unavailable: true };
      }
    } catch (e: any) {
      console.error("[rateLimit] Persistent PIN check exception:", e?.message);
      if (prod) {
        return { allowed: false, remainingAttempts: 0, retryAfterMs: 0, unavailable: true };
      }
    }
  } else if (prod) {
    console.error("[rateLimit] Supabase is not configured in production environment.");
    return { allowed: false, remainingAttempts: 0, retryAfterMs: 0, unavailable: true };
  }

  // Fallback to in-memory store only in non-production environments
  return checkPinRateLimitMemory(key);
}

/**
 * Atomically record a failed PIN verification attempt in Postgres.
 * In production: fails closed if persistent rate limiter is unavailable or errors.
 * In development/test: records in-memory fallback.
 */
export async function recordFailedPinAttempt(key: string): Promise<RecordAttemptResult> {
  const prod = isProduction();

  if (!prod) {
    recordFailedPinAttemptMemory(key);
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await (supabaseAdminClient as any).rpc("rate_limit_increment", {
        p_key: key,
        p_window_ms: PIN_WINDOW_MS,
      });

      if (error) {
        console.error("[rateLimit] Persistent recordFailedPinAttempt DB error:", error.message);
        if (prod) {
          return { success: false, unavailable: true };
        }
      } else {
        return { success: true };
      }
    } catch (e: any) {
      console.error("[rateLimit] Persistent recordFailedPinAttempt exception:", e?.message);
      if (prod) {
        return { success: false, unavailable: true };
      }
    }
  } else if (prod) {
    console.error("[rateLimit] Supabase is not configured in production environment.");
    return { success: false, unavailable: true };
  }

  return { success: true };
}

/**
 * Reset failed PIN attempts upon successful verification.
 * Successful unlock is never blocked even if DB reset encounters a transient error.
 */
export async function resetPinRateLimit(key: string): Promise<void> {
  resetPinRateLimitMemory(key);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await (supabaseAdminClient as any)
        .from("rate_limits")
        .delete()
        .eq("key", key);

      if (error) {
        console.warn("[rateLimit] DB resetPinRateLimit warning:", error.message);
      }
    } catch (e: any) {
      console.warn("[rateLimit] DB resetPinRateLimit exception:", e?.message);
    }
  }
}

/**
 * Atomically increment and enforce a rate limit window (e.g. upload requests).
 * In production: fails closed if persistent rate limiter is unavailable or errors.
 * In development/test: falls back to in-memory sliding window.
 */
export async function consumeRateLimit(
  key: string,
  windowMs: number,
  maxAttempts: number
): Promise<RateLimitResult> {
  const prod = isProduction();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabaseAdminClient as any).rpc("rate_limit_increment", {
        p_key: key,
        p_window_ms: windowMs,
      });

      if (!error && data) {
        const record = Array.isArray(data) ? data[0] : data;
        if (record && typeof record.attempts === "number") {
          const attempts = record.attempts;
          const expiresAt = new Date(record.window_expires_at).getTime();
          const now = Date.now();
          const retryAfterMs = Math.max(0, expiresAt - now);

          if (attempts > maxAttempts) {
            return { allowed: false, remainingAttempts: 0, retryAfterMs };
          }
          return {
            allowed: true,
            remainingAttempts: Math.max(0, maxAttempts - attempts),
            retryAfterMs: 0,
          };
        }
      }

      console.error("[rateLimit] Persistent consumeRateLimit DB error:", error?.message || "Invalid data returned");
      if (prod) {
        return { allowed: false, remainingAttempts: 0, retryAfterMs: 0, unavailable: true };
      }
    } catch (e: any) {
      console.error("[rateLimit] Persistent consumeRateLimit exception:", e?.message);
      if (prod) {
        return { allowed: false, remainingAttempts: 0, retryAfterMs: 0, unavailable: true };
      }
    }
  } else if (prod) {
    console.error("[rateLimit] Supabase is not configured in production environment.");
    return { allowed: false, remainingAttempts: 0, retryAfterMs: 0, unavailable: true };
  }

  return consumeRateLimitMemory(key, windowMs, maxAttempts);
}
