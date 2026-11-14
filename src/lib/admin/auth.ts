import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "wishlight_admin_session";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

function resolveSecretKey(): string {
  const secret = process.env.APP_AUTH_SECRET || process.env.PIN_HASH_SECRET_SALT;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[FATAL] APP_AUTH_SECRET is required in production for admin security."
      );
    }
    return "dev-fallback-admin-secret-key-32-chars-min-length-required";
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      `[FATAL] APP_AUTH_SECRET is too short (${secret.length} chars). ` +
        "Production requires at least 32 characters for cryptographic safety."
    );
  }
  return secret;
}

export function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL || "owner@wishscene.com";
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || "";
  if (process.env.NODE_ENV === "production" && password && password.length < 12) {
    throw new Error(
      "[FATAL] ADMIN_PASSWORD must be at least 12 characters in production."
    );
  }
  return { email, password };
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  role: "owner" | "admin";
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token for an authorized admin.
 */
export function createAdminSessionToken(email: string, adminId = "owner-admin"): string {
  const secret = resolveSecretKey();
  const now = Date.now();
  const payload: AdminSessionPayload = {
    adminId,
    email,
    role: "owner",
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes an admin session token using constant-time verification.
 */
export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return null;
  }

  const secret = resolveSecretKey();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedSigBuf.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload: AdminSessionPayload = JSON.parse(jsonStr);

    if (!payload || !payload.expiresAt || !payload.email) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sets the secure HTTP-only admin session cookie.
 */
export function setAdminSessionCookie(token: string): void {
  try {
    cookies().set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch (err) {
    // Outside active request context or inside unit testing harness
  }
}

/**
 * Clears the admin session cookie on logout.
 */
export function clearAdminSessionCookie(): void {
  try {
    cookies().set(ADMIN_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch (err) {
    // Outside active request context
  }
}

/**
 * Reads and verifies the admin session from Next.js server cookie store.
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyAdminSessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Verifies admin authorization from NextRequest headers, cookies, or Bearer auth.
 */
export async function verifyAdminRequest(
  req: NextRequest
): Promise<{ authorized: boolean; session?: AdminSessionPayload; reason?: string }> {
  // CSRF Defense: For state-changing methods with cookies, verify Origin header if present
  const isMutating = ["POST", "PATCH", "DELETE", "PUT"].includes(req.method.toUpperCase());
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (isMutating && origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return {
          authorized: false,
          reason: "Cross-site request forgery blocked: Origin host does not match request Host.",
        };
      }
    } catch {
      return { authorized: false, reason: "Invalid Origin header." };
    }
  }

  // 1. Check HTTP-only session cookie
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookieToken) {
    const session = verifyAdminSessionToken(cookieToken);
    if (session) {
      return { authorized: true, session };
    }
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    const session = verifyAdminSessionToken(bearerToken);
    if (session) {
      return { authorized: true, session };
    }

    // Direct ADMIN_SECRET / ADMIN_PASSWORD bearer key comparison
    const { password } = getAdminCredentials();
    if (password && password.length >= 8) {
      const pBuf = Buffer.from(password);
      const bBuf = Buffer.from(bearerToken);
      if (pBuf.length === bBuf.length && crypto.timingSafeEqual(pBuf, bBuf)) {
        return {
          authorized: true,
          session: {
            adminId: "bearer-token-admin",
            email: "bearer-token",
            role: "owner",
            issuedAt: Date.now(),
            expiresAt: Date.now() + 3600000,
            nonce: "bearer-auth",
          },
        };
      }
    }
  }

  // 3. Check x-admin-key header
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey) {
    const { password } = getAdminCredentials();
    if (password && password.length >= 8) {
      const pBuf = Buffer.from(password);
      const kBuf = Buffer.from(adminKey);
      if (pBuf.length === kBuf.length && crypto.timingSafeEqual(pBuf, kBuf)) {
        return {
          authorized: true,
          session: {
            adminId: "header-key-admin",
            email: "header-key",
            role: "owner",
            issuedAt: Date.now(),
            expiresAt: Date.now() + 3600000,
            nonce: "header-auth",
          },
        };
      }
    }
  }

  return { authorized: false, reason: "Unauthorized: valid admin session required." };
}

/**
 * Strict Security Filter:
 * NEVER expose pin_hash, pin_salt, or creator_session_token.
 */
export function sanitizeExperience<T extends Record<string, any>>(exp: T): Omit<T, "pin_hash" | "pin_salt" | "creator_session_token"> {
  const { pin_hash, pin_salt, creator_session_token, ...safeData } = exp;
  return safeData;
}
