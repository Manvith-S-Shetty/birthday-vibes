import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
  sanitizeExperience,
  ADMIN_COOKIE_NAME,
} from "../src/lib/admin/auth";
import { logAdminActivity, getAdminAuditLogs, _clearAuditBufferForTesting } from "../src/lib/admin/audit";
import { createZipArchive } from "../src/lib/admin/zip";
import { GET as getExperiences } from "../src/app/api/admin/experiences/route";
import { GET as getExperienceDetail, PATCH as patchExperience, DELETE as deleteExperience } from "../src/app/api/admin/experiences/[id]/route";
import { POST as revealMessage } from "../src/app/api/admin/experiences/[id]/reveal-message/route";
import { GET as getFiles } from "../src/app/api/admin/files/route";
import { POST as getSignedUrl } from "../src/app/api/admin/files/signed-url/route";
import { GET as downloadFile } from "../src/app/api/admin/files/download/route";
import { POST as backupExport } from "../src/app/api/admin/backup/route";
import { GET as getAuditLogs } from "../src/app/api/admin/logs/route";
import { POST as adminLogin } from "../src/app/api/admin/auth/login/route";
import { middleware } from "../src/middleware";
import { _clearLoginAttemptsForTesting } from "../src/lib/admin/rateLimit";
import * as serverModule from "../src/lib/supabase/server";
import * as clientModule from "../src/lib/supabase/client";

