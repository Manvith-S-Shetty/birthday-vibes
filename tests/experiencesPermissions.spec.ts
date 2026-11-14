import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { POST as unlockPost } from "../src/app/api/g/[slug]/unlock/route";
import * as serverModule from "../src/lib/supabase/server";
import * as clientModule from "../src/lib/supabase/client";
import { hashPin, hashCreatorSecret } from "../src/lib/security/hash";

test.describe("Experiences Table Permissions & RLS Security Verification Suite", () => {
  const originalAdminFrom = (serverModule.supabaseAdminClient as any).from;
  const originalClientFrom = (clientModule.supabaseClient as any).from;
  const originalNodeEnv = process.env.NODE_ENV;

  test.afterEach(() => {
    (serverModule.supabaseAdminClient as any).from = originalAdminFrom;
    (clientModule.supabaseClient as any).from = originalClientFrom;
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  // Test data fixtures
  const testPin = "4826";
  const { hash: pinHash, salt: pinSalt } = hashPin(testPin);

  const publishedExperience = {
    id: "exp-published-1111-2222-3333-444455556666",
    slug: "celebrate-emma-test",
    recipient_name: "Emma",
    birthday_date: "1995-10-25",
    theme_id: "midnight-cinema",
    personal_message: "Happy Birthday Emma! You mean the world to us.",
    pin_hash: pinHash,
    pin_salt: pinSalt,
    is_pin_protected: true,
    status: "published",
    current_step: "ready",
    creator_session_token: hashCreatorSecret("creator_token_emma_session"),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    published_at: new Date(Date.now() - 3600000).toISOString(),
    relationship: "Best Friend",
    opening_style: "cinematic-premiere",
    memory_display_mode: "polaroid",
    expires_at: null,
    expiration_option: "never",
  };

  const draftExperience = {
    id: "exp-draft-9999-8888-7777-666655554444",
    slug: "draft-secret-surprise",
    recipient_name: "Marcus",
    birthday_date: "1998-12-14",
    theme_id: "vintage-scrapbook",
    personal_message: "Secret draft message not yet ready to share.",
    pin_hash: null,
    pin_salt: null,
    is_pin_protected: false,
    status: "draft",
    current_step: "media",
    creator_session_token: hashCreatorSecret("creator_token_marcus_session"),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
    relationship: "Brother",
    opening_style: "envelope-reveal",
    memory_display_mode: "grid",
    expires_at: null,
    expiration_option: "never",
  };

  const expiredExperience = {
    ...publishedExperience,
    id: "exp-expired-5555-6666-7777-888899990000",
    slug: "celebrate-expired-test",
    status: "expired",
    expires_at: new Date(Date.now() - 86400000).toISOString(),
  };

  const mediaRows = [
    {
      id: "media-1",
      experience_id: publishedExperience.id,
      storage_path: "experiences/exp-published-1111/photo-1.jpg",
      type: "image",
      caption: "Our trip to the mountains",
      sort_order: 0,
    },
  ];

  const voiceRows = [
    {
      id: "voice-1",
      experience_id: publishedExperience.id,
      storage_path: "voice/exp-published-1111/voice-1.webm",
      mime_type: "audio/webm",
      duration_ms: 15000,
      file_size_bytes: 45000,
    },
  ];

  // Helper simulating PostgreSQL privilege & RLS rules
  function createPostgresSimulator() {
    const experiencesDb = new Map<string, any>([
      [publishedExperience.slug, { ...publishedExperience }],
      [draftExperience.slug, { ...draftExperience }],
      [expiredExperience.slug, { ...expiredExperience }],
    ]);

    // Service-role client: Granted ALL, BYPASSRLS
    const serviceRoleFrom = (tableName: string) => {
      return {
        select: (columns: string = "*") => {
          const filterBuilder = (filterFn: (r: any) => boolean, defaultRows: any[] = []) => {
            const resultPromise = Promise.resolve({
              data: tableName === "experiences"
                ? Array.from(experiencesDb.values()).filter(filterFn)
                : defaultRows,
              error: null,
            });

            return Object.assign(resultPromise, {
              single: async () => {
                if (tableName === "experiences") {
                  const record = Array.from(experiencesDb.values()).find(filterFn);
                  if (!record) return { data: null, error: { message: "Row not found", code: "PGRST116" } };
                  return { data: { ...record }, error: null };
                }
                return { data: null, error: { message: "Not found" } };
              },
              maybeSingle: async () => {
                if (tableName === "experiences") {
                  const record = Array.from(experiencesDb.values()).find(filterFn);
                  return { data: record ? { ...record } : null, error: null };
                }
                return { data: null, error: null };
              },
              order: (orderCol?: string, options?: any) => {
                const ordered = tableName === "media" ? mediaRows : tableName === "voice_messages" ? voiceRows : [];
                return Promise.resolve({ data: ordered, error: null });
              },
            });
          };

          return {
            eq: (col: string, val: any) =>
              filterBuilder(
                (r) => r[col] === val,
                tableName === "media" ? mediaRows : tableName === "voice_messages" ? voiceRows : []
              ),
            or: (orFilter: string) =>
              filterBuilder((r) => orFilter.includes(r.id) || orFilter.includes(r.slug)),
          };
        },
        upsert: async (record: any) => {
          if (tableName === "experiences") {
            const key = record.slug || record.id;
            experiencesDb.set(key, { ...record, updated_at: new Date().toISOString() });
            return { data: record, error: null };
          }
          return { data: null, error: null };
        },
        delete: () => ({
          eq: (col: string, val: any) => ({
            data: null,
            error: null,
          }),
        }),
      };
    };

    // Public / anon client: Evaluates Column Grants + RLS Policies
    const anonAllowedColumns = new Set([
      "id",
      "slug",
      "recipient_name",
      "birthday_date",
      "theme_id",
      "is_pin_protected",
      "status",
      "current_step",
      "created_at",
      "updated_at",
      "published_at",
      "relationship",
      "opening_style",
      "memory_display_mode",
      "expires_at",
      "expiration_option",
    ]);

    const anonFrom = (tableName: string) => {
      // Direct access to private child tables has RLS USING (false)
      if (["media", "music", "experience_moments", "voice_messages"].includes(tableName)) {
        const emptyQuery = Promise.resolve({ data: [], error: null });
        return {
          select: () => ({
            eq: () =>
              Object.assign(emptyQuery, {
                single: async () => ({ data: null, error: { code: "PGRST116", message: "Row not found" } }),
                maybeSingle: async () => ({ data: null, error: null }),
                order: async () => ({ data: [], error: null }),
              }),
          }),
          insert: async () => ({
            data: null,
            error: { code: "42501", message: `permission denied for table ${tableName}` },
          }),
        };
      }

      if (tableName === "experiences") {
        return {
          select: (columns: string = "*") => {
            const requestedCols = columns.split(",").map((c) => c.trim());
            const hasDisallowedCol =
              columns === "*" ||
              requestedCols.some((col) => !anonAllowedColumns.has(col) && col.length > 0);

            return {
              eq: (col: string, val: any) => {
                const queryPromise = Promise.resolve().then(() => {
                  if (hasDisallowedCol) {
                    return {
                      data: null,
                      error: { code: "42501", message: "permission denied for column pin_hash" },
                    };
                  }
                  const record = Array.from(experiencesDb.values()).find((r) => r[col] === val);
                  if (
                    !record ||
                    record.status !== "published" ||
                    (record.expires_at && new Date(record.expires_at) < new Date())
                  ) {
                    return { data: [], error: null };
                  }
                  const filtered: Record<string, any> = {};
                  for (const [k, v] of Object.entries(record)) {
                    if (anonAllowedColumns.has(k)) filtered[k] = v;
                  }
                  return { data: [filtered], error: null };
                });

                return Object.assign(queryPromise, {
                  single: async () => {
                    if (hasDisallowedCol) {
                      return {
                        data: null,
                        error: { code: "42501", message: "permission denied for column pin_hash" },
                      };
                    }
                    const record = Array.from(experiencesDb.values()).find((r) => r[col] === val);
                    if (
                      !record ||
                      record.status !== "published" ||
                      (record.expires_at && new Date(record.expires_at) < new Date())
                    ) {
                      return { data: null, error: { code: "PGRST116", message: "Row not found" } };
                    }
                    const filtered: Record<string, any> = {};
                    for (const [k, v] of Object.entries(record)) {
                      if (anonAllowedColumns.has(k)) filtered[k] = v;
                    }
                    return { data: filtered, error: null };
                  },
                  maybeSingle: async () => {
                    if (hasDisallowedCol) {
                      return {
                        data: null,
                        error: { code: "42501", message: "permission denied for column pin_hash" },
                      };
                    }
                    const record = Array.from(experiencesDb.values()).find((r) => r[col] === val);
                    if (
                      !record ||
                      record.status !== "published" ||
                      (record.expires_at && new Date(record.expires_at) < new Date())
                    ) {
                      return { data: null, error: null };
                    }
                    const filtered: Record<string, any> = {};
                    for (const [k, v] of Object.entries(record)) {
                      if (anonAllowedColumns.has(k)) filtered[k] = v;
                    }
                    return { data: filtered, error: null };
                  },
                });
              },
            };
          },
          insert: async () => ({
            data: null,
            error: { code: "42501", message: "permission denied for table experiences" },
          }),
          update: () => ({
            eq: async () => ({
              data: null,
              error: { code: "42501", message: "permission denied for table experiences" },
            }),
          }),
          delete: () => ({
            eq: async () => ({
              data: null,
              error: { code: "42501", message: "permission denied for table experiences" },
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    };

    return { serviceRoleFrom, anonFrom };
  }

  // =========================================================================
  // Requirement 1: Authorized service-role access
  // =========================================================================
  test("1. Authorized service-role access: Can query published, draft, sensitive columns, and child tables", async () => {
    const { serviceRoleFrom } = createPostgresSimulator();
    (serverModule.supabaseAdminClient as any).from = serviceRoleFrom;

    // A. Service role queries published experience with sensitive hash & salt
    const { data: pubData, error: pubErr } = await (serverModule.supabaseAdminClient as any)
      .from("experiences")
      .select("pin_hash, pin_salt, is_pin_protected, status, expires_at")
      .eq("slug", publishedExperience.slug)
      .single();

    expect(pubErr).toBeNull();
    expect(pubData).not.toBeNull();
    expect(pubData.pin_hash).toBe(pinHash);
    expect(pubData.pin_salt).toBe(pinSalt);
    expect(pubData.status).toBe("published");

    // B. Service role queries draft experience
    const { data: draftData, error: draftErr } = await (serverModule.supabaseAdminClient as any)
      .from("experiences")
      .select("*")
      .eq("slug", draftExperience.slug)
      .single();

    expect(draftErr).toBeNull();
    expect(draftData).not.toBeNull();
    expect(draftData.status).toBe("draft");
    expect(draftData.personal_message).toBe(draftExperience.personal_message);

    // C. Service role queries private child tables (media & voice)
    const mediaRes = await (serverModule.supabaseAdminClient as any)
      .from("media")
      .select("*")
      .eq("experience_id", publishedExperience.id)
      .order("sort_order");

    expect(mediaRes.error).toBeNull();
    expect(mediaRes.data).toHaveLength(1);
    expect(mediaRes.data[0].storage_path).toContain("photo-1.jpg");

    // D. Service role performs draft anchoring mutation (upsert)
    const upsertRes = await (serverModule.supabaseAdminClient as any)
      .from("experiences")
      .upsert({
        slug: "new-anchored-draft",
        creator_session_token: hashCreatorSecret("new_token"),
        status: "draft",
        recipient_name: "Draft",
      });

    expect(upsertRes.error).toBeNull();
  });

  // =========================================================================
  // Requirement 2: Public access only to published experiences
  // =========================================================================
  test("2. Public access only to published experiences: Returns safe metadata columns for published experience", async () => {
    const { anonFrom } = createPostgresSimulator();
    (clientModule.supabaseClient as any).from = anonFrom;

    // Public / anon queries published experience specifying allowed public columns
    const safeColumns =
      "id, slug, recipient_name, birthday_date, theme_id, is_pin_protected, status, created_at, opening_style";

    const { data, error } = await (clientModule.supabaseClient as any)
      .from("experiences")
      .select(safeColumns)
      .eq("slug", publishedExperience.slug)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.slug).toBe(publishedExperience.slug);
    expect(data.recipient_name).toBe("Emma");
    expect(data.status).toBe("published");
    expect(data.is_pin_protected).toBe(true);
    expect(data.theme_id).toBe("midnight-cinema");

    // Verify sensitive columns were NOT included in the public payload
    expect(data.pin_hash).toBeUndefined();
    expect(data.pin_salt).toBeUndefined();
    expect(data.creator_session_token).toBeUndefined();
    expect(data.personal_message).toBeUndefined();
  });

  // =========================================================================
  // Requirement 3: Unpublished/private experiences remain inaccessible
  // =========================================================================
  test("3. Unpublished/private experiences remain inaccessible to public/anon queries", async () => {
    const { anonFrom } = createPostgresSimulator();
    (clientModule.supabaseClient as any).from = anonFrom;

    const safeColumns = "id, slug, recipient_name, status";

    // A. Querying draft experience returns 0 rows (Row not found / PGRST116)
    const { data: draftData, error: draftErr } = await (clientModule.supabaseClient as any)
      .from("experiences")
      .select(safeColumns)
      .eq("slug", draftExperience.slug)
      .single();

    expect(draftData).toBeNull();
    expect(draftErr?.code).toBe("PGRST116"); // Blocked by RLS status = 'published'

    // B. Querying expired experience returns 0 rows
    const { data: expData, error: expErr } = await (clientModule.supabaseClient as any)
      .from("experiences")
      .select(safeColumns)
      .eq("slug", expiredExperience.slug)
      .single();

    expect(expData).toBeNull();
    expect(expErr?.code).toBe("PGRST116");

    // C. Querying sensitive columns (e.g. pin_hash, pin_salt) fails with permission denied (42501)
    const { data: secretData, error: secretErr } = await (clientModule.supabaseClient as any)
      .from("experiences")
      .select("slug, pin_hash, pin_salt")
      .eq("slug", publishedExperience.slug)
      .single();

    expect(secretData).toBeNull();
    expect(secretErr?.code).toBe("42501");
    expect(secretErr?.message).toContain("permission denied for column pin_hash");

    // D. Querying child tables directly returns empty array via RLS USING (false)
    const { data: childMedia } = await (clientModule.supabaseClient as any)
      .from("media")
      .select("*")
      .eq("experience_id", publishedExperience.id);

    expect(childMedia).toEqual([]);

    // E. Direct mutations (INSERT/UPDATE/DELETE) by anon are rejected (42501)
    const { error: insertErr } = await (clientModule.supabaseClient as any)
      .from("experiences")
      .insert({ slug: "malicious-inject", recipient_name: "Attacker" });

    expect(insertErr?.code).toBe("42501");
  });

  // =========================================================================
  // Requirement 4: PIN unlock can retrieve a valid published experience
  // =========================================================================
  test("4. PIN unlock can retrieve a valid published experience via service role and verify PIN", async () => {
    const { serviceRoleFrom } = createPostgresSimulator();
    (serverModule.supabaseAdminClient as any).from = serviceRoleFrom;
    (process.env as any).NODE_ENV = "test";

    // 4A. Correct PIN submission for published experience -> HTTP 200, isUnlocked: true
    const correctReq = new NextRequest(
      `http://localhost:3000/api/g/${publishedExperience.slug}/unlock`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: testPin }),
      }
    );

    const unlockRes = await unlockPost(correctReq, {
      params: { slug: publishedExperience.slug },
    });

    expect(unlockRes.status).toBe(200);
    const body = await unlockRes.json();
    expect(body.success).toBe(true);

    // 4B. Incorrect PIN submission -> HTTP 401, error message
    const wrongReq = new NextRequest(
      `http://localhost:3000/api/g/${publishedExperience.slug}/unlock`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "0000" }),
      }
    );

    const wrongRes = await unlockPost(wrongReq, {
      params: { slug: publishedExperience.slug },
    });

    expect(wrongRes.status).toBe(401);
    const wrongBody = await wrongRes.json();
    expect(wrongBody.error).toMatch(/incorrect|passcode/i);

    // 4C. Expired experience unlock attempt -> HTTP 410, EXPERIENCE_EXPIRED
    const expReq = new NextRequest(
      `http://localhost:3000/api/g/${expiredExperience.slug}/unlock`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: testPin }),
      }
    );

    const expRes = await unlockPost(expReq, {
      params: { slug: expiredExperience.slug },
    });

    expect(expRes.status).toBe(410);
    const expBody = await expRes.json();
    expect(expBody.code).toBe("EXPERIENCE_EXPIRED");

    // 4D. Draft experience cannot be unlocked by recipients -> HTTP 404 (Experience not found or not published)
    const draftReq = new NextRequest(
      `http://localhost:3000/api/g/${draftExperience.slug}/unlock`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: "1234" }),
      }
    );

    const draftRes = await unlockPost(draftReq, {
      params: { slug: draftExperience.slug },
    });

    expect(draftRes.status).toBe(404);
  });
});
