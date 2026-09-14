import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha256";
const APP_AUTH_SECRET = process.env.APP_AUTH_SECRET || process.env.PIN_HASH_SECRET_SALT || "wishlight_creator_app_secret_2026";

/**
 * PBKDF2 with SHA-256 PIN Hashing.
 * Plaintext PINs are NEVER stored or returned.
 */
export function hashPin(pin: string, saltInput?: string): { hash: string; salt: string } {
  const salt = saltInput || crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(pin, salt, ITERATIONS, KEY_LEN, DIGEST);
  const hash = derivedKey.toString("hex");

  return { hash, salt };
}

export function verifyPin(pin: string, storedHash: string, salt: string): boolean {
  if (!pin || !storedHash || !salt) return false;
  const { hash } = hashPin(pin, salt);

  const hashBuffer = Buffer.from(hash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (hashBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, storedBuffer);
}

/**
 * Creator Secret Hashing.
 * Raw creator secrets are NEVER stored in the database.
 * Only SHA-256 creator_token_hash is stored.
 */
export function hashCreatorSecret(secret: string): string {
  if (!secret) return "";
  return crypto
    .createHash("sha256")
    .update(`${secret}:${APP_AUTH_SECRET}`)
    .digest("hex");
}

export function verifyCreatorSecret(secret: string, storedHash: string): boolean {
  if (!secret || !storedHash) return false;
  const computedHash = hashCreatorSecret(secret);

  const computedBuffer = Buffer.from(computedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (computedBuffer.length !== storedBuffer.length) return false;
  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

export function generateHighEntropySlug(recipientName: string): string {
  const cleanName = recipientName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // 16 random hex characters (64 bits of entropy)
  const randomBytes = crypto.randomBytes(8).toString("hex");
  return `${cleanName || "gift"}-${randomBytes}`;
}
