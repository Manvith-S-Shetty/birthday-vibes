import { test, expect } from "@playwright/test";
import {
  calculateExpiresAt,
  isExperienceExpired,
  normalizeExpirationOption,
  formatExpirationRemaining,
  EXPIRATION_OPTIONS,
} from "../src/lib/expiration/expiration";
import { isInternalStoragePath, normalizeStorageKey } from "../src/lib/expiration/cleanupService";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";
import { BirthdayDraft } from "../src/types/draft";

test.describe("Wishlight V2-H — Expiration & Automatic Cleanup Spec", () => {
  // ---------------------------------------------------------------------------
  // 1. UNIT & CALCULATION TESTS: Expiry options, calculations, & normalizations
  // ---------------------------------------------------------------------------
  test("1. calculateExpiresAt correctly calculates 7d, 30d, 1y, and never durations", () => {
    const baseDate = new Date("2026-10-25T12:00:00.000Z");

    // 7 Days
    const expires7d = calculateExpiresAt("7d", baseDate);
    expect(expires7d).not.toBeNull();
    const date7d = new Date(expires7d!);
    expect(date7d.getTime() - baseDate.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

    // 30 Days
    const expires30d = calculateExpiresAt("30d", baseDate);
    expect(expires30d).not.toBeNull();
    const date30d = new Date(expires30d!);
    expect(date30d.getTime() - baseDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);

    // 1 Year
    const expires1y = calculateExpiresAt("1y", baseDate);
    expect(expires1y).not.toBeNull();
    const date1y = new Date(expires1y!);
    expect(date1y.getUTCFullYear()).toBe(2027);
    expect(date1y.getUTCMonth()).toBe(9); // October (0-indexed: 9)
    expect(date1y.getUTCDate()).toBe(25);

    // Never
    const expiresNever = calculateExpiresAt("never", baseDate);
    expect(expiresNever).toBeNull();

    // Default / Invalid fallback
    expect(calculateExpiresAt(undefined as any, baseDate)).toBeNull();
    expect(calculateExpiresAt("invalid_option" as any, baseDate)).toBeNull();
  });

  test("2. isExperienceExpired checks timestamps accurately against reference dates", () => {
    const now = new Date("2026-10-25T12:00:00.000Z");

    // Permanent (null or undefined) never expires
    expect(isExperienceExpired(null, now)).toBe(false);
    expect(isExperienceExpired(undefined, now)).toBe(false);

    // Future timestamp is active
    const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
    expect(isExperienceExpired(futureDate, now)).toBe(false);

    // Past timestamp is expired
    const pastDate = new Date(now.getTime() - 1000 * 60).toISOString();
    expect(isExperienceExpired(pastDate, now)).toBe(true);

    // Exact moment is considered expired
    expect(isExperienceExpired(now.toISOString(), now)).toBe(true);
  });

  test("3. EXPIRATION_OPTIONS defines all 4 required creator options", () => {
    const optionIds = EXPIRATION_OPTIONS.map((o) => o.id);
    expect(optionIds).toEqual(["7d", "30d", "1y", "never"]);

    const neverOption = EXPIRATION_OPTIONS.find((o) => o.id === "never");
    expect(neverOption?.label).toBe("Never");
    expect(neverOption?.days).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 2. LEGACY RECORDS & ACTIVE EXPERIENCES UNTOUCHED
  // ---------------------------------------------------------------------------
  test("4. Legacy drafts without expiration fields default safely to 'never' and remain active", async () => {
    const legacyDraftId = "draft_test_v2_h_legacy";
    const legacyDraft: any = {
      id: legacyDraftId,
      recipientName: "Old Keepsake",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Treasured memories.",
      isPinProtected: false,
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await localDraftRepository.saveDraft(legacyDraft);
    const reloaded = await localDraftRepository.getDraft(legacyDraftId);

    expect(reloaded).not.toBeNull();
    expect(reloaded?.expirationOption).toBe("never");
    expect(reloaded?.expiresAt).toBeNull();
    expect(isExperienceExpired(reloaded?.expiresAt)).toBe(false);
  });

  test("5. Active drafts persist chosen expirationOption and expiresAt accurately", async () => {
    const activeDraftId = "draft_test_v2_h_active";
    const baseDate = new Date("2026-10-25T12:00:00.000Z");
    const expiresAt = calculateExpiresAt("30d", baseDate);

    const draftData: BirthdayDraft = {
      id: activeDraftId,
      recipientName: "Maya",
      themeId: "velvet-noir",
      photos: [],
      personalMessage: "Happy 30th Birthday Maya!",
      expirationOption: "30d",
      expiresAt,
      isPinProtected: true,
      pin: "4321",
      currentStep: "security",
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    };

    const saved = await localDraftRepository.saveDraft(draftData);
    expect(saved.expirationOption).toBe("30d");
    expect(saved.expiresAt).toBe(expiresAt);

    const reloaded = await localDraftRepository.getDraft(activeDraftId);
    expect(reloaded?.expirationOption).toBe("30d");
    expect(reloaded?.expiresAt).toBe(expiresAt);
    expect(isExperienceExpired(reloaded?.expiresAt, baseDate)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 3. CLEANUP SERVICE SAFETY: Storage key filtering & path verification
  // ---------------------------------------------------------------------------
  test("6. Storage path helpers distinguish external assets from managed bucket files", () => {
    // External URLs must NOT be targeted for storage bucket deletion
    expect(isInternalStoragePath("https://images.unsplash.com/photo-1234")).toBe(false);
    expect(isInternalStoragePath("http://example.com/audio.mp3")).toBe(false);
    expect(isInternalStoragePath("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe(false);

    // Internal managed storage paths
    expect(isInternalStoragePath("exp_123/photo_1.jpg")).toBe(true);
    expect(isInternalStoragePath("experience-media/exp_123/photo_1.jpg")).toBe(true);
    expect(isInternalStoragePath("exp_123/voice-message.webm")).toBe(true);

    // Path normalization
    expect(normalizeStorageKey("experience-media/exp_123/photo_1.jpg", "experience-media")).toBe("exp_123/photo_1.jpg");
    expect(normalizeStorageKey("exp_123/photo_1.jpg", "experience-media")).toBe("exp_123/photo_1.jpg");
  });

  // ---------------------------------------------------------------------------
  // 4. CREATOR STUDIO UI: Selecting expiration option in StepSecurity
  // ---------------------------------------------------------------------------
  test("7. Creator Studio displays expiration options in StepSecurity and saves chosen option", async ({ page }) => {
    const draftId = "draft_test_v2_h_creator_ui";
    const draftData: BirthdayDraft = {
      id: draftId,
      recipientName: "Liam",
      birthdayDate: "2026-11-20",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "To Liam's big day!",
      pin: "2026",
      isPinProtected: true,
      expirationOption: "never",
      currentStep: "security",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await page.addInitScript((d) => {
      window.localStorage.clear();
      localStorage.setItem("wishlight_latest_draft_id", d.id);
      localStorage.setItem(`wishlight_draft_${d.id}`, JSON.stringify(d));
    }, draftData);

    await page.goto("/create");

    // Verify Step 07 header
    await expect(page.getByText("Step 07 — Privacy & Security")).toBeVisible();

    // Verify Expiration section
    await expect(page.getByText("Experience Lifetime & Expiration")).toBeVisible();
    await expect(page.getByText("Auto-cleanup enabled")).toBeVisible();

    // Verify all 4 selectable cards exist
    await expect(page.getByRole("button", { name: /7 Days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /30 Days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /1 Year/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Never/i })).toBeVisible();

    // Select 30 Days
    const thirtyDaysBtn = page.getByRole("button", { name: /30 Days/i });
    await thirtyDaysBtn.click();

    // Submit step to advance
    const reviewBtn = page.getByRole("button", { name: /Review Experience/i });
    await reviewBtn.click();

    // Verify draft in localStorage updated with 30d
    const savedDraftRaw = await page.evaluate((id) => {
      return localStorage.getItem(`wishlight_draft_${id}`);
    }, draftId);
    expect(savedDraftRaw).not.toBeNull();
    const savedDraft = JSON.parse(savedDraftRaw!);
    expect(savedDraft.expirationOption).toBe("30d");
  });

  // ---------------------------------------------------------------------------
  // 5. SERVER-SIDE PROTECTED ENDPOINTS: Rejection of Expired Experience
  // ---------------------------------------------------------------------------
  test("8. Cover endpoint rejects expired experience with HTTP 410 and consistent payload", async ({ request }) => {
    const res = await request.get("/api/g/demo-expired/cover");
    expect(res.status()).toBe(410);

    const body = await res.json();
    expect(body.error).toBe("This birthday experience has expired.");
    expect(body.code).toBe("EXPERIENCE_EXPIRED");
    expect(body.isExpired).toBe(true);
    expect(body.recipientName).toBe("Taylor");
  });

  test("9. Unlock endpoint rejects expired experience with HTTP 410 before PIN verification", async ({ request }) => {
    const res = await request.post("/api/g/demo-expired/unlock", {
      data: { pin: "2026" },
    });
    expect(res.status()).toBe(410);

    const body = await res.json();
    expect(body.error).toBe("This birthday experience has expired.");
    expect(body.code).toBe("EXPERIENCE_EXPIRED");
    expect(body.isExpired).toBe(true);

    // Verify auth cookie is NOT set
    const cookies = res.headers()["set-cookie"] || "";
    expect(cookies).not.toContain("auth_demo-expired=");
  });

  test("10. Payload endpoint rejects expired experience with HTTP 410", async ({ request }) => {
    const res = await request.get("/api/g/demo-expired/payload");
    // Expired experience returns HTTP 410 Gone
    expect(res.status()).toBe(410);
  });

  // ---------------------------------------------------------------------------
  // 6. RECIPIENT UI: Polished Expired Experience View
  // ---------------------------------------------------------------------------
  test("11. Expired experience displays polished 'This birthday experience has expired' page", async ({ page }) => {
    await page.goto("/g/demo-expired");

    // Check testid and headline
    const expiredPage = page.getByTestId("expired-experience-page");
    await expect(expiredPage).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "This birthday experience has expired" })
    ).toBeVisible();

    // Verify recipient name is respectfully presented
    await expect(page.getByText("Taylor")).toBeVisible();

    // Verify privacy & cleanup assurance card
    await expect(page.getByText("Privacy & Storage Cleanup Complete")).toBeVisible();
    await expect(
      page.getByText(/all private photographs, recorded voice notes, and secret passcodes have been safely and automatically retired/i)
    ).toBeVisible();

    // Verify Call to action buttons
    await expect(page.getByRole("button", { name: /Craft a New Wishlight/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Return Home/i })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 7. SCHEDULED BACKEND CLEANUP CRON ENDPOINT
  // ---------------------------------------------------------------------------
  test("12. Scheduled cron endpoint responds cleanly in dryRun mode", async ({ request }) => {
    const res = await request.get("/api/cron/cleanup-expired?dryRun=true");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(typeof body.processedCount).toBe("number");
    expect(Array.isArray(body.cleanedExperienceIds)).toBe(true);
    expect(Array.isArray(body.deletedStorageFiles)).toBe(true);
    expect(Array.isArray(body.skippedSharedFiles)).toBe(true);
  });
});
