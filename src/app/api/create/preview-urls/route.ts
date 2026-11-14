import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getOrCreateCreatorSessionToken } from "@/lib/security/session";
import { hashCreatorSecret } from "@/lib/security/hash";
import { assertDraftOwnership } from "@/lib/security/draftOwnership";

export const dynamic = "force-dynamic";

const MAX_BATCH_SIZE = 24;

export async function POST(request: Request) {
  try {
    const creatorSecret = getOrCreateCreatorSessionToken();
    const creatorTokenHash = hashCreatorSecret(creatorSecret);

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }

    const { paths } = body;
    if (!Array.isArray(paths)) {
      return NextResponse.json(
        { success: false, error: "Invalid request: 'paths' must be an array." },
        { status: 400 }
      );
    }

    if (paths.length === 0) {
      return NextResponse.json({ success: true, urls: {} });
    }

    if (paths.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { success: false, error: `Batch limit exceeded. Maximum ${MAX_BATCH_SIZE} paths per request.` },
        { status: 400 }
      );
    }

    // 1. Strict path validation and authorization
    const validatedPaths: string[] = [];

    for (const rawPath of paths) {
      if (typeof rawPath !== "string" || !rawPath.trim()) {
        return NextResponse.json(
          { success: false, error: "Invalid path: Path must be a non-empty string." },
          { status: 400 }
        );
      }

      const p = rawPath.trim();

      // Prevent path traversal and external URI injection
      if (
        p.includes("..") ||
        p.includes("\\") ||
        p.startsWith("/") ||
        p.startsWith("data:") ||
        p.startsWith("http://") ||
        p.startsWith("https://")
      ) {
        return NextResponse.json(
          { success: false, error: `Invalid storage path format: '${p}'.` },
          { status: 400 }
        );
      }

      // Check structural format
      const parts = p.split("/");
      if (parts.length < 2) {
        return NextResponse.json(
          { success: false, error: `Invalid storage path structure: '${p}'.` },
          { status: 400 }
        );
      }

      if (parts[0] === "drafts") {
        // drafts/<draftId>/...
        const draftId = parts[1];
        if (!draftId || !/^[a-zA-Z0-9_-]+$/.test(draftId)) {
          return NextResponse.json(
            { success: false, error: `Invalid draft ID in path: '${p}'.` },
            { status: 400 }
          );
        }

        // Authorize draft access
        const ownership = await assertDraftOwnership(draftId, creatorTokenHash);
        if (!ownership.authorized) {
          return NextResponse.json(
            { success: false, error: "Forbidden: You are not authorized to preview assets from this draft." },
            { status: 403 }
          );
        }
      } else {
        // <experienceId>/...
        const experienceId = parts[0];
        if (!experienceId || !/^[a-zA-Z0-9_-]+$/.test(experienceId)) {
          return NextResponse.json(
            { success: false, error: `Invalid experience identifier in path: '${p}'.` },
            { status: 400 }
          );
        }

        // Check if experience belongs to this creator
        if (isSupabaseConfigured()) {
          try {
            const { data: exp } = await (supabaseAdminClient as any)
              .from("experiences")
              .select("id, creator_session_token")
              .eq("id", experienceId)
              .maybeSingle();

            if (exp && exp.creator_session_token && exp.creator_session_token !== creatorTokenHash) {
              return NextResponse.json(
                { success: false, error: "Forbidden: You are not authorized to preview assets from this experience." },
                { status: 403 }
              );
            }
          } catch {
            // DB query error fallback
          }
        }
      }

      validatedPaths.push(p);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, urls: {} });
    }

    // 2. Generate signed URLs for validated paths
    const { data, error } = await supabaseAdminClient.storage
      .from("experience-media")
      .createSignedUrls(validatedPaths, 3600);

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || "Failed to generate signed preview URLs." },
        { status: 500 }
      );
    }

    const urls: Record<string, string> = {};
    for (const item of data) {
      if (item.path && item.signedUrl) {
        urls[item.path] = item.signedUrl;
      }
    }

    return NextResponse.json({ success: true, urls });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error during preview URL generation." },
      { status: 500 }
    );
  }
}
