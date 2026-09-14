import { ExperienceData } from "@/types/experience";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";

export const SEEDED_DEMO_EXPERIENCE: ExperienceData = {
  id: "exp_demo_sophia",
  slug: "demo",
  recipientName: "Sophia",
  birthdayDate: "November 14",
  themeId: "champagne-noir",
  personalMessage:
    "Dear Sophia, wishing you an extraordinary year ahead filled with magic, laughter, quiet wonder, and endless joy! Thank you for bringing so much warmth to everyone around you.",
  photos: [
    {
      id: "ph_1",
      url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000",
      type: "image",
      caption: "Parisian Evening",
      sortOrder: 1,
    },
    {
      id: "ph_2",
      url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=1000",
      type: "image",
      caption: "Golden Sunset Memories",
      sortOrder: 2,
    },
    {
      id: "ph_3",
      url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1000",
      type: "image",
      caption: "Celebration Moments",
      sortOrder: 3,
    },
    {
      id: "ph_4",
      url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=1000",
      type: "image",
      caption: "A Night to Remember",
      sortOrder: 4,
    },
  ],
  musicTitle: "Clair de Lune — Debussy",
  musicUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=clair-de-lune-111009.mp3",
  isPinProtected: true,
  pin: "2026",
  createdAt: new Date().toISOString(),
};

export class SeedExperienceRepository {
  async getExperienceBySlug(slug: string): Promise<ExperienceData | null> {
    if (slug === "demo") {
      return SEEDED_DEMO_EXPERIENCE;
    }
    return null;
  }
}

export const seedExperienceRepository = new SeedExperienceRepository();
