import { test, expect } from "@playwright/test";
import {
  checkPinRateLimit,
  recordFailedPinAttempt,
  resetPinRateLimit,
  consumeRateLimit,
  PIN_MAX_ATTEMPTS,
} from "../src/lib/security/rateLimit";
import * as serverModule from "../src/lib/supabase/server";
import { POST as unlockPost } from "../src/app/api/g/[slug]/unlock/route";
import { POST as uploadUrlPost } from "../src/app/api/create/upload-url/route";

test.describe("Persistent Rate Limiter Fail-Closed & Database Failure Suite", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  test.afterEach(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  test("1. Non-production environment: Falls back gracefully to in-memory store when DB is unconfigured", async () => {
    (process.env as any).NODE_ENV = "test";
    const testKey = `test_dev_key_${Date.now()}`;

    // Should allow attempt
    const check1 = await checkPinRateLimit(testKey);
    expect(check1.allowed).toBe(true);
    expect(check1.unavailable).toBeFalsy();
    expect(check1.remainingAttempts).toBe(PIN_MAX_ATTEMPTS);

    // Consume rate limit in memory
    const uploadCheck = await consumeRateLimit(testKey, 60000, 5);
    expect(uploadCheck.allowed).toBe(true);
    expect(uploadCheck.unavailable).toBeFalsy();
  });

  test("2. Production environment: Fails closed (unavailable: true) when DB is unavailable or returns an error", async () => {
    (process.env as any).NODE_ENV = "production";
    const testKey = `test_prod_fail_${Date.now()}`;

    // Mock supabaseAdminClient to simulate DB query error
    const originalFrom = (serverModule.supabaseAdminClient as any).from;
    const originalRpc = (serverModule.supabaseAdminClient as any).rpc;

    (serverModule.supabaseAdminClient as any).from = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: new Error("FATAL: connection to postgres server terminated unexpectedly"),
          }),
        }),
      }),
    });

    (serverModule.supabaseAdminClient as any).rpc = async () => ({
      data: null,
      error: new Error("FATAL: connection refused on port 5432"),
    });

    try {
      // 1. checkPinRateLimit must fail closed
      const pinCheck = await checkPinRateLimit(testKey);
      expect(pinCheck.allowed).toBe(false);
      expect(pinCheck.unavailable).toBe(true);

      // 2. recordFailedPinAttempt must report unavailable in production
      const recordResult = await recordFailedPinAttempt(testKey);
      expect(recordResult.success).toBe(false);
      expect(recordResult.unavailable).toBe(true);

      // 3. consumeRateLimit must fail closed for uploads
      const uploadCheck = await consumeRateLimit(testKey, 60000, 100);
      expect(uploadCheck.allowed).toBe(false);
      expect(uploadCheck.unavailable).toBe(true);
    } finally {
      (serverModule.supabaseAdminClient as any).from = originalFrom;
      (serverModule.supabaseAdminClient as any).rpc = originalRpc;
    }
  });

  test("3. Production environment: Fails closed when an exception is thrown by the DB client", async () => {
    (process.env as any).NODE_ENV = "production";
    const testKey = `test_prod_throw_${Date.now()}`;

    const originalFrom = (serverModule.supabaseAdminClient as any).from;
    const originalRpc = (serverModule.supabaseAdminClient as any).rpc;

    (serverModule.supabaseAdminClient as any).from = () => {
      throw new Error("Timeout contacting Supabase API");
    };

    (serverModule.supabaseAdminClient as any).rpc = () => {
      throw new Error("Network offline");
    };

    try {
      const pinCheck = await checkPinRateLimit(testKey);
      expect(pinCheck.allowed).toBe(false);
      expect(pinCheck.unavailable).toBe(true);

      const recordResult = await recordFailedPinAttempt(testKey);
      expect(recordResult.success).toBe(false);
      expect(recordResult.unavailable).toBe(true);

      const uploadCheck = await consumeRateLimit(testKey, 60000, 100);
      expect(uploadCheck.allowed).toBe(false);
      expect(uploadCheck.unavailable).toBe(true);
    } finally {
      (serverModule.supabaseAdminClient as any).from = originalFrom;
      (serverModule.supabaseAdminClient as any).rpc = originalRpc;
    }
  });

  test("4. Successful PIN verification behavior remains unchanged even if background DB reset encounters error", async () => {
    (process.env as any).NODE_ENV = "production";
    const testKey = `test_prod_reset_${Date.now()}`;

    const originalFrom = (serverModule.supabaseAdminClient as any).from;
    (serverModule.supabaseAdminClient as any).from = () => ({
      delete: () => ({
        eq: async () => ({
          error: new Error("DB delete error"),
        }),
      }),
    });

    try {
      // resetPinRateLimit should not throw an exception that interrupts successful unlock
      await expect(resetPinRateLimit(testKey)).resolves.toBeUndefined();
    } finally {
      (serverModule.supabaseAdminClient as any).from = originalFrom;
    }
  });

  test("5. Route layer: POST /api/g/[slug]/unlock fails closed with HTTP 503 on rate limiter database failure", async () => {
    (process.env as any).NODE_ENV = "production";

    const originalFrom = (serverModule.supabaseAdminClient as any).from;
    (serverModule.supabaseAdminClient as any).from = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: new Error("Postgres rate_limits relation does not exist"),
          }),
        }),
      }),
    });

    try {
      const req = new Request("http://localhost:3000/api/g/demo/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "2026" }),
      });

      const res = await unlockPost(req, { params: { slug: "demo" } });
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.error).toBe("Service temporarily unavailable. Please try again shortly.");
      // Ensure no raw DB error strings are leaked
      expect(JSON.stringify(json)).not.toContain("Postgres");
      expect(JSON.stringify(json)).not.toContain("relation does not exist");
    } finally {
      (serverModule.supabaseAdminClient as any).from = originalFrom;
    }
  });

  test("6. Route layer: POST /api/create/upload-url fails closed with HTTP 503 on rate limiter database failure", async () => {
    (process.env as any).NODE_ENV = "production";

    const originalRpc = (serverModule.supabaseAdminClient as any).rpc;
    (serverModule.supabaseAdminClient as any).rpc = async () => ({
      data: null,
      error: new Error("Postgres function rate_limit_increment does not exist"),
    });

    try {
      const req = new Request("http://localhost:3000/api/create/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": "wishlight_creator_session=test_creator_session_token_123",
        },
        body: JSON.stringify({
          draftId: "draft_test_12345",
          mediaType: "photo",
          mimeType: "image/jpeg",
          fileSize: 1024,
        }),
      });

      const res = await uploadUrlPost(req);
      expect(res.status).toBe(503);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Upload service is temporarily unavailable. Please try again shortly.");
      // Ensure no raw DB error strings are leaked
      expect(JSON.stringify(json)).not.toContain("Postgres");
      expect(JSON.stringify(json)).not.toContain("rate_limit_increment");
    } finally {
      (serverModule.supabaseAdminClient as any).rpc = originalRpc;
    }
  });

  test("7. Route layer: POST /api/g/[slug]/unlock succeeds with HTTP 200 when correct PIN is provided", async () => {
    (process.env as any).NODE_ENV = "test";

    const req = new Request("http://localhost:3000/api/g/demo/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "2026" }),
    });

    const res = await unlockPost(req, { params: { slug: "demo" } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
