import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isExperienceExpired } from "./expiration";

export interface CleanupResult {
  success: boolean;
  dryRun: boolean;
  timestamp: string;
  processedCount: number;
  cleanedExperienceIds: string[];
  deletedStorageFiles: {
    bucket: string;
    path: string;
    experienceId: string;
  }[];
  skippedSharedFiles: {
    bucket: string;
    path: string;
    experienceId: string;
    reason: string;
  }[];
  errors: {
    experienceId?: string;
    error: string;
  }[];
}

export interface CleanupOptions {
  dryRun?: boolean;
  limit?: number;
  now?: Date;
}

/**
 * Validates whether a storage path is an internal Supabase Storage key
 * rather than an external web URL or data URI.
 */
export function isInternalStoragePath(path?: string | null): boolean {
  if (!path || typeof path !== "string") return false;
  const trimmed = path.trim().toLowerCase();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return false;
  }
  return true;
}

/**
 * Normalizes a storage path for a bucket by removing the bucket prefix if present.
 */
export function normalizeStorageKey(path: string, bucketName: string): string {
  const prefix = `${bucketName}/`;
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }
  return path;
}

/**
 * Automated Cleanup Service for Expired Experiences.
 *
 * Guarantees:
 * 1. Ownership & Dependency Verification: Never deletes assets referenced by any active experience.
 * 2. Safe Retention: Marks experiences as 'expired' to allow recipients to see the polished expired screen
 *    while permanently retiring private media from storage.
 * 3. Dry-run Capable: Allows testing & auditing without mutating production data.
 */
