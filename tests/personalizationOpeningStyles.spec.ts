import { test, expect } from "@playwright/test";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";
import { BirthdayDraft, RecipientRelationship, OpeningStyleId } from "../src/types/draft";

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
      themeId: "velvet-noir",
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
      themeId: "golden-hour",
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
      themeId: "neon-sunset",
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

  // 7. PUBLISHING: End-to-end publish flow with relationship and openingStyle
  test("7. Experience publishing preserves relationship and opening style through completion", async ({ page }) => {
    const draftId = "draft_test_v2_g_publish";
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
});
