"use client";

import React, { useState, useEffect } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { ExperienceData } from "@/types/experience";
import { ArrowLeft, ArrowRight, AlertTriangle, Mic, Trash2 } from "lucide-react";

import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";

interface StepPreviewProps {
  draft: BirthdayDraft;
  onUpdate?: (updates: Partial<BirthdayDraft>) => void;
  onNavigateToVoice?: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepPreview({ draft, onUpdate, onNavigateToVoice, onNext, onPrev }: StepPreviewProps) {
  const [cachedVoice, setCachedVoice] = useState<{ blob: Blob; objectUrl: string } | null>(
    () => VoiceRecordingCache.get(draft.id) || null
  );
  const [hasMissingAudio, setHasMissingAudio] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkVoice() {
      if (draft.voiceMessage?.status === "recorded") {
        let current = VoiceRecordingCache.get(draft.id);
        if (!current) {
          current = await VoiceRecordingCache.restore(draft.id);
        }
        if (isMounted) {
          if (current) {
            setCachedVoice(current);
            setHasMissingAudio(false);
          } else {
            setCachedVoice(null);
            setHasMissingAudio(true);
          }
        }
      } else {
        if (isMounted) {
          setHasMissingAudio(false);
        }
      }
    }
    checkVoice();
    return () => {
      isMounted = false;
    };
  }, [draft.id, draft.voiceMessage?.status]);

  const voiceMessage = cachedVoice
    ? {
        url: cachedVoice.objectUrl,
        audioUrl: cachedVoice.objectUrl,
        mimeType: cachedVoice.blob.type || draft.voiceMessage?.mimeType || "audio/webm",
        durationMs: draft.voiceMessage?.durationMs || 0,
        transcript: draft.voiceMessage?.transcript || undefined,
      }
    : undefined;

  const experiencePayload: ExperienceData = {
    id: draft.id,
    slug: draft.recipientName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "birthday-preview",
    recipientName: draft.recipientName || "Recipient",
    birthdayDate: draft.birthdayDate,
    relationship: draft.relationship,
    openingStyle: draft.openingStyle || "cinematic-premiere",
    memoryDisplayMode: draft.memoryDisplayMode || "grid",
    themeId: draft.themeId,
    personalMessage: draft.personalMessage || "Wishing you a birthday filled with light and joy.",
    photos: draft.photos,
    musicTitle: draft.musicTitle,
    musicUrl: draft.musicUrl,
    voiceMessage,
    moments: draft.moments,
    isPinProtected: draft.isPinProtected,
    pin: draft.pin,
    createdAt: draft.createdAt,
  };

  const handleRemoveVoice = () => {
    VoiceRecordingCache.clear(draft.id);
    setCachedVoice(null);
    setHasMissingAudio(false);
    if (onUpdate) {
      onUpdate({ voiceMessage: undefined });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="space-y-3 text-center">
        <Eyebrow>Step 07 — Final Inspection</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Review your gift experience
        </Heading>
        <Body className="max-w-xl mx-auto">
          This is exactly what {draft.recipientName || "your recipient"} will see when they unlock their gift URL.
        </Body>
      </div>

      {hasMissingAudio && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-300">Voice Note Audio Unavailable</p>
              <p className="text-stone-300">
                Voice recording audio file is missing from session cache. Please re-record your voice note before publishing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {onNavigateToVoice && (
              <Button
                variant="champagne-outline"
                size="sm"
                onClick={onNavigateToVoice}
                className="text-xs min-h-[38px] px-3.5"
              >
                <Mic className="w-3.5 h-3.5 mr-1.5" />
                <span>Re-record</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveVoice}
              className="text-xs min-h-[38px] px-3 text-rose-300 hover:text-rose-200 hover:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Remove Voice Note</span>
            </Button>
          </div>
        </div>
      )}

      {/* Frame Container rendering Phase 1 ExperienceRenderer */}
      <div className="rounded-3xl border border-[var(--theme-border-strong)] overflow-hidden shadow-2xl bg-[var(--theme-bg-primary)] min-h-[500px]">
        <ExperienceRenderer data={experiencePayload} isPreview />
      </div>

      <div className="pt-6 pb-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-[var(--theme-border-subtle)]/60">
        <Button
          variant="ghost"
          size="md"
          onClick={onPrev}
          className="min-h-[48px] px-5 sm:px-6 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to editing</span>
        </Button>
        <Button
          variant="gold-glow"
          onClick={onNext}
          className="group min-h-[50px] px-8 sm:px-10 text-xs sm:text-sm font-semibold tracking-wider transition-all duration-200 ease-out shadow-[0_0_14px_rgba(212,175,55,0.25)] hover:shadow-[0_0_28px_rgba(212,175,55,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:outline-none"
        >
          <span>Publish Birthday Experience</span>
          <ArrowRight className="w-4 h-4 ml-2.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
