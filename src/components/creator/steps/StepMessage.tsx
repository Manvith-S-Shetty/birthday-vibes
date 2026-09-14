"use client";

import React from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Feather, ArrowRight, ArrowLeft } from "lucide-react";

interface StepMessageProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepMessage({ draft, onUpdate, onNext, onPrev }: StepMessageProps) {
  const maxChars = 1000;
  const currentChars = draft.personalMessage.length;

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 04 — Personal Letter</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Say something they&apos;ll remember
        </Heading>
        <Body>
          Write your heartfelt birthday letter. It will reveal gently with typewriter pacing during their experience.
        </Body>
      </div>

      <div className="space-y-3">
        <div className="relative rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] p-6 shadow-inner space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-xs font-serif text-[var(--theme-text-accent)]">
              <Feather className="w-4 h-4" />
              <span>A Letter to {draft.recipientName || "them"}</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[var(--theme-text-secondary)] opacity-70">
              {currentChars}/{maxChars} chars
            </span>
          </div>

          <textarea
            value={draft.personalMessage}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) {
                onUpdate({ personalMessage: e.target.value });
              }
            }}
            rows={7}
            placeholder="Write your personal birthday note here... Speak from the heart."
            className="w-full bg-transparent text-[var(--theme-text-primary)] font-serif text-lg sm:text-xl leading-relaxed focus:outline-none resize-none placeholder:text-[var(--theme-text-secondary)]/30"
          />
        </div>

        <Caption>
          Tip: A 2–4 sentence letter creates the best reading cadence on mobile screens.
        </Caption>
      </div>

      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Choose Music</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
