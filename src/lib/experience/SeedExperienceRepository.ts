import { ExperienceData } from "@/types/experience";

export const SEEDED_DEMO_EXPERIENCE: ExperienceData = {
  id: "exp_demo_sophia",
  slug: "demo",
  recipientName: "Sophia",
  birthdayDate: "November 14",
  relationship: "best_friend",
  openingStyle: "cinematic-premiere",
  memoryDisplayMode: "timeline",
  themeId: "champagne-noir",
  personalMessage:
    "Dear Sophia, wishing you an extraordinary year ahead filled with magic, laughter, quiet wonder, and endless joy! Thank you for bringing so much warmth to everyone around you.",
  photos: [
    {
      id: "ph_1",
      url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000",
      type: "image",
      caption: "Parisian Evening",
      date: "2021",
      location: "Paris, France",
      chapter: "Beginning",
      sortOrder: 1,
    },
    {
      id: "ph_2",
      url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=1000",
      type: "image",
      caption: "Golden Sunset Memories",
      date: "2022",
      location: "Santorini, Greece",
      chapter: "Favorite Memories",
      sortOrder: 2,
    },
    {
      id: "ph_3",
      url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1000",
      type: "image",
      caption: "Celebration Moments",
      date: "2023",
      location: "Barcelona, Spain",
      chapter: "Favorite Memories",
      sortOrder: 3,
    },
    {
      id: "ph_4",
      url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=1000",
      type: "image",
      caption: "A Night to Remember",
      date: "2024",
      location: "New York, USA",
      chapter: "Today",
      sortOrder: 4,
    },
  ],
  musicTitle: "Clair de Lune — Debussy",
  musicUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=clair-de-lune-111009.mp3",
  isPinProtected: true,
  pin: "2026",
  expirationOption: "never",
  expiresAt: null,
  isExpired: false,
  createdAt: new Date().toISOString(),
};

export const SEEDED_EXPIRED_EXPERIENCE: ExperienceData = {
  ...SEEDED_DEMO_EXPERIENCE,
  id: "exp_demo_expired",
  slug: "demo-expired",
  recipientName: "Taylor",
  expirationOption: "7d",
  expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  isExpired: true,
};

export const SEEDED_UNPROTECTED_EXPERIENCE: ExperienceData = {
  ...SEEDED_DEMO_EXPERIENCE,
  id: "exp_demo_unprotected",
  slug: "demo-unprotected",
  recipientName: "Alex",
  isPinProtected: false,
  pin: undefined,
  isExpired: false,
  expiresAt: null,
};

export class SeedExperienceRepository {
  async getExperienceBySlug(slug: string): Promise<ExperienceData | null> {
    if (slug === "demo") {
      return SEEDED_DEMO_EXPERIENCE;
    }
    if (slug === "demo-expired") {
      return SEEDED_EXPIRED_EXPERIENCE;
    }
    if (slug === "demo-unprotected") {
      return SEEDED_UNPROTECTED_EXPERIENCE;
    }
    return null;
  }
}

export const seedExperienceRepository = new SeedExperienceRepository();
