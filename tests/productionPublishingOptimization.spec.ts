import { test, expect } from "@playwright/test";
import { dataUrlToBlob, migrateBase64Photos } from "@/lib/media/uploadHelper";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";
import { BirthdayDraft } from "@/types/draft";
import { isInternalStoragePath, normalizeStorageKey } from "@/lib/expiration/cleanupService";
import { calculateExpiresAt, isExperienceExpired } from "@/lib/expiration/expiration";
import { SeedExperienceRepository } from "@/lib/experience/SeedExperienceRepository";

test.describe("Wishlight V3 — Production Publishing & Media Upload Optimization Tests", () => {
  const sample1x1Png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  test.describe("1. Secure Upload URL API (/api/create/upload-url)", () => {
    test("1.1 Rejects request without draft ID", async ({ request }) => {
      const res = await request.post("/api/create/upload-url", {
        data: {
          mediaType: "photo",
          mimeType: "image/jpeg",
          fileSize: 1024,
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Invalid or malformed draft ID/i);
    });

    test("1.2 Rejects path traversal in draft ID", async ({ request }) => {
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId: "../secret-dir",
          mediaType: "photo",
          mimeType: "image/jpeg",
          fileSize: 1024,
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Invalid or malformed draft ID/i);
    });

    test("1.3 Rejects invalid photo MIME type", async ({ request }) => {
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId: "draft_test_valid_123",
          mediaType: "photo",
          mimeType: "application/pdf",
          fileSize: 2048,
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Unsupported image type/i);
    });

    test("1.4 Rejects oversized photo (>10MB)", async ({ request }) => {
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId: "draft_test_valid_123",
          mediaType: "photo",
          mimeType: "image/jpeg",
          fileSize: 11 * 1024 * 1024, // 11MB
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/exceeds maximum limit/i);
    });

    test("1.5 Rejects invalid voice MIME type", async ({ request }) => {
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId: "draft_test_valid_123",
          mediaType: "voice",
          mimeType: "video/mp4",
          fileSize: 4096,
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Unsupported audio type/i);
    });

    test("1.6 Rejects oversized voice recording (>10MB)", async ({ request }) => {
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId: "draft_test_valid_123",
          mediaType: "voice",
          mimeType: "audio/webm",
          fileSize: 12 * 1024 * 1024, // 12MB
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/exceeds maximum limit/i);
    });

    test("1.7 Successfully generates signed upload info for valid photo", async ({ request }) => {
      const draftId = `draft_photo_${Date.now()}`;
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId,
          mediaType: "photo",
          mimeType: "image/png",
          fileSize: 50000,
          fileName: "family-celebration.png",
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.bucket).toBe("experience-media");
      expect(json.path).toMatch(new RegExp(`^drafts\/${draftId}\/[a-f0-9-]+\\.png$`));
      expect(typeof json.token).toBe("string");
      expect(json.token.length).toBeGreaterThan(10);
      expect(json.signedUrl).toContain("experience-media");
    });

    test("1.8 Successfully generates signed upload info for valid voice recording", async ({ request }) => {
      const draftId = `draft_voice_${Date.now()}`;
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId,
          mediaType: "voice",
          mimeType: "audio/webm",
          fileSize: 100000,
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.bucket).toBe("voice-messages");
      expect(json.path).toBe(`drafts/${draftId}/voice-message.webm`);
      expect(typeof json.token).toBe("string");
      expect(json.signedUrl).toContain("voice-messages");
    });

    test("1.9 Successfully strips codec parameters like audio/webm;codecs=opus", async ({ request }) => {
      const draftId = `draft_voice_opus_${Date.now()}`;
      const res = await request.post("/api/create/upload-url", {
        data: {
          draftId,
          mediaType: "voice",
          mimeType: "audio/webm;codecs=opus",
          fileSize: 85000,
        },
      });
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.bucket).toBe("voice-messages");
      expect(json.path).toBe(`drafts/${draftId}/voice-message.webm`);
    });
  });

  test.describe("2. Client-Side Helpers & Legacy Base64 Migration", () => {
    test("2.1 dataUrlToBlob accurately converts base64 to binary Blob", () => {
      const { blob, mimeType } = dataUrlToBlob(sample1x1Png);
      expect(mimeType).toBe("image/png");
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe("image/png");
    });

    test("2.2 isInternalStoragePath distinguishes internal storage paths from external or Base64", () => {
      expect(isInternalStoragePath("drafts/draft_123/img.png")).toBe(true);
      expect(isInternalStoragePath("exp_456/voice-message.webm")).toBe(true);
      expect(isInternalStoragePath("data:image/png;base64,abc")).toBe(false);
      expect(isInternalStoragePath("https://external.com/photo.jpg")).toBe(false);
      expect(isInternalStoragePath("http://localhost/image.png")).toBe(false);
      expect(isInternalStoragePath("")).toBe(false);
      expect(isInternalStoragePath(null)).toBe(false);
    });

    test("2.3 normalizeStorageKey strips bucket prefix if present", () => {
      expect(normalizeStorageKey("experience-media/drafts/123/pic.jpg", "experience-media")).toBe("drafts/123/pic.jpg");
      expect(normalizeStorageKey("drafts/123/pic.jpg", "experience-media")).toBe("drafts/123/pic.jpg");
      expect(normalizeStorageKey("voice-messages/drafts/123/voice.webm", "voice-messages")).toBe("drafts/123/voice.webm");
    });

    test("2.4 LocalDraftRepository gracefully saves and retains media storagePath", async () => {
      const testDraft: BirthdayDraft = {
        id: "draft_test_storage_repo_" + Date.now(),
        recipientName: "Sophia",
        themeId: "midnight-cinema",
        photos: [
          {
            id: "p1",
            url: "drafts/draft_test_storage_repo/photo_1.png",
            storagePath: "drafts/draft_test_storage_repo/photo_1.png",
            type: "image",
            caption: "Vacation",
            sortOrder: 1,
          },
        ],
        personalMessage: "Happy Birthday!",
        voiceMessage: {
          status: "recorded",
          durationMs: 5000,
          mimeType: "audio/webm",
          storagePath: "drafts/draft_test_storage_repo/voice-message.webm",
        },
        currentStep: "publish",
        isPinProtected: false,
        pin: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const saved = await localDraftRepository.saveDraft(testDraft);
      expect(saved.photos[0].storagePath).toBe("drafts/draft_test_storage_repo/photo_1.png");
      expect(saved.photos[0].url).toBe("drafts/draft_test_storage_repo/photo_1.png");

      const loaded = await localDraftRepository.getDraft(testDraft.id);
      expect(loaded?.photos[0].storagePath).toBe("drafts/draft_test_storage_repo/photo_1.png");
    });
  });

  test.describe("3. Lightweight JSON Publishing (/api/create/publish)", () => {
    test("3.1 Rejects empty recipient name", async ({ request }) => {
      const res = await request.post("/api/create/publish", {
        data: {
          recipientName: "   ",
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Recipient name is required/i);
    });

    test("3.2 Rejects missing PIN when PIN protection enabled", async ({ request }) => {
      const res = await request.post("/api/create/publish", {
        data: {
          recipientName: "Chloe",
          isPinProtected: true,
          pin: "",
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/secret PIN is required/i);
    });

    test("3.3 Rejects path traversal in media storage path", async ({ request }) => {
      const res = await request.post("/api/create/publish", {
        data: {
          recipientName: "Oliver",
          photos: [
            {
              id: "photo_hack",
              storagePath: "../../etc/passwd",
              caption: "Hacked image",
            },
          ],
        },
      });
      expect(res.status()).toBe(500);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid photo storage path/i);
    });

    test("3.4 Rejects path traversal in voice storage path", async ({ request }) => {
      const res = await request.post("/api/create/publish", {
        data: {
          recipientName: "Oliver",
          voiceMessage: {
            storagePath: "../secret-bucket/recording.webm",
            mimeType: "audio/webm",
            durationMs: 5000,
          },
        },
      });
      expect(res.status()).toBe(500);
      const json = await res.json();
      expect(json.error).toMatch(/Invalid voice message storage path/i);
    });

    test("3.5 Successfully publishes lightweight experience with media references", async ({ request }) => {
      const uniqueSlug = `test-publish-v3-${Date.now()}`;
      const draftId = `draft_v3_lightweight_${Date.now()}`;
      const res = await request.post("/api/create/publish", {
        data: {
          draftId,
          publishedSlug: uniqueSlug,
          recipientName: "Victoria",
          birthdayDate: "2026-12-25",
          themeId: "midnight-cinema",
          personalMessage: "Sending you light and laughter on your special day.",
          musicTitle: "Lofi Dream",
          photos: [
            {
              id: "p1",
              storagePath: `drafts/${draftId}/sample-photo.png`,
              caption: "Memory One",
              sortOrder: 1,
            },
          ],
          voiceMessage: {
            storagePath: `drafts/${draftId}/voice-message.webm`,
            mimeType: "audio/webm",
            durationMs: 12500,
            fileSize: 45000,
          },
          isPinProtected: false,
          expirationOption: "never",
        },
      });

      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.slug).toBe(uniqueSlug);
      expect(json.shareUrl).toContain(`/g/${uniqueSlug}`);
      expect(typeof json.experienceId).toBe("string");
    });
  });

  test.describe("4. Recipient Experience Compatibility", () => {
    test("4.1 Seed demo experience loads locked metadata", async ({ request }) => {
      const res = await request.get("/api/g/demo/cover");
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.recipientName).toBe("Sophia");
      expect(json.themeId).toBe("champagne-noir");
      expect(json.isPinProtected).toBe(true);
      expect(json.isExpired).toBe(false);
    });

    test("4.2 Expired experience returns 410 Gone with EXPERIENCE_EXPIRED code", async ({ request }) => {
      const res = await request.get("/api/g/demo-expired/cover");
      expect(res.status()).toBe(410);
      const json = await res.json();
      expect(json.code).toBe("EXPERIENCE_EXPIRED");
      expect(json.isExpired).toBe(true);
    });

    test("4.3 PIN protected experience requires PIN unlock before payload", async ({ request }) => {
      const res = await request.get("/api/g/demo/payload");
      expect(res.status()).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/PIN verification required/i);
    });

    test("4.4 Valid PIN unlocks protected experience", async ({ request }) => {
      const unlockRes = await request.post("/api/g/demo/unlock", {
        data: { pin: "2026" },
      });
      expect(unlockRes.status()).toBe(200);
      const unlockJson = await unlockRes.json();
      expect(unlockJson.success).toBe(true);
    });
  });

  test.describe("5. Preview URL Authorization & Draft Preservation", () => {
    test("5.1 Rejects path traversal in preview-urls with structured 400 error", async ({ request }) => {
      const res = await request.post("/api/create/preview-urls", {
        data: {
          paths: ["../../secret/passwords.txt"],
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Invalid storage path format/i);
    });

    test("5.2 Rejects batch limit exceeding 24 paths with structured 400 error", async ({ request }) => {
      const excessivePaths = Array.from({ length: 25 }, (_, i) => `drafts/draft_batch/photo_${i}.png`);
      const res = await request.post("/api/create/preview-urls", {
        data: {
          paths: excessivePaths,
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Batch limit exceeded/i);
    });

    test("5.3 Rejects non-array paths in preview-urls", async ({ request }) => {
      const res = await request.post("/api/create/preview-urls", {
        data: {
          paths: "not-an-array",
        },
      });
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/'paths' must be an array/i);
    });

    test("5.4 Preserves existing drafts in LocalDraftRepository without silent deletion", async () => {
      const draftA: BirthdayDraft = {
        id: "draft_preserve_user_a_" + Date.now(),
        recipientName: "Alice",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Alice's memories",
        isPinProtected: false,
        pin: "",
        currentStep: "recipient",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const draftB: BirthdayDraft = {
        id: "draft_preserve_user_b_" + Date.now(),
        recipientName: "Bob",
        themeId: "midnight-cinema",
        photos: [],
        personalMessage: "Bob's memories",
        isPinProtected: false,
        pin: "",
        currentStep: "recipient",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await localDraftRepository.saveDraft(draftA);
      await localDraftRepository.saveDraft(draftB);

      const loadedA = await localDraftRepository.getDraft(draftA.id);
      const loadedB = await localDraftRepository.getDraft(draftB.id);

      expect(loadedA?.id).toBe(draftA.id);
      expect(loadedB?.id).toBe(draftB.id);
    });
  });
});
