import { test, expect } from "@playwright/test";

test.describe("MemoryQuizScene Playwright Spec", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/moments-scene");
    // Navigate past Intro, Memories, Letter, Mystery Gift to Memory Quiz
    await page.getByRole("button", { name: /Explore Memories/i }).click();
    await page.getByRole("button", { name: /Read Letter/i }).click();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).click();
    // Mystery Gift
    await page.getByRole("button", { name: /Unwrap Special Gift/i }).click();
    await page.getByRole("button", { name: /Continue/i }).click();
  });

  test("renders quiz question, options, and handles option selection with feedback", async ({ page }) => {
    // 1. Verify Memory Quiz heading & question
    await expect(page.getByText("Memory Quiz")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Do You Remember?" })).toBeVisible();
    await expect(page.getByText("Where did we go on our first summer road trip?")).toBeVisible();

    // 2. Select option and check positive feedback banner
    await page.getByRole("button", { name: /Coastal Highway/i }).click();
    await expect(page.getByText("That's Spot On! 🎉")).toBeVisible();
    await expect(page.getByText("That trip along the coast was unforgettable!")).toBeVisible();

    // 3. Click Continue and verify transition to next scene
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page.getByRole("heading", { name: "Exclusive Coupon" })).toBeVisible();
  });

  test("can navigate back to previous scene using Back button", async ({ page }) => {
    await expect(page.getByText("Memory Quiz")).toBeVisible();
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByRole("heading", { name: "Taylor's Mystery Gift" })).toBeVisible();
  });
});
