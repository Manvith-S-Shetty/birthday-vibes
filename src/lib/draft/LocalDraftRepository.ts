import { BirthdayDraft, DraftRepository } from "@/types/draft";
import { defaultThemeId } from "@/lib/themes/definitions";

import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";

const STORAGE_KEY_PREFIX = "wishlight_draft_";
const LATEST_DRAFT_KEY = "wishlight_latest_draft_id";

export const initialDraft: BirthdayDraft = {
  id: "draft_default",
  recipientName: "",
  birthdayDate: "",
  relationship: undefined,
  openingStyle: "cinematic-premiere",
  themeId: defaultThemeId,
  photos: [],
  personalMessage: "",
  musicTrackId: "track_none",
  musicTitle: "No Music",
  voiceMessage: {
    status: "none",
    durationMs: 0,
    mimeType: "",
  },
  moments: [],
  memoryDisplayMode: "grid",
  expirationOption: "never",
  expiresAt: null,
  pin: "",
  isPinProtected: false,
  currentStep: "recipient",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const inMemoryDrafts = new Map<string, BirthdayDraft>();

/**
 * Strips heavy binary/Base64 data URLs from draft photos when a storagePath exists,
 * preventing localStorage bloat and quota exhaustion while retaining storage keys.
 */
function sanitizeDraftForStorage(draft: BirthdayDraft): BirthdayDraft {
  const sanitizedPhotos = (draft.photos || []).map((p) => {
    // If the photo already has a storagePath, never store the raw data: URL in localStorage
    if (p.storagePath && p.url && p.url.startsWith("data:")) {
      return {
        ...p,
        url: p.storagePath,
      };
    }
    return p;
  });

  return {
    ...draft,
    photos: sanitizedPhotos,
  };
}

export class LocalDraftRepository implements DraftRepository {
  public lastQuotaError: string | null = null;

  async getDraft(id?: string): Promise<BirthdayDraft | null> {
    if (typeof window === "undefined") {
      const targetId = id || initialDraft.id;
      const mem = inMemoryDrafts.get(targetId);
      if (mem) {
        return {
          ...mem,
          relationship: mem.relationship || undefined,
          openingStyle: mem.openingStyle || "cinematic-premiere",
          memoryDisplayMode: mem.memoryDisplayMode || "grid",
          expirationOption: mem.expirationOption || "never",
          expiresAt: mem.expiresAt ?? null,
          moments: Array.isArray(mem.moments) ? mem.moments : [],
          photos: Array.isArray(mem.photos)
            ? mem.photos.map((p) => ({
                ...p,
                date: p.date || undefined,
                location: p.location || undefined,
                chapter: p.chapter || undefined,
                storagePath: p.storagePath || undefined,
                previewUrl: p.previewUrl || undefined,
              }))
            : [],
        };
      }
      return { ...initialDraft, id: targetId };
    }

    try {
      const targetId = id || localStorage.getItem(LATEST_DRAFT_KEY) || initialDraft.id;

      // Check in-memory cache first for latest unsaved changes (e.g. during quota limit)
      const memDraft = inMemoryDrafts.get(targetId);

      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${targetId}`);

      if (!raw) {
        return memDraft || { ...initialDraft, id: targetId };
      }

      const parsed = JSON.parse(raw) as BirthdayDraft;
      const base = memDraft && new Date(memDraft.updatedAt) > new Date(parsed.updatedAt || 0)
        ? memDraft
        : parsed;

      return {
        ...base,
        relationship: base.relationship || undefined,
        openingStyle: base.openingStyle || "cinematic-premiere",
        memoryDisplayMode: base.memoryDisplayMode || "grid",
        expirationOption: base.expirationOption || "never",
        expiresAt: base.expiresAt ?? null,
        publishedExperienceId: base.publishedExperienceId || undefined,
        publishedSlug: base.publishedSlug || undefined,
        moments: Array.isArray(base.moments) ? base.moments : [],
        photos: Array.isArray(base.photos)
          ? base.photos.map((p) => ({
              ...p,
              date: p.date || undefined,
              location: p.location || undefined,
              chapter: p.chapter || undefined,
              storagePath: p.storagePath || undefined,
              previewUrl: p.previewUrl || undefined,
            }))
          : [],
      };
    } catch (error) {
      console.warn("Failed to read draft from localStorage:", error);
      return initialDraft;
    }
  }

  async saveDraft(draft: BirthdayDraft): Promise<BirthdayDraft> {
    const updated: BirthdayDraft = {
      ...draft,
      memoryDisplayMode: draft.memoryDisplayMode || "grid",
      expirationOption: draft.expirationOption || "never",
      expiresAt: draft.expiresAt ?? null,
      publishedExperienceId: draft.publishedExperienceId || undefined,
      publishedSlug: draft.publishedSlug || undefined,
      updatedAt: new Date().toISOString(),
    };

    // Always keep in-memory cache synchronized as a reliable fallback
    inMemoryDrafts.set(updated.id, updated);

    if (typeof window === "undefined") {
      return updated;
    }

    // Sanitize draft: Never write large Base64 media back to localStorage when storage paths exist
    const storageReady = sanitizeDraftForStorage(updated);

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${updated.id}`, JSON.stringify(storageReady));
      localStorage.setItem(LATEST_DRAFT_KEY, updated.id);
      this.lastQuotaError = null;
    } catch (error: any) {
      const isQuotaError =
        error?.name === "QuotaExceededError" ||
        error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error?.code === 22 ||
        error?.code === 1014;

      if (isQuotaError) {
        // Safe preservation: DO NOT delete older user drafts!
        // Retain successful storage paths in memory and report actionable recovery guidance.
        const recoveryMsg =
          "Browser storage quota exceeded. Existing drafts have been preserved and your current draft remains safely loaded in session memory. Please publish your draft or free browser storage space.";
        this.lastQuotaError = recoveryMsg;
        console.warn(`[DRAFT_STORAGE_QUOTA] ${recoveryMsg}`);

        // Try writing a minimal draft without any Base64 strings to save whatever metadata fits
        try {
          const minimalDraft = {
            ...storageReady,
            photos: storageReady.photos.map((p) => ({
              id: p.id,
              storagePath: p.storagePath,
              url: p.storagePath || "", // Strip data URL completely
              caption: p.caption,
              altText: p.altText,
              sortOrder: p.sortOrder,
              date: p.date,
              location: p.location,
              chapter: p.chapter,
            })),
          };
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${updated.id}`, JSON.stringify(minimalDraft));
          localStorage.setItem(LATEST_DRAFT_KEY, updated.id);
          console.log("[DRAFT_STORAGE] Successfully saved minimal draft metadata.");
        } catch {
          // If even minimal metadata exceeds quota, in-memory cache preserves full draft
          console.warn("[DRAFT_STORAGE] Draft preserved in-memory for active creator session.");
        }
      } else {
        console.warn("Failed to save draft to localStorage:", error);
      }
    }

    return updated;
  }

  async createDraft(initial?: Partial<BirthdayDraft>): Promise<BirthdayDraft> {
    const newId = `draft_${Date.now()}`;
    const newDraft: BirthdayDraft = {
      ...initialDraft,
      ...initial,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.saveDraft(newDraft);
  }

  async deleteDraft(id: string): Promise<void> {
    inMemoryDrafts.delete(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
        if (localStorage.getItem(LATEST_DRAFT_KEY) === id) {
          localStorage.removeItem(LATEST_DRAFT_KEY);
        }
        VoiceRecordingCache.clear(id);
      } catch (error) {
        console.warn("Failed to delete draft from localStorage:", error);
      }
    }
  }
}

export const localDraftRepository = new LocalDraftRepository();
