import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminRequest } from "@/lib/admin/auth";
import { logAdminActivity } from "@/lib/admin/audit";

export async function POST(req: NextRequest) {
  const { session } = await verifyAdminRequest(req);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  if (session) {
    await logAdminActivity({
      actor: session.email,
      action: "admin.logout",
      ip_address: ip,
      user_agent: userAgent,
      status: "success",
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully." });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
