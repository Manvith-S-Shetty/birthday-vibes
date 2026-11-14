import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, sanitizeExperience } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createZipArchive } from "@/lib/admin/zip";
import { logAdminActivity } from "@/lib/admin/audit";

export async function POST(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { experienceIds, all, page = 1, pageSize = 20 } = body;

  try {
    // 1. Determine which experiences to fetch
    let expQuery = (supabaseAdminClient as any).from("experiences").select("*");

    if (Array.isArray(experienceIds) && experienceIds.length > 0) {
      expQuery = expQuery.in("id", experienceIds);
    } else if (all) {
      const from = (Math.max(1, page) - 1) * pageSize;
      const to = from + pageSize - 1;
      expQuery = expQuery.order("created_at", { ascending: false }).range(from, to);
    } else {
      return NextResponse.json(
        { error: "Must specify experienceIds array or all=true." },
        { status: 400 }
      );
    }

    const { data: rawExperiences, error: expError } = await expQuery;
    if (expError) {
      return NextResponse.json({ error: expError.message }, { status: 500 });
    }

    const experiences = rawExperiences || [];
    if (experiences.length === 0) {
      return NextResponse.json({ error: "No experiences found for export." }, { status: 404 });
    }

    const expIds = experiences.map((e: any) => e.id);

    // 2. Fetch all child relations
    const [mediaRes, musicRes, momentsRes, voiceRes] = await Promise.all([
      (supabaseAdminClient as any).from("media").select("*").in("experience_id", expIds).order("sort_order", { ascending: true }),
      (supabaseAdminClient as any).from("music").select("*").in("experience_id", expIds),
      (supabaseAdminClient as any).from("experience_moments").select("*").in("experience_id", expIds).order("sort_order", { ascending: true }),
      (supabaseAdminClient as any).from("voice_messages").select("*").in("experience_id", expIds),
    ]);

    const mediaByExp = new Map<string, any[]>();
    (mediaRes.data || []).forEach((m: any) => {
      const list = mediaByExp.get(m.experience_id) || [];
      list.push(m);
      mediaByExp.set(m.experience_id, list);
    });

    const musicByExp = new Map<string, any>();
    (musicRes.data || []).forEach((mu: any) => musicByExp.set(mu.experience_id, mu));

    const momentsByExp = new Map<string, any[]>();
    (momentsRes.data || []).forEach((mo: any) => {
      const list = momentsByExp.get(mo.experience_id) || [];
      list.push(mo);
      momentsByExp.set(mo.experience_id, list);
    });

    const voiceByExp = new Map<string, any>();
    (voiceRes.data || []).forEach((v: any) => voiceByExp.set(v.experience_id, v));

    // 3. Prepare ZIP files collection
    const zipFiles: Array<{ name: string; content: Buffer | string }> = [];
    const missingOrFailedFiles: Array<{
      experience_id: string;
      bucket: string;
      path: string;
      error: string;
    }> = [];

    const exportedExperiencesManifest: any[] = [];
    let totalFilesReferenced = 0;
    let successfullyBundled = 0;

    // Helper to sanitize path for zip
    const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

    for (const rawExp of experiences) {
      const expSafe = sanitizeExperience(rawExp);
      const expSlugOrId = expSafe.slug || expSafe.id;
      const folderPrefix = `experiences/${sanitizeFilename(expSlugOrId)}`;

      const expMedia = mediaByExp.get(expSafe.id) || [];
      const expMusic = musicByExp.get(expSafe.id) || null;
      const expMoments = momentsByExp.get(expSafe.id) || [];
      const expVoice = voiceByExp.get(expSafe.id) || null;

      totalFilesReferenced += expMedia.length + (expVoice ? 1 : 0);

      // Download Media Files
      const mediaManifest: any[] = [];
      for (const m of expMedia) {
        let cleanPath = m.storage_path;
        if (cleanPath.startsWith("experience-media/")) {
          cleanPath = cleanPath.substring("experience-media/".length);
        }

        const rawFilename = cleanPath.split("/").pop() || `media_${m.id}.jpg`;
        const localZipPath = `${folderPrefix}/media/${m.sort_order}_${sanitizeFilename(rawFilename)}`;

        try {
          const { data: blob, error: dlError } = await supabaseAdminClient.storage
            .from("experience-media")
            .download(cleanPath);

          if (dlError || !blob) {
            missingOrFailedFiles.push({
              experience_id: expSafe.id,
              bucket: "experience-media",
              path: cleanPath,
              error: dlError?.message || "Storage object not found.",
            });
            mediaManifest.push({
              ...m,
              bundled: false,
              bundle_path: null,
              download_error: dlError?.message || "Not found",
            });
          } else {
            const arrayBuffer = await blob.arrayBuffer();
            zipFiles.push({
              name: localZipPath,
              content: Buffer.from(arrayBuffer),
            });
            successfullyBundled += 1;
            mediaManifest.push({
              ...m,
              bundled: true,
              bundle_path: localZipPath,
            });
          }
        } catch (err: any) {
          missingOrFailedFiles.push({
            experience_id: expSafe.id,
            bucket: "experience-media",
            path: cleanPath,
            error: err.message,
          });
          mediaManifest.push({
            ...m,
            bundled: false,
            bundle_path: null,
            download_error: err.message,
          });
        }
      }

      // Download Voice Message
      let voiceManifest: any = null;
      if (expVoice && expVoice.storage_path) {
        let cleanPath = expVoice.storage_path;
        if (cleanPath.startsWith("voice-messages/")) {
          cleanPath = cleanPath.substring("voice-messages/".length);
        }

        const rawFilename = cleanPath.split("/").pop() || `voice_${expVoice.id}.webm`;
        const localZipPath = `${folderPrefix}/voice/${sanitizeFilename(rawFilename)}`;

        try {
          const { data: blob, error: dlError } = await supabaseAdminClient.storage
            .from("voice-messages")
            .download(cleanPath);

          if (dlError || !blob) {
            missingOrFailedFiles.push({
              experience_id: expSafe.id,
              bucket: "voice-messages",
              path: cleanPath,
              error: dlError?.message || "Storage object not found.",
            });
            voiceManifest = {
              ...expVoice,
              bundled: false,
              bundle_path: null,
              download_error: dlError?.message || "Not found",
            };
          } else {
            const arrayBuffer = await blob.arrayBuffer();
            zipFiles.push({
              name: localZipPath,
              content: Buffer.from(arrayBuffer),
            });
            successfullyBundled += 1;
            voiceManifest = {
              ...expVoice,
              bundled: true,
              bundle_path: localZipPath,
            };
          }
        } catch (err: any) {
          missingOrFailedFiles.push({
            experience_id: expSafe.id,
            bucket: "voice-messages",
            path: cleanPath,
            error: err.message,
          });
          voiceManifest = {
            ...expVoice,
            bundled: false,
            bundle_path: null,
            download_error: err.message,
          };
        }
      }

      const experienceBundle = {
        experience: expSafe,
        media: mediaManifest,
        music: expMusic,
        moments: expMoments,
        voice_message: voiceManifest,
      };

      exportedExperiencesManifest.push(experienceBundle);

      // Add individual experience manifest JSON inside its folder
      zipFiles.push({
        name: `${folderPrefix}/experience.json`,
        content: JSON.stringify(experienceBundle, null, 2),
      });
    }

    // 4. Create Root Master Manifest
    const masterManifest = {
      backup_version: "1.0.0",
      backup_type: "Application Content Backup (Experiences & Storage Media)",
      notice:
        "This archive contains an application content backup. It is not an encrypted full database snapshot. Authentication secrets (pin_hash, pin_salt, creator_session_token) are strictly omitted for security.",
      exported_at: new Date().toISOString(),
      exported_by: session.email,
      experiences_count: exportedExperiencesManifest.length,
      files_summary: {
        total_files_referenced: totalFilesReferenced,
        successfully_bundled: successfullyBundled,
        missing_or_failed_count: missingOrFailedFiles.length,
      },
      missing_or_failed_files: missingOrFailedFiles,
      experiences: exportedExperiencesManifest,
    };

    zipFiles.unshift({
      name: "manifest.json",
      content: JSON.stringify(masterManifest, null, 2),
    });

    // 5. Pack ZIP buffer
    const zipBuffer = createZipArchive(zipFiles);

    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const zipName =
      experiences.length === 1
        ? `wishlight-${sanitizeFilename(experiences[0].slug || experiences[0].id)}-${timestampStr}.zip`
        : `wishlight-content-backup-${timestampStr}.zip`;

    // 6. Log the backup export
    await logAdminActivity({
      actor: session.email,
      action: experiences.length === 1 ? "backup.export_single" : "backup.export_batch",
      target_id: experiences.length === 1 ? experiences[0].id : undefined,
      target_type: "backup",
      details: {
        experiencesCount: experiences.length,
        filesBundled: successfullyBundled,
        filesMissing: missingOrFailedFiles.length,
        zipSizeBytes: zipBuffer.length,
      },
      status: "success",
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", `attachment; filename="${zipName}"`);
    headers.set("Content-Length", zipBuffer.length.toString());
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate backup archive." },
      { status: 500 }
    );
  }
}
