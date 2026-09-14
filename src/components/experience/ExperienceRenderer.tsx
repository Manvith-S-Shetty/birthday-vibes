"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ExperienceData } from "@/types/experience";
import { useTheme } from "@/components/themes/ThemeProvider";
import { ThemeId } from "@/types/theme";
import { getProtectedExperiencePayload } from "@/app/actions/experienceActions";

import { LockedCoverScene } from "./scenes/LockedCoverScene";
import { CinematicIntroScene } from "./scenes/CinematicIntroScene";
import { MemoryWallScene } from "./scenes/MemoryWallScene";
import { LetterScene } from "./scenes/LetterScene";
import { CakeCandlesScene } from "./scenes/CakeCandlesScene";
import { FinaleScene } from "./scenes/FinaleScene";

import { Volume2, VolumeX, Music } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type RecipientSceneId = "locked" | "intro" | "memories" | "letter" | "cake" | "finale";

interface ExperienceRendererProps {
  data: ExperienceData;
  isPreview?: boolean;
}

export function ExperienceRenderer({ data: initialData, isPreview = false }: ExperienceRendererProps) {
  const { setTheme } = useTheme();
  const [data, setData] = useState<ExperienceData>(initialData);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!initialData.isPinProtected || isPreview);
  const [sceneId, setSceneId] = useState<RecipientSceneId>(isUnlocked ? "intro" : "locked");

  // Cinematic Scene Transition State
  const [activeSceneId, setActiveSceneId] = useState<RecipientSceneId>(sceneId);
  const [transitionState, setTransitionState] = useState<"active" | "exiting">("active");

  // Audio control state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Live Phone Preview real-time data sync (only when in preview mode)
  useEffect(() => {
    if (isPreview) {
      setData(initialData);
      setIsUnlocked(true);
    }
  }, [initialData, isPreview]);

  // Sync theme when data themeId changes
  useEffect(() => {
    if (data.themeId) {
      setTheme(data.themeId as ThemeId);
    }
  }, [data.themeId, setTheme]);

  // Audio handler
  useEffect(() => {
    if (!data.musicUrl) return;

    const audio = new Audio(data.musicUrl);
    audio.loop = true;
    setAudioElement(audio);

    return () => {
      audio.pause();
    };
  }, [data.musicUrl]);

  // Cinematic Cut/Fade Transition Bridge (500-700ms)
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

  const handleToggleAudio = () => {
    if (!audioElement) return;

    if (isPlayingAudio) {
      audioElement.pause();
      setIsPlayingAudio(false);
    } else {
      audioElement
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((err) => console.warn("Autoplay audio blocked:", err));
    }
  };

  const handleUnlockSuccess = async () => {
    setIsUnlocked(true);
    transitionToScene("intro");

    // Fetch full protected payload post-unlock if not in live preview mode
    if (!isPreview) {
      const payloadResult = await getProtectedExperiencePayload(data.slug);
      if (payloadResult.success && payloadResult.data) {
        setData(payloadResult.data);
      }
    }

    // Attempt audio play upon user unlock gesture if music is configured
    if (audioElement && !isPlayingAudio) {
      audioElement
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((e) => console.warn("Audio play gesture required:", e));
    }
  };

  const handleReplay = () => {
    transitionToScene("intro");
  };

  return (
    <div className="relative w-full min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] transition-colors duration-500 overflow-x-hidden">
      {/* Ambient Vignette Overlay for Depth */}
      <div className="vignette-overlay" aria-hidden="true" />
      <div className="fixed inset-0 bg-film-grain opacity-40 pointer-events-none z-0" aria-hidden="true" />

      {/* Floating Audio Control Widget */}
      {data.musicUrl && isUnlocked && (
        <div className="fixed top-4 right-4 z-40">
          <button
            type="button"
            onClick={handleToggleAudio}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/80 backdrop-blur-md text-xs transition-all duration-300 shadow-lg",
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

      {/* Recipient Scene Transition Container */}
      <div
        className={cn(
          "relative z-10 w-full min-h-screen scene-transition-container",
          transitionState === "active" ? "scene-transition-active" : "scene-transition-exiting"
        )}
      >
        {!isUnlocked || activeSceneId === "locked" ? (
          <LockedCoverScene data={data} onUnlock={handleUnlockSuccess} />
        ) : activeSceneId === "intro" ? (
          <CinematicIntroScene data={data} onNext={() => transitionToScene("memories")} />
        ) : activeSceneId === "memories" ? (
          <MemoryWallScene
            data={data}
            onNext={() => transitionToScene("letter")}
            onPrev={() => transitionToScene("intro")}
          />
        ) : activeSceneId === "letter" ? (
          <LetterScene
            data={data}
            onNext={() => transitionToScene("cake")}
            onPrev={() => transitionToScene("memories")}
          />
        ) : activeSceneId === "cake" ? (
          <CakeCandlesScene
            data={data}
            onNext={() => transitionToScene("finale")}
            onPrev={() => transitionToScene("letter")}
          />
        ) : (
          <FinaleScene data={data} onReplay={handleReplay} />
        )}
      </div>
    </div>
  );
}
