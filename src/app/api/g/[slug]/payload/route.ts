import { NextResponse } from "next/server";
import { isRecipientAuthorized } from "@/lib/security/session";
import { supabaseExperienceRepository } from "@/lib/experience/SupabaseExperienceRepository";

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

  const experience = await supabaseExperienceRepository.getProtectedPayload(slug);

  if (!experience) {
    return NextResponse.json(
      { error: "Experience not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ experience });
}

