import { test, expect } from "@playwright/test";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";
import { BirthdayDraft } from "../src/types/draft";

test.describe("PIN Protection & Authorization Flow Regression Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and storage before each test to ensure clean recipient session
    await page.context().clearCookies();
  });

  test("1. Seed experience (demo) with PIN protection requires PIN in fresh session", async ({ page }) => {
    await page.goto("http://localhost:3000/g/demo");

    // Locked cover scene MUST be displayed
    await expect(page.getByText("A Private Digital Gift")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Something special has been waiting for you...")).toBeVisible();
    await expect(page.getByRole("button", { name: /Unlock/i })).toBeVisible();

    // Cinematic Intro or private content must NOT be displayed yet
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).not.toBeVisible();
  });

  test("2. Incorrect PIN is rejected and remains locked with error feedback", async ({ page }) => {
    await page.goto("http://localhost:3000/g/demo");

    const pinInput = page.locator('input[type="password"], input[placeholder*="PIN"], input[placeholder*="passcode"]').first();
    await expect(pinInput).toBeVisible();
    await pinInput.fill("9999");

    await page.getByRole("button", { name: /Unlock/i }).click();

    // Error message must appear and experience remains locked
    await expect(page.getByText(/Passcode incorrect/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("A Private Digital Gift")).toBeVisible();
  });

  test("3. Direct GET to /api/g/demo/payload without auth cookie returns 401 Unauthorized", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/g/demo/payload");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("PIN verification required");
  });

  test("4. Direct GET to /api/g/demo/cover returns public metadata and does not leak secrets", async ({ request }) => {
    const res = await request.get("http://localhost:3000/api/g/demo/cover");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.recipientName).toBe("Sophia");
    expect(body.isPinProtected).toBe(true);
    expect(body.isLocked).toBe(true);
    // Never expose private fields
    expect(body.personalMessage).toBeUndefined();
    expect(body.photos).toBeUndefined();
    expect(body.pin).toBeUndefined();
    expect(body.pin_hash).toBeUndefined();
    expect(body.pin_salt).toBeUndefined();
  });

  test("5. Correct PIN unlocks experience and page refresh preserves unlocked session", async ({ page }) => {
    await page.goto("http://localhost:3000/g/demo");

    const pinInput = page.locator('input[type="password"], input[placeholder*="PIN"], input[placeholder*="passcode"]').first();
    await expect(pinInput).toBeVisible();
    await pinInput.fill("2026");

    await page.getByRole("button", { name: /Unlock/i }).click();

    // Once unlocked, cinematic intro scene becomes visible
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).toBeVisible({ timeout: 10000 });

    // Refresh the page — existing valid auth cookie must preserve unlocked state
    await page.reload();
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).toBeVisible({ timeout: 10000 });
    // LockedCoverScene should NOT re-prompt for PIN
    await expect(page.getByText("A Private Digital Gift")).not.toBeVisible();
  });

  test("6. Unprotected seed experience (demo-unprotected) opens directly without PIN", async ({ page, request }) => {
    // Direct API access works without cookie for unprotected experience
    const apiRes = await request.get("http://localhost:3000/api/g/demo-unprotected/payload");
    expect(apiRes.status()).toBe(200);
    const body = await apiRes.json();
    expect(body.experience).toBeDefined();
    expect(body.experience.recipientName).toBe("Alex");

    // UI opens directly to intro without showing locked cover
    await page.goto("http://localhost:3000/g/demo-unprotected");
    await expect(page.getByText("A Private Digital Gift")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).toBeVisible({ timeout: 10000 });
  });

  test("7. Publishing protected experience via API enforces PIN and fresh recipient session prompts for PIN", async ({ request, page }) => {
    const slug = `pin-test-${Date.now()}`;
    const draft: Partial<BirthdayDraft> = {
      id: `draft_${Date.now()}`,
      recipientName: "Protected Recipient",
      birthdayDate: "2026-10-25",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Super secret birthday message for you!",
      isPinProtected: true,
      pin: "4321",
      publishedSlug: slug,
      currentStep: "publish",
      expirationOption: "never",
    };

    // Publish
    const pubRes = await request.post("http://localhost:3000/api/create/publish", {
      headers: { "Content-Type": "application/json" },
      data: { draft, draftId: draft.id },
    });
    expect(pubRes.status()).toBe(200);
    const pubData = await pubRes.json();
    expect(pubData.slug).toBeDefined();

    // Fresh session GET to /api/g/[slug]/payload must be 401
    const freshPayloadRes = await request.get(`http://localhost:3000/api/g/${pubData.slug}/payload`);
    expect(freshPayloadRes.status()).toBe(401);

    // Fresh browser tab visits recipient link
    await page.goto(`http://localhost:3000/g/${pubData.slug}`);
    await expect(page.getByText("A Private Digital Gift")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("For Protected Recipient")).toBeVisible();

    // Enter wrong PIN
    const pinInput = page.locator('input[type="password"], input[placeholder*="PIN"], input[placeholder*="passcode"]').first();
    await pinInput.fill("0000");
    await page.getByRole("button", { name: /Unlock/i }).click();
    await expect(page.getByText(/Passcode incorrect/i)).toBeVisible({ timeout: 5000 });

    // Enter correct PIN
    await pinInput.fill("4321");
    await page.getByRole("button", { name: /Unlock/i }).click();
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).toBeVisible({ timeout: 10000 });
  });

  test("8. Publishing unprotected experience via API opens directly without PIN", async ({ request, page }) => {
    const slug = `unprotected-test-${Date.now()}`;
    const draft: Partial<BirthdayDraft> = {
      id: `draft_${Date.now()}`,
      recipientName: "Public Recipient",
      birthdayDate: "2026-10-25",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Open birthday greeting for everyone to enjoy!",
      isPinProtected: false,
      pin: "",
      publishedSlug: slug,
      currentStep: "publish",
      expirationOption: "never",
    };

    // Publish
    const pubRes = await request.post("http://localhost:3000/api/create/publish", {
      headers: { "Content-Type": "application/json" },
      data: { draft, draftId: draft.id },
    });
    expect(pubRes.status()).toBe(200);
    const pubData = await pubRes.json();

    // Direct payload access allowed
    const payloadRes = await request.get(`http://localhost:3000/api/g/${pubData.slug}/payload`);
    expect(payloadRes.status()).toBe(200);

    // Fresh browser session renders directly without lock
    await page.goto(`http://localhost:3000/g/${pubData.slug}`);
    await expect(page.getByText("A Private Digital Gift")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).toBeVisible({ timeout: 10000 });
  });

  test("9. Recipient page handles non-existent slug with clean 404 not-found and no refresh loops", async ({ page }) => {
    const nonExistentSlug = `non-existent-${Date.now()}`;
    const res = await page.goto(`http://localhost:3000/g/${nonExistentSlug}`);
    expect(res?.status()).toBe(404);
    // Error page/not-found must render cleanly without "missing required error components"
    await expect(page.locator("text=missing required error components")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /This Wishlight Gift is Unavailable/i })).toBeVisible();
  });

  test("10. Expired recipient experience renders ExpiredExperienceView without leaking content or looping", async ({ page }) => {
    // demo-expired is a seeded expired experience
    await page.goto("http://localhost:3000/g/demo-expired");
    await expect(page.locator("text=missing required error components")).not.toBeVisible();
    await expect(page.getByTestId("expired-experience-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/This birthday experience has expired/i)).toBeVisible();
    // Private content or unlock prompt must not be accessible
    await expect(page.getByRole("button", { name: /Unlock/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Explore Memories|Open the Experience|Join the Celebration/i })).not.toBeVisible();
  });
});
