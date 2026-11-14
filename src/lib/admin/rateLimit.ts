// IP-based login rate limiting & brute-force defense
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return true;
  if (now > record.resetAt) {
    loginAttempts.delete(ip);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

export function recordFailedLoginAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + LOCKOUT_MS };
  record.count += 1;
  loginAttempts.set(ip, record);
}

export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export function _clearLoginAttemptsForTesting(): void {
  loginAttempts.clear();
}
