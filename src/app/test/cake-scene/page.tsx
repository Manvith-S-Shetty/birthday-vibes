/**
 * ISOLATED TEST ROUTE — CAKE SCENE ONLY
 *
 * This route exists exclusively for Playwright integration tests of the
 * V2-A Microphone Candle Blowing feature. It renders CakeCandlesScene in
 * isolation using a fully in-memory ExperienceData fixture.
 *
 * It does NOT connect to Supabase, require auth, or touch any DB.
 * Accessing this route in a production build returns a 404 page.
 */

import { notFound } from "next/navigation";
import { CakeCandleTestHarness } from "./CakeCandleTestHarness";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export default function TestCakeScenePage() {
  if (IS_PRODUCTION) {
    notFound();
  }

  return <CakeCandleTestHarness />;
}
