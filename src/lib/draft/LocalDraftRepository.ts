import { BirthdayDraft, DraftRepository, CreatorStep } from "@/types/draft";
import { defaultThemeId } from "@/lib/themes/definitions";

import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";

const STORAGE_KEY_PREFIX = "wishlight_draft_";
const LATEST_DRAFT_KEY = "wishlight_latest_draft_id";

export const initialDraft: BirthdayDraft = {
  id: "draft_default",
  recipientName: "",
  birthdayDate: "",
  themeId: defaultThemeId,
  photos: [],
  personalMessage: "",
  musicTrackId: "track_none",
  musicTitle: "No Music",
  pin: "",
  isPinProtected: false,
  currentStep: "recipient",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export class LocalDraftRepository implements DraftRepository {
  async getDraft(id?: string): Promise<BirthdayDraft | null> {
    if (typeof window === "undefined") return initialDraft;

    try {
      const targetId = id || localStorage.getItem(LATEST_DRAFT_KEY) || initialDraft.id;
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${targetId}`);

      if (!raw) {
        return { ...initialDraft, id: targetId };
      }

      return JSON.parse(raw) as BirthdayDraft;
    } catch (error) {
      console.warn("Failed to read draft from localStorage:", error);
      return initialDraft;
    }
  }

  async saveDraft(draft: BirthdayDraft): Promise<BirthdayDraft> {
    const updated: BirthdayDraft = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${updated.id}`, JSON.stringify(updated));
        localStorage.setItem(LATEST_DRAFT_KEY, updated.id);
      } catch (error) {
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
