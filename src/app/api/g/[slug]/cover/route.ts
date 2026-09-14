import { NextResponse } from "next/server";
import { SeedExperienceRepository } from "@/lib/experience/SeedExperienceRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabaseAdminClient as any)
        .from("experiences")
        .select("slug, recipient_name, birthday_date, theme_id, is_pin_protected, status")
        .eq("slug", slug)
        .single();

      if (!error && data && data.status === "published") {
        return NextResponse.json({
          isLocked: true,
          slug: data.slug || slug,
          recipientName: data.recipient_name,
          birthdayDate: data.birthday_date || undefined,
          themeId: data.theme_id,
          isPinProtected: data.is_pin_protected,
        });
      }
    } catch (e) {
      console.warn("Supabase cover fetch fallback to Seed repo:", e);
    }
  }

  // Seed / Local Fallback
  const seedRepo = new SeedExperienceRepository();
  const seed = await seedRepo.getExperienceBySlug(slug);

  return NextResponse.json({
    isLocked: true,
    slug: seed.slug,
    recipientName: seed.recipientName,
    birthdayDate: seed.birthdayDate,
    themeId: seed.themeId,
    isPinProtected: seed.isPinProtected,
  });
}
