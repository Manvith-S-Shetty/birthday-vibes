"use client";

import React, { useState } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";

interface StepSecurityProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepSecurity({ draft, onUpdate, onNext, onPrev }: StepSecurityProps) {
  const [pin, setPin] = useState<string>(draft.pin || "");
  const [confirmPin, setConfirmPin] = useState<string>(draft.pin || "");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPin = pin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanPin) {
      setError("Please set a 4 to 6 digit secret PIN to protect this experience.");
      return;
    }
    if (cleanPin.length < 4 || cleanPin.length > 6) {
      setError("PIN should be between 4 and 6 digits/characters.");
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setError("PIN and confirmation do not match.");
      return;
    }

    setError("");
    onUpdate({ pin: cleanPin, isPinProtected: true });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 06 — Privacy & Security</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Lock your birthday surprise
        </Heading>
        <Body>
          Set a secret PIN or passkey. Your recipient will enter this PIN on their locked cover screen to trigger the cinematic reveal.
        </Body>
      </div>

      <div className="p-4 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[var(--theme-accent-primary)] shrink-0 mt-0.5" />
        <Caption className="text-xs">
          This keeps the birthday surprise private so only your recipient can unlock their gift.
        </Caption>
      </div>

      <div className="space-y-5">
        {/* Secret PIN Field */}
        <div className="space-y-2">
          <label className="block font-sans text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-medium">
            Secret PIN / Passkey (4–6 digits) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              maxLength={6}
              onChange={(e) => {
                setError("");
                setPin(e.target.value);
              }}
              placeholder="e.g. 1024 or 2026"
              className="w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] font-mono text-2xl tracking-widest px-5 py-3.5 rounded-xl border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent-primary)] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[var(--theme-text-secondary)] opacity-60 hover:opacity-100"
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Confirm PIN Field */}
        <div className="space-y-2">
          <label className="block font-sans text-xs uppercase tracking-widest text-[var(--theme-text-secondary)] font-medium">
            Confirm Secret PIN <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={confirmPin}
              maxLength={6}
              onChange={(e) => {
                setError("");
                setConfirmPin(e.target.value);
              }}
              placeholder="Re-enter PIN"
              className="w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] font-mono text-2xl tracking-widest px-5 py-3.5 rounded-xl border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent-primary)] focus:outline-none transition-colors"
            />
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--theme-text-secondary)] opacity-40" />
          </div>
        </div>

        {error && <p className="text-xs text-rose-400 font-sans mt-1">{error}</p>}
      </div>

      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" type="submit">
          <span>Review Experience</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </form>
  );
}
