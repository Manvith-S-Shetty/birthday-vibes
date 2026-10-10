import { test, expect } from "@playwright/test";

test.describe("WishMomentScene Playwright Spec", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/moments-scene");
    // Navigate past Intro -> Memories -> Letter -> Mystery Gift -> Memory Quiz -> Coupon -> Countdown to Wish Moment
    await page.getByRole("button", { name: /Explore Memories/i }).click();
    await page.getByRole("button", { name: /Read Letter/i }).click();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).click();
    // Mystery Gift -> Continue
    await page.getByRole("button", { name: /Unwrap Special Gift/i }).click();
    await page.getByRole("button", { name: /Continue/i }).click();
    // Memory Quiz -> Continue
    await page.getByRole("button", { name: /Continue/i }).click();
    // Birthday Coupon -> Continue
    await page.getByRole("button", { name: /Continue/i }).click();
    // Countdown -> Continue
    await page.getByRole("button", { name: /Continue/i }).click();
  });

  test("1. Wish Moment scene renders promptText and allows sealing wish", async ({ page }) => {
    // Verify Wish Moment Header & Prompt Text
    await expect(page.getByText("Wish Sealing Moment")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Make a Birthday Wish" })).toBeVisible();
    await expect(
      page.getByText("Close your eyes, make a secret wish, and press to seal it in star dust.")
    ).toBeVisible();

    // Verify initial interactive element exists
    const sealButton = page.getByRole("button", { name: /Seal Your Wish/i });
    await expect(sealButton).toBeVisible();

    // Perform interaction: click Seal Your Wish
    await sealButton.click();

    // Verify sealed message and completed state
    await expect(page.getByRole("heading", { name: "Your Wish is Sealed" })).toBeVisible();
    await expect(
      page.getByText("May every secret wish you made today shine bright and come true this year!")
    ).toBeVisible();
    await expect(page.getByText("Wish Completed")).toBeVisible();
  });

  test("2. Back and Continue navigation work", async ({ page }) => {
    await expect(page.getByText("Wish Sealing Moment")).toBeVisible();

    // Click Back -> return to Countdown Scene
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByText("Birthday Countdown")).toBeVisible();

    // Click Continue -> return to Wish Moment Scene
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByText("Wish Sealing Moment")).toBeVisible();

    // Click Continue -> proceed to Cake Candles Scene
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible();
  });
});
