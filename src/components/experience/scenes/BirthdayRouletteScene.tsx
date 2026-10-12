"use client";

import React, { useState } from "react";
import { ExperienceData, BirthdayRouletteConfig, RouletteOption } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Dices, Sparkles, ArrowRight, ArrowLeft, Trophy, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface BirthdayRouletteSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export const DEFAULT_ROULETTE_OPTIONS: RouletteOption[] = [
  { id: "r_1", label: "Free Coffee & Donut", description: "On me next time we meet!" },
  { id: "r_2", label: "Movie Night Pick", description: "You get total control of the remote." },
  { id: "r_3", label: "Big Birthday Hug", description: "Redeemable anytime." },
  { id: "r_4", label: "Home Cooked Dinner", description: "Your favorite meal, cooked by me." },
  { id: "r_5", label: "Weekend Getaway", description: "A fun day trip together." },
  { id: "r_6", label: "Wildcard Surprise", description: "Anything you wish for!" },
];

const SLICE_PALETTE = [
  { bg: "#D4AF37", text: "#0F172A", border: "rgba(255,255,255,0.2)" }, // Champagne Gold
  { bg: "#1E293B", text: "#F8FAFC", border: "rgba(255,255,255,0.1)" }, // Slate Dark
  { bg: "#B45309", text: "#FFFBEB", border: "rgba(255,255,255,0.2)" }, // Amber Warm
  { bg: "#065F46", text: "#ECFDF5", border: "rgba(255,255,255,0.2)" }, // Emerald
  { bg: "#5B21B6", text: "#F5F3FF", border: "rgba(255,255,255,0.2)" }, // Deep Violet
  { bg: "#0F172A", text: "#E2E8F0", border: "rgba(255,255,255,0.15)" }, // Midnight Blue
  { bg: "#991B1B", text: "#FEF2F2", border: "rgba(255,255,255,0.2)" }, // Crimson
  { bg: "#0284C7", text: "#F0F9FF", border: "rgba(255,255,255,0.2)" }, // Sky Blue
];

/**
 * Helper to generate SVG path for a circular sector/wedge
 */
function describeArc(cx: number, cy: number, r: number, startAngleDeg: number, endAngleDeg: number): string {
  const startRad = ((startAngleDeg - 90) * Math.PI) / 180;
  const endRad = ((endAngleDeg - 90) * Math.PI) / 180;

  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);

  const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? "0" : "1";

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

/**
 * Split text string into lines for optimal SVG wheel slice display
 */
function formatSliceText(text: string): string[] {
  if (text.length <= 11) return [text];
  const words = text.split(" ");
  if (words.length === 1) {
    return [text.slice(0, 10) + "…"];
  }
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");
  return [
    line1.length > 13 ? line1.slice(0, 11) + "…" : line1,
    line2.length > 13 ? line2.slice(0, 11) + "…" : line2,
  ];
}

