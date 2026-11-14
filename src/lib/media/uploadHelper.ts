import { supabaseClient } from "@/lib/supabase/client";
import { MediaPreviewCache } from "./previewCache";
import { BirthdayDraft } from "@/types/draft";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";

export interface SignedUploadInfo {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
}

export interface UploadPhotoResult {
  path: string;
  previewUrl: string;
}

export interface UploadVoiceResult {
  path: string;
}

/**
 * Converts a base64 data: URL to a standard browser Blob.
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
  const parts = dataUrl.split(";base64,");
  const mimeType = parts[0]?.replace(/^data:/, "") || "image/jpeg";
  const base64Data = parts[1] || "";
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return {
    blob: new Blob([bytes], { type: mimeType }),
    mimeType,
  };
}

/**
 * Requests a short-lived signed upload token and path from the server.
 */
export async function requestSignedUploadUrl(
  draftId: string,
  mediaType: "photo" | "voice",
  mimeType: string,
  fileSize: number,
  fileName?: string
): Promise<SignedUploadInfo> {
  const res = await fetch("/api/create/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      draftId,
      mediaType,
      mimeType,
      fileSize,
      fileName,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success || !data.token || !data.path) {
    throw new Error(data.error || `Failed to obtain signed upload URL for ${mediaType}.`);
  }

  return {
    bucket: data.bucket,
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

/**
 * Direct browser-to-Supabase Storage upload using Supabase client's uploadToSignedUrl().
 */
export async function uploadToSignedStorage(
  bucket: string,
  path: string,
  token: string,
  fileBody: Blob | File,
  contentType: string
): Promise<{ path: string }> {
  const { data, error } = await supabaseClient.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, fileBody, {
      contentType,
      upsert: true,
    });

  if (error || !data) {
    console.error("[STORAGE_UPLOAD_ERROR]", error);
    throw new Error(error?.message || "Supabase storage upload failed.");
  }

  return { path: data.path || path };
}

/**
 * Uploads a photo File directly to Supabase Storage via signed upload URL.
 * Automatically caches a local Object URL for instant previewing in the creator UI.
 */
export async function uploadPhotoFile(
  draftId: string,
  file: File
): Promise<UploadPhotoResult> {
  // Generate instant local blob URL for preview
  let localPreviewUrl = "";
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    try {
      localPreviewUrl = URL.createObjectURL(file);
    } catch {
      // Ignore
    }
  }

  // 1. Request signed upload URL from server
  const signedInfo = await requestSignedUploadUrl(
    draftId,
    "photo",
    file.type || "image/jpeg",
    file.size,
    file.name
  );

  // 2. Upload file directly to Supabase Storage
  await uploadToSignedStorage(
    signedInfo.bucket,
    signedInfo.path,
    signedInfo.token,
    file,
    file.type || "image/jpeg"
  );

  // 3. Cache local preview URL for real-time display
  if (localPreviewUrl) {
    MediaPreviewCache.set(signedInfo.path, localPreviewUrl);
  }

  return {
    path: signedInfo.path,
    previewUrl: localPreviewUrl,
  };
}

/**
 * Uploads a voice recording Blob directly to Supabase Storage via signed upload URL.
 */
export async function uploadVoiceBlob(
  draftId: string,
  blob: Blob,
  mimeTypeOverride?: string
): Promise<UploadVoiceResult> {
  const effectiveMime = mimeTypeOverride || blob.type || "audio/webm";

  // 1. Request signed upload URL from server
  const signedInfo = await requestSignedUploadUrl(
    draftId,
    "voice",
    effectiveMime,
    blob.size,
    "voice-message"
  );

  // 2. Upload blob directly to Supabase Storage
  await uploadToSignedStorage(
    signedInfo.bucket,
    signedInfo.path,
    signedInfo.token,
    blob,
    effectiveMime
  );

  return {
    path: signedInfo.path,
  };
}

/**
 * Batch-fetches signed read URLs for an array of internal storage paths.
 * Checks MediaPreviewCache first to avoid redundant API calls.
 */
export async function fetchPreviewUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (!paths || paths.length === 0) return {};

  const result: Record<string, string> = {};
  const pathsToFetch: string[] = [];

  for (const path of paths) {
    const cached = MediaPreviewCache.get(path);
    if (cached) {
      result[path] = cached;
    } else if (
      !path.startsWith("data:") &&
      !path.startsWith("http://") &&
      !path.startsWith("https://") &&
      !path.startsWith("blob:")
    ) {
      pathsToFetch.push(path);
    } else {
      result[path] = path;
    }
  }

  if (pathsToFetch.length === 0) {
    return result;
  }

  try {
    const res = await fetch("/api/create/preview-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: pathsToFetch }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.urls) {
        for (const [path, signedUrl] of Object.entries(data.urls)) {
          if (typeof signedUrl === "string") {
            result[path] = signedUrl;
            MediaPreviewCache.set(path, signedUrl);
          }
        }
      }
    }
  } catch (e) {
    console.warn("[FETCH_PREVIEWS_ERROR] Failed to fetch signed preview URLs:", e);
  }

  return result;
}

/**
 * Migrates any legacy Base64 photos stored inside draft.photos to direct Supabase Storage paths.
 * Retains existing photos and safely commits to localDraftRepository upon completion.
 */
export async function migrateBase64Photos(
  draft: BirthdayDraft,
  onProgress?: (current: number, total: number) => void
): Promise<BirthdayDraft> {
  if (!draft.photos || draft.photos.length === 0) {
    return draft;
  }

  const base64Photos = draft.photos.filter((p) => p.url && p.url.startsWith("data:"));
  if (base64Photos.length === 0) {
    return draft;
  }

  console.log(`[LEGACY_MIGRATION] Migrating ${base64Photos.length} Base64 photos to Supabase Storage...`);

  let updatedPhotos = [...draft.photos];
  let processed = 0;

  for (let i = 0; i < updatedPhotos.length; i++) {
    const photo = updatedPhotos[i];
    if (photo.url && photo.url.startsWith("data:")) {
      processed++;
      onProgress?.(processed, base64Photos.length);

      try {
        const { blob, mimeType } = dataUrlToBlob(photo.url);
        const signedInfo = await requestSignedUploadUrl(
          draft.id,
          "photo",
          mimeType,
          blob.size,
          photo.caption || `migrated-photo-${i + 1}`
        );

        await uploadToSignedStorage(
          signedInfo.bucket,
          signedInfo.path,
          signedInfo.token,
          blob,
          mimeType
        );

        // Store the original data URL in preview cache so the UI still displays it
        MediaPreviewCache.set(signedInfo.path, photo.url);

        // Replace Base64 URL with permanent storage path
        updatedPhotos[i] = {
          ...photo,
          url: signedInfo.path,
          storagePath: signedInfo.path,
        };
      } catch (err: any) {
        console.error(`[LEGACY_MIGRATION_ERROR] Failed to migrate photo index ${i}:`, err);
        throw new Error(
          `Failed to upload photo '${photo.caption || i + 1}': ${err?.message || "Storage error"}. Please check your connection and retry.`
        );
      }
    }
  }

  const migratedDraft: BirthdayDraft = {
    ...draft,
    photos: updatedPhotos,
    updatedAt: new Date().toISOString(),
  };

  // Persist migrated draft to LocalDraftRepository
  await localDraftRepository.saveDraft(migratedDraft);
  console.log("[LEGACY_MIGRATION] Migration complete and draft persisted.");
  return migratedDraft;
}
