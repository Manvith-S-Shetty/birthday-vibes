import { ThemeId } from "./theme";
import { MediaItem, InteractiveMomentData } from "./experience";

export type CreatorStep =
  | "recipient"
  | "mood"
  | "memories"
  | "message"
  | "music"
  | "voice"
  | "moments"
  | "security"
  | "preview"
  | "publish";

export type RecipientRelationship =
  | "partner"
  | "best_friend"
  | "parent"
  | "sibling"
  | "colleague"
  | "other";

export type OpeningStyleId =
  | "cinematic-premiere"
  | "warm-letter"
  | "celebration-spark";

export type MemoryDisplayMode = "grid" | "polaroid" | "timeline";

export const MEMORY_CHAPTER_PRESETS = [
  "Beginning",
  "Favorite Memories",
  "Today",
] as const;

export type MemoryChapterPreset = (typeof MEMORY_CHAPTER_PRESETS)[number];

export interface VoiceMessageDraftState {
  status: "none" | "recorded";
  durationMs: number;
  mimeType: string;
  transcript?: string;
  updatedAt?: string;
}

export type ExpirationOption = "7d" | "30d" | "1y" | "never";

export interface BirthdayDraft {
  id: string;
  recipientName: string;
  birthdayDate?: string;
  relationship?: RecipientRelationship;
  openingStyle?: OpeningStyleId;
  memoryDisplayMode?: MemoryDisplayMode;
  themeId: ThemeId;
  photos: MediaItem[];
  personalMessage: string;
  musicTrackId?: string;
  musicTitle?: string;
  musicUrl?: string;
  voiceMessage?: VoiceMessageDraftState;
  moments?: InteractiveMomentData[];
  expirationOption?: ExpirationOption;
  expiresAt?: string | null;
  publishedExperienceId?: string;
  publishedSlug?: string;
  pin?: string;
  isPinProtected: boolean;
  currentStep: CreatorStep;
  createdAt: string;
  updatedAt: string;
}

export interface DraftRepository {
  getDraft(id?: string): Promise<BirthdayDraft | null>;
  saveDraft(draft: BirthdayDraft): Promise<BirthdayDraft>;
  createDraft(initial?: Partial<BirthdayDraft>): Promise<BirthdayDraft>;
  deleteDraft(id: string): Promise<void>;
}
