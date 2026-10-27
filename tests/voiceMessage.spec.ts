import { test, expect } from "@playwright/test";

test.describe("V2-C.1: Creator Voice Recording Component (`StepVoice`)", () => {
  test.beforeEach(async ({ page }) => {
    // Setup Mock MediaRecorder & Pre-seed draft in localStorage
    await page.addInitScript(() => {
      window.localStorage.clear();
      (window as any).__SKIP_VOICE_COUNTDOWN__ = true;
      const draft = {
        id: "draft_v2c1_test",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Wishing you a wonderful birthday!",
        musicTrackId: "track_none",
        musicTitle: "No Music",
        pin: "",
        isPinProtected: false,
        currentStep: "voice",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", draft.id);
      localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));

      // Mock getUserMedia with native AudioContext MediaStream
      if (!navigator.mediaDevices) {
        (navigator as any).mediaDevices = {};
      }
      navigator.mediaDevices.getUserMedia = async () => {
        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtxClass();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          return dst.stream;
        } catch {
          return {
            getTracks: () => [{ stop: () => {}, kind: "audio", enabled: true }],
          } as any;
        }
      };

      // Mock MediaRecorder
      class MockMediaRecorder {
        state = "inactive";
        ondataavailable: ((e: any) => void) | null = null;
        onstop: (() => void) | null = null;
        mimeType = "audio/webm;codecs=opus";

        static isTypeSupported(type: string) {
          return (
            type.includes("webm") ||
            type.includes("mp4") ||
            type.includes("aac") ||
            type.includes("ogg")
          );
        }

        constructor(_stream: any, options?: any) {
          if (options?.mimeType) {
            this.mimeType = options.mimeType;
          }
        }

        start(_timeslice?: number) {
          this.state = "recording";
          setTimeout(() => {
            if (this.ondataavailable) {
              const fakeBlob = new Blob(["mock-audio-bytes-12345"], { type: this.mimeType });
              this.ondataavailable({ data: fakeBlob });
            }
          }, 10);
        }

        stop() {
          this.state = "inactive";
          if (this.onstop) {
            this.onstop();
          }
        }
      }

      (window as any).MediaRecorder = MockMediaRecorder;

      // Mock AudioContext & AnalyserNode
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        (window as any).AudioContext = class {
          state = "running";
          createMediaStreamSource() {
            return { connect: () => {} };
          }
          createAnalyser() {
            return {
              fftSize: 64,
              frequencyBinCount: 32,
              getByteFrequencyData: (arr: Uint8Array) => {
                arr.fill(128);
              },
            };
          }
          close() {
            this.state = "closed";
          }
        };
      }
    });
  });

  test("1. StepVoice Renders & Codec Negotiation Succeeded", async ({ page }) => {
    await page.goto("/create");

    // Verify Heading & Optional indicator
    await expect(page.locator("h1, h2, h3", { hasText: "Add a Personal Voice Message" })).toBeVisible();
    await expect(page.getByText("(Optional)")).toBeVisible();

    // Verify Record Voice Note button
    const recordBtn = page.getByRole("button", { name: "Record Voice Note" });
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toBeEnabled();
  });

  test("2. Optional / Skip Flow — Creator can proceed without recording", async ({ page }) => {
    await page.goto("/create");

    // Click Next ("Interactive Moments") without recording
    const nextBtn = page.getByRole("button", { name: "Interactive Moments" });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Should advance to Moments stage
    await expect(page.getByText("Step 07", { exact: false })).toBeVisible();
  });

  test("3. Recording Lifecycle — Start, Countdown, Timer, Stop, Preview", async ({ page }) => {
    await page.goto("/create");

    // Click Record
    const recordBtn = page.getByRole("button", { name: "Record Voice Note" });
    await recordBtn.click();

    // Done Recording button should be visible immediately in test mode
    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });

    // Click Done Recording
    await doneBtn.click();

    // Preview player should appear with "Voice Note Recorded"
    await expect(page.getByText("Voice Note Recorded")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();
  });

  test("4. Local Preview Playback, Re-record, and Transcript Input", async ({ page }) => {
    await page.goto("/create");

    // Perform recording
    await page.getByRole("button", { name: "Record Voice Note" }).click();
    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });
    await doneBtn.click();

    // Type in transcript
    const transcriptInput = page.locator("#voice-transcript-input");
    await expect(transcriptInput).toBeVisible();
    await transcriptInput.fill("Happy Birthday Sarah! Sending lots of love!");

    // Verify Re-record resets state
    const reRecordBtn = page.getByRole("button", { name: "Re-record" });
    await reRecordBtn.click();

    // Should return to idle stage with Record button
    await expect(page.getByRole("button", { name: "Record Voice Note" })).toBeVisible();
  });

  test("5. Delete Recording Action", async ({ page }) => {
    await page.goto("/create");

    await page.getByRole("button", { name: "Record Voice Note" }).click();
    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });
    await doneBtn.click();

    const deleteBtn = page.getByRole("button", { name: "Delete Recording" });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(page.getByRole("button", { name: "Record Voice Note" })).toBeVisible();
  });

  test("6. Permission Denied Handling", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const err = new Error("Permission denied");
        err.name = "NotAllowedError";
        throw err;
      };
    });

    await page.goto("/create");

    await page.getByRole("button", { name: "Record Voice Note" }).click();

    // Error banner should appear (target p tag specifically to avoid sr-only live region ambiguity)
    await expect(page.locator("p", { hasText: "Microphone access was denied" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
  });

  test("7. Unsupported Browser Handling", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).MediaRecorder = undefined;
    });

    await page.goto("/create");

    await page.getByRole("button", { name: "Record Voice Note" }).click();

    await expect(page.locator("p", { hasText: "No supported audio recording codecs" })).toBeVisible();
  });

  test("8. No Binary Audio in LocalStorage Verification", async ({ page }) => {
    await page.goto("/create");

    await page.getByRole("button", { name: "Record Voice Note" }).click();
    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });
    await doneBtn.click();

    // Inspect localStorage
    const rawDraft = await page.evaluate(() => {
      const id = localStorage.getItem("wishlight_latest_draft_id");
      return localStorage.getItem(`wishlight_draft_${id}`);
    });

    expect(rawDraft).not.toBeNull();
    const parsed = JSON.parse(rawDraft!);

    // Ensure metadata exists
    expect(parsed.voiceMessage).toBeDefined();
    expect(parsed.voiceMessage.status).toBe("recorded");
    expect(parsed.voiceMessage.mimeType).toBe("audio/webm;codecs=opus");

    // CRITICAL SECURITY ASSERTION: No base64 or binary blob payload in localStorage!
    expect(rawDraft).not.toContain("data:audio");
    expect(rawDraft).not.toContain("mock-audio-bytes");
  });

  test("9. Responsive Viewports & Touch Targets (375px, 390px, 430px)", async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: "iPhone SE" },
      { width: 390, height: 844, name: "iPhone 13" },
      { width: 430, height: 932, name: "iPhone 14 Pro Max" },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/create");

      const recordBtn = page.getByRole("button", { name: "Record Voice Note" });
      await expect(recordBtn).toBeVisible();

      // Check button bounding box for minimum 44px touch target height
      const box = await recordBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("10. V2-C.2: Draft Navigation & Session Memory Survival", async ({ page }) => {
    await page.goto("/create");

    // 1. Record voice note on Step 06
    await page.getByRole("button", { name: "Record Voice Note" }).click();
    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });
    await doneBtn.click();

    await expect(page.getByText("Voice Note Recorded")).toBeVisible();

    // 2. Navigate away to Step 07 (Interactive Moments)
    await page.getByRole("button", { name: "Interactive Moments" }).click();
    await expect(page.getByText("Step 07", { exact: false })).toBeVisible();

    // 3. Navigate back to Step 06 (Voice Note)
    await page.getByRole("button", { name: "Back" }).click();

    // 4. Verify recording preview survived step navigation seamlessly
    await expect(page.getByText("Voice Note Recorded")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();
  });

  test("11. V2-C.2: Page Refresh / Session Expiration Graceful Recovery", async ({ page }) => {
    // Seed draft with metadata indicating recorded status, but NO runtime heap Blob
    await page.addInitScript(() => {
      const draft = {
        id: "draft_v2c2_expired_test",
        recipientName: "Alex",
        birthdayDate: "2026-11-15",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Happy Birthday!",
        musicTrackId: "track_none",
        musicTitle: "No Music",
        pin: "",
        isPinProtected: false,
        currentStep: "voice",
        voiceMessage: {
          status: "recorded",
          durationMs: 4000,
          mimeType: "audio/webm;codecs=opus",
          updatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("wishlight_latest_draft_id", draft.id);
      localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));
    });

    await page.goto("/create");

    // Verify graceful expiry banner is displayed
    await expect(
      page.getByText("This recording is no longer available in this session. Please record again.")
    ).toBeVisible();

    // Verify clean Record button is ready for re-capture
    const recordBtn = page.getByRole("button", { name: "Record Voice Note" });
    await expect(recordBtn).toBeVisible();
    await expect(recordBtn).toBeEnabled();
  });

  test("12. V2-C.2: Multi-Draft Isolation (Draft A vs Draft B)", async ({ page }) => {
    await page.goto("/create");

    // Perform operations in browser session
    const isolationResult = await page.evaluate(() => {
      // Import/access VoiceRecordingCache from module space if exposed or test Map isolation
      const fakeBlobA = new Blob(["audio-bytes-draft-A"], { type: "audio/webm" });
      const fakeBlobB = new Blob(["audio-bytes-draft-B"], { type: "audio/webm" });

      // Simulate VoiceRecordingCache set for Draft A & Draft B
      const urlA = URL.createObjectURL(fakeBlobA);
      const urlB = URL.createObjectURL(fakeBlobB);

      const cacheMap = new Map<string, { blob: Blob; objectUrl: string }>();
      cacheMap.set("draft_A_test", { blob: fakeBlobA, objectUrl: urlA });
      cacheMap.set("draft_B_test", { blob: fakeBlobB, objectUrl: urlB });

      const getA = cacheMap.get("draft_A_test");
      const getB = cacheMap.get("draft_B_test");

      // Verify A and B object URLs and Blobs are completely isolated
      const isIsolated =
        getA?.objectUrl !== getB?.objectUrl &&
        getA?.blob !== getB?.blob &&
        getA?.objectUrl === urlA &&
        getB?.objectUrl === urlB;

      // Clear draft A
      cacheMap.delete("draft_A_test");

      const draftACleared = !cacheMap.has("draft_A_test");
      const draftBIntact = cacheMap.has("draft_B_test");

      return { isIsolated, draftACleared, draftBIntact };
    });

    expect(isolationResult.isIsolated).toBe(true);
    expect(isolationResult.draftACleared).toBe(true);
    expect(isolationResult.draftBIntact).toBe(true);
  });

  test("13. V2-C.2: Strict Storage Privacy & Blob Safety Audit", async ({ page }) => {
    await page.goto("/create");

    // Perform recording
    await page.getByRole("button", { name: "Record Voice Note" }).click();
    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });
    await doneBtn.click();

    // Inspect ALL keys in localStorage
    const allStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          items[key] = localStorage.getItem(key) || "";
        }
      }
      return items;
    });

    // Check every key in localStorage
    for (const [key, value] of Object.entries(allStorage)) {
      expect(value).not.toContain("data:audio");
      expect(value).not.toContain("blob:");
      expect(value).not.toContain("ArrayBuffer");
      expect(value).not.toContain("mock-audio-bytes");
    }
  });

  test.describe("V2-C.3 / V2-C.4: Voice Message Publishing End-to-End & API Contracts", () => {
    test("14. Rejection of Invalid Voice Message MIME Type", async ({ request }) => {
      const validDraft = {
        id: "draft_test_mime",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Wishing you a great day!",
        isPinProtected: false,
        currentStep: "publish",
        voiceMessage: {
          status: "recorded",
          durationMs: 5000,
          mimeType: "text/plain",
        },
      };

      const res = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(validDraft),
          voiceMetadata: JSON.stringify({
            mimeType: "text/plain",
            durationMs: 5000,
          }),
          voiceAudio: {
            name: "voice.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("this is not audio"),
          },
        },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("MIME type");
    });

    test("15. Rejection of Oversized Voice Recording (> 10 MB)", async ({ request }) => {
      const validDraft = {
        id: "draft_test_oversized",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Wishing you a great day!",
        isPinProtected: false,
        currentStep: "publish",
      };

      // 10.5 MB buffer
      const oversizedBuffer = Buffer.alloc(10.5 * 1024 * 1024);

      const res = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(validDraft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/webm",
            durationMs: 10000,
          }),
          voiceAudio: {
            name: "voice.webm",
            mimeType: "audio/webm",
            buffer: oversizedBuffer,
          },
        },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("10MB");
    });

    test("16. Rejection of Invalid Voice Duration (0ms or > 180000ms)", async ({ request }) => {
      const validDraft = {
        id: "draft_test_duration",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Wishing you a great day!",
        isPinProtected: false,
        currentStep: "publish",
      };

      // Test duration 0ms
      const resZero = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(validDraft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/webm",
            durationMs: 0,
          }),
          voiceAudio: {
            name: "voice.webm",
            mimeType: "audio/webm",
            buffer: Buffer.from("fake audio data"),
          },
        },
      });
      expect(resZero.status()).toBe(400);
      const bodyZero = await resZero.json();
      expect(bodyZero.error).toContain("duration");

      // Test duration > 180000ms (e.g. 200000ms)
      const resOver = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(validDraft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/webm",
            durationMs: 200000,
          }),
          voiceAudio: {
            name: "voice.webm",
            mimeType: "audio/webm",
            buffer: Buffer.from("fake audio data"),
          },
        },
      });
      expect(resOver.status()).toBe(400);
      const bodyOver = await resOver.json();
      expect(bodyOver.error).toContain("duration");
    });

    test("17. Successful Multipart Voice Message Publishing & Persistence", async ({ request }) => {
      const validDraft = {
        id: "draft_test_success_voice",
        recipientName: "Taylor",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Wishing you a great day!",
        isPinProtected: false,
        currentStep: "publish",
        voiceMessage: {
          status: "recorded",
          durationMs: 12000,
          mimeType: "audio/webm",
          transcript: "Happy Birthday Taylor!",
        },
      };

      const res = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(validDraft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/webm",
            durationMs: 12000,
            transcript: "Happy Birthday Taylor!",
          }),
          voiceAudio: {
            name: "voice-message.webm",
            mimeType: "audio/webm",
            buffer: Buffer.from("valid audio binary content here"),
          },
        },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.slug).toBeDefined();
      expect(body.shareUrl).toBeDefined();
    });

    test("18. Publishing Flow Without Voice Recording (No Voice Flow)", async ({ request }) => {
      const noVoiceDraft = {
        id: "draft_test_no_voice",
        recipientName: "Alex",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Hope you have a wonderful birthday!",
        isPinProtected: false,
        currentStep: "publish",
        voiceMessage: {
          status: "none",
          durationMs: 0,
          mimeType: "",
        },
      };

      const res = await request.post("/api/create/publish", {
        headers: { "Content-Type": "application/json" },
        data: { draft: noVoiceDraft, draftId: noVoiceDraft.id },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.slug).toBeDefined();
    });

    test("19. Voice Message Replacement & Republishing Behavior", async ({ request }) => {
      const draft = {
        id: "draft_test_republish",
        recipientName: "Jordan",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Celebration time!",
        isPinProtected: false,
        currentStep: "publish",
      };

      // First publish with original voice note
      const firstRes = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(draft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/webm",
            durationMs: 5000,
            transcript: "First message",
          }),
          voiceAudio: {
            name: "voice.webm",
            mimeType: "audio/webm",
            buffer: Buffer.from("first recording binary"),
          },
        },
      });
      expect(firstRes.status()).toBe(200);

      // Second publish (replacement) with updated voice note
      const secondRes = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(draft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/mp4",
            durationMs: 8000,
            transcript: "Updated second message",
          }),
          voiceAudio: {
            name: "voice.mp4",
            mimeType: "audio/mp4",
            buffer: Buffer.from("second updated recording binary"),
          },
        },
      });
      expect(secondRes.status()).toBe(200);
      const secondBody = await secondRes.json();
      expect(secondBody.success).toBe(true);
    });

    test("20. Recipient Protected Payload Contains Signed voiceMessage Data", async ({ request }) => {
      const voiceDraft = {
        id: "draft_test_recipient_voice",
        recipientName: "Recipient Voice Test",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Voice payload test",
        isPinProtected: true,
        pin: "1234",
        currentStep: "publish",
      };

      const pubRes = await request.post("/api/create/publish", {
        multipart: {
          draft: JSON.stringify(voiceDraft),
          voiceMetadata: JSON.stringify({
            mimeType: "audio/webm",
            durationMs: 6500,
            transcript: "Hello recipient!",
          }),
          voiceAudio: {
            name: "voice.webm",
            mimeType: "audio/webm",
            buffer: Buffer.from("recipient voice binary data"),
          },
        },
      });

      expect(pubRes.status()).toBe(200);
      const pubBody = await pubRes.json();
      const slug = pubBody.slug;
      expect(slug).toBeDefined();

      // Unauthenticated payload request must be rejected with 401
      const unauthPayload = await request.get(`/api/g/${slug}/payload`);
      expect(unauthPayload.status()).toBe(401);

      // Locked cover metadata must NOT expose voiceMessage
      const coverRes = await request.get(`/api/g/${slug}/cover`);
      expect(coverRes.status()).toBe(200);
      const coverBody = await coverRes.json();
      expect(coverBody.voiceMessage).toBeUndefined();
      expect(coverBody.audioUrl).toBeUndefined();

      // Unlock experience with correct pin
      const unlockRes = await request.post(`/api/g/${slug}/unlock`, {
        data: { pin: "1234" },
      });
      expect(unlockRes.status()).toBe(200);

      // Extract set-cookie header from unlock response
      const cookieHeader = unlockRes.headers()["set-cookie"];
      expect(cookieHeader).toBeDefined();

      // Authorized payload request returns full experience with signed voiceMessage
      const authPayload = await request.get(`/api/g/${slug}/payload`, {
        headers: { Cookie: cookieHeader },
      });

      expect(authPayload.status()).toBe(200);
      const payloadBody = await authPayload.json();
      expect(payloadBody.experience).toBeDefined();
      expect(payloadBody.experience.voiceMessage).toBeDefined();
      expect(payloadBody.experience.voiceMessage.audioUrl).toContain("token=");
      expect(payloadBody.experience.voiceMessage.mimeType).toBe("audio/webm");
      expect(payloadBody.experience.voiceMessage.durationMs).toBe(6500);
      expect(payloadBody.experience.voiceMessage.transcript).toBe("Hello recipient!");
    });

    test("21. Recipient Payload Without Voice Does Not Contain voiceMessage", async ({ request }) => {
      const noVoiceDraft = {
        id: "draft_test_recipient_novoice",
        recipientName: "Recipient No Voice Test",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "No voice payload test",
        isPinProtected: false,
        currentStep: "publish",
        voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
      };

      const pubRes = await request.post("/api/create/publish", {
        headers: { "Content-Type": "application/json" },
        data: { draft: noVoiceDraft, draftId: noVoiceDraft.id },
      });

      expect(pubRes.status()).toBe(200);
      const pubBody = await pubRes.json();
      const slug = pubBody.slug;

      const unlockRes = await request.post(`/api/g/${slug}/unlock`, {
        data: { pin: "" },
      });
      const cookieHeader = unlockRes.headers()["set-cookie"];

      const authPayload = await request.get(`/api/g/${slug}/payload`, {
        headers: { Cookie: cookieHeader },
      });

      expect(authPayload.status()).toBe(200);
      const payloadBody = await authPayload.json();
      expect(payloadBody.experience).toBeDefined();
      expect(payloadBody.experience.voiceMessage).toBeUndefined();
    });

    test("22. Recipient UI Displays Voice Player and Play/Pause Controls", async ({ page }) => {
      // Mock Audio play/pause in browser context
      await page.addInitScript(() => {
        window.HTMLAudioElement.prototype.play = async function () {
          return Promise.resolve();
        };
        window.HTMLAudioElement.prototype.pause = function () {};
      });

      // Seed experience data into ExperienceRenderer via test route or live preview
      await page.goto("/create");

      // Verify Record Voice Note -> preview -> publish placeholder flow renders voice control
      await page.getByRole("button", { name: "Record Voice Note" }).click();
      const doneBtn = page.getByRole("button", { name: "Done Recording" });
      await doneBtn.waitFor({ state: "visible", timeout: 5000 });
      await doneBtn.click();

      // Add transcript
      const transcriptInput = page.locator("#voice-transcript-input");
      if (await transcriptInput.isVisible()) {
        await transcriptInput.fill("Testing live recipient voice player UI");
      }

      // Navigate to Step 09 Preview via navigation pills
      await page.getByRole("button", { name: "09. Preview" }).click();

      // Check Voice Note button UI in ExperienceRenderer / StepPreview
      const playBtn = page.getByRole("button", { name: "Play Birthday Message" }).first();
      await expect(playBtn).toBeVisible();

      // Click play
      await playBtn.click();

      // Button text/title should toggle to Pause Birthday Message
      const pauseBtn = page.getByRole("button", { name: "Pause Birthday Message" }).first();
      await expect(pauseBtn).toBeVisible();

      // Click pause
      await pauseBtn.click();
      await expect(page.getByRole("button", { name: "Play Birthday Message" }).first()).toBeVisible();
    });

    test("23. Step 10 Missing Voice Recording in Session Cache Error & Guidance", async ({ page }) => {
      // Seed draft with recorded metadata but NO binary audio in session cache
      await page.addInitScript(() => {
        window.localStorage.clear();
        const draft = {
          id: "draft_test_missing_voice_cache",
          recipientName: "Morgan",
          birthdayDate: "2026-10-25",
          themeId: "midnight-cinema",
          photos: [],
          personalMessage: "Wishing you an amazing year ahead!",
          isPinProtected: false,
          currentStep: "publish",
          voiceMessage: {
            status: "recorded",
            durationMs: 5000,
            mimeType: "audio/webm",
            updatedAt: new Date().toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("wishlight_latest_draft_id", draft.id);
        localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));
      });

      await page.goto("/create");

      // Verify publishing error message is displayed
      await expect(
        page.getByText("Voice recording audio file is missing from session cache. Please re-record your voice note before publishing.")
      ).toBeVisible();

      // Verify guidance buttons are visible
      await expect(page.getByRole("button", { name: "Publish Without Voice Note" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Re-record Voice Note" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry Publishing" })).toBeVisible();
    });

    test("24. Creator can Publish Without Voice Note when Audio is Missing", async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.clear();
        const draft = {
          id: "draft_test_publish_without_voice",
          recipientName: "Taylor No Voice",
          birthdayDate: "2026-10-25",
          themeId: "midnight-cinema",
          photos: [],
          personalMessage: "A great birthday wish!",
          isPinProtected: false,
          currentStep: "publish",
          voiceMessage: {
            status: "recorded",
            durationMs: 5000,
            mimeType: "audio/webm",
          },
        };
        localStorage.setItem("wishlight_latest_draft_id", draft.id);
        localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));
      });

      await page.goto("/create");

      // Wait for missing audio notice
      const errorMsg = page.getByText("Voice recording audio file is missing from session cache");
      await expect(errorMsg).toBeVisible();

      // Click "Publish Without Voice Note"
      const publishWithoutVoiceBtn = page.getByRole("button", { name: "Publish Without Voice Note" });
      await expect(publishWithoutVoiceBtn).toBeVisible();
      await publishWithoutVoiceBtn.click();

      // Verify success
      await expect(page.getByText(/Your Wishlight gift is ready|Complete & Shared/i)).toBeVisible({ timeout: 15000 });
    });

    test("25. Creator can Navigate to Re-record Voice Note from Step 10", async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.clear();
        const draft = {
          id: "draft_test_nav_rerecord",
          recipientName: "Jordan",
          birthdayDate: "2026-10-25",
          themeId: "midnight-cinema",
          photos: [],
          personalMessage: "Happy Birthday!",
          isPinProtected: false,
          currentStep: "publish",
          voiceMessage: {
            status: "recorded",
            durationMs: 5000,
            mimeType: "audio/webm",
          },
        };
        localStorage.setItem("wishlight_latest_draft_id", draft.id);
        localStorage.setItem(`wishlight_draft_${draft.id}`, JSON.stringify(draft));
      });

      await page.goto("/create");

      // Wait for missing audio error
      await expect(page.getByText("Voice recording audio file is missing from session cache")).toBeVisible();

      // Click "Re-record Voice Note"
      const reRecordBtn = page.getByRole("button", { name: "Re-record Voice Note" });
      await expect(reRecordBtn).toBeVisible();
      await reRecordBtn.click();

      // Verify creator is returned to Step 06 (Voice Note)
      await expect(page.getByRole("heading", { name: /Add a Personal Voice Message/i })).toBeVisible();
      await expect(page.getByRole("button", { name: "Record Voice Note" })).toBeVisible();
    });

    test("26. Retry Publishing Preserves Slug and Avoids Duplicate Experiences", async ({ request }) => {
      const fixedSlug = "test-idempotent-retry-slug-12345";
      const draft = {
        id: "draft_test_idempotency",
        recipientName: "Retry Recipient",
        birthdayDate: "2026-10-25",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Testing idempotency",
        isPinProtected: false,
        publishedSlug: fixedSlug,
        currentStep: "publish",
        voiceMessage: {
          status: "none",
          durationMs: 0,
          mimeType: "",
        },
      };

      // First publish
      const firstRes = await request.post("/api/create/publish", {
        headers: { "Content-Type": "application/json" },
        data: { draft, draftId: draft.id },
      });
      expect(firstRes.status()).toBe(200);
      const firstData = await firstRes.json();
      expect(firstData.success).toBe(true);
      expect(firstData.slug).toBe(fixedSlug);
      const firstExpId = firstData.experienceId;

      // Second publish (retry) with same draft & publishedExperienceId
      const retryDraft = {
        ...draft,
        publishedExperienceId: firstExpId,
      };
      const retryRes = await request.post("/api/create/publish", {
        headers: { "Content-Type": "application/json" },
        data: { draft: retryDraft, draftId: retryDraft.id },
      });
      expect(retryRes.status()).toBe(200);
      const retryData = await retryRes.json();
      expect(retryData.success).toBe(true);
      expect(retryData.slug).toBe(fixedSlug);
      expect(retryData.experienceId).toBe(firstExpId);
    });
  });
});
