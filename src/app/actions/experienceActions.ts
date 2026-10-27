"use client";
import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";
import { ExperienceData } from "@/types/experience";
import { BirthdayDraft } from "@/types/draft";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";

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
  voiceBlob?: Blob
): Promise<PublishResult> {
  console.log("[PUBLISH_CLIENT] start");
  try {
    const draft =
      typeof draftOrId === "string"
        ? undefined
        : draftOrId;

    const draftId =
      typeof draftOrId === "string"
        ? draftOrId
        : draftOrId?.id || "draft_default";

    console.log("[PUBLISH_CLIENT] draft loaded", draftId);

    const formData = new FormData();

    if (draft) {
      formData.append("draft", JSON.stringify(draft));
    } else {
      formData.append("draftId", draftId);
    }

    console.log("[PUBLISH_CLIENT] voice cache lookup");
    let cachedRecording = VoiceRecordingCache.get(draftId) || (draft?.id ? VoiceRecordingCache.get(draft.id) : null);
    if (!cachedRecording && typeof window !== "undefined") {
      cachedRecording = (await VoiceRecordingCache.restore(draftId)) || (draft?.id ? await VoiceRecordingCache.restore(draft.id) : null);
    }
    const recording = voiceBlob || cachedRecording?.blob;
    const isVoiceRecorded = draft?.voiceMessage && draft.voiceMessage.status === "recorded";

    console.log(
      "[PUBLISH_CLIENT] voice recording found/missing",
      recording ? "found" : "missing",
      "status:",
      draft?.voiceMessage?.status
    );

    if (isVoiceRecorded && !recording) {
      console.warn("[PUBLISH_CLIENT] Recorded audio file missing from session cache");
      return {
        success: false,
        error: "Voice recording audio file is missing from session cache. Please re-record your voice note before publishing.",
      };
    }

    if (recording) {
      const mimeType = recording?.type || draft?.voiceMessage?.mimeType || "";
      const durationMs = draft?.voiceMessage?.durationMs ?? 0;
      const fileSize = recording?.size || 0;

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

      if (recording && (fileSize <= 0 || fileSize > 10485760)) {
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
    }

    if (recording) {
      const effectiveMimeType = recording.type || draft?.voiceMessage?.mimeType || "audio/webm";
      const extension = getAudioExtension(effectiveMimeType);
      const voiceFile =
        typeof File !== "undefined" && recording instanceof File
          ? recording
          : new File([recording], `voice-message.${extension}`, { type: effectiveMimeType });

      formData.append("voiceAudio", voiceFile);

      formData.append(
        "voiceMetadata",
        JSON.stringify({
          mimeType: effectiveMimeType,
          durationMs: draft?.voiceMessage?.durationMs ?? 0,
          transcript: draft?.voiceMessage?.transcript || undefined,
        })
      );
    }

    console.log("[PUBLISH_CLIENT] FormData constructed");
    console.log("[PUBLISH_CLIENT] sending POST");

    const res = await fetch("/api/create/publish", {
      method: "POST",
      body: formData,
    });

    console.log("[PUBLISH_CLIENT] response received", res.status);
    const data = await res.json();
    console.log("[PUBLISH_CLIENT] response parsed", data);

    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to publish experience.",
      };
    }

    if (typeof window !== "undefined") {
      try {
        const current = await localDraftRepository.getDraft(draftId);
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

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";

  return "audio";
}