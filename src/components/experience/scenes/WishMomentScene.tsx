"use client";

import React, { useState } from "react";
import { ExperienceData, WishMomentConfig } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Wand2, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WishMomentSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function WishMomentScene({ data, onNext, onPrev }: WishMomentSceneProps) {
  const wishMoment = data.moments?.find(
    (m) => m.momentType === "wish_moment" && m.enabled !== false
  );
  const config = (wishMoment?.config || {}) as WishMomentConfig;

  const promptText =
    config.promptText ||
    "Close your eyes, take a breath, and make your secret birthday wish...";
  const sealedMessage =
    config.sealedMessage || "Your secret wish has been sealed in stardust ✨";

  const [isSealed, setIsSealed] = useState<boolean>(false);

  const handleSealWish = () => {
    setIsSealed(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      {/* Header */}
      <div className="space-y-3 pt-6">
        <Eyebrow>Wish Sealing Moment</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          {isSealed ? "Your Wish is Sealed" : "Make a Birthday Wish"}
        </Heading>
        <Body>
          {isSealed
            ? "Your birthday wish is safely locked away in the stars."
            : promptText}
        </Body>
      </div>

      {/* Main Interactive Stage */}
      <div className="w-full flex-1 flex items-center justify-center py-6">
        <AnimatePresence mode="wait">
          {!isSealed ? (
            <motion.div
              key="unsealed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-sm"
            >
              <button
                type="button"
                onClick={handleSealWish}
                aria-label="Wish Sealing Box"
                className="w-full relative group rounded-3xl border-2 border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-8 sm:p-10 shadow-2xl hover:border-[var(--theme-accent-primary)] transition-all duration-300 box-glow-sm cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-accent-primary)]/10 to-transparent rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col items-center space-y-5">
                  <motion.div
                    animate={{
                      scale: [1, 1.08, 1],
                      rotate: [0, 3, -3, 0],
                      boxShadow: [
                        "0 0 15px rgba(255,215,0,0.2)",
                        "0 0 30px rgba(255,215,0,0.5)",
                        "0 0 15px rgba(255,215,0,0.2)",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "easeInOut",
                    }}
                    className="w-20 h-20 rounded-2xl bg-[var(--theme-text-accent)]/15 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]"
                  >
                    <Wand2 className="w-10 h-10" />
                  </motion.div>

                  <div className="space-y-1">
                    <span className="font-serif text-lg text-[var(--theme-text-primary)] block">
                      Wish Sealing Orb
                    </span>
                    <span className="text-xs text-[var(--theme-text-secondary)] block">
                      Tap orb or button below to seal your wish
                    </span>
                  </div>

                  <Button
                    variant="gold-glow"
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSealWish();
                    }}
                    className="mt-2"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    <span>Seal Your Wish</span>
                  </Button>
                </div>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="sealed"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full max-w-md rounded-3xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-8 sm:p-10 shadow-2xl space-y-6 box-glow-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <Star className="w-24 h-24 text-[var(--theme-text-accent)]" />
              </div>

              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--theme-text-accent)]/20 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-3 relative z-10">
                <Eyebrow>Wish Sealed ✨</Eyebrow>
                <p className="font-serif text-xl sm:text-2xl text-[var(--theme-text-primary)] leading-relaxed italic">
                  &ldquo;{sealedMessage}&rdquo;
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--theme-text-accent)]/15 border border-[var(--theme-accent-primary)]/30 text-xs font-serif text-[var(--theme-text-accent)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Wish Completed</span>
              </div>

              <Caption>
                {data.recipientName
                  ? `Sealed with love for ${data.recipientName}.`
                  : "Sealed with love for your special day."}
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
