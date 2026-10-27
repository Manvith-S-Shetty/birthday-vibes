import { NextResponse } from "next/server";
import { supabaseExperienceRepository } from "@/lib/experience/SupabaseExperienceRepository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const metadata = await supabaseExperienceRepository.getLockedMetadata(slug);

  if (!metadata) {
    return NextResponse.json({ error: "Experience not found" }, { status: 404 });
  }

  if (metadata.isExpired) {
    return NextResponse.json(
      {
        error: "This birthday experience has expired.",
        code: "EXPERIENCE_EXPIRED",
        isExpired: true,
        recipientName: metadata.recipientName,
        themeId: metadata.themeId,
      },
      { status: 410 }
    );
  }

  return NextResponse.json(metadata);
}
