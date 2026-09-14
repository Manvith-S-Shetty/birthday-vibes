import { NextResponse } from "next/server";
import { checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit } from "@/lib/security/rateLimit";
import { verifyPin } from "@/lib/security/hash";
import { setRecipientAuthCookie } from "@/lib/security/session";
import { SeedExperienceRepository } from "@/lib/experience/SeedExperienceRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // Rate Limiting check per IP + Slug
  const ip = request.headers.get("x-forwarded-for") || "client_ip";
  const rateLimitKey = `pin_limit_${ip}_${slug}`;
  const rateCheck = checkPinRateLimit(rateLimitKey);

  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many failed attempts. Please try again later.",
        retryAfterMs: rateCheck.retryAfterMs,
      },
      { status: 429 }
    );
  }

  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const submittedPin = (body.pin || "").trim();
  let isValidPin = false;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabaseAdminClient as any)
        .from("experiences")
        .select("pin_hash, pin_salt, is_pin_protected, status")
        .eq("slug", slug)
        .single();

      if (!error && data && data.status === "published") {
        if (!data.is_pin_protected || !data.pin_hash || !data.pin_salt) {
          isValidPin = true;
        } else {
          isValidPin = verifyPin(submittedPin, data.pin_hash, data.pin_salt);
        }
      }
    } catch (e) {
      console.warn("Supabase PIN verification fallback:", e);
    }
  } else {
    // Seed / Local Fallback
    const seedRepo = new SeedExperienceRepository();
    const seed = await seedRepo.getExperienceBySlug(slug);
    if (!seed.isPinProtected || !seed.pin || submittedPin === seed.pin.trim()) {
      isValidPin = true;
    }
  }

  if (!isValidPin) {
    recordFailedPinAttempt(rateLimitKey);
    return NextResponse.json(
      { error: "Passcode incorrect. Please try again." },
      { status: 401 }
    );
  }

  // Verification succeeded: reset rate limit & set HttpOnly Auth Cookie
  resetPinRateLimit(rateLimitKey);
  setRecipientAuthCookie(slug);

  return NextResponse.json({ success: true });
}
