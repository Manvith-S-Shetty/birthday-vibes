import { NextResponse } from "next/server";
import { checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit } from "@/lib/security/rateLimit";
import { verifyPin } from "@/lib/security/hash";
import { setRecipientAuthCookie } from "@/lib/security/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { SeedExperienceRepository } from "@/lib/experience/SeedExperienceRepository";
import { isExperienceExpired } from "@/lib/expiration/expiration";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // Rate Limiting check per IP + Slug
  const rawIp =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "client_ip";
  const ip = rawIp.split(",")[0].trim();
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
  let experienceFound = false;

  if (slug === "demo" || slug === "demo-expired" || slug === "demo-unprotected") {
    const seedRepo = new SeedExperienceRepository();
    const seed = await seedRepo.getExperienceBySlug(slug);
    if (seed) {
      if (seed.isExpired || isExperienceExpired(seed.expiresAt)) {
        return NextResponse.json(
          {
            error: "This birthday experience has expired.",
            code: "EXPERIENCE_EXPIRED",
            isExpired: true,
          },
          { status: 410 }
        );
      }
      experienceFound = true;
      if (!seed.isPinProtected || !seed.pin || submittedPin === seed.pin.trim()) {
        isValidPin = true;
      }
    }
  } else if (isSupabaseConfigured()) {
    try {
      const { data, error } = await (supabaseAdminClient as any)
        .from("experiences")
        .select("pin_hash, pin_salt, is_pin_protected, status, expires_at")
        .eq("slug", slug)
        .single();

      if (!error && data) {
        if (data.status === "expired" || isExperienceExpired(data.expires_at)) {
          return NextResponse.json(
            {
              error: "This birthday experience has expired.",
              code: "EXPERIENCE_EXPIRED",
              isExpired: true,
            },
            { status: 410 }
          );
        }

        if (data.status === "published") {
          experienceFound = true;
          if (!data.is_pin_protected || !data.pin_hash || !data.pin_salt) {
            isValidPin = true;
          } else {
            isValidPin = verifyPin(submittedPin, data.pin_hash, data.pin_salt);
          }
        }
      }
    } catch (e) {
      console.warn("Supabase PIN verification query error:", e);
    }
  }

  if (!experienceFound) {
    return NextResponse.json({ error: "Experience not found" }, { status: 404 });
  }

  if (!isValidPin) {
    recordFailedPinAttempt(rateLimitKey);
    return NextResponse.json(
      { error: "Passcode incorrect. Please try again." },
      { status: 401 }
    );
  }

  // Verification succeeded: reset rate limit & set HttpOnly Auth Cookie for THIS SLUG ONLY
  resetPinRateLimit(rateLimitKey);
  setRecipientAuthCookie(slug);

  return NextResponse.json({ success: true });
}
