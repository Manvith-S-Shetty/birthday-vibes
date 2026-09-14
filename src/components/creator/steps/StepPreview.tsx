"use client";

import React from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { ExperienceData } from "@/types/experience";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";

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

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to editing</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <Sparkles className="w-4 h-4 mr-1" />
          <span>Looks beautiful → Publish</span>
        </Button>
      </div>
    </div>
  );
}
