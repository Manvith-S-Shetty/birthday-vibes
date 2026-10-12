import { test, expect } from "@playwright/test";

test.describe("V2-D Loop 3 — Recipient Interactive Moments Playwright Spec", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/moments-scene");
    // Start from Intro scene and progress
    await expect(page.getByText("FOR")).toBeVisible();
    await expect(page.getByText("Taylor").first()).toBeVisible();
  });

  test("1. Progresses through Intro -> Memories -> Letter -> Mystery Gift -> Memory Quiz -> Roulette -> Hidden Message -> Coupon -> Countdown -> Wish Moment -> Cake", async ({ page }) => {
    // 1. Intro -> click Explore Memories
    await page.getByRole("button", { name: /Explore Memories/i }).click();

    // 2. Memories -> click Read Letter
    await expect(page.getByText("Treasured Moments")).toBeVisible();
    await page.getByRole("button", { name: /Read Letter/i }).click();

    // 3. Letter -> click Make a Wish / Next
    await expect(page.getByText("The Birthday Letter")).toBeVisible();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).click();

    // 4. Mystery Gift Scene
    await expect(page.getByRole("heading", { name: "Taylor's Mystery Gift" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Unwrap Special Gift/i }).first()).toBeVisible();

    // Click Unwrap -> reveals surprise gift message
    await page.getByRole("button", { name: /Unwrap Special Gift/i }).first().click();
    await expect(page.getByText("Front row tickets to your favorite concert!")).toBeVisible();

    // Click Continue -> moves to Memory Quiz Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 5. Memory Quiz Scene
    await expect(page.getByText("Memory Quiz")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Do You Remember?" })).toBeVisible();
    await expect(page.getByText("Where did we go on our first summer road trip?")).toBeVisible();

    // Click option -> select answer and verify feedback
    await page.getByRole("button", { name: /Coastal Highway/i }).click();
    await expect(page.getByText("That's Spot On! 🎉")).toBeVisible();
    await expect(page.getByText("That trip along the coast was unforgettable!")).toBeVisible();

    // Click Continue -> moves to Birthday Roulette Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 6. Birthday Roulette Scene
    await expect(page.getByRole("heading", { name: "Spin for a Birthday Surprise" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Spin Wheel/i })).toBeVisible();

    // Click Continue -> moves to Hidden Message Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 7. Hidden Message Scene
    await expect(page.getByRole("heading", { name: "Hidden Secret Note" })).toBeVisible();
    await page.getByRole("button", { name: /Reveal Secret Note/i }).first().click();
    await expect(page.getByText("You mean the absolute world to me. Happy Birthday!")).toBeVisible();

    // Click Continue -> moves to Birthday Coupon Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 8. Birthday Coupon Scene
    await expect(page.getByRole("heading", { name: "Exclusive Coupon" })).toBeVisible();
    await expect(page.getByText("VIP Spa Weekend")).toBeVisible();
    await expect(page.getByRole("button", { name: /Claim Gift Voucher/i }).first()).toBeVisible();

    // Click Claim -> reveals code
    await page.getByRole("button", { name: /Claim Gift Voucher/i }).first().click();
    await expect(page.getByText("VIP-SPA-2026")).toBeVisible();

    // Click Continue -> moves to Countdown Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 9. Countdown Scene
    await expect(page.getByText("Birthday Countdown")).toBeVisible();
    await expect(page.getByText("The countdown to Taylor's big day is ticking!")).toBeVisible();

    // Click Continue -> moves to Wish Moment Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 10. Wish Moment Scene
    await expect(page.getByText("Wish Sealing Moment")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Make a Birthday Wish" })).toBeVisible();
    await page.getByRole("button", { name: /Seal Your Wish/i }).click();
    await expect(page.getByRole("heading", { name: "Your Wish is Sealed" })).toBeVisible();

    // Click Continue -> moves to Cake Candles Scene
    await page.getByRole("button", { name: /Continue/i }).click();

    // 11. Cake Candles Scene
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" })).toBeVisible();
  });

  test("2. Floating Voice Note widget is present for authenticated payload with voice", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Play Birthday Message/i })).toBeVisible();
  });
});
