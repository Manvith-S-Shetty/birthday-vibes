import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logAdminActivity } from "@/lib/admin/audit";

const ALLOWED_BUCKETS = ["experience-media", "voice-messages"];

export async function POST(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { bucket, path, expiresIn = 1800 } = body;

  if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { error: `Invalid bucket. Must be one of: ${ALLOWED_BUCKETS.join(", ")}` },
      { status: 400 }
    );
  }

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing or invalid storage path." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  // Sanitize and validate path against directory traversal
  let cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.substring(bucket.length + 1).replace(/^\/+/, "");
  }

  if (!cleanPath || cleanPath.includes("..") || cleanPath.includes("\0")) {
    return NextResponse.json(
      { error: "Invalid storage path or traversal detected." },
      { status: 400 }
    );
  }

  const expirationSeconds = Math.min(3600, Math.max(60, Number(expiresIn) || 1800));

  try {
    const { data, error } = await supabaseAdminClient.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expirationSeconds);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to generate signed URL." },
        { status: 500 }
      );
    }

    await logAdminActivity({
      actor: session.email,
      action: "file.preview",
      target_id: cleanPath,
      target_type: "storage_file",
      details: { bucket, path: cleanPath, expirationSeconds },
      status: "success",
    });

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      expiresIn: expirationSeconds,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
