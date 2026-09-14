import { cookies } from "next/headers";
import crypto from "crypto";

const APP_AUTH_SECRET =
  process.env.APP_AUTH_SECRET ||
  process.env.PIN_HASH_SECRET_SALT ||
  "wishlight_dedicated_app_auth_secret_2026_x89f";

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

  cookies().set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600, // 1 hour expiration
  });
}

export function isRecipientAuthorized(slug: string): boolean {
  const cookieName = getRecipientCookieName(slug);
  const cookie = cookies().get(cookieName);
  if (!cookie || !cookie.value) return false;
  return verifyRecipientAuthToken(slug, cookie.value);
}

export function getOrCreateCreatorSessionToken(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get(CREATOR_COOKIE_NAME);

  if (existing && existing.value && existing.value.startsWith("cr_sec_")) {
    return existing.value;
  }

  const newToken = `cr_sec_${crypto.randomBytes(24).toString("hex")}`;
  cookieStore.set(CREATOR_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 year
  });

  return newToken;
}
