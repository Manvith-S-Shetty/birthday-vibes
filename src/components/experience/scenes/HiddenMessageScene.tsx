"use client";

import React, { useState } from "react";
import { ExperienceData, HiddenMessageConfig } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { EyeOff, Sparkles, ArrowRight, ArrowLeft, Lock, Unlock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HiddenMessageSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function HiddenMessageScene({ data, onNext, onPrev }: HiddenMessageSceneProps) {
  const hiddenMoment = data.moments?.find(
    (m) => m.momentType === "hidden_message" && m.enabled !== false
  );
  const config = (hiddenMoment?.config || {}) as HiddenMessageConfig;

  const teaserText = config.teaserText || "Tap or hold to reveal a secret note...";
  const hiddenMessage = config.hiddenMessage || "You mean the absolute world to me. Happy Birthday!";

  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      <div className="space-y-3 pt-6">
        <Eyebrow>Secret Surprise</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">Hidden Secret Note</Heading>
        <Body>
          {isRevealed
            ? "Your secret birthday note has been revealed!"
            : "A private message is hidden below. Tap to uncover it."}
        </Body>
      </div>

      {/* Main Secret Stage */}
      <div className="w-full flex-1 flex items-center justify-center py-6">
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-md"
            >
              <button
                type="button"
                onClick={handleReveal}
                className="w-full relative group rounded-3xl border-2 border-dashed border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-8 sm:p-10 shadow-2xl hover:border-[var(--theme-accent-primary)] transition-all duration-300 box-glow-sm cursor-pointer"
              >
                <div className="relative z-10 flex flex-col items-center space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--theme-text-accent)]/15 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <span className="font-serif text-lg text-[var(--theme-text-primary)] block">
                      Top Secret Note
                    </span>
                    <span className="text-xs text-[var(--theme-text-secondary)] block">
                      {teaserText}
                    </span>
                  </div>

                  <Button
                    variant="gold-glow"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReveal();
                    }}
                    className="mt-2"
                  >
                    <EyeOff className="w-4 h-4 mr-1.5" />
                    <span>Reveal Secret Note</span>
                  </Button>
                </div>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md rounded-3xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-8 sm:p-10 shadow-2xl space-y-6 box-glow-md relative overflow-hidden"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--theme-text-accent)]/20 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]">
                <Unlock className="w-7 h-7" />
              </div>

              <div className="space-y-3 relative z-10">
                <Eyebrow>Secret Message Unlocked</Eyebrow>
                <p className="font-serif text-xl sm:text-2xl text-[var(--theme-text-primary)] leading-relaxed italic break-words">
                  &ldquo;{hiddenMessage}&rdquo;
                </p>
              </div>

              <Caption>
                Written specially for {data.recipientName || "you"}.
              </Caption>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-xl pb-4">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
