"use client";

import React, { useState, useEffect } from "react";
import { ExperienceData } from "@/types/experience";
import { Heading, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Feather, ArrowRight, ArrowLeft, Eye } from "lucide-react";
import { motion } from "framer-motion";

interface LetterSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function LetterScene({ data, onNext, onPrev }: LetterSceneProps) {
  const fullText = data.personalMessage || "Wishing you a birthday filled with joy, magic, and light.";
  const [displayedText, setDisplayedText] = useState<string>("");
  const [isFullyRevealed, setIsFullyRevealed] = useState<boolean>(false);

  // Check reduced motion preference on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsFullyRevealed(true);
      setDisplayedText(fullText);
    }
  }, [fullText]);

  useEffect(() => {
    if (isFullyRevealed) {
      setDisplayedText(fullText);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsFullyRevealed(true);
        clearInterval(interval);
      }
    }, 22);

    return () => clearInterval(interval);
  }, [fullText, isFullyRevealed]);

  const handleRevealAll = () => {
    setIsFullyRevealed(true);
    setDisplayedText(fullText);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Atmosphere Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
        <div className="w-[500px] h-[500px] rounded-full bg-[var(--theme-accent-glow)] blur-[120px]" />
      </div>

      <div className="relative z-10 text-center space-y-3 max-w-xl mx-auto">
        <Eyebrow>Step 03 — A Personal Note</Eyebrow>
        <Heading className="text-3xl sm:text-5xl">
          The Birthday Letter
        </Heading>
      </div>

      {/* Editorial Parchment Paper Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 my-auto max-w-2xl w-full bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 box-glow-sm"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-xs font-serif text-[var(--theme-text-accent)] uppercase tracking-widest font-semibold">
            <Feather className="w-4 h-4" />
            <span>To {data.recipientName}</span>
          </div>
          {!isFullyRevealed && (
            <button
              type="button"
              onClick={handleRevealAll}
              className="px-3 py-1.5 min-h-[44px] text-[11px] uppercase tracking-widest text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] flex items-center gap-1.5 opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] rounded-lg"
              aria-label="Reveal full letter immediately"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Read Full Letter</span>
            </button>
          )}
        </div>

        {/* Typewriter Text Container */}
        <div className="min-h-[160px] flex items-center py-2">
          <p className="font-serif text-xl sm:text-2xl leading-relaxed italic text-[var(--theme-text-primary)] whitespace-pre-wrap max-w-prose">
            &ldquo;{displayedText}&rdquo;
            {!isFullyRevealed && <span className="animate-pulse inline-block ml-1 font-sans text-xl text-[var(--theme-text-accent)]">|</span>}
          </p>
        </div>

        {/* Signature Footer */}
        <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--theme-text-secondary)]">
          <span className="font-serif italic text-base text-[var(--theme-text-accent)]">
            With endless warmth & affection
          </span>
          <Caption>Birthday Vibes Keepsake</Caption>
        </div>
      </motion.div>

      {/* Navigation Controls */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-xl pt-4">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Make a Wish</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
