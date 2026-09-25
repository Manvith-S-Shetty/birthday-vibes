"use client";

import React from "react";
import { VoiceMessageData } from "@/types/experience";
import { Mic, Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface VoiceMessagePlayerProps {
  voiceMessage: VoiceMessageData;
  isPlaying: boolean;
  onTogglePlay: () => void;
  className?: string;
}

export function VoiceMessagePlayer({
  voiceMessage,
  isPlaying,
  onTogglePlay,
  className,
}: VoiceMessagePlayerProps) {
  const formatDuration = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      className={cn(
        "p-5 rounded-2xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/90 backdrop-blur-md shadow-xl space-y-3 box-glow-sm transition-all duration-300 max-w-md mx-auto text-left",
        isPlaying && "border-[var(--theme-accent-primary)]/60 box-glow-md",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
        <div className="flex items-center gap-1.5 font-medium text-[var(--theme-text-accent)]">
          <Mic className="w-4 h-4 text-[var(--theme-accent-primary)] animate-pulse" />
          <span className="uppercase tracking-widest font-serif font-semibold">
            A Voice Note For You
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-80">
          {formatDuration(voiceMessage.durationMs)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onTogglePlay}
          className={cn(
            "flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all duration-200 box-glow-sm min-h-[44px]",
            isPlaying
              ? "bg-amber-400 text-stone-950 hover:bg-amber-300"
              : "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] hover:brightness-110"
          )}
          aria-label={isPlaying ? "Pause Birthday Message" : "Play Birthday Message"}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Message</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Play Birthday Message</span>
            </>
          )}
        </button>

        {isPlaying && (
          <div className="flex items-center gap-1 text-[var(--theme-accent-primary)]">
            <Volume2 className="w-4 h-4 animate-bounce" />
            <span className="text-[11px] font-sans italic opacity-90">Playing...</span>
          </div>
        )}
      </div>

      {voiceMessage.transcript && (
        <p className="text-xs font-serif italic text-[var(--theme-text-secondary)] border-t border-white/10 pt-2.5 leading-relaxed">
          &ldquo;{voiceMessage.transcript}&rdquo;
        </p>
      )}
    </div>
  );
}
