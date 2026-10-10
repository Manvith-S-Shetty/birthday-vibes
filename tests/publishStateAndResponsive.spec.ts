import { test, expect } from "@playwright/test";

test.describe("Publish Completion & Responsive Creator Studio Tests", () => {
  test("1. Step 10 Publish completion renders shareUrl, QR card, and action buttons on success", async ({ page }) => {
    const draftId = "draft_test_publish_success";

    await page.addInitScript((id) => {
      window.localStorage.clear();
      const draft = {
        id,
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Happy Birthday Taylor!",
        musicTrackId: "track_none",
        musicTitle: "No Music",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
        moments: [],
        pin: "1234",
        isPinProtected: true,
        currentStep: "publish",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", id);
      localStorage.setItem(`wishlight_draft_${id}`, JSON.stringify(draft));
    }, draftId);

    await page.route("**/api/create/publish", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          slug: "test-recipient-slug-123",
          shareUrl: "http://localhost:3000/g/test-recipient-slug-123",
        }),
      });
    });

    await page.goto("/create");

    await expect(page.getByRole("heading", { name: /Your Wishlight gift is ready/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Passcode Protected/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Preview Experience/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Edit Draft/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Another Gift/i })).toBeVisible();
  });

  test("2. Step 10 Publish failure renders notice and working Retry button", async ({ page }) => {
    const draftId = "draft_test_publish_retry";

    let callCount = 0;
    await page.route("**/api/create/publish", async (route) => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Database temporary connection issue.",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            slug: "retry-success-slug",
            shareUrl: "http://localhost:3000/g/retry-success-slug",
          }),
        });
      }
    });

    await page.addInitScript((id) => {
      window.localStorage.clear();
      const draft = {
        id,
        recipientName: "Jordan",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Cheers!",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
        moments: [],
        pin: "",
        isPinProtected: false,
        currentStep: "publish",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", id);
      localStorage.setItem(`wishlight_draft_${id}`, JSON.stringify(draft));
    }, draftId);

    await page.goto("/create");

    await expect(page.getByRole("heading", { name: /Publishing Issue Encountered/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Database temporary connection issue/i)).toBeVisible();

    const retryBtn = page.getByRole("button", { name: /Retry Publishing/i });
    await expect(retryBtn).toBeVisible();

    await retryBtn.click();
    await expect(page.getByRole("heading", { name: /Your Wishlight gift is ready/i })).toBeVisible({ timeout: 10000 });
  });

  test("3. Responsive Creator UI navigation on Desktop 1280x720, 960x600, and Mobile 390x844", async ({ page }) => {
    const draftId = "draft_responsive_test";

    await page.addInitScript((id) => {
      window.localStorage.clear();
      const draft = {
        id,
        recipientName: "Alex",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Best wishes!",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
        moments: [],
        currentStep: "recipient",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", id);
      localStorage.setItem(`wishlight_draft_${id}`, JSON.stringify(draft));
    }, draftId);

    // Viewport 1: Desktop 1280x720
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/create");
    await expect(page.getByRole("heading", { name: /Who is this little surprise for/i })).toBeVisible();
    const nextBtn = page.getByRole("button", { name: /Choose Mood & Theme/i });
    await expect(nextBtn).toBeVisible();

    // Viewport 2: Narrow Desktop 960x600
    await page.setViewportSize({ width: 960, height: 600 });
    await expect(page.getByRole("heading", { name: /Who is this little surprise for/i })).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Viewport 3: Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: /Who is this little surprise for/i })).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });
});
