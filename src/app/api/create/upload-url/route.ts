import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getOrCreateCreatorSessionToken } from "@/lib/security/session";
import { hashCreatorSecret } from "@/lib/security/hash";
import { consumeRateLimit } from "@/lib/security/rateLimit";
import { assertDraftOwnership, recordAndCheckUploadQuota } from "@/lib/security/draftOwnership";

export const dynamic = "force-dynamic";

const ALLOWED_PHOTO_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_VOICE_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
]);

const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const VOICE_EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VOICE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Rate limiting constants per IP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 100;

export async function POST(request: Request) {
  try {
    // 1. IP rate limiting (fail closed early before session processing)
    const rawIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const ip = rawIp.split(",")[0].trim();

    const rateLimitKey = `upload_ip_${ip}`;
    const rateCheck = await consumeRateLimit(rateLimitKey, RATE_LIMIT_WINDOW_MS, MAX_REQUESTS_PER_WINDOW);

    if (rateCheck.unavailable) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload service is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many upload requests. Please slow down and try again later.",
          retryAfterMs: rateCheck.retryAfterMs,
        },
        { status: 429 }
      );
    }

    // 2. Session verification
    const creatorSecret = getOrCreateCreatorSessionToken();
    const creatorTokenHash = hashCreatorSecret(creatorSecret);

    // 3. Body parsing
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { draftId, mediaType, mimeType, fileSize } = body;

    // 3. Draft ID validation (prevent path traversal & ensure valid identifier)
    if (
      !draftId ||
      typeof draftId !== "string" ||
      draftId.length < 3 ||
      draftId.length > 64 ||
      draftId.includes("..") ||
      draftId.includes("/") ||
      draftId.includes("\\") ||
      !/^[a-zA-Z0-9_-]+$/.test(draftId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or malformed draft ID." },
        { status: 400 }
      );
    }

    // 4. Media type & MIME validation (stripping codec parameters, e.g. audio/webm;codecs=opus)
    if (mediaType !== "photo" && mediaType !== "voice") {
      return NextResponse.json(
        { success: false, error: "Invalid mediaType. Must be 'photo' or 'voice'." },
        { status: 400 }
      );
    }

    const rawMime = (typeof mimeType === "string" ? mimeType : "").toLowerCase().trim();
    const baseMime = rawMime.split(";")[0].trim();
    const size = typeof fileSize === "number" ? fileSize : 0;

    if (size <= 0) {
      return NextResponse.json(
        { success: false, error: "File size must be greater than 0 bytes." },
        { status: 400 }
      );
    }

    let bucket = "";
    let safeExt = "";

    if (mediaType === "photo") {
      if (!ALLOWED_PHOTO_MIMES.has(baseMime)) {
        return NextResponse.json(
          { success: false, error: `Unsupported image type '${mimeType}'. Allowed: JPG, PNG, WebP.` },
          { status: 400 }
        );
      }
      if (size > MAX_PHOTO_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: "Photo file size exceeds maximum limit of 10MB." },
          { status: 400 }
        );
      }

      bucket = "experience-media";
      safeExt = PHOTO_EXTENSIONS[baseMime] || "jpg";
    } else {
      // voice
      if (!ALLOWED_VOICE_MIMES.has(baseMime)) {
        return NextResponse.json(
          { success: false, error: `Unsupported audio type '${mimeType}'.` },
          { status: 400 }
        );
      }
      if (size > MAX_VOICE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: "Voice message file size exceeds maximum limit of 10MB." },
          { status: 400 }
        );
      }

      bucket = "voice-messages";
      safeExt = VOICE_EXTENSIONS[baseMime] || "webm";
    }

    // 5. Draft Ownership verification (prevent uploading into another user's draft namespace)
    const ownership = await assertDraftOwnership(draftId, creatorTokenHash);
    if (!ownership.authorized) {
      return NextResponse.json(
        { success: false, error: ownership.error || "Forbidden: Unauthorized draft access." },
        { status: 403 }
      );
    }

    // 6. Quota check (prevent unlimited upload tokens by changing draftId or repeated calls)
    const quota = recordAndCheckUploadQuota(draftId, creatorTokenHash, mediaType);
    if (!quota.allowed) {
      return NextResponse.json(
        { success: false, error: quota.error || "Upload quota exceeded." },
        { status: 429 }
      );
    }

    // 7. Generate secure server-controlled storage path
    let storagePath: string;
    if (mediaType === "photo") {
      const fileId = crypto.randomUUID();
      storagePath = `drafts/${draftId}/${fileId}.${safeExt}`;
    } else {
      storagePath = `drafts/${draftId}/voice-message.${safeExt}`;
    }

    // 8. Supabase configuration check
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase storage is not configured." },
        { status: 503 }
      );
    }

    // 9. Generate signed upload URL using privileged admin client (scoped to bucket and exact path)
    let { data, error } = await supabaseAdminClient.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath, { upsert: true });

    // Self-healing: if bucket does not exist, create it as strictly private and retry
    if (
      error &&
      (error.message?.includes("Bucket not found") ||
        (error as any).statusCode === 404 ||
        (error as any).error === "Bucket not found")
    ) {
      try {
        await supabaseAdminClient.storage.createBucket(bucket, { public: false });
        const retry = await supabaseAdminClient.storage
          .from(bucket)
          .createSignedUploadUrl(storagePath, { upsert: true });
        data = retry.data;
        error = retry.error;
      } catch {
        // Fallback
      }
    }

    if (error || !data || !data.token) {
      console.error("[UPLOAD_URL_ERROR] Failed to generate signed upload URL:", error);
      return NextResponse.json(
        { success: false, error: "Failed to generate signed upload URL from storage service." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bucket,
      path: storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (err: any) {
    console.error("[UPLOAD_URL_EXCEPTION]", err);
    return NextResponse.json(
      { success: false, error: "Internal server error generating upload URL." },
      { status: 500 }
    );
  }
}