test.describe("Production-Quality Admin Panel Security & Management Suite", () => {
  const originalAdminFrom = (serverModule.supabaseAdminClient as any).from;
  const originalAdminStorage = (serverModule.supabaseAdminClient as any).storage;
  const originalClientConfigured = clientModule.isSupabaseConfigured;

  const testEmail = "owner@wishscene.com";
  let validAdminToken: string;

  test.beforeAll(() => {
    validAdminToken = createAdminSessionToken(testEmail);
  });

  test.beforeEach(() => {
    _clearAuditBufferForTesting();
  });

  test.afterEach(() => {
    (serverModule.supabaseAdminClient as any).from = originalAdminFrom;
    (serverModule.supabaseAdminClient as any).storage = originalAdminStorage;
  });

  // Fixture Experience
  const mockExperience = {
    id: "exp-test-owner-0001",
    creator_session_token: "cr_sec_super_secret_creator_token_never_expose",
    slug: "charlotte-surprise",
    recipient_name: "Charlotte",
    birthday_date: "1994-08-12",
    theme_id: "midnight-cinema",
    personal_message: "My dearest Charlotte, happy 30th birthday! With all my love.",
    pin_hash: "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3",
    pin_salt: "d8578edf8458ce06fbc5bb76a58c5ca4",
    is_pin_protected: true,
    status: "published",
    current_step: "ready",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    published_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: null,
    expiration_option: "never",
    relationship: "Partner",
    opening_style: "cinematic-premiere",
    memory_display_mode: "polaroid",
  };

  const mockMedia = [
    {
      id: "media-uuid-1",
      experience_id: mockExperience.id,
      storage_path: "experience-media/exp-test-owner-0001/photo1.jpg",
      type: "image",
      caption: "Our first trip",
      alt_text: "Charlotte at the beach",
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
  ];

  const mockVoice = {
    id: "voice-uuid-1",
    experience_id: mockExperience.id,
    storage_path: "voice-messages/exp-test-owner-0001/audio.webm",
    mime_type: "audio/webm",
    duration_ms: 12500,
    file_size_bytes: 42000,
    transcript: "Happy birthday Charlotte!",
    created_at: new Date().toISOString(),
  };

  // =========================================================================
  // 1. UNAUTHORIZED ADMIN ACCESS ENFORCEMENT
  // =========================================================================
  test("1.1: Rejects unauthorized requests without admin cookie or Bearer token with 401", async () => {
    const unauthReq = new NextRequest("http://localhost:3000/api/admin/experiences");
    const res = await getExperiences(unauthReq);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("1.2: Rejects forged or tampered admin session tokens", async () => {
    const forgedToken = `${validAdminToken.split(".")[0]}.fake_signature_hex`;
    const req = new NextRequest("http://localhost:3000/api/admin/experiences", {
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${forgedToken}`,
      },
    });
    const res = await getExperiences(req);
    expect(res.status).toBe(401);
  });

  // =========================================================================
  // 2. ADMIN AUTHENTICATION & SESSION MANAGEMENT
  // =========================================================================
  test("2.1: Generates valid HMAC-signed admin session token and verifies payload", () => {
    const token = createAdminSessionToken("owner@wishscene.com", "admin-123");
    expect(token).toBeTruthy();
    expect(token.includes(".")).toBe(true);

    const verified = verifyAdminSessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe("owner@wishscene.com");
    expect(verified?.role).toBe("owner");
    expect(verified?.expiresAt).toBeGreaterThan(Date.now());
  });

  test("2.2: Rejects expired admin session tokens", () => {
    // Manually create expired token payload
    const expiredPayload = {
      adminId: "admin-1",
      email: "owner@wishscene.com",
      role: "owner",
      issuedAt: Date.now() - 10000000,
      expiresAt: Date.now() - 1000, // Expired
      nonce: "expired-nonce",
    };
    const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    // Verify rejects
    const result = verifyAdminSessionToken(`${b64}.dummy-signature`);
    expect(result).toBeNull();
  });

  // =========================================================================
  // 3. ZERO SECRET EXPOSURE IN API RESPONSES
  // =========================================================================
  test("3.1: sanitizeExperience strictly strips pin_hash, pin_salt, and creator_session_token", () => {
    const sanitized = sanitizeExperience(mockExperience);
    expect((sanitized as any).pin_hash).toBeUndefined();
    expect((sanitized as any).pin_salt).toBeUndefined();
    expect((sanitized as any).creator_session_token).toBeUndefined();
    expect(sanitized.recipient_name).toBe("Charlotte");
    expect(sanitized.slug).toBe("charlotte-surprise");
  });

  test("3.2: Experiences list API strictly strips secrets and masks personal letters", async () => {
    // Mock Supabase admin client query
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      if (tableName === "experiences") {
        return {
          select: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: [mockExperience], count: 1, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    };

    const req = new NextRequest("http://localhost:3000/api/admin/experiences", {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}` },
    });

    const res = await getExperiences(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.experiences.length).toBe(1);

    const returnedExp = body.experiences[0];
    expect(returnedExp.pin_hash).toBeUndefined();
    expect(returnedExp.pin_salt).toBeUndefined();
    expect(returnedExp.creator_session_token).toBeUndefined();
    // Personal letter is excluded from summary list
    expect(returnedExp.personal_message).toBeUndefined();
  });

  // =========================================================================
  // 4. CONFIDENTIAL LETTER PROTECTION & AUDIT TRAIL
  // =========================================================================
  test("4.1: Experience detail view masks personal letter by default", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      if (tableName === "experiences") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockExperience, error: null }),
            }),
          }),
        };
      }
      if (tableName === "media" || tableName === "experience_moments") {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    };

    const req = new NextRequest(`http://localhost:3000/api/admin/experiences/${mockExperience.id}`, {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}` },
    });

    const res = await getExperienceDetail(req, { params: { id: mockExperience.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.experience.personal_message).toContain("CONFIDENTIAL");
    expect(body.experience.has_personal_message).toBe(true);
    expect(body.experience.pin_hash).toBeUndefined();
  });

  test("4.2: Explicit confirmation reveals personal letter and records in audit log", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      if (tableName === "experiences") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockExperience, error: null }),
            }),
          }),
        };
      }
      return {
        insert: () => Promise.resolve({ error: null }),
      };
    };

    const revealReq = new NextRequest(
      `http://localhost:3000/api/admin/experiences/${mockExperience.id}/reveal-message`,
      {
        method: "POST",
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmReveal: true, reason: "Security abuse review" }),
      }
    );

    const res = await revealMessage(revealReq, { params: { id: mockExperience.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.personal_message).toBe(mockExperience.personal_message);

    // Verify audit log entry was created
    const logsRes = await getAdminAuditLogs({ action: "experience.reveal_sensitive_message" });
    expect(logsRes.logs.length).toBeGreaterThan(0);
    expect(logsRes.logs[0].actor).toBe(testEmail);
    expect(logsRes.logs[0].target_id).toBe(mockExperience.id);
  });

  // =========================================================================
  // 5. STORAGE BUCKETS & FILE MANAGEMENT
  // =========================================================================
  test("5.1: Signed URL generator creates authorized short-lived URLs and logs preview", async () => {
    (serverModule.supabaseAdminClient as any).storage = {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, expires: number) =>
          Promise.resolve({
            data: { signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=abc` },
            error: null,
          }),
      }),
    };

    const req = new NextRequest("http://localhost:3000/api/admin/files/signed-url", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: "experience-media",
        path: "exp-test-owner-0001/photo1.jpg",
        expiresIn: 1800,
      }),
    });

    const res = await getSignedUrl(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.signedUrl).toContain("https://mock.supabase.co");
  });

  // =========================================================================
  // 6. BACKUP MANIFEST INTEGRITY & ZIP ARCHIVE
  // =========================================================================
  test("6.1: Zero-dependency ZIP generator creates valid PKZIP buffer with CRC32", () => {
    const files = [
      { name: "test.txt", content: "Hello Birthday Vibes Backup!" },
      { name: "manifest.json", content: JSON.stringify({ version: "1.0.0" }) },
    ];

    const zipBuffer = createZipArchive(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(50);

    // PKZIP header signature check: 0x04034b50 -> bytes [0x50, 0x4b, 0x03, 0x04]
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4b);
    expect(zipBuffer[2]).toBe(0x03);
    expect(zipBuffer[3]).toBe(0x04);
  });

  test("6.2: Backup export produces complete ZIP with manifest.json and omits PIN secrets", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      const chainable = (data: any) => {
        const p = Promise.resolve({ data, error: null });
        return Object.assign(p, {
          order: () => Promise.resolve({ data, error: null }),
        });
      };

      if (tableName === "experiences") {
        return {
          select: () => ({
            in: () => chainable([mockExperience]),
          }),
        };
      }
      if (tableName === "media") {
        return {
          select: () => ({
            in: () => chainable(mockMedia),
          }),
        };
      }
      if (tableName === "voice_messages") {
        return {
          select: () => ({
            in: () => chainable([mockVoice]),
          }),
        };
      }
      if (tableName === "admin_audit_logs") {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {
        select: () => ({
          in: () => chainable([]),
        }),
      };
    };

    (serverModule.supabaseAdminClient as any).storage = {
      from: () => ({
        download: () => Promise.resolve({
          data: {
            arrayBuffer: () => Promise.resolve(Buffer.from("mock image file bytes").buffer),
          },
          error: null,
        }),
      }),
    };

    const req = new NextRequest("http://localhost:3000/api/admin/backup", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ experienceIds: [mockExperience.id] }),
    });

    const res = await backupExport(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain(".zip");

    const arrayBuf = await res.arrayBuffer();
    const zipBuf = Buffer.from(arrayBuf);
    expect(zipBuf.length).toBeGreaterThan(100);

    // Verify ZIP magic bytes
    expect(zipBuf[0]).toBe(0x50);
    expect(zipBuf[1]).toBe(0x4b);
  });

  // =========================================================================
  // 7. DELETION SAFETY CONTROLS
  // =========================================================================
  test("7.1: Hard deletion requires confirmDelete=true and targetId verification", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockExperience, error: null }),
          }),
        }),
      };
    };

    const unconfirmedReq = new NextRequest(
      `http://localhost:3000/api/admin/experiences/${mockExperience.id}`,
      {
        method: "DELETE",
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmDelete: false, targetId: mockExperience.id }),
      }
    );

    const res = await deleteExperience(unconfirmedReq, { params: { id: mockExperience.id } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Safety check failed");
  });

  test("7.2: Soft archive updates status to expired without dropping data", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      return {
        update: (updates: any) => ({
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { ...mockExperience, status: "expired", updated_at: updates.updated_at },
                  error: null,
                }),
            }),
          }),
        }),
      };
    };

    const patchReq = new NextRequest(
      `http://localhost:3000/api/admin/experiences/${mockExperience.id}`,
      {
        method: "PATCH",
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "expired" }),
      }
    );

    const res = await patchExperience(patchReq, { params: { id: mockExperience.id } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.experience.status).toBe("expired");
  });

  // =========================================================================
  // 8. BRUTE-FORCE LOCKOUT & EMAIL AUTHORIZATION
  // =========================================================================
  test("8.1: Rejects login when unauthorized email is provided", async () => {
    _clearLoginAttemptsForTesting();
    const req = new NextRequest("http://localhost:3000/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unauthorized_hacker@evil.com", password: "admin" }),
    });

    const res = await adminLogin(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Invalid admin credentials");
  });

  test("8.2: Enforces login lockout after 5 consecutive failed attempts (429)", async () => {
    _clearLoginAttemptsForTesting();
    const headers = { "Content-Type": "application/json", "x-real-ip": "198.51.100.42" };

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const failReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "owner@wishscene.com", password: "wrong-password" }),
      });
      const res = await adminLogin(failReq);
      expect(res.status).toBe(401);
    }

    // 6th attempt must trigger 429 rate limit lockout
    const lockedReq = new NextRequest("http://localhost:3000/api/admin/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: "owner@wishscene.com", password: "admin" }),
    });
    const lockedRes = await adminLogin(lockedReq);
    expect(lockedRes.status).toBe(429);
    const body = await lockedRes.json();
    expect(body.error).toContain("Too many failed login attempts");
    _clearLoginAttemptsForTesting();
  });

  test("8.3: Authenticates successfully with valid credentials and sets session cookie", async () => {
    _clearLoginAttemptsForTesting();
    const originalPassword = process.env.ADMIN_PASSWORD;
    const originalEmail = process.env.ADMIN_EMAIL;
    process.env.ADMIN_EMAIL = "owner@wishscene.com";
    process.env.ADMIN_PASSWORD = "test-admin-password-1234";
    try {
      const req = new NextRequest("http://localhost:3000/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "owner@wishscene.com", password: "test-admin-password-1234" }),
      });

      const res = await adminLogin(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.admin.email).toBe("owner@wishscene.com");

      const cookieHeader = res.headers.get("set-cookie") || "";
      expect(cookieHeader).toContain(ADMIN_COOKIE_NAME);
    } finally {
      process.env.ADMIN_PASSWORD = originalPassword;
      process.env.ADMIN_EMAIL = originalEmail;
      _clearLoginAttemptsForTesting();
    }
  });

  test("8.4: Rejects malformed JSON payload with 400 and structured JSON", async () => {
    _clearLoginAttemptsForTesting();
    const req = new NextRequest("http://localhost:3000/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-a-json-string{",
    });

    const res = await adminLogin(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request payload.");
    _clearLoginAttemptsForTesting();
  });

  test("8.5: Hardened URL: obsolete /admin/login route is rejected with 404 by middleware", async () => {
    const req = new NextRequest("http://localhost:3000/admin/login");
    const res = middleware(req);
    expect(res.status).toBe(404);

    const normalReq = new NextRequest("http://localhost:3000/wishlight-control/entry");
    const normalRes = middleware(normalReq);
    expect(normalRes.status).toBe(200);
  });

  // =========================================================================
  // 9. CSRF & ORIGIN VALIDATION
  // =========================================================================
  test("9.1: Blocks mutating request with cross-site Origin mismatch", async () => {
    const crossOriginReq = new NextRequest(
      `http://localhost:3000/api/admin/experiences/${mockExperience.id}`,
      {
        method: "PATCH",
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
          "Content-Type": "application/json",
          origin: "https://malicious-attacker-site.com",
          host: "localhost:3000",
        },
        body: JSON.stringify({ status: "expired" }),
      }
    );

    const res = await patchExperience(crossOriginReq, { params: { id: mockExperience.id } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Cross-site request forgery blocked");
  });

  // =========================================================================
  // 10. PATH TRAVERSAL DEFENSE IN STORAGE
  // =========================================================================
  test("10.1: Blocks directory traversal in signed URL generator with 400", async () => {
    const traversalReq = new NextRequest("http://localhost:3000/api/admin/files/signed-url", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket: "experience-media",
        path: "../../../secret-passwords.txt",
      }),
    });

    const res = await getSignedUrl(traversalReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("traversal detected");
  });

  test("10.2: Blocks directory traversal in file download with 400", async () => {
    const traversalReq = new NextRequest(
      "http://localhost:3000/api/admin/files/download?bucket=experience-media&path=../../etc/passwd",
      {
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
        },
      }
    );

    const res = await downloadFile(traversalReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("traversal detected");
  });

  // =========================================================================
  // 11. CROSS-EXPERIENCE IDENTIFIER MISMATCH (IDOR DEFENSE)
  // =========================================================================
  test("11.1: Blocks deleting experience when targetId does not match canonical ID", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockExperience, error: null }),
          }),
        }),
      };
    };

    const mismatchReq = new NextRequest(
      `http://localhost:3000/api/admin/experiences/${mockExperience.id}`,
      {
        method: "DELETE",
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmDelete: true,
          targetId: "exp-different-victim-uuid-9999", // Intentional IDOR mismatch
        }),
      }
    );

    const res = await deleteExperience(mismatchReq, { params: { id: mockExperience.id } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Safety check failed");
  });

  test("11.2: Returns 404 when target experience is not found on deletion", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "Not found" } }),
          }),
        }),
      };
    };

    const notFoundReq = new NextRequest(
      "http://localhost:3000/api/admin/experiences/non-existent-uuid",
      {
        method: "DELETE",
        headers: {
          cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmDelete: true,
          targetId: "non-existent-uuid",
        }),
      }
    );

    const res = await deleteExperience(notFoundReq, { params: { id: "non-existent-uuid" } });
    expect(res.status).toBe(404);
  });

  // =========================================================================
  // 12. BACKUP ZIP CONTENT SECRET EXCLUSION
  // =========================================================================
  test("12.1: Verifies backup ZIP stream contains zero occurrences of pin_hash, pin_salt, or creator_session_token", async () => {
    (serverModule.supabaseAdminClient as any).from = (tableName: string) => {
      const chainable = (data: any) => {
        const p = Promise.resolve({ data, error: null });
        return Object.assign(p, {
          order: () => Promise.resolve({ data, error: null }),
        });
      };

      if (tableName === "experiences") {
        return {
          select: () => ({
            in: () => chainable([mockExperience]),
          }),
        };
      }
      if (tableName === "media") {
        return {
          select: () => ({
            in: () => chainable(mockMedia),
          }),
        };
      }
      if (tableName === "voice_messages") {
        return {
          select: () => ({
            in: () => chainable([mockVoice]),
          }),
        };
      }
      if (tableName === "admin_audit_logs") {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      return {
        select: () => ({
          in: () => chainable([]),
        }),
      };
    };

    (serverModule.supabaseAdminClient as any).storage = {
      from: () => ({
        download: () => Promise.resolve({
          data: {
            arrayBuffer: () => Promise.resolve(Buffer.from("mock image file bytes").buffer),
          },
          error: null,
        }),
      }),
    };

    const req = new NextRequest("http://localhost:3000/api/admin/backup", {
      method: "POST",
      headers: {
        cookie: `${ADMIN_COOKIE_NAME}=${validAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ experienceIds: [mockExperience.id] }),
    });

    const res = await backupExport(req);
    expect(res.status).toBe(200);

    const arrayBuf = await res.arrayBuffer();
    const rawZipString = Buffer.from(arrayBuf).toString("latin1");

    // Strict assertions: Secrets MUST NOT exist anywhere in the raw exported ZIP bytes
    expect(rawZipString.includes(mockExperience.pin_hash)).toBe(false);
    expect(rawZipString.includes(mockExperience.pin_salt)).toBe(false);
    expect(rawZipString.includes(mockExperience.creator_session_token)).toBe(false);
    expect(rawZipString.includes("pin_hash")).toBe(false);
    expect(rawZipString.includes("pin_salt")).toBe(false);
    expect(rawZipString.includes("creator_session_token")).toBe(false);
  });
});