export function BirthdayRouletteScene({ data, onNext, onPrev }: BirthdayRouletteSceneProps) {
  const rouletteMoment = data.moments?.find(
    (m) => m.momentType === "birthday_roulette" && m.enabled !== false
  );
  const config = (rouletteMoment?.config || {}) as BirthdayRouletteConfig;

  const title = config.title || "Spin for a Birthday Surprise";
  const rawOptions = Array.isArray(config.options) && config.options.length > 0
    ? config.options
    : DEFAULT_ROULETTE_OPTIONS;

  // Filter valid options
  const options: RouletteOption[] = rawOptions.filter((o) => o && o.label && o.label.trim().length > 0);
  const effectiveOptions = options.length > 0 ? options : DEFAULT_ROULETTE_OPTIONS;

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<RouletteOption | null>(null);

  const N = effectiveOptions.length;
  const sliceDegrees = 360 / N;
  const viewBoxSize = 320;
  const center = viewBoxSize / 2;
  const radius = 150;
  const textRadius = 100;

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedOption(null);

    // Randomly select winning slice index
    const selectedIdx = Math.floor(Math.random() * N);

    // Calculate mid-angle of selected slice (0deg is top 12 o'clock)
    const sliceMidAngle = selectedIdx * sliceDegrees + sliceDegrees / 2;

    // To align slice mid-angle to top pointer (0deg), we need rotation angle:
    // angleToTop = (360 - sliceMidAngle) % 360
    const angleToTop = (360 - sliceMidAngle) % 360;

    // Calculate full 5-8 rotations + exact target angle
    const currentMod = rotationDegrees % 360;
    const extraRotations = 360 * 5;
    let delta = (angleToTop - currentMod) % 360;
    if (delta < 0) delta += 360;

    const finalRotation = rotationDegrees + extraRotations + delta;

    setRotationDegrees(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setSelectedOption(effectiveOptions[selectedIdx]);
    }, 3200);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      <div className="space-y-3 pt-6">
        <Eyebrow>Interactive Surprise</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">{title}</Heading>
        <Body>
          {selectedOption
            ? "Your birthday surprise has landed!"
            : "Tap the wheel or button below to spin for your surprise."}
        </Body>
      </div>

      {/* Main Roulette Wheel Stage */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4 space-y-6">
        {/* Top Pointer Indicator */}
        <div className="relative z-30 -mb-5">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-[var(--theme-accent-primary)] filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Wheel Chassis Container */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 rounded-full border-4 border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-2 shadow-2xl overflow-hidden box-glow-md flex items-center justify-center">
          <motion.div
            className="w-full h-full rounded-full relative overflow-hidden"
            animate={{ rotate: rotationDegrees }}
            transition={{
              duration: 3.2,
              ease: [0.15, 0.85, 0.35, 1],
            }}
          >
            <svg
              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
              className="w-full h-full transform-gpu roulette-wheel-svg"
            >
              <g>
                {effectiveOptions.map((opt, idx) => {
                  const startAngle = idx * sliceDegrees;
                  const endAngle = (idx + 1) * sliceDegrees;
                  const midAngle = startAngle + sliceDegrees / 2;

                  const colorScheme = SLICE_PALETTE[idx % SLICE_PALETTE.length];
                  const pathData = describeArc(center, center, radius, startAngle, endAngle);

                  // Calculate radial text position
                  const rad = ((midAngle - 90) * Math.PI) / 180;
                  const tx = center + textRadius * Math.cos(rad);
                  const ty = center + textRadius * Math.sin(rad);

                  // Determine readable rotation angle
                  let textAngle = midAngle;
                  if (midAngle > 90 && midAngle < 270) {
                    textAngle += 180;
                  }

                  const lines = formatSliceText(opt.label);

                  return (
                    <g key={opt.id || idx}>
                      {/* Slice Wedge */}
                      <path
                        d={pathData}
                        fill={colorScheme.bg}
                        stroke={colorScheme.border}
                        strokeWidth="1.5"
                      />

                      {/* Slice Label */}
                      <g transform={`translate(${tx}, ${ty}) rotate(${textAngle})`}>
                        {lines.map((line, lIdx) => (
                          <text
                            key={lIdx}
                            x="0"
                            y={lines.length === 1 ? "0" : (lIdx - 0.5) * 12}
                            fill={colorScheme.text}
                            fontSize={N > 6 ? "9.5" : "11"}
                            fontWeight="600"
                            fontFamily="var(--font-serif, serif)"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="select-none tracking-tight"
                          >
                            {line}
                          </text>
                        ))}
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
          </motion.div>

          {/* Center Hub */}
          <div className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--theme-bg-primary)] border-2 border-[var(--theme-accent-primary)] flex items-center justify-center shadow-xl z-20">
            <Dices className={cn("w-7 h-7 sm:w-8 sm:h-8 text-[var(--theme-text-accent)]", isSpinning && "animate-spin")} />
          </div>
        </div>

        {/* Spin Button */}
        <div className="pt-2">
          <Button
            variant="gold-glow"
            size="lg"
            onClick={handleSpin}
            disabled={isSpinning}
            className="min-h-[48px] px-8 text-sm font-semibold tracking-wider"
          >
            {isSpinning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span>Spinning...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span>{selectedOption ? "Spin Again" : "Spin Wheel"}</span>
              </>
            )}
          </Button>
        </div>

        {/* Prize Reveal Modal Card */}
        <AnimatePresence>
          {selectedOption && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="w-full max-w-md rounded-2xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-6 shadow-2xl space-y-3 box-glow-sm relative z-30"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--theme-text-accent)]/20 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-text-accent)]">
                <Trophy className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <Eyebrow>You Won!</Eyebrow>
                <h3 className="font-serif text-xl sm:text-2xl text-[var(--theme-text-primary)]">
                  {selectedOption.label}
                </h3>
                {selectedOption.description && (
                  <p className="text-sm text-[var(--theme-text-secondary)] italic pt-1">
                    {selectedOption.description}
                  </p>
                )}
              </div>
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