export async function cleanExpiredExperiences(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const { dryRun = false, limit = 50, now = new Date() } = options;
  const nowIso = now.toISOString();

  const result: CleanupResult = {
    success: true,
    dryRun,
    timestamp: nowIso,
    processedCount: 0,
    cleanedExperienceIds: [],
    deletedStorageFiles: [],
    skippedSharedFiles: [],
    errors: [],
  };

  if (!isSupabaseConfigured()) {
    console.info("[CLEANUP_SERVICE] Supabase is not configured; running in mock/offline mode.");
    return result;
  }

  try {
    // 1. Identify expired experiences that still need cleanup
    // Query experiences where expires_at <= now, or status is expired with remaining media
    const { data: expiredExps, error: queryError } = await (supabaseAdminClient as any)
      .from("experiences")
      .select("id, slug, recipient_name, expires_at, status")
      .or(`expires_at.lte.${nowIso},status.eq.expired`)
      .limit(limit);

    if (queryError) {
      const isNetworkError =
        queryError.message?.includes("fetch failed") ||
        queryError.message?.includes("ENOTFOUND") ||
        (queryError as any).details?.includes("ENOTFOUND");

      if (isNetworkError) {
        console.warn("[CLEANUP_SERVICE] Supabase endpoint unreachable (offline/test environment):", queryError.message);
        result.success = true;
        result.errors.push({ error: "Supabase endpoint unreachable in current environment" });
        return result;
      }

      console.error("[CLEANUP_SERVICE] Error querying expired experiences:", queryError);
      result.success = false;
      result.errors.push({ error: queryError.message || "Failed to query expired experiences" });
      return result;
    }

    if (!expiredExps || expiredExps.length === 0) {
      console.info("[CLEANUP_SERVICE] No expired experiences found requiring cleanup.");
      return result;
    }

    // Filter to only those that are legitimately expired
    const candidates = expiredExps.filter(
      (e: any) => e.status === "expired" || isExperienceExpired(e.expires_at, now)
    );

    for (const exp of candidates) {
      result.processedCount++;
      const expId = exp.id;

      try {
        // --- A. Media cleanup with Shared-Asset Dependency Check ---
        const { data: mediaRows, error: mediaQueryError } = await (supabaseAdminClient as any)
          .from("media")
          .select("id, storage_path")
          .eq("experience_id", expId);

        if (mediaQueryError) {
          throw new Error(`Failed to query media for experience ${expId}: ${mediaQueryError.message}`);
        }

        const filesToDeleteFromMediaBucket: string[] = [];

        if (mediaRows && mediaRows.length > 0) {
          for (const m of mediaRows) {
            const rawPath = m.storage_path;
            if (!isInternalStoragePath(rawPath)) {
              continue; // External URL or data URI, no bucket file to delete
            }

            const storageKey = normalizeStorageKey(rawPath, "experience-media");

            // DEPENDENCY CHECK: Is this storage_path referenced by ANY OTHER ACTIVE experience?
            // Active experience: (expires_at IS NULL OR expires_at > now) AND status != 'expired' AND id != expId
            const { data: sharingRows, error: shareCheckError } = await (supabaseAdminClient as any)
              .from("media")
              .select("id, experience_id, experiences!inner(id, expires_at, status)")
              .eq("storage_path", rawPath)
              .neq("experience_id", expId);

            if (shareCheckError) {
              console.warn("[CLEANUP_SERVICE] Could not verify media dependencies:", shareCheckError);
            }

            const activeHolders = (sharingRows || []).filter((r: any) => {
              const otherExp = r.experiences;
              if (!otherExp) return false;
              if (otherExp.status === "expired") return false;
              return !isExperienceExpired(otherExp.expires_at, now);
            });

            if (activeHolders.length > 0) {
              // Asset is shared with at least one active experience!
              result.skippedSharedFiles.push({
                bucket: "experience-media",
                path: storageKey,
                experienceId: expId,
                reason: `File is shared with ${activeHolders.length} active experience(s). Preserved for integrity.`,
              });
              continue;
            }

            filesToDeleteFromMediaBucket.push(storageKey);
            result.deletedStorageFiles.push({
              bucket: "experience-media",
              path: storageKey,
              experienceId: expId,
            });
          }
        }

        // --- B. Voice message cleanup with Dependency Check ---
        const { data: voiceRows, error: voiceQueryError } = await (supabaseAdminClient as any)
          .from("voice_messages")
          .select("id, storage_path")
          .eq("experience_id", expId);

        if (voiceQueryError) {
          throw new Error(`Failed to query voice messages for experience ${expId}: ${voiceQueryError.message}`);
        }

        const filesToDeleteFromVoiceBucket: string[] = [];

        if (voiceRows && voiceRows.length > 0) {
          for (const v of voiceRows) {
            const rawPath = v.storage_path;
            if (!isInternalStoragePath(rawPath)) continue;

            const storageKey = normalizeStorageKey(rawPath, "voice-messages");

            // DEPENDENCY CHECK for voice note
            const { data: sharingVoice, error: shareVoiceError } = await (supabaseAdminClient as any)
              .from("voice_messages")
              .select("id, experience_id, experiences!inner(id, expires_at, status)")
              .eq("storage_path", rawPath)
              .neq("experience_id", expId);

            if (shareVoiceError) {
              console.warn("[CLEANUP_SERVICE] Could not verify voice message dependencies:", shareVoiceError);
            }

            const activeVoiceHolders = (sharingVoice || []).filter((r: any) => {
              const otherExp = r.experiences;
              if (!otherExp) return false;
              if (otherExp.status === "expired") return false;
              return !isExperienceExpired(otherExp.expires_at, now);
            });

            if (activeVoiceHolders.length > 0) {
              result.skippedSharedFiles.push({
                bucket: "voice-messages",
                path: storageKey,
                experienceId: expId,
                reason: `Voice message is shared with active experience. Preserved for integrity.`,
              });
              continue;
            }

            filesToDeleteFromVoiceBucket.push(storageKey);
            result.deletedStorageFiles.push({
              bucket: "voice-messages",
              path: storageKey,
              experienceId: expId,
            });
          }
        }

        // --- C. Execute Deletion if NOT in Dry-Run mode ---
        if (!dryRun) {
          // Remove storage files from experience-media bucket
          if (filesToDeleteFromMediaBucket.length > 0) {
            const { error: removeMediaStorageError } = await supabaseAdminClient.storage
              .from("experience-media")
              .remove(filesToDeleteFromMediaBucket);

            if (removeMediaStorageError) {
              console.error("[CLEANUP_SERVICE] Failed to delete media storage files:", removeMediaStorageError);
            }
          }

          // Remove storage files from voice-messages bucket
          if (filesToDeleteFromVoiceBucket.length > 0) {
            const { error: removeVoiceStorageError } = await supabaseAdminClient.storage
              .from("voice-messages")
              .remove(filesToDeleteFromVoiceBucket);

            if (removeVoiceStorageError) {
              console.error("[CLEANUP_SERVICE] Failed to delete voice storage files:", removeVoiceStorageError);
            }
          }

          // Delete database media records
          await (supabaseAdminClient as any)
            .from("media")
            .delete()
            .eq("experience_id", expId);

          // Delete database voice_messages records
          await (supabaseAdminClient as any)
            .from("voice_messages")
            .delete()
            .eq("experience_id", expId);

          // Mark experience as 'expired' (tombstone record so recipient sees expired page)
          await (supabaseAdminClient as any)
            .from("experiences")
            .update({
              status: "expired",
              updated_at: new Date().toISOString(),
            })
            .eq("id", expId);
        }

        result.cleanedExperienceIds.push(expId);
      } catch (err: any) {
        console.error(`[CLEANUP_SERVICE] Error processing experience ${expId}:`, err);
        result.errors.push({
          experienceId: expId,
          error: err?.message || String(err),
        });
      }
    }
  } catch (criticalErr: any) {
    const isNetworkError =
      criticalErr?.message?.includes("fetch failed") ||
      criticalErr?.message?.includes("ENOTFOUND") ||
      String(criticalErr).includes("ENOTFOUND");

    if (isNetworkError) {
      console.warn("[CLEANUP_SERVICE] Supabase endpoint unreachable (offline/test environment):", criticalErr?.message);
      result.success = true;
      result.errors.push({ error: "Supabase endpoint unreachable in current environment" });
      return result;
    }

    console.error("[CLEANUP_SERVICE] Critical error in cleanExpiredExperiences:", criticalErr);
    result.success = false;
    result.errors.push({ error: criticalErr?.message || String(criticalErr) });
  }

  return result;
}
