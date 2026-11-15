import { test, expect } from "@playwright/test";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";
import { BirthdayDraft, RecipientRelationship, OpeningStyleId } from "../src/types/draft";
import {
  getRelationshipDedication,
  getOpeningTagline,
  getOpeningQuote,
} from "../src/components/experience/scenes/CinematicIntroScene";

test.describe("Wishlight V2-G — Personalization & Opening Styles Spec", () => {
  test.setTimeout(60000);

  // 1. UNIT / PERSISTENCE: Saving and restoring relationship & openingStyle
  test("1. LocalDraftRepository saves, serializes, and restores relationship and openingStyle", async () => {
    const testDraftId = "draft_test_v2_g_persistence";
    const draftData: BirthdayDraft = {
      id: testDraftId,
      recipientName: "Genevieve",
      birthdayDate: "2028-06-15",
      relationship: "partner",
      openingStyle: "warm-letter",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "With all my love and devotion.",
      musicTrackId: "track_none",
      musicTitle: "No Music",
      moments: [],
      isPinProtected: false,
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await localDraftRepository.saveDraft(draftData);
    expect(saved.relationship).toBe("partner");
    expect(saved.openingStyle).toBe("warm-letter");

    const reloaded = await localDraftRepository.getDraft(testDraftId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.relationship).toBe("partner");
    expect(reloaded?.openingStyle).toBe("warm-letter");
  });

  test("1b. LocalDraftRepository saves, serializes, and restores 'relative' relationship", async () => {
    const testDraftId = "draft_test_v2_g_relative";
    const draftData: BirthdayDraft = {
      id: testDraftId,
      recipientName: "Aunt Clara",
      birthdayDate: "1975-09-20",
      relationship: "relative",
      openingStyle: "cinematic-premiere",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Thank you for all your warmth and love.",
      musicTrackId: "track_none",
      musicTitle: "No Music",
      moments: [],
      isPinProtected: false,
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await localDraftRepository.saveDraft(draftData);
    expect(saved.relationship).toBe("relative");
    expect(saved.openingStyle).toBe("cinematic-premiere");

    const reloaded = await localDraftRepository.getDraft(testDraftId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.relationship).toBe("relative");
    expect(reloaded?.openingStyle).toBe("cinematic-premiere");
  });

  // 2. BACKWARD COMPATIBILITY: Legacy draft missing relationship & openingStyle
  test("2. Legacy draft without relationship or openingStyle falls back safely to sensible defaults", async () => {
    const legacyDraftId = "draft_test_v2_g_legacy";
    const legacyDraft: any = {
      id: legacyDraftId,
      recipientName: "Old Friend",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Happy Birthday!",
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await localDraftRepository.saveDraft(legacyDraft);
    const reloaded = await localDraftRepository.getDraft(legacyDraftId);

    expect(reloaded).not.toBeNull();
    expect(reloaded?.relationship).toBeUndefined();
    expect(reloaded?.openingStyle).toBe("cinematic-premiere");
  });

  // 3. CREATOR STUDIO: Selecting relationship in StepRecipient and openingStyle in StepMood
  test("3. Creator Studio allows selecting relationship and opening style, saving to draft", async ({ page }) => {
    const draftId = "draft_test_v2_g_creator_ui";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Lucas",
      birthdayDate: "2029-04-12",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Cheers to our greatest memories!",
      musicTrackId: "track_none",
      musicTitle: "No Music",
      moments: [],
      isPinProtected: false,
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Select "Best Friend" relationship
    const bestFriendBtn = page.getByRole("button", { name: "Best Friend" });
    await expect(bestFriendBtn).toBeVisible();
    await bestFriendBtn.click();

    // Proceed to Step 2 (Mood & Atmosphere)
    await page.getByRole("button", { name: /Choose Mood & Theme/i }).click();
    await expect(page.getByText("Step 02 — Mood & Atmosphere")).toBeVisible();

    // Verify Opening Style selector exists
    await expect(page.getByRole("heading", { name: "Choose the Opening Style" })).toBeVisible();

    // Click "Celebration Spark"
    const celebrationSparkCard = page.getByRole("button", { name: /Celebration Spark/i });
    await expect(celebrationSparkCard).toBeVisible();
    await celebrationSparkCard.click();

    // Verify active selection badge appears
    await expect(celebrationSparkCard.getByText("Active")).toBeVisible();

    // Verify draft was saved in localStorage with the updated values
    const storedRaw = await page.evaluate((id) => localStorage.getItem(`wishlight_draft_${id}`), draftId);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!);
    expect(stored.relationship).toBe("best_friend");
    expect(stored.openingStyle).toBe("celebration-spark");
  });

  // 3b. CREATOR STUDIO: Relative relationship selection and opening style reload persistence
  test("3b. Creator Studio selects 'Relative' and opening styles, persisting across page reload", async ({ page }) => {
    const draftId = `draft_test_v2_g_relative_reload_${Date.now()}`;
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Uncle Robert",
      birthdayDate: "1968-11-20",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "To an amazing uncle and wonderful family pillar!",
      musicTrackId: "track_none",
      musicTitle: "No Music",
      moments: [],
      isPinProtected: false,
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.goto("/create");
    await page.evaluate((d) => {
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);
    await page.reload();

    // Verify all 7 relationship options are present
    const expectedRelationships = ["Partner", "Best Friend", "Parent", "Sibling", "Relative", "Colleague", "Other"];
    for (const rel of expectedRelationships) {
      await expect(page.getByRole("button", { name: rel })).toBeVisible();
    }

    // Select "Relative"
    const relativeBtn = page.getByRole("button", { name: "Relative" });
    await relativeBtn.click();

    // Verify "Clear" button appears
    const clearBtn = page.getByRole("button", { name: "Clear" });
    await expect(clearBtn).toBeVisible();

    // Proceed to Step 2 (Mood & Atmosphere)
    await page.getByRole("button", { name: /Choose Mood & Theme/i }).click();
    await expect(page.getByText("Step 02 — Mood & Atmosphere")).toBeVisible();

    // Verify all 3 opening styles are present
    const styles = ["Cinematic Premiere", "Warm Letter", "Celebration Spark"];
    for (const styleName of styles) {
      await expect(page.getByRole("button", { name: new RegExp(styleName, "i") })).toBeVisible();
    }

    // Click "Warm Letter"
    const warmLetterCard = page.getByRole("button", { name: /Warm Letter/i });
    await warmLetterCard.click();
    await expect(warmLetterCard.getByText("Active")).toBeVisible();

    // Reload the page and verify state persisted
    await page.reload();
    await expect(page.getByText("Step 02 — Mood & Atmosphere")).toBeVisible();
    const reloadedWarmLetter = page.getByRole("button", { name: /Warm Letter/i });
    await expect(reloadedWarmLetter.getByText("Active")).toBeVisible();

    // Go back to Step 1 and verify "Relative" is still selected
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByText("Step 01 — Recipient")).toBeVisible();
    const reloadedRelative = page.getByRole("button", { name: "Relative" });
    await expect(reloadedRelative).toBeVisible();

    // Check localStorage values directly
    const storedRaw = await page.evaluate((id) => localStorage.getItem(`wishlight_draft_${id}`), draftId);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!);
    expect(stored.relationship).toBe("relative");
    expect(stored.openingStyle).toBe("warm-letter");
  });

  // 4. RECIPIENT EXPERIENCE: All 3 opening styles render distinctly and navigate forward
  test("4. Style 1: Cinematic Premiere renders widescreen title, dedication & navigates", async ({ page }) => {
    const draftId = "draft_test_v2_g_style_cinematic";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Cassandra",
      relationship: "partner",
      openingStyle: "cinematic-premiere",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "You light up every room.",
      moments: [],
      isPinProtected: false,
      currentStep: "preview",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Cinematic Premiere elements
    await expect(page.getByText("World Premiere • To the Love of My Life").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("STARRING").first()).toBeVisible();
    await expect(page.getByText("Cassandra").first()).toBeVisible();
    await expect(page.getByText("Starring the one who lights up every chapter.").first()).toBeVisible();

    // Button navigates to Memories
    const exploreBtn = page.getByRole("button", { name: /Explore Memories/i }).first();
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();
    await expect(page.getByText("Step 02 — Memory Wall").first()).toBeVisible();
  });

  test("5. Style 2: Warm Letter renders editorial card, dearness & navigates", async ({ page }) => {
    const draftId = "draft_test_v2_g_style_letter";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Eleanor",
      relationship: "parent",
      openingStyle: "warm-letter",
      themeId: "champagne-noir",
      photos: [],
      personalMessage: "Thank you for everything.",
      moments: [],
      isPinProtected: false,
      currentStep: "preview",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Warm Letter elements
    await expect(page.getByText("A Personal Letter • To the Guiding Light of Our Family").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Dearest").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Eleanor" }).first()).toBeVisible();
    await expect(page.getByText("With deepest love, respect, and enduring gratitude").first()).toBeVisible();

    // Button navigates
    const openBtn = page.getByRole("button", { name: /Open the Experience/i }).first();
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    await expect(page.getByText("Step 02 — Memory Wall").first()).toBeVisible();
  });

  test("6. Style 3: Celebration Spark renders festive fanfare & navigates", async ({ page }) => {
    const draftId = "draft_test_v2_g_style_spark";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Marcus",
      relationship: "sibling",
      openingStyle: "celebration-spark",
      themeId: "playful-confetti",
      photos: [],
      personalMessage: "Let the good times roll!",
      moments: [],
      isPinProtected: false,
      currentStep: "preview",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Celebration Spark elements
    await expect(page.getByText("It’s Time to Celebrate • To My Lifelong Companion & Partner-in-Crime").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Happy Birthday!").first()).toBeVisible();
    await expect(page.getByText("Marcus").first()).toBeVisible();
    await expect(page.getByText("Cheers to the most fun, unforgettable person in the world!").first()).toBeVisible();

    // Button navigates
    const joinBtn = page.getByRole("button", { name: /Join the Celebration/i }).first();
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();
    await expect(page.getByText("Step 02 — Memory Wall").first()).toBeVisible();
  });

  test("6b. Recipient Preview renders Relative dedication and tailored Warm Letter content", async ({ page }) => {
    const draftId = "draft_test_v2_g_preview_relative";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Aunt Sophia",
      relationship: "relative",
      openingStyle: "warm-letter",
      themeId: "champagne-noir",
      photos: [],
      personalMessage: "Thank you for all your wonderful support and joy.",
      moments: [],
      isPinProtected: false,
      currentStep: "preview",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Relative Warm Letter elements
    await expect(page.getByText("A Personal Letter • To My Wonderful Family & Cherished Relative").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Dearest").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aunt Sophia" }).first()).toBeVisible();
    await expect(page.getByText("With deepest family affection and enduring gratitude").first()).toBeVisible();
    await expect(page.getByText("Having you in our family has brought so much warmth, comfort, and laughter over the years.").first()).toBeVisible();
  });

  // 7. PUBLISHING: End-to-end publish flow with relationship and openingStyle
  test("7. Experience publishing preserves relationship and opening style through completion", async ({ page }) => {
    const draftId = `draft_test_v2_g_publish_${Date.now()}`;
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Aria",
      relationship: "best_friend",
      openingStyle: "celebration-spark",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "To an unforgettable year ahead!",
      musicTrackId: "track_none",
      musicTitle: "No Music",
      moments: [],
      isPinProtected: false,
      currentStep: "preview",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Verify preview renders the selected Celebration Spark intro
    await expect(page.getByText("Aria").first()).toBeVisible();
    await expect(page.getByText("It’s Time to Celebrate • To My Greatest Confidant & Best Friend").first()).toBeVisible();

    // Click Publish Birthday Experience to go to Step 10
    const publishBtn = page.getByRole("button", { name: /Publish Birthday Experience/i }).first();
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // Verify publishing completes successfully
    await expect(page.getByRole("heading", { name: "Your Wishlight gift is ready" }).first()).toBeVisible({ timeout: 45000 });

    // Verify share link is generated
    const previewLink = page.getByRole("link", { name: /Preview Experience/i }).first();
    await expect(previewLink).toBeVisible();
    const href = await previewLink.getAttribute("href");
    expect(href).toMatch(/\/g\/[a-z0-9-]+/);
  });

  // 8. RELATIVE RELATIONSHIP TAILORED RENDERING UNIT VERIFICATION
  test("8. Relative relationship maps to tailored dedication, tagline, and quote across all 3 opening styles", async () => {
    // 8.1 Dedication
    const dedication = getRelationshipDedication("relative");
    expect(dedication).toBe("To My Wonderful Family & Cherished Relative");

    // 8.2 Cinematic Premiere
    const premiereTagline = getOpeningTagline("cinematic-premiere", "relative");
    expect(premiereTagline).toBe("Honoring a wonderful part of our family story.");
    const premiereQuote = getOpeningQuote("cinematic-premiere", "relative");
    expect(premiereQuote).toBe("Family is where our story begins and love never ends. Today, we put your warmth center stage.");

    // 8.3 Warm Letter
    const letterTagline = getOpeningTagline("warm-letter", "relative");
    expect(letterTagline).toBe("With deepest family affection and enduring gratitude");
    const letterQuote = getOpeningQuote("warm-letter", "relative");
    expect(letterQuote).toBe("Having you in our family has brought so much warmth, comfort, and laughter over the years. Wishing you the happiest birthday.");

    // 8.4 Celebration Spark
    const sparkTagline = getOpeningTagline("celebration-spark", "relative");
    expect(sparkTagline).toBe("Cheers to family, good times, and celebrating you!");
    const sparkQuote = getOpeningQuote("celebration-spark", "relative");
    expect(sparkQuote).toBe("May your special day be packed with love, sweet surprises, and everyone who loves you dearly!");
  });
});
