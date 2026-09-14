import { ThemeId } from "./theme";

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string;
  altText?: string;
  sortOrder: number;
}

export interface ExperienceData {
  id: string;
  slug: string;
  recipientName: string;
  birthdayDate?: string;
  themeId: ThemeId;
  personalMessage: string;
  photos: MediaItem[];
  musicUrl?: string;
  musicTitle?: string;
  isPinProtected: boolean;
  pin?: string;
  createdAt: string;
}
