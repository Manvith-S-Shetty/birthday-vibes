"use client";

import React, { useState } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { CURATED_MUSIC_TRACKS, MusicTrack } from "@/lib/constants/music";
import { Music, Play, Square, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepMusicProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepMusic({ draft, onUpdate, onNext, onPrev }: StepMusicProps) {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleTogglePreviewPlay = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingTrackId === track.id) {
      if (audioElement) {
        audioElement.pause();
      }
      setPlayingTrackId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    if (!track.url) {
      setPlayingTrackId(null);
      return;
    }

    const newAudio = new Audio(track.url);
    newAudio.play().catch((err) => console.warn("Audio preview blocked by browser:", err));
    setAudioElement(newAudio);
    setPlayingTrackId(track.id);

    newAudio.onended = () => {
      setPlayingTrackId(null);
    };
  };

  const handleSelectTrack = (track: MusicTrack) => {
    onUpdate({
      musicTrackId: track.id,
      musicTitle: track.title,
      musicUrl: track.url,
    });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 05 — Ambient Soundtrack</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Set the musical backdrop
        </Heading>
        <Body>
          Choose a soundtrack to accompany their experience. Music remains completely under the recipient&apos;s control with clear audio triggers.
        </Body>
      </div>

      <div className="space-y-3">
        {CURATED_MUSIC_TRACKS.map((track) => {
          const isSelected = (draft.musicTrackId || "track_none") === track.id;
          const isPlaying = playingTrackId === track.id;

          return (
            <div
              key={track.id}
              onClick={() => handleSelectTrack(track)}
              className={cn(
                "p-4 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 group",
                isSelected
                  ? "border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] box-glow-sm"
                  : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-strong)]"
              )}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    "p-2.5 rounded-lg transition-colors",
                    isSelected
                      ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)]"
                      : "bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)]"
                  )}
                >
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-serif text-base font-medium text-[var(--theme-text-primary)] block">
                    {track.title}
                  </span>
                  <span className="font-sans text-xs text-[var(--theme-text-secondary)]">
                    {track.artist} • <span className="opacity-70">{track.genre}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {track.url && (
                  <button
                    type="button"
                    onClick={(e) => handleTogglePreviewPlay(track, e)}
                    className="p-2 rounded-full bg-[var(--theme-bg-primary)] hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] transition-colors"
                    title={isPlaying ? "Pause Preview" : "Listen Preview"}
                  >
                    {isPlaying ? (
                      <Square className="w-4 h-4 text-[var(--theme-accent-primary)] fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>
                )}

                {isSelected && (
                  <div className="p-1 rounded-full bg-[var(--theme-accent-primary)] text-[var(--token-ink)]">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
