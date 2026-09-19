"use client";

import React from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { ExperienceData } from "@/types/experience";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepPreviewProps {
  draft: BirthdayDraft;
  onNext: () => void;
  onPrev: () => void;
}

export function StepPreview({ draft, onNext, onPrev }: StepPreviewProps) {
  const experiencePayload: ExperienceData = {
    id: draft.id,
    slug: draft.recipientName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "birthday-preview",
    recipientName: draft.recipientName || "Recipient",
    birthdayDate: draft.birthdayDate,
    themeId: draft.themeId,
    personalMessage: draft.personalMessage || "Wishing you a birthday filled with light and joy.",
    photos: draft.photos,
    musicTitle: draft.musicTitle,
    musicUrl: draft.musicUrl,
    isPinProtected: draft.isPinProtected,
    pin: draft.pin,
    createdAt: draft.createdAt,
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="space-y-3 text-center">
        <Eyebrow>Step 07 — Final Inspection</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Review your gift experience
        </Heading>
        <Body className="max-w-xl mx-auto">
          This is exactly what {draft.recipientName || "your recipient"} will see when they unlock their gift URL.
        </Body>
      </div>

      {/* Frame Container rendering Phase 1 ExperienceRenderer */}
      <div className="rounded-3xl border border-[var(--theme-border-strong)] overflow-hidden shadow-2xl bg-[var(--theme-bg-primary)] min-h-[500px]">
        <ExperienceRenderer data={experiencePayload} isPreview />
      </div>

      <div className="pt-6 pb-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[var(--theme-border-subtle)]/60">
        <Button
          variant="ghost"
          size="md"
          onClick={onPrev}
          className="min-h-[48px] px-5 sm:px-6 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to editing</span>
        </Button>
        <Button
          variant="gold-glow"
          onClick={onNext}
          className="group min-h-[50px] px-8 sm:px-10 text-xs sm:text-sm font-semibold tracking-wider transition-all duration-200 ease-out shadow-[0_0_14px_rgba(212,175,55,0.25)] hover:shadow-[0_0_28px_rgba(212,175,55,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:outline-none"
        >
          <span>Publish Birthday Experience</span>
          <ArrowRight className="w-4 h-4 ml-2.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
