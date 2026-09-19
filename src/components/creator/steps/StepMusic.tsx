"use client";

import React, { useState, useEffect } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { CURATED_MUSIC_TRACKS, CuratedMusicTrack, MusicMood } from "@/lib/constants/music";
import { useAudioController } from "@/hooks/useAudioController";
import {
  Music,
  Play,
  Pause,
  Loader2,
  Check,
  Volume2,
  AlertCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepMusicProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function getMoodBadgeStyles(mood: MusicMood): string {
  switch (mood) {
    case "intimate":
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    case "cinematic":
      return "bg-purple-500/10 text-purple-300 border-purple-500/20";
    case "dreamy":
      return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
    case "joyful":
      return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
    case "playful":
      return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    case "warm":
    default:
      return "bg-amber-500/10 text-amber-200 border-amber-500/20";
  }
}

export function StepMusic({ draft, onUpdate, onNext, onPrev }: StepMusicProps) {
  const audioController = useAudioController();
  const [attributionTrack, setAttributionTrack] = useState<CuratedMusicTrack | null>(null);

  const selectedTrackId = draft.musicTrackId || "track_none";
  const currentTrackId = audioController.currentTrack?.id;

  const audioControllerRef = React.useRef(audioController);
  audioControllerRef.current = audioController;

  // Unmount cleanup: Stop audio preview when navigating away from StepMusic
  useEffect(() => {
    return () => {
      audioControllerRef.current.stop();
    };
  }, []);

  // Keyboard Escape listener for Attribution Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && attributionTrack) {
        setAttributionTrack(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attributionTrack]);

  const handleSelectTrack = (track: CuratedMusicTrack) => {
    onUpdate({
      musicTrackId: track.id,
      musicTitle: track.title,
      musicUrl: track.url,
    });

    // If selecting silence, stop any active audio preview
    if (track.id === "track_none" && audioController.isPlaying) {
      audioController.stop();
    }
  };

  const handleTogglePreview = (track: CuratedMusicTrack, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();

    if (!track.url || track.id === "track_none") {
      audioController.stop();
      return;
    }

    const isCurrentTrack = currentTrackId === track.id || audioController.currentTrack?.url === track.url;

    if (isCurrentTrack) {
      if (audioController.isPlaying || audioController.transportState === "loading") {
        audioController.pause();
      } else {
        audioController.play().catch(() => {});
      }
    } else {
      audioController.stop();
      audioController.loadTrack({
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist,
      });
      audioController.play().catch(() => {});
    }
  };

  const activeTracks = CURATED_MUSIC_TRACKS.filter((t) => t.enabled);

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto pb-12">
      {/* Step Header */}
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 05 — Ambient Soundtrack</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Set the musical backdrop
        </Heading>
        <Body>
          Choose a soundtrack to accompany their experience. Music remains completely under the recipient&apos;s control with clear audio triggers.
        </Body>
      </div>

      {/* ARIA Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite">
        {audioController.isPlaying && audioController.currentTrack
          ? `Now playing preview of ${audioController.currentTrack.title}`
          : "Audio preview paused"}
      </div>

      {/* Autoplay Blocked Banner */}
      {audioController.isBlocked && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-center gap-3 text-xs sm:text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            Browser audio preview requires interaction. Click any track&apos;s <strong>Listen</strong> button to enable audio.
          </span>
        </div>
      )}

      {/* Audio Error Banner */}
      {audioController.errorMessage && !audioController.isBlocked && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 flex items-center gap-3 text-xs sm:text-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="flex-1">{audioController.errorMessage}</span>
        </div>
      )}

      {/* Track Cards List */}
      <div className="space-y-3.5">
        {activeTracks.map((track) => {
          const isSelected = selectedTrackId === track.id;
          const isCurrentTrack = currentTrackId === track.id;
          const isTrackPlaying = isCurrentTrack && audioController.isPlaying;
          const isTrackLoading = isCurrentTrack && audioController.transportState === "loading";
          const isTrackError = isCurrentTrack && audioController.transportState === "error";

          return (
            <div
              key={track.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${track.title} by ${track.artist}${isSelected ? ", currently selected" : ""}`}
              onClick={() => handleSelectTrack(track)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelectTrack(track);
                }
              }}
              className={cn(
                "p-4.5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-primary)]",
                isSelected
                  ? "border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] box-glow-sm"
                  : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-strong)]"
              )}
            >
              {/* Left Section: Icon + Track Metadata */}
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                <div
                  className={cn(
                    "p-3 rounded-xl transition-colors shrink-0 mt-0.5 sm:mt-0",
                    isSelected
                      ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)]"
                      : "bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)]"
                  )}
                >
                  <Music className="w-5 h-5" />
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif text-base sm:text-lg font-medium text-[var(--theme-text-primary)] truncate block">
                      {track.title}
                    </span>

                    {/* Mood Badge Pill */}
                    {track.mood && track.id !== "track_none" && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider border",
                          getMoodBadgeStyles(track.mood)
                        )}
                      >
                        {track.mood}
                      </span>
                    )}

                    {/* Selected Soundtrack Badge */}
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold bg-[var(--theme-accent-primary)] text-[var(--token-ink)]">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Selected</span>
                      </span>
                    )}

                    {/* Active Previewing Badge */}
                    {isTrackPlaying && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        <Volume2 className="w-3 h-3" />
                        <span>Previewing</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--theme-text-secondary)] flex-wrap">
                    <span>{track.artist}</span>
                    <span className="opacity-40">•</span>
                    <span className="opacity-80">{track.genre}</span>
                    {track.durationSeconds > 0 && (
                      <>
                        <span className="opacity-40">•</span>
                        <span className="opacity-70 font-mono text-[11px]">
                          {formatDuration(track.durationSeconds)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Section: Interactive Control Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t border-white/5 sm:border-0 w-full sm:w-auto justify-end">
                {/* Info / Attribution Modal Button */}
                {track.requiresAttribution && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttributionTrack(track);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Attribution info for ${track.title}`}
                    className="p-2.5 rounded-lg bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-primary)]"
                    title="View Track Licensing & Attribution"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}

                {/* Preview Play/Pause Toggle Button */}
                {track.url && (
                  <button
                    type="button"
                    onClick={(e) => handleTogglePreview(track, e)}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={
                      isTrackPlaying
                        ? `Pause preview of ${track.title}`
                        : `Listen preview of ${track.title}`
                    }
                    className={cn(
                      "px-3.5 py-2.5 rounded-lg text-xs font-sans font-medium transition-all duration-300 min-h-[44px] flex items-center gap-2 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-primary)]",
                      isTrackPlaying
                        ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] border-transparent shadow-md"
                        : "bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] border-[var(--theme-border-subtle)]"
                    )}
                  >
                    {isTrackLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-accent-primary)]" />
                        <span>Loading...</span>
                      </>
                    ) : isTrackPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : isTrackError ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Retry</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attribution Drawer / Modal */}
      {attributionTrack && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setAttributionTrack(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="attribution-title"
        >
          <div
            className="bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[var(--theme-border-subtle)] pb-4">
              <div>
                <Eyebrow>Track Attribution & Licensing</Eyebrow>
                <Heading id="attribution-title" className="text-xl sm:text-2xl mt-1">
                  {attributionTrack.title}
                </Heading>
              </div>
              <button
                type="button"
                onClick={() => setAttributionTrack(null)}
                aria-label="Close attribution dialog"
                className="p-2 rounded-lg bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Info */}
            <div className="space-y-3.5 text-xs sm:text-sm text-[var(--theme-text-secondary)]">
              <div>
                <strong className="text-[var(--theme-text-primary)] block">Performer / Creator:</strong>
                <span>{attributionTrack.artist}</span>
                {attributionTrack.composer && (
                  <span className="block text-xs opacity-75">Composer: {attributionTrack.composer}</span>
                )}
              </div>

              <div>
                <strong className="text-[var(--theme-text-primary)] block">License:</strong>
                <span className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-mono text-xs">
                  {attributionTrack.license}
                </span>
              </div>

              <div>
                <strong className="text-[var(--theme-text-primary)] block mb-1">Source Links:</strong>
                <div className="space-y-1.5">
                  {attributionTrack.sourceUrl && (
                    <a
                      href={attributionTrack.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--theme-accent-primary)] hover:underline text-xs"
                    >
                      <span>Original Track Catalog Entry</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {attributionTrack.licenseUrl && (
                    <a
                      href={attributionTrack.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--theme-accent-primary)] hover:underline text-xs block"
                    >
                      <span>View Official License Terms ({attributionTrack.license})</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <strong className="text-[var(--theme-text-primary)] block mb-1">Required Attribution Text:</strong>
                <div className="p-3 rounded-lg bg-[var(--theme-bg-primary)] border border-[var(--theme-border-subtle)] font-mono text-[11px] text-[var(--theme-text-primary)] select-all leading-relaxed">
                  {attributionTrack.attributionText}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <Button variant="champagne-outline" size="sm" onClick={() => setAttributionTrack(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Lock Experience</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
