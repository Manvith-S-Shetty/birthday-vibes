import { test, expect } from "@playwright/test";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";
import { BirthdayDraft } from "../src/types/draft";

test.describe("Wishlight V2 — Complete End-to-End Verification Pass", () => {
  test.setTimeout(60000);
  const TEST_DRAFT_ID = "draft_verification_e2e_2026";

  const fullTestDraft: BirthdayDraft = {
    id: TEST_DRAFT_ID,
    recipientName: "Verification Hero",
    birthdayDate: "2030-11-20",
    themeId: "midnight-cinema",
    photos: [],
    personalMessage: "Wishing you a birthday filled with joy, magic, and unforgettable memories.",
    musicTrackId: "track_none",
    musicTitle: "No Music",
    voiceMessage: {
      status: "none",
      durationMs: 0,
      mimeType: "",
    },
    moments: [
      {
        id: "mom_mystery_1",
        momentType: "mystery_gift",
        config: {
          title: "Special Birthday Surprise",
          giftText: "Congratulations! You unwrapped a VIP birthday trip voucher.",
          buttonLabel: "Open Surprise Gift",
        },
        sortOrder: 1,
        enabled: true,
      },
      {
        id: "mom_quiz_1",
        momentType: "memory_quiz",
        config: {
          question: "Where did we celebrate our favorite summer road trip?",
          options: [
            { id: "opt_1", text: "Coastal Highway Viewpoint", isCorrect: true },
            { id: "opt_2", text: "Downtown Coffee Shop", isCorrect: false },
          ],
          explanation: "That coastal sunset was truly unforgettable!",
        },
        sortOrder: 2,
        enabled: true,
      },
      {
        id: "mom_roulette_1",
        momentType: "birthday_roulette",
        config: {
          title: "Spin for Verification Surprise",
          options: [
            { id: "r_1", label: "Free Coffee & Donut", description: "On me next time we meet!" },
            { id: "r_2", label: "Movie Night Pick", description: "Total control of the remote." },
            { id: "r_3", label: "Big Birthday Hug", description: "Redeemable anytime." },
            { id: "r_4", label: "Home Cooked Dinner", description: "Your favorite meal." },
            { id: "r_5", label: "Weekend Getaway", description: "A fun day trip." },
            { id: "r_6", label: "Wildcard Surprise", description: "Anything you wish for!" },
          ],
        },
        sortOrder: 3,
        enabled: true,
      },
      {
        id: "mom_hidden_1",
        momentType: "hidden_message",
        config: {
          teaserText: "Tap to uncover top secret note",
          hiddenMessage: "You are an incredibly special person. Happy Birthday!",
        },
        sortOrder: 4,
        enabled: true,
      },
      {
        id: "mom_coupon_1",
        momentType: "birthday_coupon",
        config: {
          couponTitle: "VIP Spa Weekend Voucher",
          couponDescription: "All-inclusive relaxing weekend getaway!",
          terms: "Valid anytime in 2026-2030",
          code: "VERIFY-2026",
        },
        sortOrder: 5,
        enabled: true,
      },
      {
        id: "mom_countdown_1",
        momentType: "countdown",
        config: {
          targetDate: "2030-11-20",
          preBirthdayMessage: "Counting down to Verification Hero's grand day!",
        },
        sortOrder: 6,
        enabled: true,
      },
      {
        id: "mom_wish_1",
        momentType: "wish_moment",
        config: {
          promptText: "Close your eyes, make a secret wish, and seal it in star dust.",
          sealedMessage: "Your wish has been sealed ✨",
        },
        sortOrder: 7,
        enabled: true,
      },
    ],
    isPinProtected: false,
    pin: "",
    currentStep: "preview",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("CHECK 1 & 3: Creator draft persistence & publishing completion flow", async ({ page }) => {
    await page.addInitScript((draftData) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", draftData.id);
      localStorage.setItem(`wishlight_draft_${draftData.id}`, JSON.stringify(draftData));
    }, fullTestDraft);

    // 1. Load creator preview
    await page.goto("/create");

    // 2. Click Publish Birthday Experience to go to Step 10
    const publishBtn = page.getByRole("button", { name: /Publish Birthday Experience/i }).first();
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // 3. Verify Step 10 completes publishing without remaining stuck
    await expect(page.getByRole("heading", { name: "Your Wishlight gift is ready" }).first()).toBeVisible({ timeout: 45000 });

    // 4. Verify published URL is generated and displayed
    const previewLink = page.getByRole("link", { name: /Preview Experience/i }).first();
    await expect(previewLink).toBeVisible();
    const href = await previewLink.getAttribute("href");
    expect(href).toMatch(/\/g\/[a-z0-9-]+/);
  });

  test("CHECK 2: Published Recipient Experience Scene Progression & Interactive Moments", async ({ page }) => {
    await page.addInitScript((draftData) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", draftData.id);
      localStorage.setItem(`wishlight_draft_${draftData.id}`, JSON.stringify(draftData));
    }, fullTestDraft);

    await page.goto("/create");

    // Recipient Intro Scene
    await expect(page.getByText("Verification Hero").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Explore Memories/i }).first().click();

    // Memories Scene
    await page.getByRole("button", { name: /Read Letter/i }).first().click();

    // Letter Scene
    await expect(page.getByText("Wishing you a birthday filled with joy").first()).toBeVisible();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).first().click();

    // Mystery Gift Scene
    await expect(page.getByRole("heading", { name: "Special Birthday Surprise" }).first()).toBeVisible();
    await page.getByRole("button", { name: /Open Surprise Gift/i }).first().click();
    await expect(page.getByText("Congratulations! You unwrapped").first()).toBeVisible();
    await page.getByRole("button", { name: "Quiz" }).first().click();

    // Memory Quiz Scene
    await expect(page.getByText("Where did we celebrate our favorite summer road trip?").first()).toBeVisible();
    await page.getByText("Coastal Highway Viewpoint").first().click();
    await expect(page.getByText("That coastal sunset was truly unforgettable!").first()).toBeVisible();
    await page.getByRole("button", { name: "Roulette" }).first().click();

    // Birthday Roulette Scene (6 SVG Slices & Wheel Spin)
    await expect(page.getByRole("heading", { name: "Spin for Verification Surprise" }).first()).toBeVisible();
    await expect(page.locator("svg.roulette-wheel-svg path")).toHaveCount(6);
    await page.getByRole("button", { name: /Spin Wheel/i }).first().click();
    await expect(page.getByText("You Won!").first()).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Secret" }).first().click();

    // Hidden Secret Message Scene
    await expect(page.getByRole("heading", { name: "Hidden Secret Note" }).first()).toBeVisible();
    await page.getByRole("button", { name: /Reveal Secret Note/i }).first().click();
    await expect(page.getByText("You are an incredibly special person. Happy Birthday!").first()).toBeVisible();
    await page.getByRole("button", { name: "Voucher" }).first().click();

    // Birthday Coupon Scene
    await expect(page.getByText("VIP Spa Weekend Voucher").first()).toBeVisible();
    await page.getByRole("button", { name: "Timer" }).first().click();

    // Birthday Countdown Scene
    await expect(page.getByText("Birthday Countdown").first()).toBeVisible();
    await expect(page.getByText("Counting down to Verification Hero's grand day!").first()).toBeVisible();
    await expect(page.getByText("Days").first()).toBeVisible();
    await page.getByRole("button", { name: "Wish" }).first().click();

    // Wish Moment Scene
    await expect(page.getByText("Close your eyes, make a secret wish").first()).toBeVisible();
    await page.getByRole("button", { name: "Cake" }).first().click();

    // Cake & Candles Scene
    await expect(page.getByRole("heading", { name: "Blow Out the Candles" }).first()).toBeVisible();
  });

  test("CHECK 4: Creator Preview Single Navbar & Responsive Offsets (Desktop & Mobile)", async ({ page }) => {
    await page.addInitScript((draftData) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", draftData.id);
      localStorage.setItem(`wishlight_draft_${draftData.id}`, JSON.stringify(draftData));
    }, fullTestDraft);

    // Desktop viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/create");

    // Verify single scene navigation bar in preview step
    const desktopIntroPills = page.getByRole("button", { name: "Intro", exact: true });
    await expect(desktopIntroPills).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Publish Birthday Experience/i }).first()).toBeVisible();

    // Mobile narrow viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileIntroPills = page.getByRole("button", { name: "Intro", exact: true });
    await expect(mobileIntroPills).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Publish Birthday Experience/i }).first()).toBeVisible();
  });
});
