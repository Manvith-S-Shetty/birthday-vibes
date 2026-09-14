import { NextResponse } from "next/server";
import { getOrCreateCreatorSessionToken } from "@/lib/security/session";
import { generateHighEntropySlug, hashPin, hashCreatorSecret } from "@/lib/security/hash";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { supabaseAdminClient } from "@/lib/supabase/server";

import { BirthdayDraft } from "@/types/draft";

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

  // 2. Generate high-entropy slug & salted PIN hash
  const slug = generateHighEntropySlug(draft.recipientName);
  const { hash, salt } = hashPin(draft.pin || "2026");

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

      // Media Persistence
      if (draft.photos && draft.photos.length > 0) {
        await (supabaseAdminClient as any).from("media").delete().eq("experience_id", exp.id);
        const mediaInserts = draft.photos.map((p, idx) => ({
          experience_id: exp.id,
          storage_path: p.url,
          mime_type: "image/jpeg",
          file_size: 1024,
          type: "image",
          caption: p.caption || null,
          sort_order: idx + 1,
        }));
        await (supabaseAdminClient as any).from("media").insert(mediaInserts);
      }

      // Music Persistence
      if (draft.musicTitle) {
        await (supabaseAdminClient as any).from("music").delete().eq("experience_id", exp.id);
        await (supabaseAdminClient as any).from("music").insert({
          experience_id: exp.id,
          source_type: "curated",
          source_url: draft.musicUrl || null,
          track_id: draft.musicTrackId || null,
          title: draft.musicTitle,
          enabled: true,
        });
      }
    } catch (e) {
      console.warn("Supabase publish fallback:", e);
    }
  }

  // Update local draft status as published
  await localDraftRepository.saveDraft({
    ...draft,
    currentStep: "publish",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";
  const shareUrl = `${appUrl}/g/${slug}`;

  return NextResponse.json({
    success: true,
    slug,
    shareUrl,
  });
}
