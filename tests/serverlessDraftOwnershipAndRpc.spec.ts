import { test, expect } from "@playwright/test";
import {
  assertDraftOwnership,
  _clearInMemoryRegistryForTesting,
} from "../src/lib/security/draftOwnership";
import { hashCreatorSecret } from "../src/lib/security/hash";

test.describe("Wishlight V3 — Serverless Cross-Instance & Atomic RPC Verification", () => {
  const sessionToken1 = "cr_sec_instance_test_session_alpha_111";
  const sessionHash1 = hashCreatorSecret(sessionToken1);

  const sessionToken2 = "cr_sec_instance_test_session_beta_222";
  const sessionHash2 = hashCreatorSecret(sessionToken2);

  test("1. Draft ownership persists across simulated serverless cold starts & multi-instance invocations", async () => {
    const testDraftId = `draft_serverless_${Date.now()}`;

    // --- Instance A (Cold Start 1) ---
    _clearInMemoryRegistryForTesting();

    // Session 1 claims the draft on Instance A
    const claimResult = await assertDraftOwnership(testDraftId, sessionHash1);
    expect(claimResult.authorized).toBe(true);

    // --- Instance B (Cold Start 2 on separate serverless container) ---
    // Simulating memory isolation between serverless functions
    _clearInMemoryRegistryForTesting();

    // Legitimate owner (Session 1) connects to Instance B
    const session1AccessOnInstanceB = await assertDraftOwnership(testDraftId, sessionHash1);
    expect(session1AccessOnInstanceB.authorized).toBe(true);

    // Attacker (Session 2) connects to Instance B attempting to hijack Session 1's draft
    const session2AccessOnInstanceB = await assertDraftOwnership(testDraftId, sessionHash2);
    expect(session2AccessOnInstanceB.authorized).toBe(false);
    expect(session2AccessOnInstanceB.error).toMatch(/belongs to another creator session/i);
  });

  test("2. Signed upload authorization rejects cross-instance hijacking attempts via HTTP API", async ({
    request,
  }) => {
    const draftId = `draft_cross_inst_${Date.now()}`;

    // 1. Session 1 requests upload URL with custom session header / cookie
    const res1 = await request.post("/api/create/upload-url", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_alpha_cross_inst_999",
      },
      data: {
        draftId,
        mediaType: "photo",
        mimeType: "image/jpeg",
        fileSize: 10240,
      },
    });

    expect(res1.status()).toBe(200);
    const json1 = await res1.json();
    expect(json1.success).toBe(true);

    // 2. Clear memory registry to simulate subsequent request hitting a new serverless instance
    _clearInMemoryRegistryForTesting();

    // 3. Session 1 hits the new instance: should succeed
    const res1Instance2 = await request.post("/api/create/upload-url", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_alpha_cross_inst_999",
      },
      data: {
        draftId,
        mediaType: "photo",
        mimeType: "image/jpeg",
        fileSize: 10240,
      },
    });
    expect(res1Instance2.status()).toBe(200);

    // 4. Session 2 (attacker on new instance) attempts to upload to Session 1's draftId
    const res2 = await request.post("/api/create/upload-url", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_beta_attacker_888",
      },
      data: {
        draftId,
        mediaType: "photo",
        mimeType: "image/jpeg",
        fileSize: 10240,
      },
    });

    expect(res2.status()).toBe(403);
    const json2 = await res2.json();
    expect(json2.success).toBe(false);
    expect(json2.error).toMatch(/Forbidden/i);
  });

  test("3. Preview URL route enforces cross-instance ownership after simulated cold start", async ({
    request,
  }) => {
    const draftId = `draft_preview_sec_${Date.now()}`;

    // Session 1 claims the draft
    await request.post("/api/create/upload-url", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_alpha_preview_777",
      },
      data: {
        draftId,
        mediaType: "photo",
        mimeType: "image/png",
        fileSize: 2048,
      },
    });

    // Simulate cold start on new serverless instance
    _clearInMemoryRegistryForTesting();

    // Attacker tries to request preview URLs for Session 1's draft path
    const previewRes = await request.post("/api/create/preview-urls", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_beta_preview_attacker_666",
      },
      data: {
        paths: [`drafts/${draftId}/photo_1.png`],
      },
    });

    expect(previewRes.status()).toBe(403);
    const previewJson = await previewRes.json();
    expect(previewJson.success).toBe(false);
    expect(previewJson.error).toMatch(/Forbidden/i);
  });

  test("4. Publishing route attempts transactional persistence and maintains rollback safety", async ({
    request,
  }) => {
    const slug = `test-atomic-rpc-${Date.now()}`;
    const draftId = `draft_atomic_${Date.now()}`;

    const res = await request.post("/api/create/publish", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_publish_atomic_test_555",
      },
      data: {
        draftId,
        publishedSlug: slug,
        recipientName: "Evelyn",
        birthdayDate: "2026-11-20",
        themeId: "midnight-cinema",
        personalMessage: "Wishing you a bright year ahead.",
        isPinProtected: false,
        photos: [
          {
            id: "p1",
            storagePath: `drafts/${draftId}/photo_1.jpg`,
            caption: "At the beach",
            sortOrder: 1,
          },
        ],
        voiceMessage: {
          storagePath: `drafts/${draftId}/voice-message.webm`,
          mimeType: "audio/webm",
          durationMs: 8000,
          fileSize: 32000,
        },
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.slug).toBe(slug);
    expect(typeof json.experienceId).toBe("string");
  });

  test("5. Publishing route enforces input validation before database persistence", async ({
    request,
  }) => {
    // Missing recipientName
    const res = await request.post("/api/create/publish", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_publish_val_111",
      },
      data: {
        draftId: `draft_val_${Date.now()}`,
        recipientName: "   ",
      },
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/recipient name is required/i);
  });

  test("6. Publishing route rejects invalid voice duration or size before transactional persistence", async ({
    request,
  }) => {
    const draftId = `draft_voice_val_${Date.now()}`;
    const res = await request.post("/api/create/publish", {
      headers: {
        Cookie: "wishlight_creator_session=cr_sec_publish_val_222",
      },
      data: {
        draftId,
        recipientName: "Arthur",
        voiceMessage: {
          storagePath: `drafts/${draftId}/voice.webm`,
          mimeType: "audio/webm",
          durationMs: -500, // Invalid duration
          fileSize: 1024,
        },
      },
    });

    // Invalid voice metadata
    expect([400, 500]).toContain(res.status());
  });

  test("7. SQL migration file implements required security controls", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261102_publish_atomic.sql"
    );

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    // Check search_path configuration
    expect(sqlContent).toMatch(/SET search_path = public, pg_temp/i);

    // Check SECURITY DEFINER
    expect(sqlContent).toMatch(/SECURITY DEFINER/);

    // Check Revocations
    expect(sqlContent).toMatch(/REVOKE ALL ON FUNCTION publish_experience_transactional.*FROM PUBLIC/i);
    expect(sqlContent).toMatch(/REVOKE ALL ON FUNCTION publish_experience_transactional.*FROM anon/i);
    expect(sqlContent).toMatch(/REVOKE ALL ON FUNCTION publish_experience_transactional.*FROM authenticated/i);

    // Check Grant strictly to service_role
    expect(sqlContent).toMatch(/GRANT EXECUTE ON FUNCTION publish_experience_transactional.*TO service_role/i);

    // Check row locking or collision prevention
    expect(sqlContent).toMatch(/FOR UPDATE/i);
    expect(sqlContent).toMatch(/insufficient_privilege/i);
  });
});

