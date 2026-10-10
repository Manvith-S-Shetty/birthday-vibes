"use client";
import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";
import { ExperienceData } from "@/types/experience";
import { BirthdayDraft } from "@/types/draft";

export interface LockedCoverMetadata {
  isLocked: boolean;
  slug: string;
  recipientName: string;
  birthdayDate?: string;
  themeId: string;
  isPinProtected: boolean;
}

export interface VerifyPinResult {
  success: boolean;
  error?: string;
  retryAfterMs?: number;
}

export interface ProtectedPayloadResult {
  success: boolean;
  data?: ExperienceData;
  error?: string;
}

export interface PublishResult {
  success: boolean;
  slug?: string;
  shareUrl?: string;
  error?: string;
}

// Client-side wrappers calling server endpoints / actions safely
export async function getLockedCoverMetadata(slug: string): Promise<LockedCoverMetadata> {
  const res = await fetch(`/api/g/${slug}/cover`, { cache: "no-store" });
  if (!res.ok) {
    return {
      isLocked: true,
      slug,
      recipientName: "Special Person",
      themeId: "midnight-cinema",
      isPinProtected: true,
    };
  }
  return res.json();
}

export async function verifyPinAndUnlock(slug: string, pin: string): Promise<VerifyPinResult> {
  const res = await fetch(`/api/g/${slug}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || "Passcode incorrect. Please try again.",
      retryAfterMs: data.retryAfterMs,
    };
  }

  return { success: true };
}

export async function getProtectedExperiencePayload(slug: string): Promise<ProtectedPayloadResult> {
  const res = await fetch(`/api/g/${slug}/payload`, { cache: "no-store" });
  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
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
    const cachedRecording = VoiceRecordingCache.get(draftId) || (draft?.id ? VoiceRecordingCache.get(draft.id) : null);
    const recording = voiceBlob || cachedRecording?.blob;
    const isVoiceRecorded = draft?.voiceMessage && draft.voiceMessage.status === "recorded";
    const hasVoiceRecording = !!recording || isVoiceRecorded;

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

    if (hasVoiceRecording || recording) {
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

    return {
      success: true,
      slug: data.slug,
      shareUrl: data.shareUrl,
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