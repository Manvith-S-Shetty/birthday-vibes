"use client";
import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";
import { ExperienceData } from "@/types/experience";
import { BirthdayDraft } from "@/types/draft";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";
import { migrateBase64Photos, uploadVoiceBlob } from "@/lib/media/uploadHelper";

export type PublishStage =
  | "preparing"
  | "uploading_photos"
  | "uploading_voice"
  | "saving"
  | "generating_link"
  | "completed";

export interface PublishProgress {
  stage: PublishStage;
  message: string;
  current?: number;
  total?: number;
}

export type PublishProgressCallback = (progress: PublishProgress) => void;

export interface LockedCoverMetadata {
  isLocked: boolean;
  isExpired?: boolean;
  slug: string;
  recipientName: string;
  birthdayDate?: string;
  themeId: string;
  isPinProtected: boolean;
}

export interface VerifyPinResult {
  success: boolean;
  isExpired?: boolean;
  error?: string;
  retryAfterMs?: number;
}

export interface ProtectedPayloadResult {
  success: boolean;
  isExpired?: boolean;
  data?: ExperienceData;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  slug?: string;
  shareUrl?: string;
  experienceId?: string;
  error?: string;
}

// Client-side wrappers calling server endpoints / actions safely
export async function getLockedCoverMetadata(slug: string): Promise<LockedCoverMetadata> {
  const res = await fetch(`/api/g/${slug}/cover`, { cache: "no-store" });
  const data = await res.json().catch(() => null);

  if (res.status === 410 || data?.isExpired) {
    return {
      isLocked: true,
      isExpired: true,
      slug,
      recipientName: data?.recipientName || "Someone Special",
      themeId: data?.themeId || "midnight-cinema",
      isPinProtected: true,
    };
  }

  if (!res.ok || !data) {
    return {
      isLocked: true,
      isExpired: false,
      slug,
      recipientName: "Special Person",
      themeId: "midnight-cinema",
      isPinProtected: true,
    };
  }
  return data;
}

