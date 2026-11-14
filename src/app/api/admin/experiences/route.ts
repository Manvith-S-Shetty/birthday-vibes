import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, sanitizeExperience } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
  const { authorized, session, reason } = await verifyAdminRequest(req);
  if (!authorized || !session) {
    return NextResponse.json({ error: reason || "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "all";
  const sortBy = searchParams.get("sort") === "updated_at" ? "updated_at" : "created_at";
  const sortOrder = searchParams.get("order") === "asc" ? true : false;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      experiences: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      message: "Supabase not configured.",
    });
  }

  try {
    let query = (supabaseAdminClient as any)
      .from("experiences")
      .select(
        "id, slug, recipient_name, birthday_date, theme_id, status, is_pin_protected, current_step, created_at, updated_at, published_at, expires_at, expiration_option, relationship, opening_style, memory_display_mode",
        { count: "exact" }
      );

    // Filter by status
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Search by recipient_name, slug, or UID
    if (search) {
      // Check if search is a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
      if (isUuid) {
        query = query.eq("id", search);
      } else {
        // Sanitize to prevent PostgREST AST filter injection (strip commas, parens, quotes, operators)
        const sanitizedSearch = search.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();
        if (sanitizedSearch.length > 0) {
          query = query.or(
            `recipient_name.ilike.%${sanitizedSearch}%,slug.ilike.%${sanitizedSearch}%`
          );
        }
      }
    }

    // Sorting and Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.order(sortBy, { ascending: sortOrder }).range(from, to);

    const { data: experiences, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const expList = experiences || [];
    const expIds = expList.map((e: any) => e.id);

    // Fetch related counts in batch
    let mediaCounts: Record<string, number> = {};
    let momentCounts: Record<string, number> = {};
    let voiceCounts: Record<string, number> = {};

    if (expIds.length > 0) {
      const [mediaRes, momentsRes, voiceRes] = await Promise.all([
        (supabaseAdminClient as any)
          .from("media")
          .select("experience_id")
          .in("experience_id", expIds),
        (supabaseAdminClient as any)
          .from("experience_moments")
          .select("experience_id")
          .in("experience_id", expIds),
        (supabaseAdminClient as any)
          .from("voice_messages")
          .select("experience_id")
          .in("experience_id", expIds),
      ]);

      (mediaRes.data || []).forEach((row: any) => {
        mediaCounts[row.experience_id] = (mediaCounts[row.experience_id] || 0) + 1;
      });
      (momentsRes.data || []).forEach((row: any) => {
        momentCounts[row.experience_id] = (momentCounts[row.experience_id] || 0) + 1;
      });
      (voiceRes.data || []).forEach((row: any) => {
        voiceCounts[row.experience_id] = (voiceCounts[row.experience_id] || 0) + 1;
      });
    }

    // Combine safe data with counts
    const enriched = expList.map((exp: any) => {
      const safe = sanitizeExperience(exp);
      delete (safe as any).personal_message;
      return {
        ...safe,
        media_count: mediaCounts[exp.id] || 0,
        moments_count: momentCounts[exp.id] || 0,
        voice_count: voiceCounts[exp.id] || 0,
      };
    });

    const total = count || enriched.length;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      experiences: enriched,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch experiences." },
      { status: 500 }
    );
  }
}
