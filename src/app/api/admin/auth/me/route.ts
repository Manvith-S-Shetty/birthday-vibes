import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ authenticated: false, reason }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    admin: {
      email: session.email,
      role: session.role,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    },
  });
}
