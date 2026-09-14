import { ExperienceData } from "@/types/experience";
import { SeedExperienceRepository, seedExperienceRepository } from "./SeedExperienceRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

export class SupabaseExperienceRepository {
  private fallbackRepo: SeedExperienceRepository;

  constructor() {
    this.fallbackRepo = seedExperienceRepository;
  }

  async getLockedMetadata(slug: string) {
    if (slug === "demo" || !isSupabaseConfigured()) {
      const seed = await this.fallbackRepo.getExperienceBySlug(slug);
      return {
        isLocked: true,
        slug: seed.slug,
        recipientName: seed.recipientName,
        birthdayDate: seed.birthdayDate,
        themeId: seed.themeId,
        isPinProtected: seed.isPinProtected,
      };
    }

    try {
      const { data, error } = await (supabaseAdminClient as any)
        .from("experiences")
        .select("slug, recipient_name, birthday_date, theme_id, is_pin_protected, status")
        .eq("slug", slug)
        .single();

      if (!error && data && data.status === "published") {
        return {
          isLocked: true,
          slug: data.slug || slug,
          recipientName: data.recipient_name,
          birthdayDate: data.birthday_date || undefined,
          themeId: data.theme_id,
          isPinProtected: data.is_pin_protected,
        };
      }
    } catch (e) {
      console.warn("Server-side Supabase metadata query fallback:", e);
    }

    const seed = await this.fallbackRepo.getExperienceBySlug(slug);
    return {
      isLocked: true,
      slug: seed.slug,
      recipientName: seed.recipientName,
      birthdayDate: seed.birthdayDate,
      themeId: seed.themeId,
      isPinProtected: seed.isPinProtected,
    };
  }

  async getProtectedPayload(slug: string): Promise<ExperienceData | null> {
    const seed = await this.fallbackRepo.getExperienceBySlug(slug);
    return {
      ...seed,
      pin: undefined,
    };
  }
}

export const supabaseExperienceRepository = new SupabaseExperienceRepository();
