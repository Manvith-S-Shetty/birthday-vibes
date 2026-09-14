"use client";

import React, { useState } from "react";
import { ExperienceData } from "@/types/experience";
import { Display, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Lock, KeyRound, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { heroEntranceVariants } from "@/lib/motion";
import { verifyPinAndUnlock } from "@/app/actions/experienceActions";

interface LockedCoverSceneProps {
  data: ExperienceData;
  onUnlock: () => void;
}

export function LockedCoverScene({ data, onUnlock }: LockedCoverSceneProps) {
  const [pinInput, setPinInput] = useState<string>("");
  const [errorFeedback, setErrorFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAttemptUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data.isPinProtected) {
      setErrorFeedback("");
      onUnlock();
      return;
    }

    setIsSubmitting(true);
    setErrorFeedback("");

    try {
      const result = await verifyPinAndUnlock(data.slug, pinInput.trim());

      if (result.success) {
        setPinInput("");
        onUnlock();
      } else {
        setErrorFeedback(result.error || "Passcode incorrect. Please try again.");
        setPinInput("");
      }
    } catch {
      setErrorFeedback("Failed to verify passcode. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center text-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Atmosphere Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
        <div className="w-[450px] h-[450px] rounded-full bg-[var(--theme-accent-glow)] blur-[100px] animate-pulse-glow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 space-y-2"
      >
        <Eyebrow>A Private Digital Gift</Eyebrow>
        {data.birthdayDate && (
          <Caption className="block uppercase tracking-widest text-xs opacity-70">
            {/^\d{4}-\d{2}-\d{2}$/.test(data.birthdayDate)
              ? (() => {
                  const [y, m, d] = data.birthdayDate.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  return isNaN(dateObj.getTime())
                    ? data.birthdayDate
                    : dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                })()
              : data.birthdayDate}
          </Caption>
        )}
      </motion.div>

      {/* Main Cover Mystery Card */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={heroEntranceVariants}
        className="relative z-10 my-auto py-8 max-w-lg w-full space-y-8"
      >
        <div className="w-16 h-16 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] flex items-center justify-center mx-auto box-glow-sm">
          <Lock className="w-7 h-7 text-[var(--theme-accent-primary)]" />
        </div>

        <div className="space-y-3">
          <p className="font-serif italic text-2xl sm:text-3xl text-[var(--theme-text-secondary)]">
            Something special has been waiting for you...
          </p>
          <Display gradient className="text-4xl sm:text-6xl capitalize">
            For {data.recipientName}
          </Display>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleAttemptUnlock} className="space-y-4 max-w-xs mx-auto">
          <div className="relative">
            <input
              type="password"
              value={pinInput}
              maxLength={6}
              onChange={(e) => {
                setErrorFeedback("");
                setPinInput(e.target.value);
              }}
              placeholder="Enter Secret PIN"
              disabled={isSubmitting}
              className={`w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] font-mono text-center text-xl tracking-[0.3em] px-4 py-3.5 rounded-xl border transition-all duration-300 focus:outline-none ${
                errorFeedback
                  ? "border-amber-500/80 box-glow-sm animate-shake"
                  : "border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent-primary)]"
              }`}
              autoFocus
            />
            <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-secondary)] opacity-40 pointer-events-none" />
          </div>

          {errorFeedback && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-sans text-amber-400 opacity-90"
            >
              {errorFeedback}
            </motion.p>
          )}

          <Button variant="gold-glow" size="lg" type="submit" disabled={isSubmitting} className="w-full">
            <span>{isSubmitting ? "Verifying..." : "Unlock Surprise"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 text-[10px] uppercase tracking-widest text-[var(--theme-text-secondary)] opacity-50"
      >
        Wishlight Private Experience Engine
      </motion.div>
    </div>
  );
}
