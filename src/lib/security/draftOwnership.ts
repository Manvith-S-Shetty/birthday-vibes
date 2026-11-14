import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

interface DraftOwnershipRecord {
  ownerTokenHash: string;
  createdAt: number;
  lastActiveAt: number;
  photoUploadCount: number;
  voiceUploadCount: number;
}

interface CreatorSessionQuota {
  tokenHash: string;
  draftIds: Set<string>;
  totalUploads: number;
  windowResetAt: number;
}

// In-memory cache for fast local lookup within a running process
const draftRegistry = new Map<string, DraftOwnershipRecord>();
const creatorQuotas = new Map<string, CreatorSessionQuota>();

const MAX_DRAFTS_PER_SESSION = 25;
const MAX_UPLOADS_PER_WINDOW = 120; // 120 uploads per hour per creator session
const WINDOW_DURATION_MS = 60 * 60 * 1000; // 1 hour

const MAX_PHOTOS_PER_DRAFT = 35;
const MAX_VOICE_PER_DRAFT = 10;

/**
 * Test helper to simulate serverless cold starts or multi-instance environments
 * by wiping the in-memory registry so ownership must be resolved via persistent store.
 */
export function _clearInMemoryRegistryForTesting(): void {
  draftRegistry.clear();
  creatorQuotas.clear();
}

// Cleanup stale in-memory draft registrations older than 7 days
function cleanupStaleRegistry(): void {
  const now = Date.now();
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  draftRegistry.forEach((record, draftId) => {
    if (now - record.lastActiveAt > maxAgeMs) {
      draftRegistry.delete(draftId);
    }
  });
}

/**
 * Asserts whether a creator session owns a given draftId.
 * Guarantees persistence across serverless cold starts and separate Vercel instances
 * by checking and anchoring draft ownership in the database experiences table.
 */
export async function assertDraftOwnership(
  draftId: string,
  creatorTokenHash: string
): Promise<{ authorized: boolean; error?: string }> {
  if (!draftId || !creatorTokenHash) {
    return { authorized: false, error: "Missing draft ID or creator session." };
  }

  // 'draft_default' is the standard unassigned template draft identifier
  if (draftId === "draft_default") {
    return { authorized: true };
  }

  // Periodic maintenance
  if (Math.random() < 0.05) {
    cleanupStaleRegistry();
  }

  const now = Date.now();

  // 1. Check in-memory draft registry (hot instance fast path)
  const existingInMemory = draftRegistry.get(draftId);
  if (existingInMemory) {
    if (existingInMemory.ownerTokenHash !== creatorTokenHash) {
      return {
        authorized: false,
        error: "Forbidden: This draft namespace belongs to another creator session.",
      };
    }
    existingInMemory.lastActiveAt = now;
    return { authorized: true };
  }

  // 2. Cold start / multi-instance fallback: Check persistent Supabase database
  if (isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId);
      const query = isUuid
        ? (supabaseAdminClient as any)
            .from("experiences")
            .select("id, slug, creator_session_token, status")
            .or(`id.eq.${draftId},slug.eq.${draftId}`)
        : (supabaseAdminClient as any)
            .from("experiences")
            .select("id, slug, creator_session_token, status")
            .eq("slug", draftId);

      const { data: exp } = await query.maybeSingle();

      if (exp && exp.creator_session_token) {
        if (exp.creator_session_token !== creatorTokenHash) {
          return {
            authorized: false,
            error: "Forbidden: This draft namespace belongs to another creator session.",
          };
        }

        // Verified against persistent database: cache in memory for this instance
        draftRegistry.set(draftId, {
          ownerTokenHash: creatorTokenHash,
          createdAt: now,
          lastActiveAt: now,
          photoUploadCount: 0,
          voiceUploadCount: 0,
        });

        return { authorized: true };
      }
    } catch (dbErr) {
      console.warn("[DRAFT_OWNERSHIP] Supabase verification query warning:", dbErr);
    }
  }

  // 3. Draft is new/unclaimed: enforce session draft limit
  let sessionQuota = creatorQuotas.get(creatorTokenHash);
  if (!sessionQuota || now > sessionQuota.windowResetAt) {
    sessionQuota = {
      tokenHash: creatorTokenHash,
      draftIds: new Set<string>(),
      totalUploads: 0,
      windowResetAt: now + WINDOW_DURATION_MS,
    };
    creatorQuotas.set(creatorTokenHash, sessionQuota);
  }

  if (!sessionQuota.draftIds.has(draftId) && sessionQuota.draftIds.size >= MAX_DRAFTS_PER_SESSION) {
    return {
      authorized: false,
      error: `Draft limit exceeded. A creator session can manage up to ${MAX_DRAFTS_PER_SESSION} drafts concurrently.`,
    };
  }

  sessionQuota.draftIds.add(draftId);

  // 4. Anchor ownership in database so other serverless instances & cold starts recognize it
  if (isSupabaseConfigured()) {
    try {
      await (supabaseAdminClient as any)
        .from("experiences")
        .upsert(
          {
            slug: draftId,
            creator_session_token: creatorTokenHash,
            status: "draft",
            recipient_name: "Draft",
          },
          { onConflict: "slug", ignoreDuplicates: true }
        );
    } catch {
      // Non-blocking fallback if draft record already anchored
    }
  }

  // 5. Register in local memory
  draftRegistry.set(draftId, {
    ownerTokenHash: creatorTokenHash,
    createdAt: now,
    lastActiveAt: now,
    photoUploadCount: 0,
    voiceUploadCount: 0,
  });

  return { authorized: true };
}

