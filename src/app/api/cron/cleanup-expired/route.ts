import { NextResponse } from "next/server";
import { cleanExpiredExperiences } from "@/lib/expiration/cleanupService";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max execution time for serverless cron

/**
 * Validates the authorization secret for scheduled cron execution.
 */
function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In production, CRON_SECRET must be configured
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CRON_CLEANUP] Rejected: CRON_SECRET is not configured in production environment.");
      return false;
    }
    // In local development, permit execution with warning
    console.warn("[CRON_CLEANUP] Notice: CRON_SECRET is not set. Permitting request in development mode.");
    return true;
  }

  // Check Authorization header (Bearer token used by Vercel Cron & HTTP schedulers)
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ") && authHeader.slice(7).trim() === cronSecret) {
    return true;
  }

  // Check alternative x-cron-secret header
  const customHeader = request.headers.get("x-cron-secret");
  if (customHeader && customHeader.trim() === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid CRON_SECRET authorization required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 50;

  console.log(`[CRON_CLEANUP] Starting scheduled cleanup (dryRun: ${dryRun}, limit: ${limit})...`);

  try {
    const result = await cleanExpiredExperiences({
      dryRun,
      limit: Number.isNaN(limit) ? 50 : Math.min(limit, 200),
    });

    console.log(
      `[CRON_CLEANUP] Completed. Processed: ${result.processedCount}, Cleaned: ${result.cleanedExperienceIds.length}, Files Deleted: ${result.deletedStorageFiles.length}, Errors: ${result.errors.length}`
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[CRON_CLEANUP] Unexpected failure during scheduled cleanup:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error during scheduled cleanup.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid CRON_SECRET authorization required." },
      { status: 401 }
    );
  }

  let body: { dryRun?: boolean; limit?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const dryRun = body.dryRun === true;
  const limit = typeof body.limit === "number" ? Math.min(body.limit, 200) : 50;

  try {
    const result = await cleanExpiredExperiences({ dryRun, limit });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[CRON_CLEANUP] Unexpected failure in POST cleanup:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error during scheduled cleanup.",
      },
      { status: 500 }
    );
  }
}
