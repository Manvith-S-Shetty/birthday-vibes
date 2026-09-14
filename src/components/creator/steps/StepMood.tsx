"use client";

import React from "react";
import { BirthdayDraft } from "@/types/draft";
import { ThemeId } from "@/types/theme";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { themes } from "@/lib/themes/definitions";
import { useTheme } from "@/components/themes/ThemeProvider";
import { Check, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepMoodProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepMood({ draft, onUpdate, onNext, onPrev }: StepMoodProps) {
  const { setTheme } = useTheme();

  const handleSelectTheme = (id: ThemeId) => {
    onUpdate({ themeId: id });
    setTheme(id);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 02 — Mood & Atmosphere</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Pick the visual atmosphere
        </Heading>
        <Body>
          Every theme uses a unique color palette, typography pairing, and motion personality. Select the mood that best fits their personality.
        </Body>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(themes).map((t) => {
          const isSelected = draft.themeId === t.id;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => handleSelectTheme(t.id as ThemeId)}
              className={cn(
                "relative text-left p-5 rounded-2xl border transition-all duration-300 group overflow-hidden flex flex-col justify-between min-h-[170px]",
                isSelected
                  ? "border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] box-glow-sm scale-[1.02]"
                  : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-strong)]"
              )}
            >
              {/* Background preview simulation */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none transition-opacity group-hover:opacity-25"
                style={{ background: t.background.css }}
              />

              <div className="relative z-10 flex items-start justify-between w-full">
                <div>
                  <span className="font-serif text-xl font-normal text-[var(--theme-text-primary)] block mb-1">
                    {t.name}
                  </span>
                  <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed line-clamp-2">
                    {t.description}
                  </p>
                </div>
                {isSelected ? (
                  <div className="p-1 rounded-full bg-[var(--theme-accent-primary)] text-[var(--token-ink)]">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <Sparkles className="w-4 h-4 text-[var(--theme-text-secondary)] opacity-30 group-hover:opacity-100" />
                )}
              </div>

              <div className="relative z-10 flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: t.tokens.bgPrimary }}
                  title="Primary BG"
                />
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: t.tokens.textPrimary }}
                  title="Text Primary"
                />
                <span
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: t.tokens.accentPrimary }}
                  title="Accent Gold"
                />
                <span className="text-[10px] uppercase tracking-widest text-[var(--theme-text-secondary)] ml-auto opacity-70">
                  {t.componentVariants.cardStyle}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Add Memories</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
