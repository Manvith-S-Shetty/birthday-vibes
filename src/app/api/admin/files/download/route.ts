import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logAdminActivity } from "@/lib/admin/audit";

const ALLOWED_BUCKETS = ["experience-media", "voice-messages"];

export async function GET(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const path = searchParams.get("path");

  if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { error: `Invalid bucket. Must be one of: ${ALLOWED_BUCKETS.join(", ")}` },
      { status: 400 }
    );
  }

  if (!path) {
    return NextResponse.json({ error: "Missing storage path." }, { status: 400 });
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

  try {
    const { data: blob, error } = await supabaseAdminClient.storage
      .from(bucket)
      .download(cleanPath);

    if (error || !blob) {
      return NextResponse.json(
        { error: error?.message || "File download failed." },
        { status: 404 }
      );
    }

    const filename = cleanPath.split("/").pop() || "download";
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await logAdminActivity({
      actor: session.email,
      action: "file.download",
      target_id: cleanPath,
      target_type: "storage_file",
      details: { bucket, path: cleanPath, sizeBytes: buffer.length },
      status: "success",
    });

    const headers = new Headers();
    headers.set("Content-Type", blob.type || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
