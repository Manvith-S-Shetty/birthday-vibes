import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logAdminActivity } from "@/lib/admin/audit";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Require explicit user confirmation flag
  if (body.confirmReveal !== true) {
    return NextResponse.json(
      {
        error:
          "Explicit confirmation required to reveal sensitive personal messages (confirmReveal: true).",
      },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = (supabaseAdminClient as any).from("experiences").select("id, recipient_name, slug, personal_message");
    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", id);
    }

    const { data: exp, error } = await query.single();
    if (error || !exp) {
      return NextResponse.json({ error: "Experience not found." }, { status: 404 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    // Strictly log this sensitive action in the audit trail!
    await logAdminActivity({
      actor: session.email,
      action: "experience.reveal_sensitive_message",
      target_id: exp.id,
      target_type: "experience",
      ip_address: ip,
      details: {
        recipient_name: exp.recipient_name,
        slug: exp.slug,
        reason: body.reason || "Security & abuse review",
      },
      status: "success",
    });

    return NextResponse.json({
      success: true,
      personal_message: exp.personal_message || "(Empty message)",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
