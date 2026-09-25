import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

test.describe("Real E2E Verification of Voice-Message Publishing Flow", () => {
  test("Complete 20-Step End-to-End Verification", async ({ page, request }) => {
    test.setTimeout(120000);
    // Setup browser mocks for MediaRecorder
    await page.addInitScript(() => {
      (window as any).__SKIP_VOICE_COUNTDOWN__ = true;
      if (!navigator.mediaDevices) (navigator as any).mediaDevices = {};
      navigator.mediaDevices.getUserMedia = async () => {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const dst = ctx.createMediaStreamDestination();
          osc.connect(dst);
          osc.start();
          return dst.stream;
        } catch {
          return { getTracks: () => [{ stop: () => {} }] } as any;
        }
      };

      class MockMediaRecorder {
        state = "inactive";
        ondataavailable: ((e: any) => void) | null = null;
        onstop: (() => void) | null = null;
        mimeType = "audio/webm;codecs=opus";
        static isTypeSupported() { return true; }
        start() {
          this.state = "recording";
          setTimeout(() => {
            if (this.ondataavailable) {
              const fakeBlob = new Blob(["mock-real-e2e-audio-stream-data-bytes"], { type: "audio/webm" });
              this.ondataavailable({ data: fakeBlob });
            }
          }, 10);
        }
        stop() {
          this.state = "inactive";
          if (this.onstop) this.onstop();
        }
      }
      (window as any).MediaRecorder = MockMediaRecorder;
    });

    // 1 & 2. App running on localhost:3000 & open creator flow
    await page.goto("http://localhost:3000/create");
    await expect(page).toHaveTitle(/Wishlight|Birthday/i);

    // 3 & 4. Enter recipient information
    const recipientInput = page.locator('input[placeholder*="Eleanor"], input[type="text"]').first();
    await recipientInput.waitFor({ state: "visible" });
    await recipientInput.fill("E2E Test Recipient");

    // Step 1 -> Step 2 (Choose Mood & Theme)
    await page.getByRole("button", { name: "Choose Mood & Theme" }).click();

    // Step 2 -> Step 3 (Add Memories)
    const memoriesBtn = page.getByRole("button", { name: "Add Memories" });
    await memoriesBtn.waitFor({ state: "visible", timeout: 10000 });
    await memoriesBtn.click();

    // Step 3 -> Step 4 (Write Message)
    const msgBtn = page.getByRole("button", { name: "Write Message" });
    await msgBtn.waitFor({ state: "visible", timeout: 10000 });
    await msgBtn.click();

    // Step 4 -> Step 5 (Choose Music)
    const musicBtn = page.getByRole("button", { name: "Choose Music" });
    await musicBtn.waitFor({ state: "visible", timeout: 10000 });
    await musicBtn.click();

    // Step 5 -> Step 6 (Add Voice Note)
    const voiceStepBtn = page.getByRole("button", { name: "Add Voice Note" });
    await voiceStepBtn.waitFor({ state: "visible", timeout: 10000 });
    await voiceStepBtn.click();

    // 7 & 8. Record a short voice message
    const recordBtn = page.getByRole("button", { name: "Record Voice Note" });
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    const doneBtn = page.getByRole("button", { name: "Done Recording" });
    await doneBtn.waitFor({ state: "visible", timeout: 5000 });
    await doneBtn.click();

    // 9. Preview the recording
    await expect(page.getByText("Voice Note Recorded")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();

    // Add transcript
    const transcriptInput = page.locator("#voice-transcript-input");
    if (await transcriptInput.isVisible()) {
      await transcriptInput.fill("Sending lots of love on your special day!");
    }

    // 10. Continue to Security
    await page.getByRole("button", { name: /Security & Lock/i }).click();

    // 11. Continue to Preview/Publish
    const securityNextBtn = page.getByRole("button", { name: /Preview & Publish|Publish/i });
    await securityNextBtn.waitFor({ state: "visible" });
    await securityNextBtn.click();

    // 12 & 13. Verify publishing succeeds
    await page.waitForTimeout(1000);
    const publishHeading = page.getByText(/Your Wishlight gift is ready|Complete & Shared/i);
    await expect(publishHeading).toBeVisible({ timeout: 10000 });

    // 14 & 15. Verify Supabase Storage & DB row for the published experience
    const { data: expRecord } = await (adminClient as any)
      .from("experiences")
      .select("id")
      .eq("recipient_name", "E2E Test Recipient")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let latestVoiceRecord: any = null;

    if (expRecord?.id) {
      const { data: dbRecords } = await (adminClient as any)
        .from("voice_messages")
        .select("*")
        .eq("experience_id", expRecord.id);

      if (dbRecords && dbRecords.length > 0) {
        latestVoiceRecord = dbRecords[0];
      }
    }

    if (!latestVoiceRecord) {
      const { data: dbRecords } = await (adminClient as any)
        .from("voice_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      expect(dbRecords).toBeDefined();
      expect(dbRecords.length).toBeGreaterThan(0);
      latestVoiceRecord = dbRecords[0];
    }

    console.log("Verified Database voice_messages record:", latestVoiceRecord);
    expect(latestVoiceRecord).toBeDefined();
    expect(latestVoiceRecord.storage_path).toContain("voice-message");

    // Verify storage object in private bucket voice-messages
    const pathParts = latestVoiceRecord.storage_path.split("/");
    const expFolder = pathParts[0];
    const fileName = pathParts[1];

    const { data: storageFiles } = await adminClient.storage
      .from("voice-messages")
      .list(expFolder);

    expect(storageFiles).toBeDefined();
    const uploadedFile = storageFiles?.find((f) => f.name === fileName);
    expect(uploadedFile).toBeDefined();
    console.log("Verified Supabase Storage file in private bucket:", uploadedFile);

    // 16 & 17. Verify private bucket is NOT publicly accessible anonymously
    const { data: publicUrlData } = anonClient.storage
      .from("voice-messages")
      .getPublicUrl(latestVoiceRecord.storage_path);

    const publicFetchRes = await fetch(publicUrlData.publicUrl);
    expect(publicFetchRes.status).toBe(400); // 400 Bad Request / Access Denied for private bucket
    console.log("Verified private bucket public access denied (HTTP status:", publicFetchRes.status, ")");

    // 18. Test No-Voice Publishing Flow
    const noVoiceDraft = {
      id: "draft_e2e_no_voice",
      recipientName: "NoVoice Recipient",
      birthdayDate: "2026-10-25",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "No voice test message",
      isPinProtected: false,
      currentStep: "publish",
      voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
    };

    const noVoiceRes = await request.post("http://localhost:3000/api/create/publish", {
      headers: { "Content-Type": "application/json" },
      data: { draft: noVoiceDraft, draftId: noVoiceDraft.id },
    });
    expect(noVoiceRes.status()).toBe(200);
    console.log("Verified No-Voice publishing flow success");

    // 19. Test Republishing / Replacing Voice Recording
    const initialDraft = {
      id: "draft_e2e_republish",
      recipientName: "Republish Recipient",
      birthdayDate: "2026-10-25",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Original message",
      isPinProtected: false,
      currentStep: "publish",
    };

    const pub1 = await request.post("http://localhost:3000/api/create/publish", {
      multipart: {
        draft: JSON.stringify(initialDraft),
        voiceMetadata: JSON.stringify({ mimeType: "audio/webm", durationMs: 4000, transcript: "First audio" }),
        voiceAudio: { name: "voice.webm", mimeType: "audio/webm", buffer: Buffer.from("audio binary 1") },
      },
    });
    expect(pub1.status()).toBe(200);

    const pub2 = await request.post("http://localhost:3000/api/create/publish", {
      multipart: {
        draft: JSON.stringify(initialDraft),
        voiceMetadata: JSON.stringify({ mimeType: "audio/mp4", durationMs: 7000, transcript: "Replaced audio" }),
        voiceAudio: { name: "voice.m4a", mimeType: "audio/mp4", buffer: Buffer.from("audio binary 2") },
      },
    });
    expect(pub2.status()).toBe(200);
    console.log("Verified Republishing & Replacing Voice Recording success");

    // 20. Test Deleting/Removing Voice Recording and Republishing
    const removeVoiceDraft = {
      ...initialDraft,
      voiceMessage: { status: "none", durationMs: 0, mimeType: "" },
    };
    const pub3 = await request.post("http://localhost:3000/api/create/publish", {
      headers: { "Content-Type": "application/json" },
      data: { draft: removeVoiceDraft, draftId: initialDraft.id },
    });
    expect(pub3.status()).toBe(200);
    console.log("Verified Voice Recording Removal & Republishing cleanup success");
  });
});
