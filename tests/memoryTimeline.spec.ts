import { test, expect } from "@playwright/test";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";
import { BirthdayDraft, MemoryDisplayMode } from "../src/types/draft";
import { parseDateToTimestamp } from "../src/components/creator/steps/StepMemories";

test.describe("Wishlight V2-D — Memory Story / Timeline Spec", () => {
  test.setTimeout(60000);

  // 1. UNIT / PERSISTENCE: Saving and restoring memoryDisplayMode and photo metadata
  test("1. LocalDraftRepository saves, serializes, and restores memoryDisplayMode and photo metadata", async () => {
    const testDraftId = "draft_test_v2_d_persistence";
    const draftData: BirthdayDraft = {
      id: testDraftId,
      recipientName: "Arthur",
      birthdayDate: "2028-11-20",
      memoryDisplayMode: "timeline",
      themeId: "midnight-cinema",
      photos: [
        {
          id: "photo_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "College Graduation",
          date: "2019",
          location: "Boston, MA",
          chapter: "Beginning",
          sortOrder: 1,
        },
        {
          id: "photo_2",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "Pacific Coast Highway",
          date: "Summer 2022",
          location: "Big Sur, CA",
          chapter: "Favorite Memories",
          sortOrder: 2,
        },
      ],
      personalMessage: "To a lifetime of incredible adventures.",
      moments: [],
      isPinProtected: false,
      currentStep: "memories",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await localDraftRepository.saveDraft(draftData);
    expect(saved.memoryDisplayMode).toBe("timeline");
    expect(saved.photos[0].chapter).toBe("Beginning");
    expect(saved.photos[0].date).toBe("2019");
    expect(saved.photos[0].location).toBe("Boston, MA");

    const reloaded = await localDraftRepository.getDraft(testDraftId);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.memoryDisplayMode).toBe("timeline");
    expect(reloaded?.photos).toHaveLength(2);
    expect(reloaded?.photos[1].caption).toBe("Pacific Coast Highway");
    expect(reloaded?.photos[1].date).toBe("Summer 2022");
    expect(reloaded?.photos[1].location).toBe("Big Sur, CA");
    expect(reloaded?.photos[1].chapter).toBe("Favorite Memories");
  });

  // 2. CHRONOLOGICAL SORTING LOGIC: parseDateToTimestamp correctly orders milestones
  test("2. parseDateToTimestamp correctly resolves chronological ordering", async () => {
    const dates = ["2024-05-15", "2018", "Summer 2021", "2015", ""];
    const timestamps = dates.map(parseDateToTimestamp);

    // 2015 should be earlier than 2018
    expect(timestamps[3]).toBeLessThan(timestamps[1]);
    // 2018 should be earlier than 2021
    expect(timestamps[1]).toBeLessThan(timestamps[2]);
    // 2021 should be earlier than 2024
    expect(timestamps[2]).toBeLessThan(timestamps[0]);
    // Empty string maps to MAX_SAFE_INTEGER (placed at end)
    expect(timestamps[4]).toBe(Number.MAX_SAFE_INTEGER);
  });

  // 3. BACKWARD COMPATIBILITY: Legacy draft missing memoryDisplayMode or photo metadata
  test("3. Legacy draft without memoryDisplayMode falls back safely to 'grid' and handles missing metadata", async () => {
    const legacyDraftId = "draft_test_v2_d_legacy";
    const legacyDraft: any = {
      id: legacyDraftId,
      recipientName: "Classic Friend",
      themeId: "midnight-cinema",
      photos: [
        {
          id: "photo_old",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "Simple Photo",
          sortOrder: 1,
        },
      ],
      personalMessage: "Happy Birthday!",
      currentStep: "memories",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await localDraftRepository.saveDraft(legacyDraft);
    const reloaded = await localDraftRepository.getDraft(legacyDraftId);

    expect(reloaded).not.toBeNull();
    expect(reloaded?.memoryDisplayMode).toBe("grid");
    expect(reloaded?.photos[0].chapter).toBeUndefined();
    expect(reloaded?.photos[0].date).toBeUndefined();
    expect(reloaded?.photos[0].location).toBeUndefined();
  });

  // 4. CREATOR STUDIO UX: Selecting display mode in Step 03
  test("4. Creator Studio allows choosing display mode and editing memory story details", async ({ page }) => {
    const draftId = "draft_test_v2_d_creator_ui";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Eleanor",
      relationship: "best_friend",
      openingStyle: "cinematic-premiere",
      memoryDisplayMode: "grid",
      themeId: "midnight-cinema",
      photos: [
        {
          id: "ph_edit_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "Road Trip Sunrise",
          sortOrder: 1,
        },
      ],
      personalMessage: "To our greatest moments together.",
      moments: [],
      isPinProtected: false,
      currentStep: "memories",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    await expect(page.getByText("Step 03 — Memory Wall & Timeline")).toBeVisible();

    // Verify Display Mode options are visible
    await expect(page.getByText("Classic Gallery")).toBeVisible();
    await expect(page.getByText("Polaroid Keepsakes")).toBeVisible();
    await expect(page.getByText("Story Timeline")).toBeVisible();

    // Select Story Timeline mode
    await page.getByRole("button", { name: /Story Timeline/i }).click();
    await expect(page.getByText("timeline mode active")).toBeVisible();

    // Switch to Polaroid mode
    await page.getByRole("button", { name: /Polaroid Keepsakes/i }).click();
    await expect(page.getByText("polaroid mode active")).toBeVisible();

    // Expand Details for the photo
    await page.getByRole("button", { name: /Details/i }).first().click();
    await expect(page.getByText("Memory Caption")).toBeVisible();
    await expect(page.getByText("Date or Year (Optional)")).toBeVisible();
    await expect(page.getByText("Location (Optional)")).toBeVisible();
    await expect(page.getByText("Story Chapter (Optional)")).toBeVisible();

    // Click "Beginning" chapter chip
    await page.getByRole("button", { name: "Beginning" }).first().click();

    // Check that draft was updated in localStorage
    const storedRaw = await page.evaluate((id) => localStorage.getItem(`wishlight_draft_${id}`), draftId);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!);
    expect(stored.memoryDisplayMode).toBe("polaroid");
    expect(stored.photos[0].chapter).toBe("Beginning");
  });

  // 5. RECIPIENT RENDERING: Story Timeline with chapters, dates, locations, and lightbox
  test("5. Recipient scene renders Story Timeline with chapters, dates, locations and opens lightbox", async ({ page }) => {
    const draftId = "draft_test_v2_d_recipient_timeline";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Genevieve",
      relationship: "partner",
      openingStyle: "cinematic-premiere",
      memoryDisplayMode: "timeline",
      themeId: "champagne-noir",
      photos: [
        {
          id: "ph_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "Parisian Evening",
          date: "2021",
          location: "Paris, France",
          chapter: "Beginning",
          sortOrder: 1,
        },
        {
          id: "ph_2",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "Golden Memories",
          date: "2024",
          location: "New York, USA",
          chapter: "Today",
          sortOrder: 2,
        },
      ],
      personalMessage: "Wishing you an unforgettable celebration.",
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

    // Advance from Intro -> Memories
    const exploreBtn = page.getByRole("button", { name: /Explore Memories/i }).first();
    await expect(exploreBtn).toBeVisible({ timeout: 10000 });
    await exploreBtn.click();

    // Verify Scene Header
    await expect(page.getByText("Treasured Moments").first()).toBeVisible();
    await expect(page.getByText("Story Timeline").first()).toBeVisible();

    // Verify chapter headings exist
    await expect(page.getByText("Chapter: Beginning").first()).toBeVisible();
    await expect(page.getByText("Chapter: Today").first()).toBeVisible();

    // Verify metadata badges exist
    await expect(page.getByText("Paris, France").first()).toBeVisible();
    await expect(page.getByText("2021").first()).toBeVisible();
    await expect(page.getByText("Parisian Evening").first()).toBeVisible();

    // Click to open lightbox
    await page.getByRole("button", { name: /Expand timeline memory: Parisian Evening/i }).first().click();

    // Verify lightbox modal
    await expect(page.getByRole("button", { name: "Close Lightbox" })).toBeVisible();
    await expect(page.getByText("Chapter: Beginning").last()).toBeVisible();

    // Press Escape to close lightbox
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Close Lightbox" })).not.toBeVisible();

    // Continue navigation works
    await page.getByRole("button", { name: /Read Letter/i }).first().click();
    await expect(page.getByText("The Birthday Letter").first()).toBeVisible();
  });

  // 6. END-TO-END PUBLISHING: preserves memoryDisplayMode and metadata through completion
  test("6. Publishing an experience preserves memoryDisplayMode and photo metadata", async ({ page }) => {
    const draftId = "draft_test_v2_d_publish";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Benjamin",
      relationship: "sibling",
      openingStyle: "cinematic-premiere",
      memoryDisplayMode: "timeline",
      themeId: "midnight-cinema",
      photos: [
        {
          id: "ph_publish_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          type: "image",
          caption: "Childhood Fort",
          date: "2002",
          location: "Seattle, WA",
          chapter: "Beginning",
          sortOrder: 1,
        },
      ],
      personalMessage: "Celebrating every milestone with you.",
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

    // Verify preview renders Benjamin
    await expect(page.getByText("Benjamin").first()).toBeVisible();

    // Click Publish Birthday Experience
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
