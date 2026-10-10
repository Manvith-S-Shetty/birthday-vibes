"use client";

import React, { useState } from "react";
import { ExperienceData, MysteryGiftConfig } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Gift, Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface MysteryGiftSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function MysteryGiftScene({ data, onNext, onPrev }: MysteryGiftSceneProps) {
  const giftMoment = data.moments?.find(
    (m) => m.momentType === "mystery_gift" && m.enabled !== false
  );
  const config = (giftMoment?.config || {}) as MysteryGiftConfig;

  const title = config.title || "A Special Surprise";
  const giftText = config.giftText || "Happy Birthday! Here is your special surprise.";
  const buttonLabel = config.buttonLabel || "Open Mystery Gift";

  const [isOpened, setIsOpened] = useState<boolean>(false);

  const handleOpenGift = () => {
    setIsOpened(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      <div className="space-y-3 pt-6">
        <Eyebrow>Interactive Surprise</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">{title}</Heading>
        <Body>
          {isOpened
            ? "Your mystery gift has been unlocked!"
            : "A personalized surprise is waiting inside for you."}
        </Body>
      </div>

      {/* Main Gift Box Stage */}
      <div className="w-full flex-1 flex items-center justify-center py-6">
        <AnimatePresence mode="wait">
          {!isOpened ? (
            <motion.div
              key="closed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <button
                type="button"
                onClick={handleOpenGift}
                aria-label="Open Gift Box"
                className="w-full relative group rounded-3xl border-2 border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-8 sm:p-10 shadow-2xl hover:border-[var(--theme-accent-primary)] transition-all duration-300 box-glow-sm cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-accent-primary)]/10 to-transparent rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col items-center space-y-5">
                  <motion.div
                    animate={{
                      rotate: [0, -5, 5, -5, 0],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "easeInOut",
                    }}
                    className="w-20 h-20 rounded-2xl bg-[var(--theme-text-accent)]/15 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]"
                  >
                    <Gift className="w-10 h-10" />
                  </motion.div>

                  <div className="space-y-1">
                    <span className="font-serif text-lg text-[var(--theme-text-primary)] block">
                      Mystery Gift Box
                    </span>
                    <span className="text-xs text-[var(--theme-text-secondary)] block">
                      Tap box or button below to unwrap
                    </span>
                  </div>

                  <Button
                    variant="gold-glow"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenGift();
                    }}
                    className="mt-2"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>{buttonLabel}</span>
                  </Button>
                </div>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="opened"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md rounded-3xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-8 sm:p-10 shadow-2xl space-y-6 box-glow-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <Sparkles className="w-24 h-24 text-[var(--theme-text-accent)]" />
              </div>

              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--theme-text-accent)]/20 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-3 relative z-10">
                <Eyebrow>Surprise Unlocked</Eyebrow>
                <p className="font-serif text-xl sm:text-2xl text-[var(--theme-text-primary)] leading-relaxed italic">
                  &ldquo;{giftText}&rdquo;
                </p>
              </div>

              <Caption>
                A special memory saved just for your birthday.
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
