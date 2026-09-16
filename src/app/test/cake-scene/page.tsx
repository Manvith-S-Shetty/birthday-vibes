/**
 * ISOLATED TEST ROUTE — CAKE SCENE ONLY
 *
 * This route exists exclusively for Playwright integration tests of the
 * V2-A Microphone Candle Blowing feature. It renders CakeCandlesScene in
 * isolation using a fully in-memory ExperienceData fixture.
 *
 * It does NOT connect to Supabase, require authentication, or touch any DB.
 *
 * Availability:
 *   NODE_ENV === "development"             → local dev server    → ALLOWED
 *   VERCEL_ENV === "preview"               → Vercel Preview URL  → ALLOWED
 *   VERCEL_ENV === "production"            → Vercel Production   → 404 (notFound)
 */

import { notFound } from "next/navigation";
import { CakeCandleTestHarness } from "./CakeCandleTestHarness";

/**
 * Block only on Vercel Production.
 * - Local dev:       NODE_ENV = "development", VERCEL_ENV = undefined → false → ALLOW
 * - Vercel Preview:  NODE_ENV = "production",  VERCEL_ENV = "preview" → false → ALLOW
 * - Vercel Prod:     NODE_ENV = "production",  VERCEL_ENV = "production" → true → BLOCK
 */
const IS_VERCEL_PRODUCTION =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV !== "preview";

export default function TestCakeScenePage() {
  if (IS_VERCEL_PRODUCTION) {
    notFound();
  }

  return <CakeCandleTestHarness />;
}
