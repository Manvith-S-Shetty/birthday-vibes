import {
  ExperienceData,
  MediaItem,
  VoiceMessageData,
  InteractiveMomentData,
  MomentType,
  MomentConfig,
} from "@/types/experience";
import { SeedExperienceRepository, seedExperienceRepository } from "./SeedExperienceRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { ThemeId } from "@/types/theme";
import { isExperienceExpired } from "@/lib/expiration/expiration";

export interface LockedMetadataResult {
  isLocked: boolean;
  isExpired: boolean;
  slug: string;
  recipientName: string;
  birthdayDate?: string;
  themeId: string;
  isPinProtected: boolean;
  expiresAt?: string | null;
}

export class SupabaseExperienceRepository {
  private fallbackRepo: SeedExperienceRepository;

  constructor() {
    this.fallbackRepo = seedExperienceRepository;
  }

  async getLockedMetadata(slug: string): Promise<LockedMetadataResult | null> {
    if (slug === "demo" || slug === "demo-expired" || slug === "demo-unprotected") {
      const seed = await this.fallbackRepo.getExperienceBySlug(slug);
      if (!seed) return null;
      const expired = Boolean(seed.isExpired || isExperienceExpired(seed.expiresAt));
      return {
        isLocked: seed.isPinProtected,
        isExpired: expired,
        slug: seed.slug,
        recipientName: seed.recipientName,
        birthdayDate: seed.birthdayDate,
        themeId: seed.themeId,
        isPinProtected: seed.isPinProtected,
        expiresAt: seed.expiresAt || null,
      };
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await (supabaseAdminClient as any)
          .from("experiences")
          .select("slug, recipient_name, birthday_date, theme_id, is_pin_protected, status, expires_at, expiration_option")
          .eq("slug", slug)
          .single();

        if (!error && data) {
          const expired = Boolean(data.status === "expired" || isExperienceExpired(data.expires_at));
          if (expired) {
            return {
              isLocked: true,
              isExpired: true,
              slug: data.slug || slug,
              recipientName: data.recipient_name,
              birthdayDate: data.birthday_date || undefined,
              themeId: data.theme_id,
              isPinProtected: data.is_pin_protected,
              expiresAt: data.expires_at || null,
            };
          }

          if (data.status === "published") {
            return {
              isLocked: data.is_pin_protected,
              isExpired: false,
              slug: data.slug || slug,
              recipientName: data.recipient_name,
              birthdayDate: data.birthday_date || undefined,
              themeId: data.theme_id,
              isPinProtected: data.is_pin_protected,
              expiresAt: data.expires_at || null,
            };
          }
        }
      } catch (e) {
        console.warn("Supabase metadata query error for slug:", slug, e);
      }
    }

    // Strict isolation: Return null if slug does not exist in DB (DO NOT FALL BACK TO DEMO DATA)
    return null;
  }

  async getProtectedPayload(slug: string): Promise<ExperienceData | null> {
    if (slug === "demo" || slug === "demo-expired" || slug === "demo-unprotected") {
      const seed = await this.fallbackRepo.getExperienceBySlug(slug);
      if (!seed) return null;

      // Strict rejection: expired seed experiences cannot return payload
      if (seed.isExpired || isExperienceExpired(seed.expiresAt)) {
        return null;
      }

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

        if (!expError && exp) {
          // Strict server-side expiration gate:
          // Expired experiences NEVER return content or signed media URLs
          if (exp.status === "expired" || isExperienceExpired(exp.expires_at)) {
            return null;
          }

          if (exp.status === "published") {
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
                  date: m.metadata?.date || undefined,
                  location: m.metadata?.location || undefined,
                  chapter: m.metadata?.chapter || undefined,
                };
              })
            );

            // Fetch music belonging strictly to exp.id
            const { data: musicRows } = await (supabaseAdminClient as any)
              .from("music")
              .select("*")
              .eq("experience_id", exp.id)
              .single();

            // Fetch voice message belonging strictly to exp.id
            const { data: voiceRow } = await (supabaseAdminClient as any)
              .from("voice_messages")
              .select("*")
              .eq("experience_id", exp.id)
              .maybeSingle();

            let voiceMessage: VoiceMessageData | undefined = undefined;

            if (voiceRow && voiceRow.storage_path) {
              const { data: signed, error: signError } = await supabaseAdminClient.storage
                .from("voice-messages")
                .createSignedUrl(voiceRow.storage_path, 3600);

              if (!signError && signed?.signedUrl) {
                voiceMessage = {
                  url: signed.signedUrl,
                  audioUrl: signed.signedUrl,
                  mimeType: voiceRow.mime_type,
                  durationMs: voiceRow.duration_ms,
                  transcript: voiceRow.transcript || undefined,
                };
              }
            }

            // Fetch interactive moments belonging strictly to exp.id
            const { data: momentRows } = await (supabaseAdminClient as any)
              .from("experience_moments")
              .select("*")
              .eq("experience_id", exp.id)
              .eq("enabled", true)
              .order("sort_order", { ascending: true });

            const moments: InteractiveMomentData[] = (momentRows || []).map((m: any) => ({
              id: m.id,
              momentType: m.moment_type as MomentType,
              config: (m.config_json || {}) as MomentConfig,
              sortOrder: m.sort_order,
              enabled: m.enabled ?? true,
            }));

            const fullExperience: ExperienceData = {
              id: exp.id,
              slug: exp.slug || slug,
              recipientName: exp.recipient_name,
              birthdayDate: exp.birthday_date || undefined,
              relationship: exp.relationship || undefined,
              openingStyle: exp.opening_style || "cinematic-premiere",
              memoryDisplayMode: exp.memory_display_mode || "grid",
              themeId: exp.theme_id as ThemeId,
              personalMessage: exp.personal_message || "",
              photos,
              musicTitle: musicRows?.title || undefined,
              musicUrl: musicRows?.source_url || undefined,
              voiceMessage,
              moments,
              isPinProtected: exp.is_pin_protected,
              pin: undefined,
              expirationOption: exp.expiration_option || "never",
              expiresAt: exp.expires_at || null,
              isExpired: false,
              createdAt: exp.created_at,
            };

            return fullExperience;
          }
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
