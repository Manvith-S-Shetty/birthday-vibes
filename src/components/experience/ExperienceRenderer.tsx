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
import { MysteryGiftScene } from "./scenes/MysteryGiftScene";
import { MemoryQuizScene } from "./scenes/MemoryQuizScene";
import { BirthdayRouletteScene } from "./scenes/BirthdayRouletteScene";
import { HiddenMessageScene } from "./scenes/HiddenMessageScene";
import { BirthdayCouponScene } from "./scenes/BirthdayCouponScene";
import { CountdownScene } from "./scenes/CountdownScene";
import { WishMomentScene } from "./scenes/WishMomentScene";
import { CakeCandlesScene } from "./scenes/CakeCandlesScene";
import { FinaleScene } from "./scenes/FinaleScene";
import { ExpiredExperienceView } from "./ExpiredExperienceView";

import { Volume2, VolumeX, Music, Mic, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type RecipientSceneId =
  | "locked"
  | "intro"
  | "memories"
  | "letter"
  | "mystery_gift"
  | "memory_quiz"
  | "birthday_roulette"
  | "hidden_message"
  | "birthday_coupon"
  | "countdown"
  | "wish_moment"
  | "cake"
  | "finale";

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
    initialUnlocked !== undefined
      ? initialUnlocked
      : (!initialData.isPinProtected || isPreview)
  );
  const [sceneId, setSceneId] = useState<RecipientSceneId>(isUnlocked ? "intro" : "locked");

  // Cinematic Scene Transition State
  const [activeSceneId, setActiveSceneId] = useState<RecipientSceneId>(sceneId);
  const [transitionState, setTransitionState] = useState<"active" | "exiting">("active");

  // Dynamic payload fetch for unprotected experiences without full content
  useEffect(() => {
    if (!isPreview && !initialData.isPinProtected && !data.personalMessage && data.slug) {
      getProtectedExperiencePayload(data.slug).then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      });
    }
  }, [data.slug, initialData.isPinProtected, data.personalMessage, isPreview]);

  // Audio control state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Voice message control state
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
  const [voiceAudioElement, setVoiceAudioElement] = useState<HTMLAudioElement | null>(null);

  // Dynamic active scene progression builder
  const getActiveSceneSequence = useCallback((): RecipientSceneId[] => {
    const sequence: RecipientSceneId[] = ["intro", "memories", "letter"];

    if (Array.isArray(data.moments)) {
      const activeMoments = [...data.moments]
        .filter((m) => m && m.enabled !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      for (const moment of activeMoments) {
        if (moment.momentType === "mystery_gift") {
          sequence.push("mystery_gift");
        } else if (moment.momentType === "memory_quiz") {
          sequence.push("memory_quiz");
        } else if (moment.momentType === "birthday_roulette") {
          sequence.push("birthday_roulette");
        } else if (moment.momentType === "hidden_message") {
          sequence.push("hidden_message");
        } else if (moment.momentType === "birthday_coupon") {
          sequence.push("birthday_coupon");
        } else if (moment.momentType === "countdown") {
          sequence.push("countdown");
        } else if (moment.momentType === "wish_moment") {
          sequence.push("wish_moment");
        }
      }
    }

    sequence.push("cake", "finale");
    return sequence;
  }, [data.moments]);

  const getNextSceneId = useCallback(
    (current: RecipientSceneId): RecipientSceneId => {
      const seq = getActiveSceneSequence();
      const idx = seq.indexOf(current);
      if (idx !== -1 && idx < seq.length - 1) {
        return seq[idx + 1];
      }
      return "finale";
    },
    [getActiveSceneSequence]
  );

  const getPrevSceneId = useCallback(
    (current: RecipientSceneId): RecipientSceneId => {
      const seq = getActiveSceneSequence();
      const idx = seq.indexOf(current);
      if (idx > 0) {
        return seq[idx - 1];
      }
      return "intro";
    },
    [getActiveSceneSequence]
  );

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
      if (payloadResult.isExpired) {
        setIsExpired(true);
        return;
      }
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

  if (isExpired) {
    return (
      <ExpiredExperienceView
        recipientName={data.recipientName}
        themeId={data.themeId}
      />
    );
  }

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

      {/* Floating Scene Sequence Navigation Bar - Only rendered in creator preview */}
      {showSceneNavigation && isUnlocked && activeSceneId !== "locked" && (
        <div
          data-testid="creator-scene-navigation"
          role="navigation"
          aria-label="Scene Preview Navigation"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[92%] sm:max-w-[85%] overflow-x-auto no-scrollbar py-1.5 px-3 rounded-full border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/90 backdrop-blur-md shadow-2xl flex items-center gap-1.5"
        >
          {getActiveSceneSequence().map((sId, idx) => {
            const isActive = activeSceneId === sId;
            const labels: Record<RecipientSceneId, string> = {
              locked: "Lock",
              intro: "Intro",
              memories: "Memories",
              letter: "Letter",
              mystery_gift: "Gift",
              memory_quiz: "Quiz",
              birthday_roulette: "Roulette",
              hidden_message: "Secret",
              birthday_coupon: "Voucher",
              countdown: "Timer",
              wish_moment: "Wish",
              cake: "Cake",
              finale: "Finale",
            };
            return (
              <button
                key={sId}
                type="button"
                data-scene-id={sId}
                onClick={() => transitionToScene(sId)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-sans font-medium transition-all duration-300 whitespace-nowrap min-h-[32px] flex items-center justify-center",
                  isActive
                    ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] font-semibold shadow-sm"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-white/10"
                )}
              >
                <span>{labels[sId] || sId}</span>
              </button>
            );
          })}
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
          <CinematicIntroScene data={data} onNext={() => transitionToScene(getNextSceneId("intro"))} />
        ) : activeSceneId === "memories" ? (
          <MemoryWallScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("memories"))}
            onPrev={() => transitionToScene(getPrevSceneId("memories"))}
          />
        ) : activeSceneId === "letter" ? (
          <LetterScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("letter"))}
            onPrev={() => transitionToScene(getPrevSceneId("letter"))}
            isPlayingVoice={isPlayingVoice}
            onToggleVoice={handleToggleVoice}
          />
        ) : activeSceneId === "mystery_gift" ? (
          <MysteryGiftScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("mystery_gift"))}
            onPrev={() => transitionToScene(getPrevSceneId("mystery_gift"))}
          />
        ) : activeSceneId === "memory_quiz" ? (
          <MemoryQuizScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("memory_quiz"))}
            onPrev={() => transitionToScene(getPrevSceneId("memory_quiz"))}
          />
        ) : activeSceneId === "birthday_roulette" ? (
          <BirthdayRouletteScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("birthday_roulette"))}
            onPrev={() => transitionToScene(getPrevSceneId("birthday_roulette"))}
          />
        ) : activeSceneId === "hidden_message" ? (
          <HiddenMessageScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("hidden_message"))}
            onPrev={() => transitionToScene(getPrevSceneId("hidden_message"))}
          />
        ) : activeSceneId === "birthday_coupon" ? (
          <BirthdayCouponScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("birthday_coupon"))}
            onPrev={() => transitionToScene(getPrevSceneId("birthday_coupon"))}
          />
        ) : activeSceneId === "countdown" ? (
          <CountdownScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("countdown"))}
            onPrev={() => transitionToScene(getPrevSceneId("countdown"))}
          />
        ) : activeSceneId === "wish_moment" ? (
          <WishMomentScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("wish_moment"))}
            onPrev={() => transitionToScene(getPrevSceneId("wish_moment"))}
          />
        ) : activeSceneId === "cake" ? (
          <CakeCandlesScene
            data={data}
            onNext={() => transitionToScene(getNextSceneId("cake"))}
            onPrev={() => transitionToScene(getPrevSceneId("cake"))}
          />
        ) : (
          <FinaleScene data={data} onReplay={handleReplay} />
        )}
      </div>
    </div>
  );
}
