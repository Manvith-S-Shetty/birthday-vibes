"use client";

import React from "react";
import { ExperienceData } from "@/types/experience";
import { Display, Eyebrow, Body } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CinematicIntroSceneProps {
  data: ExperienceData;
  onNext: () => void;
}

export function CinematicIntroScene({ data, onNext }: CinematicIntroSceneProps) {
  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center text-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Background Evolving Lighting & Radial Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
      >
        <div className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-[var(--theme-accent-glow)] blur-[150px]" />
      </motion.div>

      {/* Stage 1: Atmospheric Eyebrow Badge */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 space-y-2 max-w-md pt-4"
      >
        <Eyebrow className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          A Celebration of You
        </Eyebrow>
      </motion.div>

      {/* Stage 2-5: Sequential Cinematic Name Reveal Sequence */}
      <div className="relative z-10 my-auto py-8 sm:py-12 max-w-4xl w-full px-2 space-y-6">
        {/* Stage 2: Pre-Title */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.7, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-serif text-lg sm:text-2xl italic tracking-[0.25em] text-[var(--theme-text-secondary)] uppercase block"
        >
          FOR
        </motion.span>

        {/* Stage 3: Emotional Hero Recipient Name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="py-1"
        >
          <Display
            gradient
            className="text-4xl sm:text-7xl md:text-8xl tracking-tight capitalize break-words leading-tight animate-tracking-cinematic max-w-full px-2"
          >
            {data.recipientName}
          </Display>
        </motion.div>

        {/* Stage 4: Supporting Subtitle */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="font-serif text-base sm:text-2xl tracking-[0.2em] uppercase text-[var(--theme-text-accent)] block pt-3 font-medium"
        >
          THE DAY IS YOURS.
        </motion.span>

        {/* Stage 5: Warm Birthday Quote */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.9, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
        >
          <Body className="max-w-md sm:max-w-lg mx-auto text-base sm:text-xl font-serif italic text-[var(--theme-text-primary)] leading-relaxed pt-3">
            &ldquo;May every moment today remind you of how deeply cherished you are.&rdquo;
          </Body>
        </motion.div>
      </div>

      {/* Stage 6: Action Callout Button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.8 }}
        className="relative z-10 pb-4"
      >
        <Button variant="gold-glow" size="lg" onClick={onNext} className="shadow-2xl">
          <span>Explore Memories</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </motion.div>
    </div>
  );
}
