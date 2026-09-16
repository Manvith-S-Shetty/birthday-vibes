"use client";

/**
 * CakeCandleTestHarness
 *
 * Renders CakeCandlesScene directly in isolation using a fully static
 * in-memory ExperienceData fixture. No network calls, no Supabase.
 *
 * Used only by Playwright tests. The parent page.tsx gates this to
 * non-production environments.
 */

import React, { useState } from "react";
import { CakeCandlesScene } from "@/components/experience/scenes/CakeCandlesScene";
import { ExperienceData } from "@/types/experience";

const TEST_FIXTURE: ExperienceData = {
  id: "test-fixture-001",
  slug: "test-fixture",
  recipientName: "Test User",
  birthdayDate: "January 1",
  themeId: "midnight-cinema",
  personalMessage: "Test message for Playwright integration tests.",
  photos: [],
  isPinProtected: false,
  createdAt: new Date().toISOString(),
};

export function CakeCandleTestHarness() {
  const [scene, setScene] = useState<"cake" | "done">("cake");

  if (scene === "done") {
    return (
      <div
        data-testid="scene-complete"
        className="flex items-center justify-center min-h-screen text-white bg-black text-xl"
      >
        Finale reached ✓
      </div>
    );
  }

  return (
    <CakeCandlesScene
      data={TEST_FIXTURE}
      onNext={() => setScene("done")}
      onPrev={() => {}}
    />
  );
}
