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

export async function POST(request: Request) {
  let body: { draftId?: string; draft?: BirthdayDraft };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // 1. Retrieve creator secret from HttpOnly session cookie
  const creatorSecret = getOrCreateCreatorSessionToken();
  const creatorTokenHash = hashCreatorSecret(creatorSecret);

  const draftId = body.draftId || "draft_default";
  const draft = body.draft || (await localDraftRepository.getDraft(draftId));

  if (!draft || !draft.recipientName.trim()) {
    return NextResponse.json(
      { error: "Recipient name is required before publishing." },
      { status: 400 }
    );
  }

  // 2. Validate PIN and generate high-entropy slug & salted PIN hash
  const pin = (draft.pin || "").trim();
  if (draft.isPinProtected && !pin) {
    return NextResponse.json(
      { error: "A PIN is required before publishing." },
      { status: 400 }
    );
  }

  const slug = generateHighEntropySlug(draft.recipientName);
  const { hash, salt } = hashPin(pin);

  if (isSupabaseConfigured()) {
    try {
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

      const { data: exp, error: expError } = await (supabaseAdminClient as any)
        .from("experiences")
        .upsert(experienceRow, { onConflict: experienceRow.id ? "id" : "slug" })
        .select()
        .single();

      if (expError) throw expError;

      // Media Persistence & Storage Upload
      if (draft.photos && draft.photos.length > 0) {
        await (supabaseAdminClient as any).from("media").delete().eq("experience_id", exp.id);

        const mediaInserts = [];
        for (let idx = 0; idx < draft.photos.length; idx++) {
          const p = draft.photos[idx];
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

          mediaInserts.push({
            experience_id: exp.id,
            storage_path: storagePath,
            type: "image",
            caption: p.caption || null,
            sort_order: idx + 1,
            metadata: {
              mime_type: mimeType,
              file_size: fileSize,
            },
          });
        }

        if (mediaInserts.length > 0) {
          const { error: mediaError } = await (supabaseAdminClient as any)
            .from("media")
            .insert(mediaInserts);
          if (mediaError) throw mediaError;
        }
      }

      // Music Persistence
      if (draft.musicTitle) {
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
      }
    } catch (e) {
      console.error("Supabase publish error:", e);
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
    return NextResponse.json(
      { error: appUrlError || "Server configuration error: Invalid canonical URL." },
      { status: 500 }
    );
  }

  const shareUrl = new URL(`/g/${slug}`, validatedAppUrl).toString();

  return NextResponse.json({
    success: true,
    slug,
    shareUrl,
  });
}
