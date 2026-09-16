/**
 * V2-A Cake Candle Scene — UI Integration Tests
 *
 * These tests target /test/cake-scene — an isolated, in-memory route that
 * renders CakeCandlesScene with a static fixture. No Supabase, no real
 * experience slug, no authentication required.
 *
 * What these tests cover (UI / Integration):
 *   ✓ Scene renders with three candles
 *   ✓ Microphone pre-permission card is present
 *   ✓ Tap fallback extinguishes candles
 *   ✓ Keyboard fallback (Enter / Space) extinguishes candles
 *   ✓ Microphone permission denied → cake still works (simulated via denied mic grant)
 *   ✓ All candles extinguished → wish-sealed state shown
 *   ✓ Navigate away (Back / Finale) cleans up normally
 *
 * What these tests do NOT cover (real-device only):
 *   ✗ Actual microphone audio input
 *   ✗ Blow detection accuracy
 *   ✗ iOS Safari AudioContext resume
 *   ✗ Real microphone stream cleanup
 *
 * See: docs/v2-testing.md for real-device test instructions.
 */

import { test, expect, Page } from "@playwright/test";

const TEST_ROUTE = "/test/cake-scene";

async function gotoScene(page: Page) {
  await page.goto(TEST_ROUTE);
  // Wait for the heading to confirm the scene rendered
  await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible();
}

test.describe("V2-A: Cake Candle Scene — UI Integration", () => {
  test.beforeEach(async ({ page }) => {
    await gotoScene(page);
  });

  // ------------------------------------------------------------------
  // 1. Rendering
  // ------------------------------------------------------------------

  test("renders the candle scene heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible();
  });

  test("renders all three lit candles", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Extinguish candle 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Extinguish candle 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Extinguish candle 3" })).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 2. Microphone pre-permission UI
  // ------------------------------------------------------------------

  test("shows microphone pre-permission card on initial load", async ({ page }) => {
    await expect(page.getByText("Microphone Candle Blowing")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enable Mic & Blow/i })).toBeVisible();
    await expect(page.getByText("or tap any candle directly")).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 3. Tap fallback
  // ------------------------------------------------------------------

  test("tap extinguishes candle 1", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 1" }).click();
    await expect(page.getByRole("button", { name: "Candle 1 extinguished" })).toBeVisible();
  });

  test("tap extinguishes all three candles sequentially", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 1" }).click();
    await page.getByRole("button", { name: "Extinguish candle 2" }).click();
    await page.getByRole("button", { name: "Extinguish candle 3" }).click();

    // All three should now read "extinguished"
    await expect(page.getByRole("button", { name: "Candle 1 extinguished" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Candle 2 extinguished" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Candle 3 extinguished" })).toBeVisible();
  });

  test("double-tap on extinguished candle does not corrupt state", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 1" }).click();
    // Try clicking again on the now-extinguished candle slot (role changes so click is inert)
    await page.getByRole("button", { name: "Candle 1 extinguished" }).click({ force: true });
    // Candles 2 and 3 should still be lit
    await expect(page.getByRole("button", { name: "Extinguish candle 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Extinguish candle 3" })).toBeVisible();
  });

  test("wish-sealed state appears after all candles extinguished", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 1" }).click();
    await page.getByRole("button", { name: "Extinguish candle 2" }).click();
    await page.getByRole("button", { name: "Extinguish candle 3" }).click();

    await expect(page.getByText("Your wish is sealed!")).toBeVisible({ timeout: 2000 });
  });

  test("finale transition fires after all candles extinguished", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 1" }).click();
    await page.getByRole("button", { name: "Extinguish candle 2" }).click();
    await page.getByRole("button", { name: "Extinguish candle 3" }).click();

    // The harness sets scene="done" which renders a "Finale reached" sentinel
    await expect(page.getByTestId("scene-complete")).toBeVisible({ timeout: 3000 });
  });

  // ------------------------------------------------------------------
  // 4. Keyboard fallback
  // ------------------------------------------------------------------

  test("Enter key extinguishes focused candle", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 1" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Candle 1 extinguished" })).toBeVisible();
  });

  test("Space key extinguishes focused candle", async ({ page }) => {
    await page.getByRole("button", { name: "Extinguish candle 2" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Candle 2 extinguished" })).toBeVisible();
  });

  test("candles have visible focus ring on Tab navigation", async ({ page }) => {
    await page.keyboard.press("Tab");
    // At least one candle button should receive focus (order depends on DOM)
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 5. Microphone denied — cake remains usable
  // ------------------------------------------------------------------

  test("microphone denied still leaves candles tappable", async ({ page }) => {
    // Deny microphone permission at the browser context level
    await page.context().grantPermissions([], { origin: "http://localhost:3000" });

    // Click Enable Mic & Blow — browser will reject the getUserMedia call
    await page.getByRole("button", { name: /Enable Mic & Blow/i }).click();

    // Wait briefly for rejection to propagate to UI
    await page.waitForTimeout(500);

    // Candles must still be tappable regardless of mic state
    await page.getByRole("button", { name: "Extinguish candle 1" }).click();
    await expect(page.getByRole("button", { name: "Candle 1 extinguished" })).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 6. Navigation / cleanup
  // ------------------------------------------------------------------

  test("Back button navigates without error", async ({ page }) => {
    await page.getByRole("button", { name: /Back/i }).click();
    // The harness onPrev is a no-op, so the scene stays but no crash occurs
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible();
  });

  test("See Celebration Finale button advances scene", async ({ page }) => {
    await page.getByRole("button", { name: /See Celebration Finale/i }).click();
    await expect(page.getByTestId("scene-complete")).toBeVisible({ timeout: 2000 });
  });
});

// ------------------------------------------------------------------
// NOTE: Real microphone blow detection tests must be performed manually
// on real devices over HTTPS. See docs/v2-testing.md.
// ------------------------------------------------------------------
