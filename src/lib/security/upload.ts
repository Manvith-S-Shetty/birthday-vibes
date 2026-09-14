import crypto from "crypto";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  mimeType?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
]);

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "mp3", "wav"]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validates file buffer magic bytes against declared MIME type.
 * Rejects disguised or malicious file contents.
 */
export function validateMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (declaredMime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (declaredMime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WEBP: RIFF .... WEBP
  if (declaredMime === "image/webp") {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  // MP3: ID3 header (49 44 33) or Frame Sync (FF FB / FF F3 / FF F2)
  if (declaredMime === "audio/mpeg" || declaredMime === "audio/mp3") {
    const isId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
    const isSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
    return isId3 || isSync;
  }

  // WAV: RIFF .... WAVE
  if (declaredMime === "audio/wav" || declaredMime === "audio/x-wav") {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWave =
      buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45;
    return isRiff && isWave;
  }

  return false;
}

/**
 * Validates file upload metadata, sizes, extensions, and magic byte signatures.
 */
export function validateUploadFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  buffer?: Buffer
): FileValidationResult {
  // 1. Path Traversal & Sanity Check
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return { valid: false, error: "Invalid filename or path traversal detected." };
  }

  // 2. MIME Type Whitelist
  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return { valid: false, error: `File type '${mimeType}' is not supported.` };
  }

  // 3. Extension Whitelist
  const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "";
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension '.${ext}' is not permitted.` };
  }

  // 4. File Size Caps
  const isAudio = normalizedMime.startsWith("audio/");
  const maxSize = isAudio ? MAX_AUDIO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;

  if (sizeBytes > maxSize) {
    const maxMb = isAudio ? "20MB" : "10MB";
    return { valid: false, error: `File size exceeds maximum allowed limit of ${maxMb}.` };
  }

  // 5. Magic Byte Inspection (if buffer available)
  if (buffer && !validateMagicBytes(buffer, normalizedMime)) {
    return { valid: false, error: "File content signature (magic bytes) does not match declared MIME type." };
  }

  // 6. Generate safe randomized filename (UUID + sanitized extension)
  const safeFilename = `${crypto.randomUUID()}.${ext}`;

  return {
    valid: true,
    sanitizedFilename: safeFilename,
    mimeType: normalizedMime,
  };
}
