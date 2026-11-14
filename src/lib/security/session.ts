import { cookies } from "next/headers";
import crypto from "crypto";

function resolveAppAuthSecret(): string {
  const secret = process.env.APP_AUTH_SECRET || process.env.PIN_HASH_SECRET_SALT;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[FATAL] APP_AUTH_SECRET environment variable is required in production. " +
          "Set a cryptographically random value of at least 32 characters in your environment settings. " +
          "Generate one with: openssl rand -base64 32"
      );
    }
    return "dev-only-fallback__not-for-production__set-APP_AUTH_SECRET-in-env-local";
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error(
      `[FATAL] APP_AUTH_SECRET is too short (${secret.length} chars). ` +
        "Production requires at least 32 characters for cryptographic safety."
    );
  }
  return secret;
}

const APP_AUTH_SECRET = resolveAppAuthSecret();

const CREATOR_COOKIE_NAME = "wishlight_creator_session";

export function getRecipientCookieName(slug: string): string {
  const sanitizedSlug = slug.replace(/[^a-z0-9]/g, "_");
  return `wishlight_auth_${sanitizedSlug}`;
}

export function createRecipientAuthToken(slug: string): string {
  const timestamp = Date.now();
  const payload = `${slug}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", APP_AUTH_SECRET).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifyRecipientAuthToken(targetSlug: string, token: string): boolean {
  if (!token || !token.includes(".")) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, hmac] = parts;
  const payloadParts = payload.split(":");
  if (payloadParts.length !== 2) return false;

  const [tokenSlug, timestampStr] = payloadParts;

  // Strict scope check: Token slug MUST match target experience slug exactly
  if (tokenSlug !== targetSlug) return false;

  const timestamp = parseInt(timestampStr, 10);
  const now = Date.now();
  const maxAgeMs = 1 * 60 * 60 * 1000; // 1 Hour max lifetime

  if (isNaN(timestamp) || now - timestamp > maxAgeMs) return false;

  const expectedHmac = crypto
    .createHmac("sha256", APP_AUTH_SECRET)
    .update(payload)
    .digest("hex");

  const hmacBuffer = Buffer.from(hmac, "hex");
  const expectedBuffer = Buffer.from(expectedHmac, "hex");

  if (hmacBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(hmacBuffer, expectedBuffer);
}

export function setRecipientAuthCookie(slug: string): void {
  const cookieName = getRecipientCookieName(slug);
  const token = createRecipientAuthToken(slug);

  try {
    cookies().set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour expiration
    });
  } catch {
    // Outside active request context or testing harness
  }
}

export function isRecipientAuthorized(slug: string): boolean {
  try {
    const cookieName = getRecipientCookieName(slug);
    const cookie = cookies().get(cookieName);
    if (!cookie || !cookie.value) return false;
    return verifyRecipientAuthToken(slug, cookie.value);
  } catch {
    return false;
  }
}

export function getOrCreateCreatorSessionToken(): string {
  try {
    const cookieStore = cookies();
    const existing = cookieStore.get(CREATOR_COOKIE_NAME);

    if (existing && existing.value && existing.value.startsWith("cr_sec_")) {
      return existing.value;
    }

    const newToken = `cr_sec_${crypto.randomBytes(24).toString("hex")}`;
    try {
      cookieStore.set(CREATOR_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 365 * 24 * 60 * 60, // 1 year
      });
    } catch {
      // Read-only render context fallback (e.g. Server Component render)
    }

    return newToken;
  } catch {
    // Outside active request context (e.g. unit testing)
    return `cr_sec_${crypto.randomBytes(24).toString("hex")}`;
  }
}
