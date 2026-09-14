"use client";

import React, { useEffect } from "react";
import { ExperienceData } from "@/types/experience";
import { Display, Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Sparkles, RefreshCw, Heart, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { heroEntranceVariants } from "@/lib/motion";
import confetti from "canvas-confetti";

interface FinaleSceneProps {
  data: ExperienceData;
  onReplay: () => void;
}

export function FinaleScene({ data, onReplay }: FinaleSceneProps) {
  useEffect(() => {
    // Trigger elegant celebratory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#C9A96E", "#FFFDF8", "#8F7447", "#D4AF37", "#E5C384"],
        disableForReducedMotion: true,
      });
    } catch (e) {
      console.log("Confetti trigger:", e);
    }
  }, []);

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center text-center px-4 py-16 md:py-24 bg-film-grain overflow-hidden">
      {/* Celebration Atmosphere Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-50">
        <div className="w-[650px] h-[650px] rounded-full bg-[var(--theme-accent-glow)] blur-[150px] animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 space-y-2"
      >
        <Eyebrow className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)]" />
          Celebration Finale
        </Eyebrow>
      </motion.div>

      {/* Finale Composition */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={heroEntranceVariants}
        className="relative z-10 my-auto py-10 max-w-2xl w-full space-y-6"
      >
        <div className="w-16 h-16 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] flex items-center justify-center mx-auto box-glow-lg">
          <Heart className="w-8 h-8 text-[var(--theme-accent-primary)] fill-current" />
        </div>

        <Display gradient className="text-4xl sm:text-6xl md:text-7xl capitalize">
          Happy Birthday, {data.recipientName}!
        </Display>

        <Body className="text-xl sm:text-2xl font-serif italic text-[var(--theme-text-primary)] max-w-lg mx-auto leading-relaxed">
          &ldquo;May this year give you more moments worth remembering, quiet joys worth keeping, and dreams worth reaching.&rdquo;
        </Body>

        <div className="pt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] text-xs text-[var(--theme-text-accent)]">
          <span>Curated with love • Wishlight Keepsake</span>
        </div>
      </motion.div>

      {/* Replay & Action Controls */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="relative z-10 space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="gold-glow" size="lg" onClick={onReplay}>
            <RefreshCw className="w-4 h-4 mr-1" />
            <span>Replay Experience</span>
          </Button>
        </div>

        <Caption className="block text-[10px] uppercase tracking-widest text-[var(--theme-text-secondary)] opacity-60">
          Created with Wishlight Digital Gift Engine
        </Caption>
      </motion.div>
    </div>
  );
}
