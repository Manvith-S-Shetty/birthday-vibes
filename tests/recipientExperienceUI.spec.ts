import { test, expect } from "@playwright/test";

test.describe("Recipient Experience UI & Creator Preview Navigation Spec", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies for a pristine session
    await page.context().clearCookies();
  });

  test("1. Published recipient experience does not render bottom navigation bar or scene buttons", async ({ page }) => {
    // Navigate to unprotected recipient route
    await page.goto("http://localhost:3000/g/demo-unprotected");

    // Intro scene is visible
    await expect(
      page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })
    ).toBeVisible({ timeout: 10000 });

    // Floating scene navigation bar container MUST NOT exist
    const navBar = page.locator('[data-testid="creator-scene-navigation"]');
    await expect(navBar).not.toBeAttached();

    // Scene pill buttons must not exist
    const introNavButton = page.locator('button[data-scene-id="intro"]');
    const cakeNavButton = page.locator('button[data-scene-id="cake"]');
    const finaleNavButton = page.locator('button[data-scene-id="finale"]');
    await expect(introNavButton).not.toBeAttached();
    await expect(cakeNavButton).not.toBeAttached();
    await expect(finaleNavButton).not.toBeAttached();
  });

  test("2. Recipient can smoothly progress through scenes using in-scene controls and replay", async ({ page }) => {
    await page.goto("http://localhost:3000/g/demo-unprotected");

    // 1. Intro -> click in-scene progression button
    const startButton = page.getByRole("button", {
      name: /Explore Memories|Open the Experience|Join the Celebration/i,
    });
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();

    // 2. Memory Wall Scene
    await expect(page.getByText("Treasured Moments")).toBeVisible({ timeout: 6000 });
    // Still no bottom nav bar
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();

    // Click in-scene "Read Letter" button
    await page.getByRole("button", { name: /Read Letter/i }).click();

    // 3. Letter Scene
    await expect(page.getByText("The Birthday Letter")).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();

    // Click in-scene "Make a Wish" / "Continue"
    await page.getByRole("button", { name: /Make a Wish|Continue/i }).click();

    // 4. Cake Candles Scene
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();

    // Click in-scene "See Celebration Finale"
    await page.getByRole("button", { name: /See Celebration Finale/i }).click();

    // 5. Finale Scene
    await expect(page.getByText("Celebration Finale")).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();

    // Verify Replay button works
    const replayButton = page.getByRole("button", { name: /Replay Experience/i });
    await expect(replayButton).toBeVisible();
    await replayButton.click();

    // Returns to Intro Scene
    await expect(
      page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })
    ).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();
  });

  test("3. PIN-protected recipient experience enforces PIN and omits bottom navigation when locked and unlocked", async ({ page }) => {
    await page.goto("http://localhost:3000/g/demo");

    // Locked cover scene requires PIN
    await expect(page.getByText("A Private Digital Gift")).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();

    // Unlock with PIN
    const pinInput = page.locator('input[type="password"], input[placeholder*="PIN"], input[placeholder*="passcode"]').first();
    await pinInput.fill("2026");
    await page.getByRole("button", { name: /Unlock/i }).click();

    // Unlocked into intro scene
    await expect(
      page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })
    ).toBeVisible({ timeout: 10000 });

    // Bottom navigation bar MUST NOT be present
    await expect(page.locator('[data-testid="creator-scene-navigation"]')).not.toBeAttached();
  });

  test("4. Creator preview mode retains the floating scene navigation bar and enables scene jumping", async ({ page }) => {
    // Navigate to preview harness with isPreview=true
    await page.goto("http://localhost:3000/test/moments-scene");

    // The creator scene navigation bar MUST be visible in preview mode
    const navBar = page.locator('[data-testid="creator-scene-navigation"]');
    await expect(navBar).toBeVisible({ timeout: 10000 });

    // Verify scene jump buttons exist
    const cakeNavButton = page.locator('button[data-scene-id="cake"]');
    await expect(cakeNavButton).toBeVisible();

    // Creator jumps directly to Cake Candles scene
    await cakeNavButton.click();
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible({ timeout: 6000 });

    // Creator jumps to Letter scene
    const letterNavButton = page.locator('button[data-scene-id="letter"]');
    await expect(letterNavButton).toBeVisible();
    await letterNavButton.click();
    await expect(page.getByText("The Birthday Letter")).toBeVisible({ timeout: 6000 });
  });
});
