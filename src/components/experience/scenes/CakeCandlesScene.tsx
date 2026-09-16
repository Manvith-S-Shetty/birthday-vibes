"use client";

import React, { useState, useCallback, useRef } from "react";
import { ExperienceData } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Flame, Sparkles, ArrowRight, ArrowLeft, Mic, MicOff, Wind, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useBlowDetector, BLOW_DETECTOR_CONFIG } from "@/hooks/useBlowDetector";

interface CakeCandlesSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

/** true in development/test builds; false in production (dead-code-eliminated by Next.js).
 *  Also true on Vercel Preview (NEXT_PUBLIC_VERCEL_ENV === "preview") for real-device HTTPS diagnostics. */
const IS_DEV =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

/**
 * DEV-ONLY: Renders a single labeled row in the diagnostic panel.
 * No-ops in production because it is only rendered inside IS_DEV guards.
 */
function DiagRow({
  label,
  value,
  pass,
  bold,
}: {
  label: string;
  value: string;
  pass?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}>
      <span className="text-white/40">{label}</span>
      <span
        className={
          pass === true
            ? "text-green-400"
            : pass === false
            ? "text-red-400"
            : "text-white/80"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function CakeCandlesScene({ data, onNext, onPrev }: CakeCandlesSceneProps) {
  const [litCandles, setLitCandles] = useState<boolean[]>([true, true, true]);
  const [isAllExtinguished, setIsAllExtinguished] = useState<boolean>(false);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>("Candle scene loaded. You can blow into your microphone or tap the candles to extinguish them.");

  // Ref to access current litCandles state inside blow detector callback without stale closures
  const litCandlesRef = useRef(litCandles);
  litCandlesRef.current = litCandles;

  const handleExtinguishCandle = useCallback((index: number) => {
    const current = litCandlesRef.current;
    if (!current[index]) return;

    const next = [...current];
    next[index] = false;
    setLitCandles(next);
    setAriaAnnouncement(`Candle ${index + 1} extinguished.`);

    // Check if all candles are now extinguished
    if (next.every((lit) => !lit)) {
      setAriaAnnouncement("All candles extinguished! Your birthday wish is sealed!");
      setTimeout(() => {
        setIsAllExtinguished(true);
        // 1.2s beat pause before proceeding toward finale
        setTimeout(() => {
          onNext();
        }, 1200);
      }, 600);
    }
  }, [onNext]);

  // Callback triggered when a valid sustained blow is detected
  const handleBlowDetected = useCallback(() => {
    const current = litCandlesRef.current;
    const firstLitIndex = current.findIndex((isLit) => isLit);
    if (firstLitIndex !== -1) {
      handleExtinguishCandle(firstLitIndex);
    }
  }, [handleExtinguishCandle]);

  const {
    permissionState,
    isListening,
    audioLevel,
    isCalibrating,
    startListening,
    stopListening,
    diagnostics,
  } = useBlowDetector({
    onBlowDetected: handleBlowDetected,
  });

  const handleNextWithCleanup = () => {
    stopListening();
    onNext();
  };

  const handlePrevWithCleanup = () => {
    stopListening();
    onPrev();
  };

  const extinguishedCount = litCandles.filter((l) => !l).length;

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center text-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Accessibility Live Announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

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
          {isListening
            ? "Take a deep breath and blow into your microphone!"
            : "Blow into your microphone or tap each candle flame to extinguish it!"}
        </Body>
      </div>

      {/* Interactive Birthday Cake & Candles Container */}
      <div className="relative z-10 my-auto py-6 space-y-6 max-w-md w-full">
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
                      animate={{
                        scale: [1, 1.15 + audioLevel * 0.3, 1],
                        rotate: [-2 - audioLevel * 5, 2 + audioLevel * 5, -2],
                      }}
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

        {/* Microphone Interaction UX Card */}
        {!isAllExtinguished && (
          <div className="mt-4">
            {permissionState === "idle" && (
              <div className="p-4 rounded-2xl bg-[var(--theme-bg-card)]/80 border border-[var(--theme-border-subtle)] backdrop-blur-md space-y-3 box-glow-sm">
                <div className="flex items-center justify-center gap-2 text-xs font-serif tracking-wide text-[var(--theme-text-accent)] uppercase">
                  <Wind className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                  <span>Microphone Candle Blowing</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="gold-glow"
                    size="sm"
                    onClick={startListening}
                    className="w-full sm:w-auto"
                  >
                    <Mic className="w-4 h-4 mr-1.5" />
                    <span>Enable Mic & Blow</span>
                  </Button>
                  <Caption className="text-xs">or tap any candle directly</Caption>
                </div>
              </div>
            )}

            {permissionState === "prompting" && (
              <div className="p-4 rounded-2xl bg-[var(--theme-bg-card)]/80 border border-[var(--theme-border-strong)] backdrop-blur-md flex items-center justify-center gap-2 text-sm text-[var(--theme-text-accent)] animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Allow microphone access in your browser...</span>
              </div>
            )}

            {permissionState === "listening" && (
              <>
                <div className="p-4 rounded-2xl bg-[var(--theme-bg-card)]/90 border border-[var(--theme-accent-primary)]/50 backdrop-blur-md space-y-3 shadow-lg">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--theme-text-primary)]">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-accent-primary)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--theme-accent-primary)]"></span>
                      </span>
                      <span className="font-sans font-medium text-xs">
                        {isCalibrating ? "Calibrating room audio..." : "Listening for blow..."}
                      </span>
                    </div>

                    {/* Real-time Audio Level Bar Indicator */}
                    <div className="flex items-center gap-1 h-4 w-20 bg-black/40 rounded-full px-1.5 overflow-hidden border border-white/10">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-75"
                        style={{ width: `${Math.min(100, Math.max(5, audioLevel * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <Caption className="text-[11px] text-[var(--theme-text-secondary)]">
                      💨 Take a deep breath and blow into your mic!
                    </Caption>
                    <button
                      type="button"
                      onClick={stopListening}
                      className="text-xs text-[var(--theme-text-secondary)] hover:text-white underline font-sans"
                    >
                      Tap only mode
                    </button>
                  </div>
                </div>

                {/* DEV-ONLY Diagnostic Panel — not rendered in production (IS_DEV guard) */}
                {IS_DEV && diagnostics !== null && (
                  <div className="mt-2 p-3 rounded-xl bg-black/80 border border-yellow-500/40 font-mono text-[10px] leading-[1.6] select-text">
                    <div className="text-yellow-400/70 uppercase tracking-widest text-[9px] mb-1.5 pb-1 border-b border-yellow-500/20">
                      🔬 Blow Detector Diagnostics — dev only
                    </div>

                    {/* Gate A: RMS */}
                    <DiagRow label="RMS" value={diagnostics.rms.toFixed(4)} />
                    <DiagRow label="Baseline" value={diagnostics.baseline.toFixed(4)} />
                    <DiagRow label="Threshold" value={diagnostics.threshold.toFixed(4)} />
                    <DiagRow
                      label="RMS Gate (A)"
                      value={diagnostics.rmsGatePass ? "PASS ✓" : "FAIL ✗"}
                      pass={diagnostics.rmsGatePass}
                      bold
                    />

                    <div className="border-t border-white/10 my-1" />

                    {/* Gate B: Spectral */}
                    <DiagRow label="Low Energy" value={diagnostics.lowEnergy.toFixed(0)} />
                    <DiagRow label="Mid/High Energy" value={diagnostics.midHighEnergy.toFixed(0)} />
                    <DiagRow
                      label="Spectral Ratio"
                      value={diagnostics.speechEnergyRatio.toFixed(2)}
                      pass={diagnostics.spectralGatePass}
                    />
                    <DiagRow
                      label="Spectral Gate (B)"
                      value={diagnostics.spectralGatePass ? "PASS ✓" : "FAIL ✗"}
                      pass={diagnostics.spectralGatePass}
                      bold
                    />

                    <div className="border-t border-white/10 my-1" />

                    {/* Gate C: Duration */}
                    <DiagRow
                      label="Sustained"
                      value={`${diagnostics.sustainedMs.toFixed(0)}ms / ${BLOW_DETECTOR_CONFIG.MIN_BLOW_DURATION_MS}ms`}
                      pass={diagnostics.durationGatePass}
                    />
                    <DiagRow
                      label="Duration Gate (C)"
                      value={diagnostics.durationGatePass ? "PASS ✓" : "FAIL ✗"}
                      pass={diagnostics.durationGatePass}
                      bold
                    />

                    <div className="border-t border-white/10 my-1" />

                    {/* Gate D: Cooldown + summary */}
                    <DiagRow
                      label="Cooldown (D)"
                      value={diagnostics.cooldownReady ? "READY" : "WAIT"}
                      pass={diagnostics.cooldownReady}
                    />
                    <DiagRow
                      label="Blow Candidate"
                      value={diagnostics.isBlowCandidate ? "YES" : "NO"}
                      pass={diagnostics.isBlowCandidate}
                      bold
                    />

                    {diagnostics.firing && (
                      <div className="mt-1 text-center text-green-400 font-bold animate-pulse">
                        ⚡ FIRED!
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {(permissionState === "denied" || permissionState === "unsupported" || permissionState === "error") && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm flex items-center justify-center gap-2 text-xs text-[var(--theme-text-secondary)]">
                <MicOff className="w-3.5 h-3.5 opacity-60" />
                <span>Microphone unavailable. Tap the candles to extinguish them!</span>
              </div>
            )}
          </div>
        )}

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
                ? "Tap candles or blow into your mic to make a wish."
                : `${extinguishedCount} wish${extinguishedCount > 1 ? "es" : ""} made!`}
            </Caption>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-xl pt-4">
        <Button variant="ghost" size="md" onClick={handlePrevWithCleanup}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>

        <Button
          variant="gold-glow"
          size="lg"
          onClick={handleNextWithCleanup}
          className={cn(isAllExtinguished && "box-glow-lg scale-105")}
        >
          <span>See Celebration Finale</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
