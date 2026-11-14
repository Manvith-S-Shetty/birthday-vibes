import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      files: [],
      stats: { total: 0, active: 0, orphaned: 0, missing: 0 },
      message: "Supabase not configured.",
    });
  }

  const { searchParams } = new URL(req.url);
  const targetBucket = searchParams.get("bucket") || "all"; // 'all' | 'experience-media' | 'voice-messages'
  const filterStatus = searchParams.get("status") || "all"; // 'all' | 'active' | 'orphaned' | 'missing'

  try {
    // 1. Fetch DB records from media and voice_messages
    const [mediaRes, voiceRes, expRes] = await Promise.all([
      (supabaseAdminClient as any).from("media").select("id, experience_id, storage_path, type, caption, sort_order, created_at"),
      (supabaseAdminClient as any).from("voice_messages").select("id, experience_id, storage_path, mime_type, duration_ms, file_size_bytes, created_at"),
      (supabaseAdminClient as any).from("experiences").select("id, slug, recipient_name, status"),
    ]);

    const expMap = new Map<string, any>();
    (expRes.data || []).forEach((e: any) => expMap.set(e.id, e));

    const dbMedia = mediaRes.data || [];
    const dbVoice = voiceRes.data || [];

    // Map DB paths normalized
    const dbMediaPaths = new Map<string, any>();
    dbMedia.forEach((m: any) => {
      const clean = m.storage_path.replace("experience-media/", "");
      dbMediaPaths.set(clean, { ...m, bucket: "experience-media", exp: expMap.get(m.experience_id) });
    });

    const dbVoicePaths = new Map<string, any>();
    dbVoice.forEach((v: any) => {
      const clean = v.storage_path.replace("voice-messages/", "");
      dbVoicePaths.set(clean, { ...v, bucket: "voice-messages", exp: expMap.get(v.experience_id) });
    });

    // 2. Fetch Storage files list from both buckets
    // Helper to recursively list files in Supabase storage bucket
    const listBucketFiles = async (bucketName: string): Promise<any[]> => {
      const allFiles: any[] = [];
      try {
        const { data: topLevel, error } = await supabaseAdminClient.storage.from(bucketName).list("", { limit: 100 });
        if (error || !topLevel) return allFiles;

        for (const item of topLevel) {
          if (item.id === null) {
            // It's a folder (e.g. experienceId folder or draftId folder)
            const { data: subFiles } = await supabaseAdminClient.storage.from(bucketName).list(item.name, { limit: 100 });
            (subFiles || []).forEach((sf) => {
              if (sf.name && !sf.name.startsWith(".")) {
                allFiles.push({
                  ...sf,
                  path: `${item.name}/${sf.name}`,
                  bucket: bucketName,
                });
              }
            });
          } else if (item.name && !item.name.startsWith(".")) {
            allFiles.push({
              ...item,
              path: item.name,
              bucket: bucketName,
            });
          }
        }
      } catch (e) {
        console.warn(`Error listing bucket ${bucketName}:`, e);
      }
      return allFiles;
    };

    const [mediaBucketFiles, voiceBucketFiles] = await Promise.all([
      targetBucket === "voice-messages" ? Promise.resolve([]) : listBucketFiles("experience-media"),
      targetBucket === "experience-media" ? Promise.resolve([]) : listBucketFiles("voice-messages"),
    ]);

    const storageFiles = [...mediaBucketFiles, ...voiceBucketFiles];
    const storagePathsSet = new Set(storageFiles.map((sf) => `${sf.bucket}:${sf.path}`));

    const resultFiles: any[] = [];

    // Process storage items -> check if active or orphaned
    for (const sf of storageFiles) {
      const isVoice = sf.bucket === "voice-messages";
      const dbEntry = isVoice ? dbVoicePaths.get(sf.path) : dbMediaPaths.get(sf.path);

      if (dbEntry) {
        resultFiles.push({
          id: dbEntry.id,
          name: sf.name,
          path: sf.path,
          bucket: sf.bucket,
          size: sf.metadata?.size || dbEntry.file_size_bytes || 0,
          mimeType: sf.metadata?.mimetype || dbEntry.mime_type || (isVoice ? "audio/webm" : "image/jpeg"),
          lastModified: sf.updated_at || sf.created_at || dbEntry.created_at,
          status: "active",
          experience_id: dbEntry.experience_id,
          experience_slug: dbEntry.exp?.slug || null,
          recipient_name: dbEntry.exp?.recipient_name || null,
        });
      } else {
        resultFiles.push({
          id: `orphan_${sf.path}`,
          name: sf.name,
          path: sf.path,
          bucket: sf.bucket,
          size: sf.metadata?.size || 0,
          mimeType: sf.metadata?.mimetype || (isVoice ? "audio/webm" : "image/jpeg"),
          lastModified: sf.updated_at || sf.created_at || new Date().toISOString(),
          status: "orphaned",
          experience_id: null,
          experience_slug: null,
          recipient_name: null,
        });
      }
    }

    // Process DB entries -> check if missing from storage
    if (targetBucket === "all" || targetBucket === "experience-media") {
      dbMediaPaths.forEach((dbEntry, path) => {
        if (!storagePathsSet.has(`experience-media:${path}`)) {
          resultFiles.push({
            id: dbEntry.id,
            name: path.split("/").pop() || path,
            path,
            bucket: "experience-media",
            size: 0,
            mimeType: "image/jpeg",
            lastModified: dbEntry.created_at,
            status: "missing",
            experience_id: dbEntry.experience_id,
            experience_slug: dbEntry.exp?.slug || null,
            recipient_name: dbEntry.exp?.recipient_name || null,
          });
        }
      });
    }

    if (targetBucket === "all" || targetBucket === "voice-messages") {
      dbVoicePaths.forEach((dbEntry, path) => {
        if (!storagePathsSet.has(`voice-messages:${path}`)) {
          resultFiles.push({
            id: dbEntry.id,
            name: path.split("/").pop() || path,
            path,
            bucket: "voice-messages",
            size: dbEntry.file_size_bytes || 0,
            mimeType: dbEntry.mime_type || "audio/webm",
            lastModified: dbEntry.created_at,
            status: "missing",
            experience_id: dbEntry.experience_id,
            experience_slug: dbEntry.exp?.slug || null,
            recipient_name: dbEntry.exp?.recipient_name || null,
          });
        }
      });
    }

    // Filter by status if requested
    const filtered = filterStatus === "all"
      ? resultFiles
      : resultFiles.filter((f) => f.status === filterStatus);

    const stats = {
      total: resultFiles.length,
      active: resultFiles.filter((f) => f.status === "active").length,
      orphaned: resultFiles.filter((f) => f.status === "orphaned").length,
      missing: resultFiles.filter((f) => f.status === "missing").length,
    };

    return NextResponse.json({
      files: filtered,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
