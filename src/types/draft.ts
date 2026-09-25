import { ThemeId } from "./theme";
import { MediaItem } from "./experience";

export type CreatorStep =
  | "recipient"
  | "mood"
  | "memories"
  | "message"
  | "music"
  | "voice"
  | "security"
  | "preview"
  | "publish";

export interface VoiceMessageDraftState {
  status: "none" | "recorded";
  durationMs: number;
  mimeType: string;
  transcript?: string;
  updatedAt?: string;
}

export interface BirthdayDraft {
  id: string;
  recipientName: string;
  birthdayDate?: string;
  themeId: ThemeId;
  photos: MediaItem[];
  personalMessage: string;
  musicTrackId?: string;
  musicTitle?: string;
  musicUrl?: string;
  voiceMessage?: VoiceMessageDraftState;
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
