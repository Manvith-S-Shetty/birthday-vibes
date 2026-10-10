"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ExperienceData, CountdownConfig } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

interface CountdownSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getCountdownParts(targetTime: number): CountdownParts {
  const remaining = Math.max(0, targetTime - Date.now());

  const totalSeconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function CountdownScene({
  data,
  onNext,
  onPrev,
}: CountdownSceneProps) {
  const countdownMoment = data.moments?.find(
    (moment) =>
      moment.momentType === "countdown" && moment.enabled !== false
  );

  const config = (countdownMoment?.config || {}) as CountdownConfig;

  const targetDate = config.targetDate;

  const targetTime = useMemo(() => {
    const parsed = new Date(targetDate).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }, [targetDate]);

  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    targetTime
      ? getCountdownParts(targetTime)
      : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  );

  useEffect(() => {
    if (!targetTime) return;

    const updateCountdown = () => {
      setCountdown(getCountdownParts(targetTime));
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [targetTime]);

  const status = !targetTime
    ? "invalid"
    : Date.now() < targetTime
      ? "before"
      : Date.now() < targetTime + 24 * 60 * 60 * 1000
        ? "birthday"
        : "after";

  const message =
    status === "before"
      ? config.preBirthdayMessage ||
        "Something beautiful is waiting for your birthday..."
      : status === "birthday"
        ? config.onBirthdayMessage ||
          "Happy Birthday! Today is your special day."
        : config.postBirthdayMessage ||
          "The birthday may be over, but the memories continue.";

  const formattedDate = targetTime
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(targetTime)
    : "Birthday date unavailable";

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      {/* Header */}
      <div className="space-y-3 pt-6">
        <Eyebrow>Birthday Countdown</Eyebrow>

        <Heading className="text-3xl sm:text-4xl">
          {status === "birthday"
            ? "It's Your Birthday!"
            : status === "after"
              ? "The Celebration Continues"
              : "Something Special Is Coming"}
        </Heading>

        <Body>{message}</Body>
      </div>

      {/* Countdown Card */}
      <div className="w-full flex-1 flex items-center justify-center py-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-3xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-6 sm:p-8 shadow-2xl box-glow-md"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-serif text-[var(--theme-text-accent)] uppercase tracking-widest font-semibold mb-6">
            <CalendarDays className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>

          {status === "before" && targetTime ? (
            <>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {[
                  ["Days", countdown.days],
                  ["Hours", countdown.hours],
                  ["Minutes", countdown.minutes],
                  ["Seconds", countdown.seconds],
                ].map(([label, value]) => (
                  <motion.div
                    key={String(label)}
                    className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"
                    animate={{ scale: label === "Seconds" ? [1, 1.03, 1] : 1 }}
                    transition={
                      label === "Seconds"
                        ? { duration: 1, repeat: Infinity }
                        : undefined
                    }
                  >
                    <div className="font-serif text-2xl sm:text-3xl font-bold text-[var(--theme-text-primary)]">
                      {String(value).padStart(2, "0")}
                    </div>

                    <div className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-[var(--theme-text-secondary)]">
                      {label}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--theme-text-secondary)]">
                <Clock3 className="w-4 h-4" />
                <span>Counting down to your special day</span>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-8 space-y-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-[var(--theme-accent-primary)]/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[var(--theme-text-accent)]" />
              </div>

              <h3 className="font-serif text-2xl font-bold text-[var(--theme-text-primary)]">
                {status === "birthday"
                  ? "Today Is The Day"
                  : "A Day Worth Remembering"}
              </h3>

              <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed">
                {message}
              </p>
            </motion.div>
          )}

          <div className="mt-6 border-t border-white/10 pt-4">
            <Caption className="text-[11px] text-[var(--theme-text-secondary)] opacity-70">
              {data.recipientName
                ? `Made especially for ${data.recipientName}.`
                : "Made especially for you."}
            </Caption>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
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