import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/auth";
import { getAdminAuditLogs } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || undefined;
  const targetId = searchParams.get("targetId") || undefined;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  try {
    const { logs, total } = await getAdminAuditLogs({
      limit,
      offset,
      action,
      targetId,
    });

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch audit logs." },
      { status: 500 }
    );
  }
}
