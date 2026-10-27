import { ThemeId } from "./theme";
import { RecipientRelationship, OpeningStyleId, MemoryDisplayMode, ExpirationOption } from "./draft";

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string;
  altText?: string;
  sortOrder: number;
  date?: string;
  location?: string;
  chapter?: string;
}

export interface VoiceMessageData {
  url?: string;
  audioUrl: string;
  mimeType: string;
  durationMs: number;
  transcript?: string;
}

export type MomentType =
  | "mystery_gift"
  | "memory_quiz"
  | "birthday_roulette"
  | "hidden_message"
  | "birthday_coupon"
  | "countdown"
  | "wish_moment";

export interface MysteryGiftConfig {
  title?: string;
  giftText: string;
  giftImageUrl?: string;
  buttonLabel?: string;
}

export interface MemoryQuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MemoryQuizConfig {
  question: string;
  photoUrl?: string;
  options: MemoryQuizOption[];
  explanation?: string;
}

export interface RouletteOption {
  id: string;
  label: string;
  description?: string;
}

export interface BirthdayRouletteConfig {
  title?: string;
  options: RouletteOption[];
}

export interface HiddenMessageConfig {
  teaserText?: string;
  hiddenMessage: string;
  revealType?: "tap" | "scratch" | "hold";
}

export interface BirthdayCouponConfig {
  couponTitle: string;
  couponDescription?: string;
  terms?: string;
  code?: string;
}

export interface CountdownConfig {
  targetDate: string;
  preBirthdayMessage?: string;
  onBirthdayMessage?: string;
  postBirthdayMessage?: string;
}

export interface WishMomentConfig {
  promptText?: string;
  sealedMessage?: string;
}

export type MomentConfig =
  | MysteryGiftConfig
  | MemoryQuizConfig
  | BirthdayRouletteConfig
  | HiddenMessageConfig
  | BirthdayCouponConfig
  | CountdownConfig
  | WishMomentConfig;

export interface InteractiveMomentData {
  id: string;
  momentType: MomentType;
  config: MomentConfig;
  sortOrder: number;
  enabled: boolean;
}

export interface ExperienceData {
  id: string;
  slug: string;
  recipientName: string;
  birthdayDate?: string;
  relationship?: RecipientRelationship;
  openingStyle?: OpeningStyleId;
  memoryDisplayMode?: MemoryDisplayMode;
  themeId: ThemeId;
  personalMessage: string;
  photos: MediaItem[];
  musicUrl?: string;
  musicTitle?: string;
  voiceMessage?: VoiceMessageData;
  moments?: InteractiveMomentData[];
  isPinProtected: boolean;
  pin?: string;
  expirationOption?: ExpirationOption;
  expiresAt?: string | null;
  isExpired?: boolean;
  createdAt: string;
}

