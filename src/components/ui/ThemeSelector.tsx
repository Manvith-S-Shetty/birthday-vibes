"use client";

import React from "react";
import { useTheme } from "@/components/themes/ThemeProvider";
import { ThemeId } from "@/types/theme";
import { cn } from "@/lib/utils/cn";
import { Check, Sparkles } from "lucide-react";

export function ThemeSelector({ className }: { className?: string }) {
  const { themeId, setTheme, availableThemes } = useTheme();

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3", className)}>
      {availableThemes.map((t) => {
        const isSelected = t.id === themeId;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id as ThemeId)}
            className={cn(
              "relative text-left p-3.5 rounded-xl border transition-all duration-300 group flex flex-col justify-between overflow-hidden",
              isSelected
                ? "border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] box-glow-sm"
                : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-strong)]"
            )}
          >
            <div
              className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
              style={{ background: t.background.css }}
            />
            <div className="relative z-10 flex items-center justify-between w-full mb-2">
              <span className="font-serif text-sm font-medium text-[var(--theme-text-primary)]">
                {t.name}
              </span>
              {isSelected ? (
                <Check className="w-4 h-4 text-[var(--theme-accent-primary)]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[var(--theme-text-secondary)] opacity-40 group-hover:opacity-100" />
              )}
            </div>

            <div className="relative z-10 flex items-center gap-1.5 mt-2">
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20"
                style={{ backgroundColor: t.tokens.bgPrimary }}
                title="Primary Background"
              />
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20"
                style={{ backgroundColor: t.tokens.textPrimary }}
                title="Text Primary"
              />
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20"
                style={{ backgroundColor: t.tokens.accentPrimary }}
                title="Accent Gold/Glow"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
