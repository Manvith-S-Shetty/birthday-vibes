import { NextResponse } from "next/server";
import { getOrCreateCreatorSessionToken } from "@/lib/security/session";
import { generateHighEntropySlug, hashPin, hashCreatorSecret } from "@/lib/security/hash";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

import { BirthdayDraft } from "@/types/draft";
import { CURATED_MUSIC_TRACKS } from "@/lib/constants/music";

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
  let body: { draftId?: string; draft?: BirthdayDraft } = {};
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

  const draftId = body.draftId || "draft_default";
  const draft = body.draft || (await localDraftRepository.getDraft(draftId));

  if (!draft || !draft.recipientName.trim()) {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: "Recipient name is required before publishing." },
      { status: 400 }
    );
  }

  // 2. Validate PIN and generate high-entropy slug & salted PIN hash
  const pin = (draft.pin || "").trim();
  if (draft.isPinProtected && !pin) {
    console.timeEnd("[PUBLISH_TIMING] total_publish_route");
    return NextResponse.json(
      { error: "A PIN is required before publishing." },
      { status: 400 }
    );
  }

  // 3. Voice Message Metadata & Binary Validation
  const hasVoiceRecording =
    !!voiceAudio ||
    (draft.voiceMessage && draft.voiceMessage.status === "recorded");

  const voiceMimeType =
    voiceAudio?.type ||
    voiceMetadata?.mimeType ||
    draft.voiceMessage?.mimeType ||
    "";
  const voiceDurationMs =
    voiceMetadata?.durationMs ??
    draft.voiceMessage?.durationMs ??
    0;
  const voiceTranscript =
    voiceMetadata?.transcript ||
    draft.voiceMessage?.transcript ||
    null;
  const voiceFileSize = voiceAudio?.size || 0;

  if (hasVoiceRecording || voiceAudio) {
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

    if (voiceFileSize <= 0 || voiceFileSize > 10485760) {
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

  const slug = generateHighEntropySlug(draft.recipientName);
  const { hash, salt } = hashPin(pin);

  if (isSupabaseConfigured()) {
    try {
      console.time("[PUBLISH_TIMING] total_supabase_pipeline");
      // Upsert experience using ONLY creator_token_hash (NEVER raw secret)
      const experienceRow: any = {
        creator_session_token: creatorTokenHash,
        slug,
        recipient_name: draft.recipientName,
        birthday_date: draft.birthdayDate || null,
        theme_id: draft.themeId,
        personal_message: draft.personalMessage,
        pin_hash: hash,
        pin_salt: salt,
        is_pin_protected: draft.isPinProtected,
        status: "published",
        current_step: "publish",
        published_at: new Date().toISOString(),
      };
      if (draft.id && !draft.id.startsWith("draft_")) {
        experienceRow.id = draft.id;
      }

      console.time("[PUBLISH_TIMING] 1. upsert_experience");
      const { data: exp, error: expError } = await (supabaseAdminClient as any)
        .from("experiences")
        .upsert(experienceRow, { onConflict: experienceRow.id ? "id" : "slug" })
        .select()
        .single();
      console.timeEnd("[PUBLISH_TIMING] 1. upsert_experience");

      if (expError) throw expError;

      // Define independent persistence tasks to execute concurrently
      const mediaTask = (async () => {
        if (!draft.photos || draft.photos.length === 0) return;

        console.time("[PUBLISH_TIMING] media_persistence");
        const deletePromise = (supabaseAdminClient as any)
          .from("media")
          .delete()
          .eq("experience_id", exp.id);

        console.time("[PUBLISH_TIMING] photo_uploads");
        const uploadPromises = draft.photos.map(async (p, idx) => {
          let storagePath = p.url;
          let mimeType = "image/jpeg";
          let fileSize = 1024;

          if (p.url && p.url.startsWith("data:")) {
            const mimeMatch = p.url.match(/^data:([^;]+);base64,/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
            const ext = mimeType.split("/")[1] || "jpg";
            const base64Data = p.url.split(";base64,").pop() || "";
            const buffer = Buffer.from(base64Data, "base64");
            fileSize = buffer.length;

            const fileId = p.id || `photo_${idx + 1}`;
            storagePath = `${exp.id}/${fileId}.${ext}`;

            const { error: uploadError } = await supabaseAdminClient.storage
              .from("experience-media")
              .upload(storagePath, buffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (uploadError) {
              console.error("Supabase Storage photo upload failed:", storagePath, uploadError);
              throw uploadError;
            }
          }

          return {
            idx,
            item: {
              experience_id: exp.id,
              storage_path: storagePath,
              type: "image",
              caption: p.caption || null,
              sort_order: idx + 1,
              metadata: {
                mime_type: mimeType,
                file_size: fileSize,
              },
            },
          };
        });

        const uploadResults = await Promise.all(uploadPromises);
        console.timeEnd("[PUBLISH_TIMING] photo_uploads");

        uploadResults.sort((a, b) => a.idx - b.idx);
        const mediaInserts = uploadResults.map((r) => r.item);

        const { error: deleteError } = await deletePromise;
        if (deleteError) throw deleteError;

        if (mediaInserts.length > 0) {
          console.time("[PUBLISH_TIMING] media_inserts");
          const { error: mediaError } = await (supabaseAdminClient as any)
            .from("media")
            .insert(mediaInserts);
          console.timeEnd("[PUBLISH_TIMING] media_inserts");

          if (mediaError) throw mediaError;
        }
        console.timeEnd("[PUBLISH_TIMING] media_persistence");
      })();

      const musicTask = (async () => {
        if (!draft.musicTitle) return;

        console.time("[PUBLISH_TIMING] music_persistence");
        const matchedTrack = CURATED_MUSIC_TRACKS.find(
          (t) => t.id === draft.musicTrackId
        );
        await (supabaseAdminClient as any).from("music").delete().eq("experience_id", exp.id);
        await (supabaseAdminClient as any).from("music").insert({
          experience_id: exp.id,
          source_type: "curated",
          source_url: draft.musicUrl || null,
          track_id: draft.musicTrackId || null,
          title: draft.musicTitle,
          artist: matchedTrack?.artist || null,
          enabled: true,
        });
        console.timeEnd("[PUBLISH_TIMING] music_persistence");
      })();

      const voiceTask = (async () => {
        if (hasVoiceRecording && voiceAudio) {
          console.time("[PUBLISH_TIMING] voice_persistence");
          const ext = getAudioExtensionFromMime(voiceMimeType);
          const storagePath = `${exp.id}/voice-message.${ext}`;
          const buffer = Buffer.from(await voiceAudio.arrayBuffer());

          const existingVoicePromise = (supabaseAdminClient as any)
            .from("voice_messages")
            .select("storage_path")
            .eq("experience_id", exp.id)
            .maybeSingle();

          console.time("[PUBLISH_TIMING] voice_storage_upload");
          let { error: uploadError } = await supabaseAdminClient.storage
            .from("voice-messages")
            .upload(storagePath, buffer, {
              contentType: voiceMimeType,
              upsert: true,
            });

          if (
            uploadError &&
            (uploadError.message?.includes("Bucket not found") ||
              (uploadError as any).statusCode === 404 ||
              (uploadError as any).error === "Bucket not found")
          ) {
            try {
              await supabaseAdminClient.storage.createBucket("voice-messages", { public: false });
              const retry = await supabaseAdminClient.storage
                .from("voice-messages")
                .upload(storagePath, buffer, {
                  contentType: voiceMimeType,
                  upsert: true,
                });
              uploadError = retry.error;
            } catch {
              // Bucket creation retry fallback
            }
          }

          if (uploadError) {
            console.error("Supabase Storage voice message upload failed:", storagePath, uploadError);
            throw uploadError;
          }
          console.timeEnd("[PUBLISH_TIMING] voice_storage_upload");

          const { data: existingVoice } = await existingVoicePromise;
          if (existingVoice && existingVoice.storage_path !== storagePath) {
            await supabaseAdminClient.storage
              .from("voice-messages")
              .remove([existingVoice.storage_path]);
          }

          console.time("[PUBLISH_TIMING] voice_db_upsert");
          const voiceRow = {
            experience_id: exp.id,
            storage_path: storagePath,
            mime_type: voiceMimeType,
            duration_ms: Math.round(voiceDurationMs),
            file_size_bytes: voiceFileSize,
            transcript: voiceTranscript,
            updated_at: new Date().toISOString(),
          };

          const { error: voiceDbError } = await (supabaseAdminClient as any)
            .from("voice_messages")
            .upsert(voiceRow, { onConflict: "experience_id" });

          if (voiceDbError) throw voiceDbError;
          console.timeEnd("[PUBLISH_TIMING] voice_db_upsert");
          console.timeEnd("[PUBLISH_TIMING] voice_persistence");
        } else if (draft.voiceMessage?.status === "none" || (!hasVoiceRecording && !voiceAudio)) {
          const { data: existingVoice } = await (supabaseAdminClient as any)
            .from("voice_messages")
            .select("storage_path")
            .eq("experience_id", exp.id)
            .maybeSingle();

          if (existingVoice) {
            await supabaseAdminClient.storage
              .from("voice-messages")
              .remove([existingVoice.storage_path]);

            await (supabaseAdminClient as any)
              .from("voice_messages")
              .delete()
              .eq("experience_id", exp.id);
          }
        }
      })();

      const momentsTask = (async () => {
        console.time("[PUBLISH_TIMING] moments_persistence");
        console.time("[PUBLISH_TIMING] delete_existing_moments");
        const { error: deleteMomentsError } = await (supabaseAdminClient as any)
          .from("experience_moments")
          .delete()
          .eq("experience_id", exp.id);
        console.timeEnd("[PUBLISH_TIMING] delete_existing_moments");

        if (deleteMomentsError) throw deleteMomentsError;

        if (Array.isArray(draft.moments) && draft.moments.length > 0) {
          const VALID_MOMENT_TYPES = new Set([
            "mystery_gift",
            "memory_quiz",
            "birthday_roulette",
            "hidden_message",
            "birthday_coupon",
            "countdown",
            "wish_moment",
          ]);

          const momentInserts = draft.moments
            .filter((m) => m && typeof m === "object" && m.enabled !== false && VALID_MOMENT_TYPES.has(m.momentType))
            .map((m, idx) => ({
              experience_id: exp.id,
              moment_type: m.momentType,
              config_json: m.config && typeof m.config === "object" ? m.config : {},
              sort_order: typeof m.sortOrder === "number" ? m.sortOrder : idx + 1,
              enabled: true,
            }));

          if (momentInserts.length > 0) {
            console.time("[PUBLISH_TIMING] insert_moments");
            const { error: momentsError } = await (supabaseAdminClient as any)
              .from("experience_moments")
              .insert(momentInserts);
            console.timeEnd("[PUBLISH_TIMING] insert_moments");

            if (momentsError) throw momentsError;
          }
        }
        console.timeEnd("[PUBLISH_TIMING] moments_persistence");
      })();

      // Run all independent persistence steps concurrently
      await Promise.all([mediaTask, musicTask, voiceTask, momentsTask]);
      console.timeEnd("[PUBLISH_TIMING] total_supabase_pipeline");
    } catch (e) {
      console.error("Supabase publish error:", e);
      console.timeEnd("[PUBLISH_TIMING] total_publish_route");
      return NextResponse.json(
        { error: "Failed to persist experience to database. Please try again." },
        { status: 500 }
      );
    }
  }

  // Update local draft status as published
  await localDraftRepository.saveDraft({
    ...draft,
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
  });
}
