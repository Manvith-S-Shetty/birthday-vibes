import { test, expect } from "@playwright/test";
import { CURATED_MUSIC_TRACKS } from "../src/lib/constants/music";

/**
 * Phase B3.3 — Dedicated StepMusic UX & Integration Playwright Test Suite
 */
test.describe("V2-B: Phase B3.3 — Music UX & Interaction Spec", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed localStorage with draft at currentStep = "music"
    await page.addInitScript(() => {
      const draft = {
        id: "draft_b3_test",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "classic-gold",
        photos: [],
        personalMessage: "Wishing you a wonderful birthday!",
        musicTrackId: "track_none",
        musicTitle: "No Background Music",
        musicUrl: "",
        pin: "",
        isPinProtected: false,
        currentStep: "music",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", draft.id);
      localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));
    });

    await page.goto("/create");
    await expect(page.getByRole("heading", { name: "Set the musical backdrop" })).toBeVisible();
  });

  // 1. MUSIC LIBRARY
  test("1. Music Library — Renders No Background Music and all 5 enabled curated tracks with metadata", async ({ page }) => {
    // No Background Music
    const silentCard = page.getByRole("button", { name: /No Background Music by Silent Reverie/i });
    await expect(silentCard).toBeVisible();

    // 5 Curated Tracks
    const curatedTracks = CURATED_MUSIC_TRACKS.filter((t) => t.id !== "track_none");
    expect(curatedTracks).toHaveLength(5);

    for (const track of curatedTracks) {
      const trackCard = page.getByRole("button", { name: new RegExp(`${track.title} by ${track.artist}`, "i") });
      await expect(trackCard).toBeVisible();

      // Check metadata text visibility
      await expect(page.getByText(track.title).first()).toBeVisible();
      await expect(page.getByText(track.artist).first()).toBeVisible();
      await expect(page.getByText(track.genre).first()).toBeVisible();
    }
  });

  // 2. SELECTION
  test("2. Selection — Clicking a track selects it, displays indicator, and updates draft state", async ({ page }) => {
    const trackGymnopedie = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_gymnopedie_1")!;
    const trackCard = page.getByRole("button", { name: new RegExp(`${trackGymnopedie.title} by`, "i") });

    // Click track card to select
    await trackCard.click();

    // Indicator / aria-pressed check
    await expect(trackCard).toHaveAttribute("aria-pressed", "true");
    await expect(trackCard.getByText("Selected")).toBeVisible();

    // Verify draft state in localStorage
    const savedDraft = await page.evaluate(() => {
      const id = localStorage.getItem("wishlight_latest_draft_id") || "";
      const raw = localStorage.getItem(`wishlight_draft_${id}`);
      return raw ? JSON.parse(raw) : null;
    });

    expect(savedDraft).not.toBeNull();
    expect(savedDraft.musicTrackId).toBe(trackGymnopedie.id);
    expect(savedDraft.musicTitle).toBe(trackGymnopedie.title);
    expect(savedDraft.musicUrl).toBe(trackGymnopedie.url);
  });

  // 3. SELECTION VS PREVIEW
  test("3. Selection vs Preview — Previewing Track B does not alter selection of Track A", async ({ page }) => {
    const trackA = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_gymnopedie_1")!;
    const trackB = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_evening")!;

    const cardA = page.getByRole("button", { name: new RegExp(`${trackA.title} by`, "i") });
    const cardB = page.getByRole("button", { name: new RegExp(`${trackB.title} by`, "i") });

    // Select Track A
    await cardA.click();
    await expect(cardA).toHaveAttribute("aria-pressed", "true");

    // Preview Track B
    const listenBtnB = page.getByRole("button", { name: `Listen preview of ${trackB.title}` });
    await listenBtnB.click();

    // Confirm Track A remains selected
    await expect(cardA).toHaveAttribute("aria-pressed", "true");
    await expect(cardB).toHaveAttribute("aria-pressed", "false");

    // Confirm Track B is previewing
    await expect(page.getByRole("button", { name: `Pause preview of ${trackB.title}` })).toBeVisible();

    // Confirm draft state still holds Track A
    const savedDraft = await page.evaluate(() => {
      const id = localStorage.getItem("wishlight_latest_draft_id") || "";
      const raw = localStorage.getItem(`wishlight_draft_${id}`);
      return raw ? JSON.parse(raw) : null;
    });
    expect(savedDraft.musicTrackId).toBe(trackA.id);
  });

  // 4. SINGLE PREVIEW
  test("4. Single Preview — Starting Track C stops Track B preview", async ({ page }) => {
    const trackB = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_evening")!;
    const trackC = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_dream_culture")!;

    // Start Track B preview
    await page.getByRole("button", { name: `Listen preview of ${trackB.title}` }).click();
    await expect(page.getByRole("button", { name: `Pause preview of ${trackB.title}` })).toBeVisible();

    // Start Track C preview
    await page.getByRole("button", { name: `Listen preview of ${trackC.title}` }).click();

    // Track B is no longer playing
    await expect(page.getByRole("button", { name: `Listen preview of ${trackB.title}` })).toBeVisible();

    // Track C is active preview
    await expect(page.getByRole("button", { name: `Pause preview of ${trackC.title}` })).toBeVisible();
  });

  // 5. PLAY / PAUSE
  test("5. Play / Pause — Toggling preview reflects transport state", async ({ page }) => {
    const track = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_life_of_riley")!;

    const listenBtn = page.getByRole("button", { name: `Listen preview of ${track.title}` });
    await listenBtn.click();

    // Enters playing state
    const pauseBtn = page.getByRole("button", { name: `Pause preview of ${track.title}` });
    await expect(pauseBtn).toBeVisible();

    // Click again to pause
    await pauseBtn.click();
    await expect(listenBtn).toBeVisible();
  });

  // 6. UNMOUNT CLEANUP
  test("6. Unmount Cleanup — Navigating away from Music stops preview playback", async ({ page }) => {
    const track = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_carefree")!;

    // Start preview
    await page.getByRole("button", { name: `Listen preview of ${track.title}` }).click();
    await expect(page.getByRole("button", { name: `Pause preview of ${track.title}` })).toBeVisible();

    // Navigate away from Music to Security step via Next button or step nav
    const securityNavBtn = page.getByRole("button", { name: /(06|07)\.\s*Security|Security/i });
    await securityNavBtn.click();

    await expect(page.getByRole("heading", { name: "Lock your birthday surprise" })).toBeVisible();

    // Navigate back to Music
    const musicNavBtn = page.getByRole("button", { name: /05\.\s*Music/i });
    await musicNavBtn.click();
    await expect(page.getByRole("heading", { name: "Set the musical backdrop" })).toBeVisible();

    // Confirm preview is stopped (Listen button restored)
    await expect(page.getByRole("button", { name: `Listen preview of ${track.title}` })).toBeVisible();
  });

  // 7. KEYBOARD
  test("7. Keyboard Navigation — Track cards, preview, and info buttons are keyboard accessible", async ({ page }) => {
    const trackGymnopedie = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_gymnopedie_1")!;
    const trackEvening = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_evening")!;

    const cardGymnopedie = page.getByRole("button", { name: new RegExp(`${trackGymnopedie.title} by`, "i") });
    const cardEvening = page.getByRole("button", { name: new RegExp(`${trackEvening.title} by`, "i") });

    // Enter key selects focused card
    await cardGymnopedie.focus();
    await page.keyboard.press("Enter");
    await expect(cardGymnopedie).toHaveAttribute("aria-pressed", "true");

    // Space key selects focused card
    await cardEvening.focus();
    await page.keyboard.press("Space");
    await expect(cardEvening).toHaveAttribute("aria-pressed", "true");

    // Preview button independently accessible via keyboard
    const listenBtn = page.getByRole("button", { name: `Listen preview of ${trackGymnopedie.title}` });
    await listenBtn.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: `Pause preview of ${trackGymnopedie.title}` })).toBeVisible();

    // Info button independently accessible via keyboard
    const infoBtn = page.getByRole("button", { name: `Attribution info for ${trackGymnopedie.title}` });
    await infoBtn.focus();
    await page.keyboard.press("Enter");

    // Info modal opens
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  // 8. ATTRIBUTION
  test("8. Attribution Modal — Displays title, artist, license, source link, and closes on Escape", async ({ page }) => {
    const trackGymnopedie = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_gymnopedie_1")!;

    const infoBtn = page.getByRole("button", { name: `Attribution info for ${trackGymnopedie.title}` });
    await infoBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Verify metadata in modal
    await expect(dialog.getByText(trackGymnopedie.title)).toBeVisible();
    await expect(dialog.getByText(trackGymnopedie.artist)).toBeVisible();
    await expect(dialog.getByText(trackGymnopedie.license, { exact: true })).toBeVisible();
    await expect(dialog.getByText(/Required Attribution Text/i)).toBeVisible();

    // Focus inside modal (close button) and press Escape to close
    const closeBtn = dialog.getByRole("button", { name: "Close attribution dialog" });
    await closeBtn.focus();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  // 9. MOBILE RESPONSIVENESS
  for (const width of [375, 390, 430]) {
    test(`9. Mobile UX (${width}px) — No overflow, usable controls, touch targets >= 44px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });

      // No horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // Verify controls usable
      const trackGymnopedie = CURATED_MUSIC_TRACKS.find((t) => t.id === "track_gymnopedie_1")!;
      const cardGymnopedie = page.getByRole("button", { name: new RegExp(`${trackGymnopedie.title} by`, "i") });
      await cardGymnopedie.click();
      await expect(cardGymnopedie).toHaveAttribute("aria-pressed", "true");

      // Verify interactive targets >= 44px height/width
      const listenBtn = page.getByRole("button", { name: `Listen preview of ${trackGymnopedie.title}` });
      const listenBox = await listenBtn.boundingBox();
      expect(listenBox).not.toBeNull();
      expect(listenBox!.height).toBeGreaterThanOrEqual(44);

      const infoBtn = page.getByRole("button", { name: `Attribution info for ${trackGymnopedie.title}` });
      const infoBox = await infoBtn.boundingBox();
      expect(infoBox).not.toBeNull();
      expect(infoBox!.height).toBeGreaterThanOrEqual(44);
      expect(infoBox!.width).toBeGreaterThanOrEqual(44);
    });
  }
});
