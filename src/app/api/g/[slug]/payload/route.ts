import { NextResponse } from "next/server";
import { isRecipientAuthorized } from "@/lib/security/session";
import { supabaseExperienceRepository } from "@/lib/experience/SupabaseExperienceRepository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const metadata = await supabaseExperienceRepository.getLockedMetadata(slug);

  if (!metadata) {
    return NextResponse.json(
      { error: "Experience not found" },
      { status: 404 }
    );
  }

  if (metadata.isExpired) {
    return NextResponse.json(
      {
        error: "This birthday experience has expired.",
        code: "EXPERIENCE_EXPIRED",
        isExpired: true,
      },
      { status: 410 }
    );
  }

  // If experience is PIN protected, verify HttpOnly Auth Cookie scoped strictly to slug
  if (metadata.isPinProtected) {
    const authorized = isRecipientAuthorized(slug);
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized. PIN verification required." },
        { status: 401 }
      );
    }
  }

  const experience = await supabaseExperienceRepository.getProtectedPayload(slug);

  if (!experience) {
    return NextResponse.json(
      { error: "Experience not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ experience });
}