/**
 * Checks and increments upload count for a draft and creator session.
 */
export function recordAndCheckUploadQuota(
  draftId: string,
  creatorTokenHash: string,
  mediaType: "photo" | "voice"
): { allowed: boolean; error?: string } {
  const now = Date.now();

  // Session-level upload limit
  let sessionQuota = creatorQuotas.get(creatorTokenHash);
  if (!sessionQuota || now > sessionQuota.windowResetAt) {
    sessionQuota = {
      tokenHash: creatorTokenHash,
      draftIds: new Set<string>([draftId]),
      totalUploads: 0,
      windowResetAt: now + WINDOW_DURATION_MS,
    };
    creatorQuotas.set(creatorTokenHash, sessionQuota);
  }

  if (sessionQuota.totalUploads >= MAX_UPLOADS_PER_WINDOW) {
    return {
      allowed: false,
      error: "Session upload rate limit reached. Please wait before uploading more files.",
    };
  }

  // Draft-level upload limit
  const draftRecord = draftRegistry.get(draftId);
  if (draftRecord) {
    if (mediaType === "photo" && draftRecord.photoUploadCount >= MAX_PHOTOS_PER_DRAFT) {
      return {
        allowed: false,
        error: `Photo upload limit of ${MAX_PHOTOS_PER_DRAFT} photos reached for this draft.`,
      };
    }
    if (mediaType === "voice" && draftRecord.voiceUploadCount >= MAX_VOICE_PER_DRAFT) {
      return {
        allowed: false,
        error: `Voice message upload limit reached for this draft.`,
      };
    }

    if (mediaType === "photo") {
      draftRecord.photoUploadCount += 1;
    } else {
      draftRecord.voiceUploadCount += 1;
    }
  }

  sessionQuota.totalUploads += 1;
  return { allowed: true };
}

/**
 * Checks if a given draftId is owned by the creatorTokenHash.
 */
export function isDraftOwnedBySession(draftId: string, creatorTokenHash: string): boolean {
  if (draftId === "draft_default") return true;
  const record = draftRegistry.get(draftId);
  if (!record) {
    const sessionQuota = creatorQuotas.get(creatorTokenHash);
    return Boolean(sessionQuota?.draftIds.has(draftId));
  }
  return record.ownerTokenHash === creatorTokenHash;
}
