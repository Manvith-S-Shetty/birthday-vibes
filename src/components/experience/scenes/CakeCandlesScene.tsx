"use client";

import React, { useState } from "react";
import { ExperienceData } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Flame, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface CakeCandlesSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function CakeCandlesScene({ data, onNext, onPrev }: CakeCandlesSceneProps) {
  const [litCandles, setLitCandles] = useState<boolean[]>([true, true, true]);
  const [isAllExtinguished, setIsAllExtinguished] = useState<boolean>(false);

  const handleExtinguishCandle = (index: number) => {
    if (!litCandles[index]) return;

    const next = [...litCandles];
    next[index] = false;
    setLitCandles(next);

    // Check if all candles are now extinguished
    if (next.every((lit) => !lit)) {
      setTimeout(() => {
        setIsAllExtinguished(true);
        // 1.2s beat pause before proceeding toward finale
        setTimeout(() => {
          onNext();
        }, 1200);
      }, 600);
    }
  };

  const extinguishedCount = litCandles.filter((l) => !l).length;

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center text-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Atmosphere Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
        <div className="w-[500px] h-[500px] rounded-full bg-[var(--theme-accent-glow)] blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-3 max-w-xl mx-auto">
        <Eyebrow>Step 04 — Make a Wish</Eyebrow>
        <Heading className="text-3xl sm:text-5xl">
          Blow Out the Candles
        </Heading>
        <Body>
          Tap each candle flame to extinguish it and make your birthday wish!
        </Body>
      </div>

      {/* Interactive Birthday Cake & Candles Container */}
      <div className="relative z-10 my-auto py-8 space-y-8 max-w-md w-full">
        {/* Candle Flame Taps Container */}
        <div className="flex items-end justify-center gap-8 sm:gap-12 mb-4">
          {litCandles.map((isLit, idx) => (
            <div
              key={idx}
              onClick={() => handleExtinguishCandle(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleExtinguishCandle(idx);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={isLit ? `Extinguish candle ${idx + 1}` : `Candle ${idx + 1} extinguished`}
              className="relative cursor-pointer group flex flex-col items-center select-none min-w-[44px] p-2 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] rounded-xl"
            >
              {/* Flame / Smoke animation container */}
              <div className="h-16 flex items-end justify-center mb-1">
                <AnimatePresence mode="wait">
                  {isLit ? (
                    <motion.div
                      key="flame"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.15, 1], rotate: [-2, 2, -2] }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]"
                    >
                      <Flame className="w-9 h-9 fill-amber-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="smoke"
                      initial={{ y: 0, opacity: 1, scale: 0.6 }}
                      animate={{ y: -24, opacity: 0, scale: 1.4 }}
                      transition={{ duration: 1 }}
                      className="text-gray-400 text-xs font-sans italic flex flex-col items-center"
                    >
                      <div className="w-2 h-2 rounded-full bg-gray-400 opacity-60 mb-1 animate-ping" />
                      <span>wished ✨</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Candle Stick */}
              <div className="w-4 h-24 rounded-t-sm bg-gradient-to-b from-[var(--theme-accent-primary)] to-[var(--theme-accent-secondary)] border border-white/20 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 w-1/2" />
              </div>
            </div>
          ))}
        </div>

        {/* Cake Base Graphic */}
        <div className="relative mx-auto w-64 sm:w-72">
          {/* Top Layer */}
          <div className="h-16 rounded-t-3xl bg-[var(--theme-bg-card)] border-2 border-[var(--theme-border-strong)] flex items-center justify-center box-glow-sm">
            <span className="font-serif text-sm tracking-widest text-[var(--theme-text-accent)] uppercase">
              Happy Birthday {data.recipientName}
            </span>
          </div>
          {/* Bottom Layer */}
          <div className="h-14 rounded-b-2xl bg-[var(--theme-bg-secondary)] border-2 border-t-0 border-[var(--theme-border-strong)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)] opacity-60" />
          </div>
        </div>

        {/* Wish Prompt / Extinguished Celebration Prompt */}
        <div className="h-12 flex items-center justify-center">
          {isAllExtinguished ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-1"
            >
              <span className="font-serif text-xl font-medium text-gold-gradient block">
                Your wish is sealed! ✨
              </span>
              <Caption>Proceeding to your celebration finale...</Caption>
            </motion.div>
          ) : (
            <Caption>
              {extinguishedCount === 0
                ? "Tap candles to extinguish and make a wish."
                : `${extinguishedCount} wish${extinguishedCount > 1 ? "es" : ""} made!`
              }
            </Caption>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-xl pt-4">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>

        <Button
          variant="gold-glow"
          size="lg"
          onClick={onNext}
          className={cn(isAllExtinguished && "box-glow-lg scale-105")}
        >
          <span>See Celebration Finale</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
