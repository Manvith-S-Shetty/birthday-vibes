"use client";

import React, { useState } from "react";
import { BirthdayDraft, ExpirationOption } from "@/types/draft";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ArrowLeft, Clock, Calendar, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { EXPIRATION_OPTIONS } from "@/lib/expiration/expiration";
import { cn } from "@/lib/utils/cn";

interface StepSecurityProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepSecurity({ draft, onUpdate, onNext, onPrev }: StepSecurityProps) {
  const [isPinProtected, setIsPinProtected] = useState<boolean>(() => {
    if (typeof draft.isPinProtected === "boolean") return draft.isPinProtected;
    return Boolean(draft.pin);
  });
  const [pin, setPin] = useState<string>(draft.pin || "");
  const [confirmPin, setConfirmPin] = useState<string>(draft.pin || "");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [expirationOption, setExpirationOption] = useState<ExpirationOption>(
    draft.expirationOption || "never"
  );
  const [error, setError] = useState<string>("");

  const handleTogglePinProtection = () => {
    const next = !isPinProtected;
    setIsPinProtected(next);
    setError("");
    if (next) {
      const cleanPin = pin.trim();
      const cleanConfirm = confirmPin.trim();
      if (cleanPin && cleanPin === cleanConfirm && cleanPin.length >= 4 && cleanPin.length <= 6) {
        onUpdate({ isPinProtected: true, pin: cleanPin, expirationOption });
      } else {
        onUpdate({ isPinProtected: true, expirationOption });
      }
    } else {
      setPin("");
      setConfirmPin("");
      onUpdate({ isPinProtected: false, pin: "", expirationOption });
    }
  };

  const handlePinChange = (val: string) => {
    setError("");
    setPin(val);
    if (!isPinProtected && val.length > 0) {
      setIsPinProtected(true);
    }
    const cleanPin = val.trim();
    const cleanConfirm = confirmPin.trim();
    if (cleanPin && cleanPin === cleanConfirm && cleanPin.length >= 4 && cleanPin.length <= 6) {
      onUpdate({ pin: cleanPin, isPinProtected: true, expirationOption });
    } else if (cleanPin.length === 0) {
      onUpdate({ pin: "", isPinProtected: false, expirationOption });
    }
  };

  const handleConfirmPinChange = (val: string) => {
    setError("");
    setConfirmPin(val);
    const cleanPin = pin.trim();
    const cleanConfirm = val.trim();
    if (cleanPin && cleanPin === cleanConfirm && cleanPin.length >= 4 && cleanPin.length <= 6) {
      onUpdate({ pin: cleanPin, isPinProtected: true, expirationOption });
    }
  };

  const handleSelectExpiration = (optId: ExpirationOption) => {
    setExpirationOption(optId);
    onUpdate({ expirationOption: optId });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPin = pin.trim();
    const cleanConfirm = confirmPin.trim();

    if (isPinProtected || cleanPin.length > 0) {
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
      onUpdate({
        pin: cleanPin,
        isPinProtected: true,
        expirationOption,
      });
    } else {
      setError("");
      onUpdate({
        pin: "",
        isPinProtected: false,
        expirationOption,
      });
    }

    onNext();
  };

  const handlePrevClick = () => {
    const cleanPin = pin.trim();
    const cleanConfirm = confirmPin.trim();
    if (isPinProtected || cleanPin.length >= 4) {
      if (cleanPin && cleanPin === cleanConfirm && cleanPin.length >= 4 && cleanPin.length <= 6) {
        onUpdate({ pin: cleanPin, isPinProtected: true, expirationOption });
      } else {
        onUpdate({ isPinProtected: true, expirationOption });
      }
    } else {
      onUpdate({ pin: "", isPinProtected: false, expirationOption });
    }
    onPrev();
  };

