import { test, expect } from "@playwright/test";

test.describe("CountdownScene Playwright Spec", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/moments-scene");
    // Navigate past Intro -> Memories -> Letter -> Mystery Gift -> Memory Quiz -> Coupon to Countdown
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
  });

  test("1. Countdown scene renders time units and preBirthdayMessage for future target date", async ({ page }) => {
    // Verify Countdown Scene Header
    await expect(page.getByText("Birthday Countdown")).toBeVisible();
    await expect(page.getByText("Something Special Is Coming")).toBeVisible();
    await expect(page.getByText("The countdown to Taylor's big day is ticking!")).toBeVisible();

    // Verify time unit labels
    await expect(page.getByText("Days")).toBeVisible();
    await expect(page.getByText("Hours")).toBeVisible();
    await expect(page.getByText("Minutes")).toBeVisible();
    await expect(page.getByText("Seconds")).toBeVisible();

    // Verify footer label
    await expect(page.getByText("Counting down to your special day")).toBeVisible();
  });

  test("2. Back and Continue navigation work", async ({ page }) => {
    await expect(page.getByText("Birthday Countdown")).toBeVisible();

    // Click Back -> return to Birthday Coupon Scene
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByRole("heading", { name: "Exclusive Coupon" })).toBeVisible();

    // Click Continue -> return to Countdown Scene
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByText("Birthday Countdown")).toBeVisible();

    // Click Continue -> proceed to Wish Moment Scene
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByText("Wish Sealing Moment")).toBeVisible();

    // Click Continue -> proceed to Cake Candles Scene
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible();
  });
});
