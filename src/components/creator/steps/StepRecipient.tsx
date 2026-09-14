"use client";

import React, { useState } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Display, Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { User, Calendar, ArrowRight } from "lucide-react";

interface StepRecipientProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
}

export function StepRecipient({ draft, onUpdate, onNext }: StepRecipientProps) {
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = draft.recipientName.trim();
    if (!trimmedName) {
      setError("Please enter the recipient's name to continue.");
      return;
    }
    if (trimmedName.length > 50) {
      setError("Recipient name must be 50 characters or fewer.");
      return;
    }

    setError("");
    onUpdate({ recipientName: trimmedName });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 01 — Recipient</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Who is this little surprise for?
        </Heading>
        <Body>
          Enter the name of the person you are creating this experience for. It will form the emotional centerpiece of the gift.
        </Body>
      </div>

      <div className="space-y-6">
        {/* Recipient Name Field */}
        <div className="space-y-2">
          <label className="block font-sans text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-medium">
            Recipient Name <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={draft.recipientName}
              onChange={(e) => {
                setError("");
                onUpdate({ recipientName: e.target.value });
              }}
              placeholder="e.g. Eleanor, Julian, Sophia"
              className="w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] font-serif text-xl sm:text-2xl px-5 py-4 rounded-xl border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent-primary)] focus:outline-none transition-colors duration-300 placeholder:text-[var(--theme-text-secondary)]/40"
              autoFocus
            />
            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--theme-text-secondary)] opacity-50" />
          </div>
          {error && <p className="text-xs text-rose-400 font-sans mt-1">{error}</p>}
        </div>

        {/* Birthday Date Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="birthday-date"
              className="block font-sans text-xs uppercase tracking-widest text-[var(--theme-text-secondary)] font-medium"
            >
              Birthday Date <span className="text-xs opacity-60 lowercase font-normal">(optional)</span>
            </label>
          </div>
          <div className="relative">
            <input
              id="birthday-date"
              type="date"
              value={draft.birthdayDate && /^\d{4}-\d{2}-\d{2}$/.test(draft.birthdayDate) ? draft.birthdayDate : ""}
              onChange={(e) => onUpdate({ birthdayDate: e.target.value })}
              className="w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] font-sans text-base px-5 py-3.5 rounded-xl border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent-primary)] focus:outline-none transition-colors duration-300 [color-scheme:dark] cursor-pointer"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                const el = document.getElementById("birthday-date") as HTMLInputElement | null;
                if (el) {
                  if (typeof el.showPicker === "function") {
                    try {
                      el.showPicker();
                    } catch {
                      el.focus();
                    }
                  } else {
                    el.focus();
                  }
                }
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[var(--theme-text-secondary)] opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Open date picker"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
          <Caption>If provided, a subtle countdown and date reveal moment will be added.</Caption>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <Button variant="gold-glow" size="lg" type="submit">
          <span>Choose Mood & Theme</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </form>
  );
}
