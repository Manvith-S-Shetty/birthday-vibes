interface RateLimitRecord {
  attempts: number;
  resetTime: number;
  lockoutTime: number;
}

const attemptStore = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout after max attempts

export function checkPinRateLimit(key: string): { allowed: boolean; remainingAttempts: number; retryAfterMs: number } {
  const now = Date.now();
  const record = attemptStore.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterMs: 0 };
  }

  if (now > record.resetTime) {
    attemptStore.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterMs: 0 };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    const retryAfterMs = record.resetTime - now;
    return { allowed: false, remainingAttempts: 0, retryAfterMs };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.attempts, retryAfterMs: 0 };
}

export function recordFailedPinAttempt(key: string): void {
  const now = Date.now();
  const record = attemptStore.get(key);

  if (!record || now > record.resetTime) {
    attemptStore.set(key, {
      attempts: 1,
      resetTime: now + WINDOW_MS,
      lockoutTime: 0,
    });
    return;
  }

  const updatedAttempts = record.attempts + 1;
  const lockoutTime = updatedAttempts >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;

  attemptStore.set(key, {
    attempts: updatedAttempts,
    resetTime: now + WINDOW_MS,
    lockoutTime,
  });
}

export function resetPinRateLimit(key: string): void {
  attemptStore.delete(key);
}