  const getOptionIcon = (id: ExpirationOption) => {
    switch (id) {
      case "7d":
        return <Clock className="w-4 h-4 text-amber-400" />;
      case "30d":
        return <Calendar className="w-4 h-4 text-emerald-400" />;
      case "1y":
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      case "never":
        return <InfinityIcon className="w-4 h-4 text-yellow-300" />;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 07 — Privacy & Security</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Lock your birthday surprise
        </Heading>
        <Body>
          Configure optional secret PIN protection and celebration lifetime. When enabled, your recipient will enter this PIN on their locked cover screen to trigger the cinematic reveal.
        </Body>
      </div>

      {/* PIN Protection Toggle Switch */}
      <div className="p-4 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <span className="font-semibold text-sm text-[var(--theme-text-primary)]">
              Secret PIN Protection
            </span>
          </div>
          <Caption className="text-xs">
            {isPinProtected
              ? "Require your recipient to enter a 4–6 digit secret PIN to unlock and view their gift."
              : "PIN protection disabled. Set a PIN below or toggle on to require passcode verification."}
          </Caption>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPinProtected}
          onClick={handleTogglePinProtection}
          className={cn(
            "w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] shrink-0",
            isPinProtected ? "bg-[var(--theme-accent-primary)]" : "bg-stone-700"
          )}
        >
          <div
            className={cn(
              "bg-[var(--token-ink)] w-4 h-4 rounded-full shadow-md transform transition-transform duration-300",
              isPinProtected ? "translate-x-6" : "translate-x-0"
            )}
          />
        </button>
      </div>

      <div className="space-y-5 animate-fade-in">
        {/* Secret PIN Field */}
        <div className="space-y-2">
          <label className="block font-sans text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-medium">
            Secret PIN / Passkey (4–6 digits) {isPinProtected && <span className="text-rose-400">*</span>}
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              maxLength={6}
              onChange={(e) => handlePinChange(e.target.value)}
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
            Confirm Secret PIN {isPinProtected && <span className="text-rose-400">*</span>}
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={confirmPin}
              maxLength={6}
              onChange={(e) => handleConfirmPinChange(e.target.value)}
              placeholder="Re-enter PIN"
              className="w-full bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] font-mono text-2xl tracking-widest px-5 py-3.5 rounded-xl border border-[var(--theme-border-subtle)] focus:border-[var(--theme-accent-primary)] focus:outline-none transition-colors"
            />
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--theme-text-secondary)] opacity-40" />
          </div>
        </div>

        {error && <p className="text-xs text-rose-400 font-sans mt-1">{error}</p>}
      </div>

      {/* Experience Expiration & Lifetime Selector */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="block font-sans text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-medium">
            Experience Lifetime & Expiration
          </label>
          <span className="text-[11px] text-[var(--theme-text-muted)] font-mono">
            Auto-cleanup enabled
          </span>
        </div>
        <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
          Choose how long this experience remains accessible to your recipient. Once expired, private photos and voice notes are safely and automatically removed from storage.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {EXPIRATION_OPTIONS.map((opt) => {
            const isSelected = expirationOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectExpiration(opt.id)}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between relative group",
                  isSelected
                    ? "border-[var(--theme-accent-primary)] bg-[var(--theme-accent-primary)]/10 shadow-[0_0_15px_rgba(234,179,8,0.15)] ring-1 ring-[var(--theme-accent-primary)]"
                    : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] hover:border-[var(--theme-border-strong)]"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-[var(--theme-bg-page)] border border-[var(--theme-border-subtle)]">
                      {getOptionIcon(opt.id)}
                    </div>
                    <span className="font-semibold text-sm text-[var(--theme-text-primary)]">
                      {opt.label}
                    </span>
                  </div>
                  {opt.badge && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
                  {opt.description}
                </p>
                <div className="mt-2.5 pt-2 border-t border-[var(--theme-border-subtle)] flex items-center justify-between text-[11px]">
                  <span className="text-[var(--theme-text-muted)] font-mono">Duration</span>
                  <span className={cn("font-medium", isSelected ? "text-[var(--theme-accent-primary)]" : "text-[var(--theme-text-secondary)]")}>
                    {opt.durationLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" type="button" onClick={handlePrevClick}>
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
