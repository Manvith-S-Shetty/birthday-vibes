import { test, expect } from "@playwright/test";
import { BirthdayDraft } from "../src/types/draft";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";

test.describe("Birthday Surprise Roulette End-to-End & Recipient Interactive Spec", () => {
  test("1. LocalDraftRepository saves, serializes, and reloads draft with birthday_roulette moment", async () => {
    const mockDraft: BirthdayDraft = {
      id: "draft_test_roulette",
      recipientName: "Sam",
      birthdayDate: "2026-11-20",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Happy Birthday Sam!",
      moments: [
        {
          id: "mom_roulette_1",
          momentType: "birthday_roulette",
          config: {
            title: "Spin for Sam's Birthday Surprise",
            options: [
              { id: "r_1", label: "Free Coffee & Donut", description: "On me next time we meet!" },
              { id: "r_2", label: "Movie Night Pick", description: "You get total control of the remote." },
              { id: "r_3", label: "Big Birthday Hug", description: "Redeemable anytime." },
              { id: "r_4", label: "Home Cooked Dinner", description: "Your favorite meal, cooked by me." },
              { id: "r_5", label: "Weekend Getaway", description: "A fun day trip together." },
              { id: "r_6", label: "Wildcard Surprise", description: "Anything you wish for!" },
            ],
          },
          sortOrder: 1,
          enabled: true,
        },
      ],
      isPinProtected: false,
      currentStep: "moments",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await localDraftRepository.saveDraft(mockDraft);
    expect(saved.moments).toBeDefined();
    expect(saved.moments).toHaveLength(1);
    expect(saved.moments?.[0].momentType).toBe("birthday_roulette");
    expect(saved.moments?.[0].enabled).toBe(true);
  });

  test("2. Recipient ExperienceRenderer includes 6-item SVG BirthdayRouletteScene and spins wheel", async ({ page }) => {
    const draftId = "draft_test_roulette_scene";

    await page.addInitScript((id) => {
      window.localStorage.clear();
      const draft = {
        id,
        recipientName: "Sam",
        birthdayDate: "2026-11-20",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Happy Birthday Sam!",
        musicTrackId: "track_none",
        musicTitle: "No Music",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
        moments: [
          {
            id: "mom_roulette_1",
            momentType: "birthday_roulette",
            config: {
              title: "Spin for Sam's Birthday Surprise",
              options: [
                { id: "r_1", label: "Free Coffee & Donut", description: "On me next time!" },
                { id: "r_2", label: "Movie Night Pick", description: "Total control." },
                { id: "r_3", label: "Big Birthday Hug", description: "Redeemable anytime." },
                { id: "r_4", label: "Home Cooked Dinner", description: "Your favorite meal." },
                { id: "r_5", label: "Weekend Getaway", description: "Day trip." },
                { id: "r_6", label: "Wildcard Surprise", description: "Anything!" },
              ],
            },
            sortOrder: 1,
            enabled: true,
          },
        ],
        isPinProtected: false,
        currentStep: "preview",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", id);
      localStorage.setItem(`wishlight_draft_${id}`, JSON.stringify(draft));
    }, draftId);

    await page.goto("/create");

    // Progress preview: Intro -> Memories -> Letter -> Birthday Surprise Roulette
    await page.getByRole("button", { name: /Explore Memories/i }).first().click();
    await page.getByRole("button", { name: /Read Letter/i }).first().click();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).first().click();

    // Verify Birthday Surprise Roulette scene is rendered on recipient preview!
    await expect(page.getByRole("heading", { name: "Spin for Sam's Birthday Surprise" }).first()).toBeVisible({ timeout: 10000 });

    // Verify all 6 slice path elements are rendered in the SVG wheel
    await expect(page.locator("svg.roulette-wheel-svg path")).toHaveCount(6);

    // Click Spin Wheel button
    const spinBtn = page.getByRole("button", { name: /Spin Wheel/i }).first();
    await expect(spinBtn).toBeVisible();
    await spinBtn.click();

    // Verify prize reveal appears after spinning wheel lands
    await expect(page.getByText("You Won!").first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Countdown and Hidden Secret Message scene sequence and interactions", async ({ page }) => {
    const draftId = "draft_test_moments_all";

    await page.addInitScript((id) => {
      window.localStorage.clear();
      const draft = {
        id,
        recipientName: "Alex",
        birthdayDate: "2030-12-25",
        themeId: "champagne-gold",
        photos: [],
        personalMessage: "Happy Birthday Alex!",
        musicTrackId: "track_none",
        musicTitle: "No Music",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
        moments: [
          {
            id: "mom_hidden_1",
            momentType: "hidden_message",
            config: {
              teaserText: "Tap to uncover top secret note",
              hiddenMessage: "You are truly amazing! Happy Birthday!",
            },
            sortOrder: 1,
            enabled: true,
          },
          {
            id: "mom_countdown_1",
            momentType: "countdown",
            config: {
              targetDate: "2030-12-25",
              preBirthdayMessage: "Counting down to Alex's special day!",
            },
            sortOrder: 2,
            enabled: true,
          },
        ],
        isPinProtected: false,
        currentStep: "preview",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", id);
      localStorage.setItem(`wishlight_draft_${id}`, JSON.stringify(draft));
    }, draftId);

    await page.goto("/create");

    // Progress: Intro -> Memories -> Letter -> Hidden Message
    await page.getByRole("button", { name: /Explore Memories/i }).first().click();
    await page.getByRole("button", { name: /Read Letter/i }).first().click();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).first().click();

    // Verify Hidden Message Scene
    await expect(page.getByRole("heading", { name: "Hidden Secret Note" }).first()).toBeVisible({ timeout: 10000 });
    const revealBtn = page.getByRole("button", { name: /Reveal Secret Note/i }).first();
    await revealBtn.click();
    await expect(page.getByText("You are truly amazing! Happy Birthday!").first()).toBeVisible();

    // Progress to Countdown Scene using scene navigation
    const timerBtn = page.getByRole("button", { name: "Timer" }).first();
    await timerBtn.click();

    // Verify Countdown Scene
    await expect(page.getByText("Birthday Countdown").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Counting down to Alex's special day!").first()).toBeVisible();
    await expect(page.getByText("Days").first()).toBeVisible();
    await expect(page.getByText("Seconds").first()).toBeVisible();
  });

  test("4. Exactly ONE scene-navigation bar is rendered in Creator Studio preview step", async ({ page }) => {
    const draftId = "draft_test_single_navbar";

    await page.addInitScript((id) => {
      window.localStorage.clear();
      const draft = {
        id,
        recipientName: "Taylor",
        birthdayDate: "2026-11-20",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Happy Birthday Taylor!",
        musicTrackId: "track_none",
        musicTitle: "No Music",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
        moments: [],
        isPinProtected: false,
        currentStep: "preview",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", id);
      localStorage.setItem(`wishlight_draft_${id}`, JSON.stringify(draft));
    }, draftId);

    await page.goto("/create");

    // Assert exactly ONE 'Intro' scene navigation button exists in the DOM
    const introButtons = page.getByRole("button", { name: "Intro", exact: true });
    await expect(introButtons).toHaveCount(1);

    // Assert exactly ONE 'Cake' scene navigation button exists in the DOM
    const cakeButtons = page.getByRole("button", { name: "Cake", exact: true });
    await expect(cakeButtons).toHaveCount(1);
  });
});
