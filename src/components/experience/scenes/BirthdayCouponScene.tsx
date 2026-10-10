"use client";

import React, { useState } from "react";
import { ExperienceData, BirthdayCouponConfig } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Ticket, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface BirthdayCouponSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function BirthdayCouponScene({ data, onNext, onPrev }: BirthdayCouponSceneProps) {
  const couponMoment = data.moments?.find(
    (m) => m.momentType === "birthday_coupon" && m.enabled !== false
  );
  const config = (couponMoment?.config || {}) as BirthdayCouponConfig;

  const couponTitle = config.couponTitle || "One Birthday Gift Voucher";
  const couponDescription =
    config.couponDescription || "Redeemable anytime for a special birthday treat!";
  const terms = config.terms || "No expiration date.";
  const code = config.code || "BDAY-2026";

  const [isRedeemed, setIsRedeemed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleRedeem = () => {
    setIsRedeemed(true);
  };

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      <div className="space-y-3 pt-6">
        <Eyebrow>Birthday Voucher</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">Exclusive Coupon</Heading>
        <Body>
          A gift voucher created especially for you by {data.recipientName ? `${data.recipientName}'s wish creator` : "your creator"}.
        </Body>
      </div>

      {/* Main Ticket Voucher Card */}
      <div className="w-full flex-1 flex items-center justify-center py-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md relative rounded-3xl border-2 border-dashed border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-6 sm:p-8 shadow-2xl space-y-6 box-glow-md overflow-hidden"
        >
          {/* Ticket Notch Cutouts */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--theme-bg-primary)] border-r-2 border-dashed border-[var(--theme-border-strong)]" />
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--theme-bg-primary)] border-l-2 border-dashed border-[var(--theme-border-strong)]" />

          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-xs font-serif text-[var(--theme-text-accent)]">
              <Ticket className="w-4 h-4" />
              <span className="uppercase tracking-widest font-sans font-medium">Official Gift Pass</span>
            </div>
            {isRedeemed && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                Claimed
              </span>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-serif text-2xl sm:text-3xl text-[var(--theme-text-primary)] font-bold">
              {couponTitle}
            </h3>
            <p className="text-sm text-[var(--theme-text-secondary)] leading-relaxed">
              {couponDescription}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isRedeemed ? (
              <motion.div
                key="unclaimed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pt-2"
              >
                <Button variant="gold-glow" size="lg" onClick={handleRedeem} className="w-full">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span>Claim Gift Voucher</span>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="claimed"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="pt-2 space-y-4"
              >
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-2">
                  <div className="text-left">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--theme-text-secondary)] block">
                      Voucher Code
                    </span>
                    <span className="font-mono text-lg font-bold text-[var(--theme-text-accent)] tracking-wider">
                      {code}
                    </span>
                  </div>
                  <Button variant="champagne-outline" size="sm" onClick={handleCopyCode}>
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Voucher Activated! Show this to redeem.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {terms && (
            <div className="border-t border-white/10 pt-4">
              <Caption className="text-[11px] text-[var(--theme-text-secondary)] opacity-70">
                Terms: {terms}
              </Caption>
            </div>
          )}
        </motion.div>
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
