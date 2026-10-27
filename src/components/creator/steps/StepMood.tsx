"use client";

import React from "react";
import { BirthdayDraft, OpeningStyleId } from "@/types/draft";
import { ThemeId } from "@/types/theme";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { themes } from "@/lib/themes/definitions";
import { useTheme } from "@/components/themes/ThemeProvider";
import { Check, Sparkles, ArrowRight, ArrowLeft, Film, Mail } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface OpeningStyleOption {
  id: OpeningStyleId;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  previewBadge: string;
  previewBg: string;
}

const OPENING_STYLE_OPTIONS: OpeningStyleOption[] = [
  {
    id: "cinematic-premiere",
    name: "Cinematic Premiere",
    tagline: "Film Festival Title Reveal",
    description: "Grand widescreen title cards, dramatic spotlight reveal, and cinematic tracking typography.",
    icon: Film,
    previewBadge: "Widescreen Premiere",
    previewBg: "from-amber-950/40 via-purple-950/20 to-black/60",
  },
  {
    id: "warm-letter",
    name: "Warm Letter",
    tagline: "Handwritten & Intimate",
    description: "Tender editorial letter entrance, soft candlelight glow, and elegant parchment atmosphere.",
    icon: Mail,
    previewBadge: "Intimate Letter",
    previewBg: "from-amber-900/30 via-stone-900/40 to-black/60",
  },
  {
    id: "celebration-spark",
    name: "Celebration Spark",
    tagline: "Joyful & Energetic",
    description: "Celebratory animated entrance with glowing bursts, festive fanfare, and radiant typography.",
    icon: Sparkles,
    previewBadge: "Festive Fanfare",
    previewBg: "from-rose-950/40 via-amber-950/30 to-black/60",
  },
];

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

      {/* Opening Style Selection Section */}
      <div className="space-y-4 pt-6 border-t border-white/10">
        <div className="space-y-1 text-center sm:text-left">
          <Eyebrow>Experience Entrance</Eyebrow>
          <h3 className="font-serif text-2xl text-[var(--theme-text-primary)]">
            Choose the Opening Style
          </h3>
          <p className="text-xs sm:text-sm text-[var(--theme-text-secondary)]">
            Determine how the recipient is greeted the moment they unlock their birthday surprise.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {OPENING_STYLE_OPTIONS.map((style) => {
            const isSelected = (draft.openingStyle || "cinematic-premiere") === style.id;
            const IconComp = style.icon;

            return (
              <button
                type="button"
                key={style.id}
                onClick={() => onUpdate({ openingStyle: style.id })}
                className={cn(
                  "relative text-left p-4 rounded-2xl border transition-all duration-300 group overflow-hidden flex flex-col justify-between min-h-[190px]",
                  isSelected
                    ? "border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] box-glow-sm scale-[1.02] shadow-lg"
                    : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-strong)]"
                )}
              >
                {/* Background gradient simulation */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-40 pointer-events-none transition-opacity group-hover:opacity-60",
                    style.previewBg
                  )}
                />

                <div className="relative z-10 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/10 bg-black/40 text-[var(--theme-text-accent)]">
                      {style.previewBadge}
                    </span>
                    {isSelected ? (
                      <div className="p-1 rounded-full bg-[var(--theme-accent-primary)] text-[var(--token-ink)]">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <IconComp className="w-4 h-4 text-[var(--theme-text-secondary)] opacity-40 group-hover:opacity-80" />
                    )}
                  </div>

                  <div>
                    <span className="font-serif text-lg font-medium text-[var(--theme-text-primary)] block">
                      {style.name}
                    </span>
                    <span className="text-[11px] font-sans text-[var(--theme-text-accent)] block mb-1">
                      {style.tagline}
                    </span>
                    <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
                      {style.description}
                    </p>
                  </div>
                </div>

                {/* Visual miniature mockup */}
                <div className="relative z-10 mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[var(--theme-text-secondary)]">
                  <div className="flex items-center gap-1.5">
                    <IconComp className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                    <span className="text-[10px] font-sans uppercase tracking-wider">Preview Ready</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-[var(--theme-accent-primary)] font-sans">Active</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
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
