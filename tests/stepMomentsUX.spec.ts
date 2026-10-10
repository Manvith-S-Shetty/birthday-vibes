import { test, expect } from "@playwright/test";

test.describe("V2-D Loop 2 — StepMoments Creator Studio UX & Persistence Spec", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed localStorage with draft at currentStep = "moments"
    await page.addInitScript(() => {
      const draft = {
        id: "draft_moments_ux_test",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Happy Birthday!",
        moments: [],
        pin: "",
        isPinProtected: false,
        currentStep: "moments",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", draft.id);
      localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));
    });

    await page.goto("/create");
    await expect(page.getByRole("heading", { name: "Add Interactive Surprises" })).toBeVisible();
  });

  test("1. Renders all 7 interactive moment candidate cards", async ({ page }) => {
    await expect(page.getByText("Mystery Gift Box")).toBeVisible();
    await expect(page.getByText("Memory Quiz Trivia")).toBeVisible();
    await expect(page.getByText("Birthday Surprise Roulette")).toBeVisible();
    await expect(page.getByText("Hidden Secret Message")).toBeVisible();
    await expect(page.getByText("Birthday Coupon / Voucher")).toBeVisible();
    await expect(page.getByText("Birthday Countdown")).toBeVisible();
    await expect(page.getByText("Wish Sealing Sequence")).toBeVisible();
  });

  test("2. Enabling a moment toggles active state and expands config panel", async ({ page }) => {
    // Click Enable on first moment card (Mystery Gift Box)
    await page.getByRole("button", { name: /Enable/i }).first().click();

    // Verify Active badge & Enabled button appear
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(page.getByText("Configure Mystery Gift Box")).toBeVisible();

    // Verify draft state saved in localStorage
    const savedDraftRaw = await page.evaluate(() =>
      localStorage.getItem("wishlight_draft_draft_moments_ux_test")
    );
    expect(savedDraftRaw).toBeTruthy();
    const savedDraft = JSON.parse(savedDraftRaw!);
    expect(savedDraft.moments).toHaveLength(1);
    expect(savedDraft.moments[0].momentType).toBe("mystery_gift");
    expect(savedDraft.moments[0].enabled).toBe(true);
  });

  test("3. Editing moment configuration fields updates draft state", async ({ page }) => {
    // Enable Mystery Gift Box
    await page.getByRole("button", { name: /Enable/i }).first().click();

    // Edit gift text
    const giftTextInput = page.locator("textarea").first();
    await giftTextInput.fill("Front row tickets to your favorite show!");

    // Verify localStorage draft state updated
    const savedDraftRaw = await page.evaluate(() =>
      localStorage.getItem("wishlight_draft_draft_moments_ux_test")
    );
    const savedDraft = JSON.parse(savedDraftRaw!);
    expect(savedDraft.moments[0].config.giftText).toBe(
      "Front row tickets to your favorite show!"
    );
  });

  test("4. Navigation buttons operate step transitions properly", async ({ page }) => {
    // Click Back -> goes to Voice Note step (heading check)
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByRole("heading", { name: /Add a Personal Voice Message/i })).toBeVisible();

    // Go back forward to Moments step
    await page.getByRole("button", { name: /Interactive Moments/i }).click();
    await expect(page.getByRole("heading", { name: "Add Interactive Surprises" })).toBeVisible();

    // Click Passcode & Security -> goes to Security step
    await page.getByRole("button", { name: /Passcode & Security/i }).click();
    await expect(page.getByRole("heading", { name: /Lock your birthday surprise/i })).toBeVisible();
  });

  test("5. Creator Review Experience includes enabled interactive moments from draft.moments", async ({ page }) => {
    // Enable Mystery Gift Box moment
    await page.getByRole("button", { name: /Enable/i }).first().click();

    // Navigate to Passcode & Security step
    await page.getByRole("button", { name: /Passcode & Security/i }).click();
    await expect(page.getByRole("heading", { name: /Lock your birthday surprise/i })).toBeVisible();

    // Navigate to Review Experience (Preview) step
    await page.getByRole("button", { name: /Review Experience/i }).click();
    await expect(page.getByRole("heading", { name: "Review your gift experience" })).toBeVisible();

    // Verify inside preview container that interactive moment sequence includes the enabled moment
    // Progress through preview: Intro -> Memories -> Letter -> Mystery Gift
    await page.getByRole("button", { name: /Explore Memories/i }).click();
    await page.getByRole("button", { name: /Read Letter/i }).click();
    await page.getByRole("button", { name: /Make a Wish|Continue|Next/i }).click();

    // Verify Mystery Gift interactive moment is visible in the preview container
    await expect(page.getByRole("heading", { name: "A Special Gift" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open Gift/i })).toBeVisible();
  });
});
