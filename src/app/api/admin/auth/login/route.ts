import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createAdminSessionToken,
  getAdminCredentials,
  ADMIN_COOKIE_NAME,
} from "@/lib/admin/auth";
import { logAdminActivity } from "@/lib/admin/audit";
import {
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  clearLoginAttempts,
} from "@/lib/admin/rateLimit";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  if (!checkLoginRateLimit(ip)) {
    await logAdminActivity({
      actor: "unknown",
      action: "admin.login_locked",
      ip_address: ip,
      user_agent: userAgent,
      status: "failure",
      details: { reason: "Rate limit exceeded" },
    });
    return NextResponse.json(
      { error: "Too many failed login attempts. Please try again in 15 minutes." },
      { status: 429 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const { email, password, secretKey } = body;
  const configured = getAdminCredentials();
  const configuredEmail = (configured.email || "owner@wishscene.com").trim().toLowerCase();
  const inputEmail = (email || "").toString().trim().toLowerCase();

  let isAuthorized = false;
  const inputSecret = (password || secretKey || "").toString();

  // If ADMIN_PASSWORD or ADMIN_SECRET is set in environment
  if (configured.password && configured.password.length > 0) {
    if (inputSecret.length === configured.password.length) {
      isAuthorized = crypto.timingSafeEqual(
        Buffer.from(inputSecret),
        Buffer.from(configured.password)
      );
    }
  } else {
    // Development fallback when no ADMIN_PASSWORD is set in local environment
    if (process.env.NODE_ENV !== "production") {
      const devAllowed = ["admin", "wishlight-admin-dev-2026", "secret"];
      isAuthorized = devAllowed.includes(inputSecret);
    }
  }

  // Enforce authorized email match
  const emailValid = inputEmail === configuredEmail || (inputEmail === "" && secretKey);

  if (!isAuthorized || !emailValid) {
    recordFailedLoginAttempt(ip);
    await logAdminActivity({
      actor: inputEmail || "unknown",
      action: "admin.login_failed",
      ip_address: ip,
      user_agent: userAgent,
      status: "failure",
      details: { emailAttempted: inputEmail || "unspecified" },
    });
    return NextResponse.json(
      { error: "Invalid admin credentials." },
      { status: 401 }
    );
  }

  clearLoginAttempts(ip);

  const targetEmail = configuredEmail;
  const token = createAdminSessionToken(targetEmail);

  await logAdminActivity({
    actor: targetEmail,
    action: "admin.login",
    ip_address: ip,
    user_agent: userAgent,
    status: "success",
  });

  const response = NextResponse.json({
    success: true,
    admin: { email: targetEmail },
  });

  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });

  return response;
}
