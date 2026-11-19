"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ExperienceData } from "@/types/experience";
import { useTheme } from "@/components/themes/ThemeProvider";
import { ThemeId } from "@/types/theme";
import { getProtectedExperiencePayload } from "@/app/actions/experienceActions";
import { ExpiredExperienceView } from "./ExpiredExperienceView";
import { ExperienceSceneSwitch } from "./ExperienceSceneSwitch";
import { useExperienceAudio } from "@/hooks/useExperienceAudio";
import { Volume2, VolumeX, Music, Mic, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type RecipientSceneId =
  | "locked" | "intro" | "memories" | "letter" | "mystery_gift"
  | "memory_quiz" | "birthday_roulette" | "hidden_message"
  | "birthday_coupon" | "countdown" | "wish_moment" | "cake" | "finale";

const SCENE_LABELS: Record<string, string> = {
  locked: "Lock", intro: "Intro", memories: "Memories", letter: "Letter",
  mystery_gift: "Gift", memory_quiz: "Quiz", birthday_roulette: "Roulette",
  hidden_message: "Secret", birthday_coupon: "Voucher", countdown: "Timer",
  wish_moment: "Wish", cake: "Cake", finale: "Finale",
};

interface ExperienceRendererProps {
  data: ExperienceData;
  isPreview?: boolean;
  initialUnlocked?: boolean;
  showSceneNavigation?: boolean;
}

export function ExperienceRenderer({
  data: initialData,
  isPreview = false,
  initialUnlocked,
  showSceneNavigation = isPreview,
}: ExperienceRendererProps) {
  const { setTheme } = useTheme();
  const [data, setData] = useState<ExperienceData>(initialData);
  const [isExpired, setIsExpired] = useState<boolean>(Boolean(initialData.isExpired));
  const [isUnlocked, setIsUnlocked] = useState<boolean>(
    initialUnlocked !== undefined ? initialUnlocked : (!initialData.isPinProtected || isPreview)
  );
  const [sceneId, setSceneId] = useState<RecipientSceneId>(isUnlocked ? "intro" : "locked");
  const [activeSceneId, setActiveSceneId] = useState<RecipientSceneId>(sceneId);
  const [transitionState, setTransitionState] = useState<"active" | "exiting">("active");

  useEffect(() => {
    if (!isPreview && !initialData.isPinProtected && !data.personalMessage && data.slug) {
      getProtectedExperiencePayload(data.slug).then((res) => {
        if (res.success && res.data) setData(res.data);
      });
    }
  }, [data.slug, initialData.isPinProtected, data.personalMessage, isPreview]);

  const voiceAudioUrl = data.voiceMessage?.url || data.voiceMessage?.audioUrl;

  const {
    isPlayingAudio,
    isPlayingVoice,
    handleToggleAudio,
    handleToggleVoice,
    triggerUnlockAudio,
  } = useExperienceAudio({
    musicUrl: data.musicUrl,
    musicTitle: data.musicTitle,
    voiceAudioUrl,
    activeSceneId,
    isUnlocked,
  });

  const getActiveSceneSequence = useCallback((): RecipientSceneId[] => {
    const sequence: RecipientSceneId[] = ["intro", "memories", "letter"];
    if (Array.isArray(data.moments)) {
      [...data.moments]
        .filter((m) => m && m.enabled !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach((m) => sequence.push(m.momentType as RecipientSceneId));
    }
    return [...sequence, "cake", "finale"];
  }, [data.moments]);

  const getNextSceneId = useCallback((cur: RecipientSceneId): RecipientSceneId => {
    const seq = getActiveSceneSequence();
    const idx = seq.indexOf(cur);
    return idx !== -1 && idx < seq.length - 1 ? seq[idx + 1] : "finale";
  }, [getActiveSceneSequence]);

  const getPrevSceneId = useCallback((cur: RecipientSceneId): RecipientSceneId => {
    const seq = getActiveSceneSequence();
    const idx = seq.indexOf(cur);
    return idx > 0 ? seq[idx - 1] : "intro";
  }, [getActiveSceneSequence]);

  useEffect(() => {
    if (isPreview) {
      setData(initialData);
      setIsUnlocked(true);
    }
  }, [initialData, isPreview]);

  useEffect(() => {
    if (data.themeId) setTheme(data.themeId as ThemeId);
  }, [data.themeId, setTheme]);

  const transitionToScene = useCallback((nextScene: RecipientSceneId) => {
    if (nextScene === activeSceneId) return;
    setTransitionState("exiting");
    const exitTimer = setTimeout(() => {
      setActiveSceneId(nextScene);
      setSceneId(nextScene);
      setTransitionState("active");
    }, 350);
    return () => clearTimeout(exitTimer);
  }, [activeSceneId]);

  const handleUnlockSuccess = async () => {
    setIsUnlocked(true);
    transitionToScene("intro");
    if (!isPreview) {
      const payloadResult = await getProtectedExperiencePayload(data.slug);
      if (payloadResult.isExpired) {
        setIsExpired(true);
        return;
      }
      if (payloadResult.success && payloadResult.data) setData(payloadResult.data);
    }
    triggerUnlockAudio();
  };

  if (isExpired) {
    return <ExpiredExperienceView recipientName={data.recipientName} themeId={data.themeId} />;
  }

  return (
    <div className="relative w-full min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] transition-colors duration-500 overflow-x-hidden">
      <div className="vignette-overlay" aria-hidden="true" />
      <div className="fixed inset-0 bg-film-grain opacity-40 pointer-events-none z-0" aria-hidden="true" />

      {voiceAudioUrl && isUnlocked && (
        <div className="fixed top-4 left-4 z-40">
          <button
            type="button"
            onClick={handleToggleVoice}
            aria-label={isPlayingVoice ? "Pause Birthday Message" : "Play Birthday Message"}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/80 backdrop-blur-md text-xs transition-all duration-300 shadow-lg min-h-[44px]",
              isPlayingVoice
                ? "box-glow-sm text-[var(--theme-text-accent)] border-[var(--theme-accent-primary)]"
                : "text-[var(--theme-text-secondary)]"
            )}
            title={isPlayingVoice ? "Pause Birthday Message" : "Play Birthday Message"}
          >
            <Mic className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
            <span className="hidden sm:inline font-sans font-medium text-[11px]">Voice Note</span>
            {isPlayingVoice ? (
              <Pause className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 opacity-80 fill-current" />
            )}
          </button>
        </div>
      )}

      {data.musicUrl && isUnlocked && (
        <div className="fixed top-4 right-4 z-40">
          <button
            type="button"
            onClick={handleToggleAudio}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/80 backdrop-blur-md text-xs transition-all duration-300 shadow-lg min-h-[44px]",
              isPlayingAudio ? "box-glow-sm text-[var(--theme-text-accent)]" : "text-[var(--theme-text-secondary)]"
            )}
            title={isPlayingAudio ? "Mute Background Music" : "Play Background Music"}
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-sans font-medium text-[11px]">
              {data.musicTitle || "Audio Track"}
            </span>
            {isPlayingAudio ? (
              <Volume2 className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>
        </div>
      )}

      {showSceneNavigation && isUnlocked && activeSceneId !== "locked" && (
        <div
          data-testid="creator-scene-navigation"
          role="navigation"
          aria-label="Scene Preview Navigation"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[92%] sm:max-w-[85%] overflow-x-auto no-scrollbar py-1.5 px-3 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/90 backdrop-blur-md shadow-2xl flex items-center gap-1.5"
        >
          {getActiveSceneSequence().map((sId) => (
            <button
              key={sId}
              type="button"
              data-scene-id={sId}
              onClick={() => transitionToScene(sId)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-sans font-medium transition-all duration-300 whitespace-nowrap min-h-[32px] flex items-center justify-center",
                activeSceneId === sId
                  ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] font-semibold shadow-sm"
                  : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-white/10"
              )}
            >
              <span>{SCENE_LABELS[sId] || sId}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "relative z-10 w-full min-h-screen scene-transition-container",
          transitionState === "active" ? "scene-transition-active" : "scene-transition-exiting"
        )}
      >
        <ExperienceSceneSwitch
          data={data}
          activeSceneId={activeSceneId}
          isUnlocked={isUnlocked}
          isPlayingVoice={isPlayingVoice}
          onUnlock={handleUnlockSuccess}
          onNext={(s) => transitionToScene(getNextSceneId(s))}
          onPrev={(s) => transitionToScene(getPrevSceneId(s))}
          onToggleVoice={handleToggleVoice}
          onReplay={() => transitionToScene("intro")}
        />
      </div>
    </div>
  );
}
