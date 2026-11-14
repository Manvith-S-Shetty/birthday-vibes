import { NextResponse } from "next/server";
import { getOrCreateCreatorSessionToken } from "@/lib/security/session";
import { generateHighEntropySlug, hashPin, hashCreatorSecret } from "@/lib/security/hash";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { assertDraftOwnership } from "@/lib/security/draftOwnership";

import { BirthdayDraft } from "@/types/draft";
import { CURATED_MUSIC_TRACKS } from "@/lib/constants/music";
import { calculateExpiresAt } from "@/lib/expiration/expiration";

function getValidatedCanonicalAppUrl(request: Request): { url?: string; error?: string } {
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (!rawAppUrl) {
    if (isProduction) {
      return {
        error: "Server configuration error: NEXT_PUBLIC_APP_URL environment variable is missing in production.",
      };
    }
    const fallback = request.headers.get("origin") || "http://localhost:3000";
    try {
      return { url: new URL(fallback).origin };
    } catch {
      return { url: "http://localhost:3000" };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(rawAppUrl);
  } catch {
    return {
      error: "Server configuration error: NEXT_PUBLIC_APP_URL is not a valid URL.",
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isProduction) {
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost") ||
      hostname.includes("localhost");

    if (parsed.protocol !== "https:") {
      return {
        error: "Server configuration error: NEXT_PUBLIC_APP_URL must use HTTPS in production.",
      };
    }

    if (isLocalhost) {
      return {
        error: "Server configuration error: NEXT_PUBLIC_APP_URL cannot be a localhost address in production.",
      };
    }
  }

  return { url: parsed.origin };
}

function getAudioExtensionFromMime(mimeType: string): string {
  const mime = mimeType.toLowerCase();
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "audio";
}

export async function POST(request: Request) {
  console.time("[PUBLISH_TIMING] total_publish_route");
  let body: any = {};
  let voiceAudio: File | null = null;
  let voiceMetadata: {
    mimeType?: string;
    durationMs?: number;
    transcript?: string;
  } | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const draftIdValue = formData.get("draftId");
      const draftValue = formData.get("draft");
      const voiceAudioValue = formData.get("voiceAudio");
      const voiceMetadataValue = formData.get("voiceMetadata");

      if (typeof draftIdValue === "string") {
        body.draftId = draftIdValue;
      }

      if (typeof draftValue === "string") {
        body.draft = JSON.parse(draftValue);
      }

      if (voiceAudioValue && typeof (voiceAudioValue as any).arrayBuffer === "function") {
        voiceAudio = voiceAudioValue as File;
      }

      if (typeof voiceMetadataValue === "string") {
        voiceMetadata = JSON.parse(voiceMetadataValue);
      }
    } else {
      body = await request.json();
    }
  } catch {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: "Invalid publish request." },
      { status: 400 }
    );
  }

  // 1. Retrieve creator secret from HttpOnly session cookie
  const creatorSecret = getOrCreateCreatorSessionToken();
  const creatorTokenHash = hashCreatorSecret(creatorSecret);

  const draftId = body.draftId || body.id || "draft_default";

  const draft: BirthdayDraft | null = body.recipientName
    ? (body as BirthdayDraft)
    : body.draft || (await localDraftRepository.getDraft(draftId));

  if (!draft || !draft.recipientName?.trim()) {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: "Recipient name is required before publishing." },
      { status: 400 }
    );
  }

  // 2. Validate PIN and generate high-entropy slug & salted PIN hash
  const pin = (draft.pin || "").trim();
  const isPinProtected = Boolean(draft.isPinProtected);

  if (isPinProtected && (!pin || pin.length < 4 || pin.length > 6)) {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: "A 4 to 6 digit secret PIN is required before publishing when PIN protection is enabled." },
      { status: 400 }
    );
  }

  // Enforce draft ownership before publishing (verified across serverless instances)
  const ownership = await assertDraftOwnership(draftId, creatorTokenHash);
  if (!ownership.authorized) {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: ownership.error || "Forbidden: You are not authorized to publish this draft." },
      { status: 403 }
    );
  }

  // 3. Voice Message Metadata & Binary Validation
  let effectiveVoiceStoragePath =
    body.voiceMessage?.storagePath ||
    draft.voiceMessage?.storagePath;
  const voiceMimeType = (
    voiceMetadata?.mimeType ||
    voiceAudio?.type ||
    body.voiceMessage?.mimeType ||
    draft.voiceMessage?.mimeType ||
    ""
  ).trim();
  const voiceDurationMs =
    voiceMetadata?.durationMs ??
    body.voiceMessage?.durationMs ??
    draft.voiceMessage?.durationMs ??
    0;
  const voiceFileSize =
    voiceAudio?.size ??
    body.voiceMessage?.fileSize ??
    0;
  const voiceTranscript =
    voiceMetadata?.transcript ||
    body.voiceMessage?.transcript ||
    draft.voiceMessage?.transcript ||
    null;

  if (voiceAudio) {
    const isAudioMime =
      voiceMimeType &&
      (voiceMimeType.toLowerCase().startsWith("audio/") ||
        voiceMimeType.toLowerCase().includes("webm") ||
        voiceMimeType.toLowerCase().includes("ogg") ||
        voiceMimeType.toLowerCase().includes("wav") ||
        voiceMimeType.toLowerCase().includes("mp4") ||
        voiceMimeType.toLowerCase().includes("aac") ||
        voiceMimeType.toLowerCase().includes("mpeg") ||
        voiceMimeType.toLowerCase().includes("m4a"));

    if (!isAudioMime) {
      console.timeEnd("[PUBLISH_TIMING] total_publish_route");
      return NextResponse.json(
        { error: "Invalid voice message MIME type." },
        { status: 400 }
      );
    }

    if (voiceAudio.size <= 0 || voiceAudio.size > 10485760) {
      console.timeEnd("[PUBLISH_TIMING] total_publish_route");
      return NextResponse.json(
        { error: "Voice message file size must be between 1 byte and 10MB." },
        { status: 400 }
      );
    }

    if (voiceDurationMs <= 0 || voiceDurationMs > 180000) {
      console.timeEnd("[PUBLISH_TIMING] total_publish_route");
      return NextResponse.json(
        { error: "Voice message duration must be between 1ms and 180000ms." },
        { status: 400 }
      );
    }
  }

  // Preserve slug & experience ID across retries to prevent duplicate experiences
  const experienceId = draft.publishedExperienceId || (draft.id && !draft.id.startsWith("draft_") ? draft.id : undefined);
  let savedExperienceId: string | undefined = experienceId;
  const slug = draft.publishedSlug || generateHighEntropySlug(draft.recipientName);
  const { hash, salt } = (isPinProtected && pin) ? hashPin(pin) : { hash: null, salt: null };
  const publishedAt = new Date();
  const expirationOption = draft.expirationOption || "never";
  const expiresAt = calculateExpiresAt(expirationOption, publishedAt);

  let isNewlyCreatedExperience = false;

  if (isSupabaseConfigured()) {
    try {
      console.time("[PUBLISH_TIMING] total_supabase_pipeline");

      // Handle voice binary storage upload if File body was provided
      if (voiceAudio && !effectiveVoiceStoragePath) {
        const ext = getAudioExtensionFromMime(voiceMimeType);
        const targetVoiceId = experienceId || draftId || "voice";
        effectiveVoiceStoragePath = `drafts/${targetVoiceId}/voice-message.${ext}`;
        const buffer = Buffer.from(await voiceAudio.arrayBuffer());

        let { error: uploadError } = await supabaseAdminClient.storage
          .from("voice-messages")
          .upload(effectiveVoiceStoragePath, buffer, {
            contentType: voiceMimeType,
            upsert: true,
          });

        if (uploadError && uploadError.message?.includes("Bucket not found")) {
          await supabaseAdminClient.storage.createBucket("voice-messages", { public: false });
          const retry = await supabaseAdminClient.storage
            .from("voice-messages")
            .upload(effectiveVoiceStoragePath, buffer, {
              contentType: voiceMimeType,
              upsert: true,
            });
          uploadError = retry.error;
        }

        if (uploadError) {
          throw uploadError;
        }
      }

      // Prepare standardized entity rows for atomic transaction
      const experienceRow: any = {
        creator_session_token: creatorTokenHash,
        slug,
        recipient_name: draft.recipientName,
        birthday_date: draft.birthdayDate || null,
        relationship: draft.relationship || null,
        opening_style: draft.openingStyle || "cinematic-premiere",
        memory_display_mode: draft.memoryDisplayMode || "grid",
        theme_id: draft.themeId,
        personal_message: draft.personalMessage,
        pin_hash: hash,
        pin_salt: salt,
        is_pin_protected: isPinProtected,
        status: "published",
        current_step: "publish",
        expires_at: expiresAt,
        expiration_option: expirationOption,
      };
      if (experienceId) {
        experienceRow.id = experienceId;
      }

      // Prepare media rows (handling any legacy Base64 conversion if needed)
      const preparedMediaRows: any[] = [];
      if (draft.photos && draft.photos.length > 0) {
        for (let idx = 0; idx < draft.photos.length; idx++) {
          const p = draft.photos[idx];
          let storagePath = p.storagePath || p.url;
          let mimeType = (p as any).metadata?.mime_type || "image/jpeg";
          let fileSize = (p as any).metadata?.file_size || 1024;

          if (storagePath && storagePath.startsWith("data:")) {
            const mimeMatch = storagePath.match(/^data:([^;]+);base64,/);
            if (mimeMatch) mimeType = mimeMatch[1];
            const ext = mimeType.split("/")[1] || "jpg";
            const base64Data = storagePath.split(";base64,").pop() || "";
            const buffer = Buffer.from(base64Data, "base64");
            fileSize = buffer.length;
            const fileId = p.id || `photo_${idx + 1}`;
            storagePath = `drafts/${draft.id || slug}/${fileId}.${ext}`;

            const { error: uploadError } = await supabaseAdminClient.storage
              .from("experience-media")
              .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

            if (uploadError) throw uploadError;
          } else {
            if (
              !storagePath ||
              typeof storagePath !== "string" ||
              storagePath.includes("..") ||
              storagePath.includes("\\") ||
              storagePath.startsWith("/")
            ) {
              throw new Error(`Invalid photo storage path: ${storagePath}`);
            }
          }

          preparedMediaRows.push({
            storage_path: storagePath,
            type: "image",
            caption: p.caption || null,
            sort_order: idx + 1,
            metadata: {
              mime_type: mimeType,
              file_size: fileSize,
              date: p.date || null,
              location: p.location || null,
              chapter: p.chapter || null,
            },
          });
        }
      }

      // Prepare music row
      const matchedTrack = CURATED_MUSIC_TRACKS.find((t) => t.id === draft.musicTrackId);
      const preparedMusicRow = draft.musicTitle ? {
        source_type: "curated",
        source_url: draft.musicUrl || null,
        track_id: draft.musicTrackId || null,
        title: draft.musicTitle,
        artist: matchedTrack?.artist || null,
      } : null;

      // Prepare voice row
      let preparedVoiceRow: any = null;
      if (effectiveVoiceStoragePath) {
        if (
          effectiveVoiceStoragePath.includes("..") ||
          effectiveVoiceStoragePath.includes("\\") ||
          effectiveVoiceStoragePath.startsWith("/")
        ) {
          throw new Error(`Invalid voice message storage path: ${effectiveVoiceStoragePath}`);
        }

        preparedVoiceRow = {
          storage_path: effectiveVoiceStoragePath,
          mime_type: voiceMimeType || "audio/webm",
          duration_ms: Math.round(voiceDurationMs),
          file_size_bytes: voiceFileSize || 1024,
          transcript: voiceTranscript,
        };
      }

      // Prepare moments rows
      const VALID_MOMENT_TYPES = new Set([
        "mystery_gift", "memory_quiz", "birthday_roulette",
        "hidden_message", "birthday_coupon", "countdown", "wish_moment"
      ]);
      const preparedMomentsRows = (draft.moments || [])
        .filter((m) => m && typeof m === "object" && m.enabled !== false && VALID_MOMENT_TYPES.has(m.momentType))
        .map((m, idx) => ({
          moment_type: m.momentType,
          config_json: m.config && typeof m.config === "object" ? m.config : {},
          sort_order: typeof m.sortOrder === "number" ? m.sortOrder : idx + 1,
        }));

      // =========================================================================
      // STRATEGY A: Invocation of PostgreSQL publish_experience_transactional RPC
      // Guarantees genuine ACID database transaction across experiences, media, voice, music, moments
      // =========================================================================
      let rpcExecutedSuccessfully = false;
      try {
        console.time("[PUBLISH_TIMING] transactional_rpc");
        const { data: rpcData, error: rpcError } = await (supabaseAdminClient as any).rpc(
          "publish_experience_transactional",
          {
            p_experience_row: experienceRow,
            p_media_rows: preparedMediaRows,
            p_music_row: preparedMusicRow,
            p_voice_row: preparedVoiceRow,
            p_moments_rows: preparedMomentsRows,
          }
        );

        if (!rpcError && rpcData?.success) {
          rpcExecutedSuccessfully = true;
          savedExperienceId = rpcData.id;
          console.log("[PUBLISH] Successfully executed publish_experience_transactional RPC.");
        } else if (rpcError) {
          const isRpcMissing =
            rpcError.code === "PGRST202" ||
            rpcError.code === "42883" ||
            rpcError.message?.toLowerCase().includes("could not find the function") ||
            rpcError.message?.toLowerCase().includes("does not exist") ||
            rpcError.message?.toLowerCase().includes("schema cache");

          if (isRpcMissing) {
            console.info("[PUBLISH] RPC not available in DB schema, falling back to staged persistence:", rpcError.message);
          } else {
            console.error("[PUBLISH] Transactional RPC execution error:", rpcError);
            throw new Error(rpcError.message || "Atomic publishing transaction failed");
          }
        }
        console.timeEnd("[PUBLISH_TIMING] transactional_rpc");
      } catch (rpcErr: any) {
        if (
          rpcErr?.message &&
          !rpcErr.message.toLowerCase().includes("does not exist") &&
          !rpcErr.message.toLowerCase().includes("schema cache") &&
          !rpcErr.message.toLowerCase().includes("could not find the function")
        ) {
          throw rpcErr;
        }
        console.info("[PUBLISH] RPC invocation exception, using staged persistence fallback:", rpcErr);
      }

      // =========================================================================
      // STRATEGY B: Staged Two-Phase Persistence Fallback with Compensating Rollback
      // Used when RPC migration has not yet been applied to the remote database
      // =========================================================================
      if (!rpcExecutedSuccessfully) {
        console.time("[PUBLISH_TIMING] staged_persistence_fallback");
        // Phase 1: Upsert experience in 'draft' status so incomplete records are never visible
        const stagedRow = { ...experienceRow, status: "draft" };

        let { data: exp, error: expError } = await (supabaseAdminClient as any)
          .from("experiences")
          .upsert(stagedRow, { onConflict: stagedRow.id ? "id" : "slug" })
          .select()
          .single();

        if (exp?.id) {
          savedExperienceId = exp.id;
          if (!experienceId) isNewlyCreatedExperience = true;
        }

        if (
          expError &&
          (expError.message?.includes("relationship") ||
            expError.message?.includes("opening_style") ||
            expError.message?.includes("memory_display_mode") ||
            expError.message?.includes("expires_at") ||
            expError.message?.includes("expiration_option"))
        ) {
          delete stagedRow.relationship;
          delete stagedRow.opening_style;
          delete stagedRow.memory_display_mode;
          delete stagedRow.expires_at;
          delete stagedRow.expiration_option;
          const retry = await (supabaseAdminClient as any)
            .from("experiences")
            .upsert(stagedRow, { onConflict: stagedRow.id ? "id" : "slug" })
            .select()
            .single();
          exp = retry.data;
          expError = retry.error;
        }

        if (expError) throw expError;
        if (exp?.id) savedExperienceId = exp.id;

        // Phase 2: Execute child persistence tasks
        const mediaTask = (async () => {
          if (preparedMediaRows.length === 0) return;
          await (supabaseAdminClient as any).from("media").delete().eq("experience_id", exp.id);
          const inserts = preparedMediaRows.map((r) => ({ ...r, experience_id: exp.id }));
          const { error } = await (supabaseAdminClient as any).from("media").insert(inserts);
          if (error) throw error;
        })();

        const musicTask = (async () => {
          if (!preparedMusicRow) return;
          await (supabaseAdminClient as any).from("music").delete().eq("experience_id", exp.id);
          const { error } = await (supabaseAdminClient as any)
            .from("music")
            .insert({ ...preparedMusicRow, experience_id: exp.id });
          if (error) throw error;
        })();

        const voiceTask = (async () => {
          if (preparedVoiceRow) {
            const { error } = await (supabaseAdminClient as any)
              .from("voice_messages")
              .upsert(
                { ...preparedVoiceRow, experience_id: exp.id, updated_at: new Date().toISOString() },
                { onConflict: "experience_id" }
              );
            if (error) throw error;
          } else {
            await (supabaseAdminClient as any).from("voice_messages").delete().eq("experience_id", exp.id);
          }
        })();

        const momentsTask = (async () => {
          await (supabaseAdminClient as any).from("experience_moments").delete().eq("experience_id", exp.id);
          if (preparedMomentsRows.length > 0) {
            const inserts = preparedMomentsRows.map((m) => ({ ...m, experience_id: exp.id, enabled: true }));
            const { error } = await (supabaseAdminClient as any).from("experience_moments").insert(inserts);
            if (error) throw error;
          }
        })();

        await Promise.all([mediaTask, musicTask, voiceTask, momentsTask]);

        // Phase 3: Atomic commit transition
        const { error: commitError } = await (supabaseAdminClient as any)
          .from("experiences")
          .update({
            status: "published",
            published_at: publishedAt.toISOString(),
            updated_at: new Date().toISOString(),
            current_step: "publish",
          })
          .eq("id", exp.id);

        if (commitError) throw commitError;
        console.timeEnd("[PUBLISH_TIMING] staged_persistence_fallback");
      }

      console.timeEnd("[PUBLISH_TIMING] total_supabase_pipeline");
    } catch (e: any) {
      console.error("Supabase publish error:", e);
      console.timeEnd("[PUBLISH_TIMING] total_publish_route");

      // Compensating rollback for failed staged publish
      if (savedExperienceId && isNewlyCreatedExperience) {
        try {
          await (supabaseAdminClient as any).from("experiences").delete().eq("id", savedExperienceId);
        } catch {}
      }

      return NextResponse.json(
        { error: e?.message || e?.details || "Failed to persist experience to database. Please try again." },
        { status: 500 }
      );
    }
  }

  // Update local draft status as published
  await localDraftRepository.saveDraft({
    ...draft,
    publishedExperienceId: savedExperienceId,
    publishedSlug: slug,
    expirationOption,
    expiresAt,
    currentStep: "publish",
  });

  const { url: validatedAppUrl, error: appUrlError } = getValidatedCanonicalAppUrl(request);
  if (appUrlError || !validatedAppUrl) {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: appUrlError || "Server configuration error: Invalid canonical URL." },
      { status: 500 }
    );
  }

  const shareUrl = new URL(`/g/${slug}`, validatedAppUrl).toString();

  console.timeEnd("[PUBLISH_TIMING] total_publish_route");
  return NextResponse.json({
    success: true,
    slug,
    shareUrl,
    experienceId: savedExperienceId,
  });
}
