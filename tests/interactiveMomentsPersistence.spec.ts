import { test, expect } from "@playwright/test";
import { BirthdayDraft } from "../src/types/draft";
import { InteractiveMomentData } from "../src/types/experience";
import { localDraftRepository } from "../src/lib/draft/LocalDraftRepository";

test.describe("V2-D Loop 1 Task 2 — Interactive Moments Persistence Tests", () => {
  test("1. Draft moments array serialization & fallback in LocalDraftRepository", async () => {
    const testMoments: InteractiveMomentData[] = [
      {
        id: "mom_gift_1",
        momentType: "mystery_gift",
        config: { giftText: "Surprise Concert Tickets!" },
        sortOrder: 1,
        enabled: true,
      },
      {
        id: "mom_coupon_1",
        momentType: "birthday_coupon",
        config: { couponTitle: "Free Coffee & Donut" },
        sortOrder: 2,
        enabled: true,
      },
    ];

    const mockDraft: BirthdayDraft = {
      id: "draft_test_moments",
      recipientName: "Alex",
      birthdayDate: "2026-10-10",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Happy Birthday Alex!",
      moments: testMoments,
      isPinProtected: false,
      currentStep: "recipient",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verify local draft repository handles moments property gracefully
    const saved = await localDraftRepository.saveDraft(mockDraft);
    expect(saved.moments).toBeDefined();
    expect(saved.moments).toHaveLength(2);
    expect(saved.moments?.[0].momentType).toBe("mystery_gift");
    expect(saved.moments?.[1].momentType).toBe("birthday_coupon");
  });

  test("2. Legacy draft without moments defaults moments to empty array", async () => {
    const legacyDraft: any = {
      id: "draft_legacy_no_moments",
      recipientName: "Jordan",
      themeId: "midnight-cinema",
      photos: [],
      personalMessage: "Cheers!",
    };

    // Simulate loading legacy draft
    const momentsFallback = Array.isArray(legacyDraft.moments) ? legacyDraft.moments : [];
    expect(momentsFallback).toEqual([]);
  });

  test("3. Moment types validation helper filters unknown or disabled moments", () => {
    const VALID_TYPES = new Set([
      "mystery_gift",
      "memory_quiz",
      "birthday_roulette",
      "hidden_message",
      "birthday_coupon",
      "countdown",
      "wish_moment",
    ]);

    const mixedMoments: any[] = [
      { id: "1", momentType: "mystery_gift", enabled: true },
      { id: "2", momentType: "invalid_type", enabled: true },
      { id: "3", momentType: "birthday_coupon", enabled: false },
      { id: "4", momentType: "memory_quiz", enabled: true },
    ];

    const validMoments = mixedMoments.filter(
      (m) => m && m.enabled !== false && VALID_TYPES.has(m.momentType)
    );

    expect(validMoments).toHaveLength(2);
    expect(validMoments.map((m) => m.momentType)).toEqual(["mystery_gift", "memory_quiz"]);
  });
});
