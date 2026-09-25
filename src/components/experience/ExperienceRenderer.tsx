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

import { Volume2, VolumeX, Music, Mic, Play, Pause } from "lucide-react";
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

  // Voice message control state
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
  const [voiceAudioElement, setVoiceAudioElement] = useState<HTMLAudioElement | null>(null);

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

  // Background Audio handler
  useEffect(() => {
    if (!data.musicUrl) return;

    const audio = new Audio(data.musicUrl);
    audio.loop = true;
    setAudioElement(audio);

    return () => {
      audio.pause();
    };
  }, [data.musicUrl]);

  const voiceAudioUrl = data.voiceMessage?.url || data.voiceMessage?.audioUrl;

  // Voice Message Audio handler
  useEffect(() => {
    if (!voiceAudioUrl) {
      setVoiceAudioElement(null);
      setIsPlayingVoice(false);
      return;
    }

    const audio = new Audio(voiceAudioUrl);

    const handleEnded = () => {
      setIsPlayingVoice(false);
    };

    audio.addEventListener("ended", handleEnded);
    setVoiceAudioElement(audio);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [voiceAudioUrl]);

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
      // Pause voice message if playing
      if (voiceAudioElement && isPlayingVoice) {
        voiceAudioElement.pause();
        setIsPlayingVoice(false);
      }

      audioElement
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((err) => console.warn("Autoplay audio blocked:", err));
    }
  };

  const handleToggleVoice = () => {
    if (!voiceAudioElement) return;

    if (isPlayingVoice) {
      voiceAudioElement.pause();
      setIsPlayingVoice(false);
    } else {
      // Pause background music if playing when voice starts
      if (audioElement && isPlayingAudio) {
        audioElement.pause();
        setIsPlayingAudio(false);
      }

      voiceAudioElement
        .play()
        .then(() => setIsPlayingVoice(true))
        .catch((err) => console.warn("Voice playback blocked:", err));
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

      {/* Floating Voice Control Widget */}
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
            <span className="hidden sm:inline font-sans font-medium text-[11px]">
              Voice Note
            </span>
            {isPlayingVoice ? (
              <Pause className="w-3.5 h-3.5 text-[var(--theme-accent-primary)] fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 opacity-80 fill-current" />
            )}
          </button>
        </div>
      )}

      {/* Floating Background Music Control Widget */}
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
            isPlayingVoice={isPlayingVoice}
            onToggleVoice={handleToggleVoice}
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
