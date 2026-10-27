"use client";

import React from "react";
import Link from "next/link";
import { Display, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Clock, ShieldCheck, Sparkles, HeartHandshake, ArrowRight } from "lucide-react";
import { useTheme } from "@/components/themes/ThemeProvider";
import { ThemeId } from "@/types/theme";

interface ExpiredExperienceViewProps {
  recipientName?: string;
  themeId?: string;
}

export function ExpiredExperienceView({
  recipientName = "Someone Special",
  themeId = "midnight-cinema",
}: ExpiredExperienceViewProps) {
  const { setTheme } = useTheme();

  React.useEffect(() => {
    if (themeId) {
      setTheme(themeId as ThemeId);
    }
  }, [themeId, setTheme]);

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--theme-bg-page)] text-[var(--theme-text-primary)] relative overflow-hidden"
      data-testid="expired-experience-page"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-500 blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center space-y-6 sm:space-y-8 animate-fade-in p-6 sm:p-10 rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)]/90 backdrop-blur-xl shadow-2xl">
        {/* Cinematic Clock/Retired Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--theme-accent-primary)]/15 border border-[var(--theme-accent-primary)]/30 text-[var(--theme-accent-primary)] flex items-center justify-center mx-auto box-glow-md">
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2] text-amber-400 animate-pulse" />
        </div>

        <div className="space-y-3">
          <Eyebrow className="text-amber-400/90 font-mono tracking-widest text-xs uppercase">
            Celebration Concluded
          </Eyebrow>
          <Display gradient className="text-3xl sm:text-4xl font-serif">
            This birthday experience has expired
          </Display>
          <Body className="text-sm sm:text-base text-[var(--theme-text-secondary)] leading-relaxed max-w-md mx-auto">
            The personalized birthday celebration crafted for{" "}
            <strong className="text-[var(--theme-text-primary)] font-semibold">
              {recipientName}
            </strong>{" "}
            has reached the end of its scheduled lifetime.
          </Body>
        </div>

        {/* Privacy & Cleanup Assurance Card */}
        <div className="p-4 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-page)]/60 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Privacy & Storage Cleanup Complete</span>
          </div>
          <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed">
            As requested by the creator, all private photographs, recorded voice notes, and secret passcodes have been safely and automatically retired from cloud storage.
          </p>
        </div>

        {/* Call to action */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link href="/create" className="w-full sm:w-auto">
            <Button variant="gold-glow" size="lg" className="w-full">
              <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
              <span>Craft a New Wishlight</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="champagne-outline" size="lg" className="w-full">
              <HeartHandshake className="w-4 h-4 mr-2" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
