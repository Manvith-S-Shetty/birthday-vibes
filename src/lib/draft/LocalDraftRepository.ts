import { BirthdayDraft, DraftRepository, CreatorStep } from "@/types/draft";
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

export class LocalDraftRepository implements DraftRepository {
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
              }))
            : [],
        };
      }
      return { ...initialDraft, id: targetId };
    }

    try {
      const targetId = id || localStorage.getItem(LATEST_DRAFT_KEY) || initialDraft.id;
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${targetId}`);

      if (!raw) {
        return { ...initialDraft, id: targetId };
      }

      const parsed = JSON.parse(raw) as BirthdayDraft;
      return {
        ...parsed,
        relationship: parsed.relationship || undefined,
        openingStyle: parsed.openingStyle || "cinematic-premiere",
        memoryDisplayMode: parsed.memoryDisplayMode || "grid",
        expirationOption: parsed.expirationOption || "never",
        expiresAt: parsed.expiresAt ?? null,
        publishedExperienceId: parsed.publishedExperienceId || undefined,
        publishedSlug: parsed.publishedSlug || undefined,
        moments: Array.isArray(parsed.moments) ? parsed.moments : [],
        photos: Array.isArray(parsed.photos)
          ? parsed.photos.map((p) => ({
              ...p,
              date: p.date || undefined,
              location: p.location || undefined,
              chapter: p.chapter || undefined,
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

    if (typeof window === "undefined") {
      inMemoryDrafts.set(updated.id, updated);
      return updated;
    }

    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${updated.id}`, JSON.stringify(updated));
      localStorage.setItem(LATEST_DRAFT_KEY, updated.id);
    } catch (error) {
      console.warn("Failed to save draft to localStorage:", error);
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
