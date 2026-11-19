"use client";

import React, { useEffect } from "react";
import { X, PlusCircle, ArrowRight, Film } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface MotionFilmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MotionFilmModal({ isOpen, onClose }: MotionFilmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Birthday Vibes Motion Film"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-fade-in"
    >
      <div className="relative w-full max-w-5xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-strong)] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col box-glow-sm">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)]/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--theme-accent-primary)]">
            <Film className="w-4 h-4" />
            <span className="font-sans font-semibold text-[var(--theme-text-primary)] tracking-normal normal-case text-sm">
              Birthday Vibes — Motion Film
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close motion film"
            className="p-2 rounded-full text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 16:9 Responsive Video Viewport */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <iframe
            src="/motion/birthday-vibes-motion.html"
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            title="Birthday Vibes Motion Film"
          />
        </div>

        {/* Modal Footer with Secondary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)]/90">
          <p className="text-xs text-[var(--theme-text-secondary)] text-center sm:text-left font-sans">
            Crafting intimate, personalized short-film birthday celebrations.
          </p>

          <Button href="/create" variant="gold-glow" size="sm" onClick={onClose} className="w-full sm:w-auto">
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            <span>Create a Birthday Gift</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
