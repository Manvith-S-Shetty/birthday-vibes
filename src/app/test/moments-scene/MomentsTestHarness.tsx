"use client";

import React, { useState } from "react";
import { ExperienceData } from "@/types/experience";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";

const MOCK_MOMENTS_EXPERIENCE: ExperienceData = {
  id: "exp_test_moments",
  slug: "test-moments",
  recipientName: "Taylor",
  birthdayDate: "November 14",
  themeId: "midnight-cinema",
  personalMessage: "Wishing you an extraordinary birthday filled with magic and joy!",
  photos: [],
  musicTitle: "Clair de Lune",
  musicUrl: "",
  voiceMessage: {
    audioUrl: "https://example.com/voice.mp3",
    mimeType: "audio/webm",
    durationMs: 5000,
  },
  moments: [
    {
      id: "mom_gift_test",
      momentType: "mystery_gift",
      config: {
        title: "Taylor's Mystery Gift",
        giftText: "Front row tickets to your favorite concert!",
        buttonLabel: "Unwrap Special Gift",
      },
      sortOrder: 1,
      enabled: true,
    },
    {
      id: "mom_quiz_test",
      momentType: "memory_quiz",
      config: {
        question: "Where did we go on our first summer road trip?",
        options: [
          { id: "opt_1", text: "Coastal Highway", isCorrect: true },
          { id: "opt_2", text: "Mountain Pines", isCorrect: false },
        ],
        explanation: "That trip along the coast was unforgettable!",
      },
      sortOrder: 2,
      enabled: true,
    },
    {
      id: "mom_roulette_test",
      momentType: "birthday_roulette",
      config: {
        title: "Spin for a Birthday Surprise",
        options: [
          { id: "r_1", label: "Free Coffee & Donut", description: "On me next time!" },
          { id: "r_2", label: "Movie Night Pick", description: "Total control." },
        ],
      },
      sortOrder: 3,
      enabled: true,
    },
    {
      id: "mom_hidden_test",
      momentType: "hidden_message",
      config: {
        teaserText: "Tap to reveal a secret note...",
        hiddenMessage: "You mean the absolute world to me. Happy Birthday!",
      },
      sortOrder: 4,
      enabled: true,
    },
    {
      id: "mom_coupon_test",
      momentType: "birthday_coupon",
      config: {
        couponTitle: "VIP Spa Weekend",
        couponDescription: "All-inclusive relaxing weekend getaway!",
        terms: "Valid until end of 2026",
        code: "VIP-SPA-2026",
      },
      sortOrder: 5,
      enabled: true,
    },
    {
      id: "mom_countdown_test",
      momentType: "countdown",
      config: {
        targetDate: "2030-11-14T00:00:00.000Z",
        preBirthdayMessage: "The countdown to Taylor's big day is ticking!",
        onBirthdayMessage: "Happy Birthday Taylor! The day is finally here!",
        postBirthdayMessage: "Hope you had the happiest birthday ever!",
      },
      sortOrder: 6,
      enabled: true,
    },
    {
      id: "mom_wish_test",
      momentType: "wish_moment",
      config: {
        promptText: "Close your eyes, make a secret wish, and press to seal it in star dust.",
        sealedMessage: "May every secret wish you made today shine bright and come true this year!",
      },
      sortOrder: 7,
      enabled: true,
    },
  ],
  isPinProtected: false,
  createdAt: new Date().toISOString(),
};

export function MomentsTestHarness() {
  return <ExperienceRenderer data={MOCK_MOMENTS_EXPERIENCE} isPreview={true} />;
}
