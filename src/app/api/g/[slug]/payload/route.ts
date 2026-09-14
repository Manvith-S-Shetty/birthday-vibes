import { NextResponse } from "next/server";
import { isRecipientAuthorized } from "@/lib/security/session";
import { SeedExperienceRepository } from "@/lib/experience/SeedExperienceRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { ExperienceData, MediaItem } from "@/types/experience";
import { ThemeId } from "@/types/theme";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // Verify HttpOnly Auth Cookie scoped strictly to slug
  const authorized = isRecipientAuthorized(slug);
  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized. PIN verification required." },
      { status: 401 }
    );
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: exp, error: expError } = await (supabaseAdminClient as any)
        .from("experiences")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!expError && exp && exp.status === "published") {
        // Fetch media
        const { data: mediaRows } = await (supabaseAdminClient as any)
          .from("media")
          .select("*")
          .eq("experience_id", exp.id)
          .order("sort_order", { ascending: true });

        // Generate short-lived signed URLs (600s = 10 minutes expiry) for storage media
        const photos: MediaItem[] = await Promise.all(
          (mediaRows || []).map(async (m: any) => {
            let url = m.storage_path;
            if (m.storage_path.startsWith("experience-media/")) {
              const { data: signed } = await supabaseAdminClient.storage
                .from("experience-media")
                .createSignedUrl(m.storage_path.replace("experience-media/", ""), 600);
              if (signed) url = signed.signedUrl;
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

        // Fetch music
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
          personalMessage: exp.personal_message,
          photos,
          musicTitle: musicRows?.title || undefined,
          musicUrl: musicRows?.source_url || undefined,
          isPinProtected: exp.is_pin_protected,
          pin: undefined, // Never return plaintext PIN
          createdAt: exp.created_at,
        };

        return NextResponse.json({ experience: fullExperience });
      }
    } catch (e) {
      console.warn("Supabase payload fetch fallback:", e);
    }
  }

  // Seed / Local Fallback
  const seedRepo = new SeedExperienceRepository();
  const seed = await seedRepo.getExperienceBySlug(slug);

  // Return protected payload (stripping PIN value)
  const safeSeed: ExperienceData = {
    ...seed,
    pin: undefined,
  };

  return NextResponse.json({ experience: safeSeed });
}
