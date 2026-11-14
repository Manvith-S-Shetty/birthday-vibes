import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, sanitizeExperience } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { logAdminActivity } from "@/lib/admin/audit";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Missing experience ID." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  try {
    // 1. Fetch experience record
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let expQuery = (supabaseAdminClient as any).from("experiences").select("*");
    if (isUuid) {
      expQuery = expQuery.eq("id", id);
    } else {
      expQuery = expQuery.eq("slug", id);
    }

    const { data: exp, error: expError } = await expQuery.single();
    if (expError || !exp) {
      return NextResponse.json({ error: "Experience not found." }, { status: 404 });
    }

    const experienceId = exp.id;

    // 2. Fetch all child relations concurrently
    const [mediaRes, musicRes, momentsRes, voiceRes] = await Promise.all([
      (supabaseAdminClient as any)
        .from("media")
        .select("*")
        .eq("experience_id", experienceId)
        .order("sort_order", { ascending: true }),
      (supabaseAdminClient as any)
        .from("music")
        .select("*")
        .eq("experience_id", experienceId)
        .maybeSingle(),
      (supabaseAdminClient as any)
        .from("experience_moments")
        .select("*")
        .eq("experience_id", experienceId)
        .order("sort_order", { ascending: true }),
      (supabaseAdminClient as any)
        .from("voice_messages")
        .select("*")
        .eq("experience_id", experienceId)
        .maybeSingle(),
    ]);

    // 3. Generate signed URLs for media preview
    const rawMedia = mediaRes.data || [];
    const mediaWithPreviews = await Promise.all(
      rawMedia.map(async (m: any) => {
        let signedUrl: string | null = null;
        if (m.storage_path) {
          let path = m.storage_path;
          if (path.startsWith("experience-media/")) {
            path = path.replace("experience-media/", "");
          }
          const { data: signed } = await supabaseAdminClient.storage
            .from("experience-media")
            .createSignedUrl(path, 3600);
          signedUrl = signed?.signedUrl || null;
        }

        return {
          id: m.id,
          experience_id: m.experience_id,
          storage_path: m.storage_path,
          type: m.type,
          caption: m.caption,
          alt_text: m.alt_text,
          sort_order: m.sort_order,
          metadata: m.metadata,
          created_at: m.created_at,
          preview_url: signedUrl,
        };
      })
    );

    // 4. Generate signed URL for voice message preview
    let voiceMessageData = null;
    if (voiceRes.data) {
      const v = voiceRes.data;
      let voiceSignedUrl: string | null = null;
      if (v.storage_path) {
        let path = v.storage_path;
        if (path.startsWith("voice-messages/")) {
          path = path.replace("voice-messages/", "");
        }
        const { data: signed } = await supabaseAdminClient.storage
          .from("voice-messages")
          .createSignedUrl(path, 3600);
        voiceSignedUrl = signed?.signedUrl || null;
      }

      voiceMessageData = {
        ...v,
        preview_url: voiceSignedUrl,
      };
    }

    // 5. Strict security: strip pin_hash, pin_salt, creator_session_token
    const safeExp = sanitizeExperience(exp);

    // Log the inspection
    await logAdminActivity({
      actor: session.email,
      action: "experience.view_detail",
      target_id: experienceId,
      target_type: "experience",
      details: { slug: exp.slug, recipient_name: exp.recipient_name },
      status: "success",
    });

    const hasPersonalMessage = Boolean(exp.personal_message && exp.personal_message.trim().length > 0);

    return NextResponse.json({
      experience: {
        ...safeExp,
        // Sensitive message masked by default; revealed only via explicit confirmation endpoint
        personal_message: "[CONFIDENTIAL - SENSITIVE MESSAGE HIDDEN]",
        has_personal_message: hasPersonalMessage,
      },
      media: mediaWithPreviews,
      music: musicRes.data || null,
      moments: momentsRes.data || [],
      voice_message: voiceMessageData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load experience details." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Soft archive, un-expire, or update status of an experience.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const { status, expiration_option } = body;
  const allowedStatuses = ["draft", "ready", "published", "expired"];

  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (status) {
    updates.status = status;
    if (status === "expired") {
      updates.expires_at = new Date().toISOString();
    } else if (status === "published") {
      updates.published_at = updates.published_at || new Date().toISOString();
    }
  }

  if (expiration_option) {
    updates.expiration_option = expiration_option;
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let updateQuery = (supabaseAdminClient as any)
      .from("experiences")
      .update(updates);

    if (isUuid) {
      updateQuery = updateQuery.eq("id", id);
    } else {
      updateQuery = updateQuery.eq("slug", id);
    }

    const { data, error } = await updateQuery
      .select("id, slug, recipient_name, status, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Experience not found." }, { status: 404 });
    }

    await logAdminActivity({
      actor: session.email,
      action: status === "expired" ? "experience.soft_archive" : "experience.update_status",
      target_id: data.id,
      target_type: "experience",
      details: { updates, result: data },
      status: "success",
    });

    return NextResponse.json({ success: true, experience: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Hard delete with explicit safety confirmation.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Confirmation payload required for destructive deletion." },
      { status: 400 }
    );
  }

  try {
    // 1. Resolve canonical experience first to prevent IDOR / mismatch deletions
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let expLookup = (supabaseAdminClient as any).from("experiences").select("id, slug, recipient_name");
    if (isUuid) {
      expLookup = expLookup.eq("id", id);
    } else {
      expLookup = expLookup.eq("slug", id);
    }

    const { data: targetExp, error: lookupErr } = await expLookup.single();
    if (lookupErr || !targetExp) {
      return NextResponse.json({ error: "Target experience not found." }, { status: 404 });
    }

    if (
      body.confirmDelete !== true ||
      (body.targetId !== targetExp.id && body.targetId !== targetExp.slug)
    ) {
      return NextResponse.json(
        {
          error:
            "Safety check failed. Deletion requires confirmDelete=true and targetId matching canonical experience ID.",
        },
        { status: 400 }
      );
    }

    const canonicalId = targetExp.id;

    // 2. Fetch associated storage files strictly belonging to canonicalId
    const [mediaRes, voiceRes] = await Promise.all([
      (supabaseAdminClient as any).from("media").select("storage_path").eq("experience_id", canonicalId),
      (supabaseAdminClient as any).from("voice_messages").select("storage_path").eq("experience_id", canonicalId),
    ]);

    // 3. Remove files from storage buckets
    const mediaPaths = (mediaRes.data || [])
      .map((m: any) => m.storage_path?.replace("experience-media/", ""))
      .filter(Boolean);

    if (mediaPaths.length > 0) {
      await supabaseAdminClient.storage.from("experience-media").remove(mediaPaths);
    }

    const voicePaths = (voiceRes.data || [])
      .map((v: any) => v.storage_path?.replace("voice-messages/", ""))
      .filter(Boolean);

    if (voicePaths.length > 0) {
      await supabaseAdminClient.storage.from("voice-messages").remove(voicePaths);
    }

    // 4. Delete experience (cascades to media, music, moments, voice_messages in DB)
    const { error: deleteError } = await (supabaseAdminClient as any)
      .from("experiences")
      .delete()
      .eq("id", canonicalId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await logAdminActivity({
      actor: session.email,
      action: "experience.hard_delete",
      target_id: canonicalId,
      target_type: "experience",
      details: {
        slug: targetExp.slug,
        recipient_name: targetExp.recipient_name,
        deletedMediaFilesCount: mediaPaths.length,
        deletedVoiceFilesCount: voicePaths.length,
      },
      status: "success",
    });

    return NextResponse.json({
      success: true,
      message: `Experience ${canonicalId} and associated storage files permanently deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