export async function verifyPinAndUnlock(slug: string, pin: string): Promise<VerifyPinResult> {
  const res = await fetch(`/api/g/${slug}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      isExpired: res.status === 410 || Boolean(data.isExpired),
      error: data.error || "Passcode incorrect. Please try again.",
      retryAfterMs: data.retryAfterMs,
    };
  }

  return { success: true };
}

export async function getProtectedExperiencePayload(slug: string): Promise<ProtectedPayloadResult> {
  const res = await fetch(`/api/g/${slug}/payload`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      success: false,
      isExpired: res.status === 410 || Boolean(data.isExpired),
      error: data.error || "Access denied. PIN verification required.",
    };
  }

  return {
    success: true,
    data: data.experience,
  };
}

export async function publishExperience(
  draftOrId: BirthdayDraft | string,
  voiceBlob?: Blob,
  onProgress?: PublishProgressCallback
): Promise<PublishResult> {
  console.log("[PUBLISH_CLIENT] start");
  try {
    onProgress?.({ stage: "preparing", message: "Preparing experience..." });

    const draftId =
      typeof draftOrId === "string"
        ? draftOrId
        : draftOrId?.id || "draft_default";

    let draft =
      typeof draftOrId === "string"
        ? await localDraftRepository.getDraft(draftId)
        : draftOrId;

    if (!draft || !draft.recipientName?.trim()) {
      return {
        success: false,
        error: "Recipient name is required before publishing.",
      };
    }

    console.log("[PUBLISH_CLIENT] draft loaded", draft.id);

    // Stage 1: Legacy Base64 Migration (if any Base64 photos exist in draft)
    const base64Photos = (draft.photos || []).filter((p) => p.url && p.url.startsWith("data:"));
    if (base64Photos.length > 0) {
      console.log(`[PUBLISH_CLIENT] Migrating ${base64Photos.length} Base64 photos to storage...`);
      onProgress?.({
        stage: "uploading_photos",
        message: `Uploading photos to private storage (0/${base64Photos.length})...`,
        current: 0,
        total: base64Photos.length,
      });

      draft = await migrateBase64Photos(draft, (curr, tot) => {
        onProgress?.({
          stage: "uploading_photos",
          message: `Uploading photo ${curr} of ${tot} to storage...`,
          current: curr,
          total: tot,
        });
      });
    }

    // Stage 2: Voice message upload
    let cachedRecording = VoiceRecordingCache.get(draft.id);
    if (!cachedRecording && typeof window !== "undefined") {
      cachedRecording = await VoiceRecordingCache.restore(draft.id);
    }
    const recording = voiceBlob || cachedRecording?.blob;
    const isVoiceRecorded = draft.voiceMessage && draft.voiceMessage.status === "recorded";

    let voiceStoragePath = draft.voiceMessage?.storagePath;

    if (isVoiceRecorded) {
      if (!recording && !voiceStoragePath) {
        console.warn("[PUBLISH_CLIENT] Recorded audio file missing from session cache");
        return {
          success: false,
          error: "Voice recording audio file is missing from session cache. Please re-record your voice note before publishing.",
        };
      }

      if (recording) {
        const mimeType = recording.type || draft.voiceMessage?.mimeType || "";
        const durationMs = draft.voiceMessage?.durationMs ?? 0;
        const fileSize = recording.size || 0;

        const isAudioMime =
          mimeType &&
          (mimeType.toLowerCase().startsWith("audio/") ||
            mimeType.toLowerCase().includes("webm") ||
            mimeType.toLowerCase().includes("ogg") ||
            mimeType.toLowerCase().includes("wav") ||
            mimeType.toLowerCase().includes("mp4") ||
            mimeType.toLowerCase().includes("aac") ||
            mimeType.toLowerCase().includes("mpeg") ||
            mimeType.toLowerCase().includes("m4a"));

        if (!isAudioMime) {
          return {
            success: false,
            error: "Invalid voice message MIME type.",
          };
        }

        if (fileSize <= 0 || fileSize > 10 * 1024 * 1024) {
          return {
            success: false,
            error: "Voice message file size must be between 1 byte and 10MB.",
          };
        }

        if (durationMs <= 0 || durationMs > 180000) {
          return {
            success: false,
            error: "Voice message duration must be between 1ms and 180000ms.",
          };
        }

        // Direct upload of voice blob to Supabase Storage
        onProgress?.({
          stage: "uploading_voice",
          message: "Uploading voice message to private storage...",
        });

        const uploadResult = await uploadVoiceBlob(draft.id, recording, mimeType);
        voiceStoragePath = uploadResult.path;
      }
    }

    // Stage 3: Construct lightweight JSON payload and save experience
    onProgress?.({ stage: "saving", message: "Saving experience details..." });

    const publishPayload = {
      draftId: draft.id,
      publishedExperienceId: draft.publishedExperienceId,
      publishedSlug: draft.publishedSlug,
      recipientName: draft.recipientName,
      birthdayDate: draft.birthdayDate,
      relationship: draft.relationship,
      openingStyle: draft.openingStyle,
      memoryDisplayMode: draft.memoryDisplayMode,
      themeId: draft.themeId,
      personalMessage: draft.personalMessage,
      musicTrackId: draft.musicTrackId,
      musicTitle: draft.musicTitle,
      musicUrl: draft.musicUrl,
      photos: (draft.photos || []).map((p, idx) => ({
        id: p.id,
        storagePath: p.storagePath || p.url,
        caption: p.caption,
        altText: p.altText,
        sortOrder: idx + 1,
        date: p.date,
        location: p.location,
        chapter: p.chapter,
      })),
      voiceMessage: isVoiceRecorded && voiceStoragePath ? {
        storagePath: voiceStoragePath,
        mimeType: recording?.type || draft.voiceMessage?.mimeType || "audio/webm",
        durationMs: draft.voiceMessage?.durationMs ?? 0,
        fileSize: recording?.size ?? 0,
        transcript: draft.voiceMessage?.transcript,
      } : undefined,
      moments: draft.moments,
      isPinProtected: draft.isPinProtected,
      pin: draft.pin,
      expirationOption: draft.expirationOption,
    };

    console.log("[PUBLISH_CLIENT] Sending lightweight JSON publish payload");

    const res = await fetch("/api/create/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(publishPayload),
    });

    console.log("[PUBLISH_CLIENT] response received", res.status);

    if (res.status === 413) {
      return {
        success: false,
        error: "Publish request payload too large (HTTP 413). Media must be uploaded directly to storage.",
      };
    }

    // Parse JSON safely (protect against HTML error pages)
    const rawText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        error: `Server returned non-JSON response (${res.status}): ${rawText.slice(0, 100)}`,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to publish experience.",
      };
    }

    onProgress?.({ stage: "generating_link", message: "Generating share link..." });

    if (typeof window !== "undefined") {
      try {
        const current = await localDraftRepository.getDraft(draft.id);
        if (current) {
          await localDraftRepository.saveDraft({
            ...current,
            publishedExperienceId: data.experienceId || current.publishedExperienceId,
            publishedSlug: data.slug || current.publishedSlug,
            currentStep: "publish",
          });
        }
      } catch (e) {
        console.warn("[PUBLISH_CLIENT] Failed to update local draft cache after publish:", e);
      }
    }

    onProgress?.({ stage: "completed", message: "Published successfully!" });

    return {
      success: true,
      slug: data.slug,
      shareUrl: data.shareUrl,
      experienceId: data.experienceId,
    };
  } catch (err: any) {
    console.error("[PUBLISH_CLIENT] Exception during publishExperience:", err);
    return {
      success: false,
      error: err?.message || "Failed to publish experience due to a client-side error.",
    };
  }
}