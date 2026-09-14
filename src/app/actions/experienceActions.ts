"use client";

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

export async function publishExperience(draftOrId: BirthdayDraft | string): Promise<PublishResult> {
  const payload = typeof draftOrId === "string" ? { draftId: draftOrId } : { draftId: draftOrId.id, draft: draftOrId };
  const res = await fetch("/api/create/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
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
}
