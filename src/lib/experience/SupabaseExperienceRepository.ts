import { ExperienceData, MediaItem } from "@/types/experience";
import { SeedExperienceRepository, seedExperienceRepository } from "./SeedExperienceRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { ThemeId } from "@/types/theme";

export class SupabaseExperienceRepository {
  private fallbackRepo: SeedExperienceRepository;

  constructor() {
    this.fallbackRepo = seedExperienceRepository;
  }

  async getLockedMetadata(slug: string) {
    if (slug === "demo") {
      const seed = await this.fallbackRepo.getExperienceBySlug(slug);
      if (!seed) return null;
      return {
        isLocked: true,
        slug: seed.slug,
        recipientName: seed.recipientName,
        birthdayDate: seed.birthdayDate,
        themeId: seed.themeId,
        isPinProtected: seed.isPinProtected,
      };
    }

    if (isSupabaseConfigured()) {
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
        console.warn("Supabase metadata query error for slug:", slug, e);
      }
    }

    // Strict isolation: Return null if slug does not exist in DB (DO NOT FALL BACK TO DEMO DATA)
    return null;
  }

  async getProtectedPayload(slug: string): Promise<ExperienceData | null> {
    if (slug === "demo") {
      const seed = await this.fallbackRepo.getExperienceBySlug(slug);
      if (!seed) return null;
      return {
        ...seed,
        pin: undefined,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data: exp, error: expError } = await (supabaseAdminClient as any)
          .from("experiences")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!expError && exp && exp.status === "published") {
          // Fetch media belonging strictly to exp.id
          const { data: mediaRows } = await (supabaseAdminClient as any)
            .from("media")
            .select("*")
            .eq("experience_id", exp.id)
            .order("sort_order", { ascending: true });

          const photos: MediaItem[] = await Promise.all(
            (mediaRows || []).map(async (m: any) => {
              let url = m.storage_path;
              if (
                m.storage_path &&
                !m.storage_path.startsWith("http://") &&
                !m.storage_path.startsWith("https://") &&
                !m.storage_path.startsWith("data:")
              ) {
                let storageKey = m.storage_path;
                if (storageKey.startsWith("experience-media/")) {
                  storageKey = storageKey.replace("experience-media/", "");
                }
                const { data: signed, error: signError } = await supabaseAdminClient.storage
                  .from("experience-media")
                  .createSignedUrl(storageKey, 3600);
                if (!signError && signed?.signedUrl) {
                  url = signed.signedUrl;
                }
              }

              return {
                id: m.id,
                url,
                type: "image",
                caption: m.caption || undefined,
                altText: m.alt_text || undefined,
                sortOrder: m.sort_order,
              };
            })
          );

          // Fetch music belonging strictly to exp.id
          const { data: musicRows } = await (supabaseAdminClient as any)
            .from("music")
            .select("*")
            .eq("experience_id", exp.id)
            .single();

          const fullExperience: ExperienceData = {
            id: exp.id,
            slug: exp.slug || slug,
            recipientName: exp.recipient_name,
            birthdayDate: exp.birthday_date || undefined,
            themeId: exp.theme_id as ThemeId,
            personalMessage: exp.personal_message || "",
            photos,
            musicTitle: musicRows?.title || undefined,
            musicUrl: musicRows?.source_url || undefined,
            isPinProtected: exp.is_pin_protected,
            pin: undefined,
            createdAt: exp.created_at,
          };

          return fullExperience;
        }
      } catch (e) {
        console.warn("Supabase payload query error for slug:", slug, e);
      }
    }

    // Strict isolation: Return null if slug does not exist in DB (DO NOT FALL BACK TO DEMO DATA)
    return null;
  }
}

export const supabaseExperienceRepository = new SupabaseExperienceRepository();
