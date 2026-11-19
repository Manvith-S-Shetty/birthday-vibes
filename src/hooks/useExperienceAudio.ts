"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAudioController } from "@/hooks/useAudioController";
import { AudioVolumeIntent } from "@/types/audio";
import { RecipientSceneId } from "@/components/experience/ExperienceRenderer";

export interface UseExperienceAudioOptions {
  musicUrl?: string | null;
  musicTitle?: string | null;
  voiceAudioUrl?: string | null;
  activeSceneId: RecipientSceneId;
  isUnlocked: boolean;
}

export function useExperienceAudio({
  musicUrl,
  musicTitle,
  voiceAudioUrl,
  activeSceneId,
  isUnlocked,
}: UseExperienceAudioOptions) {
  const controller = useAudioController();
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const isVoicePlayingRef = useRef(false);
  const baseIntentRef = useRef<AudioVolumeIntent>("normal");

  isVoicePlayingRef.current = isPlayingVoice;

  // 1. Determine target base intent based on active scene
  const determineSceneIntent = useCallback((scene: RecipientSceneId): AudioVolumeIntent => {
    if (scene === "memories" || scene === "letter") {
      return "intimate";
    }
    if (scene === "cake" || scene === "finale") {
      return "finale";
    }
    return "normal";
  }, []);

  // 2. Load background music track and manage unmount cleanup
  useEffect(() => {
    if (!musicUrl) {
      return;
    }

    controllerRef.current.loadTrack({
      url: musicUrl,
      title: musicTitle || "Ambient Soundtrack",
    });

    return () => {
      controllerRef.current.stop();
    };
  }, [musicUrl, musicTitle]);

  // 3. Update volume intent on scene transitions without overriding active voice ducking
  useEffect(() => {
    const nextIntent = determineSceneIntent(activeSceneId);
    baseIntentRef.current = nextIntent;

    if (!isVoicePlayingRef.current && isUnlocked) {
      controllerRef.current.setVolumeIntent(nextIntent, 400);
    }
  }, [activeSceneId, isUnlocked, determineSceneIntent]);

  // 4. Voice note HTMLAudioElement lifecycle & ended listener
  useEffect(() => {
    if (!voiceAudioUrl) {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }
      setIsPlayingVoice(false);
      return;
    }

    const audio = new Audio(voiceAudioUrl);
    voiceAudioRef.current = audio;

    const handleEnded = () => {
      setIsPlayingVoice(false);
      controllerRef.current.setVolumeIntent(baseIntentRef.current, 400);
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      voiceAudioRef.current = null;
    };
  }, [voiceAudioUrl]);

  // 5. Toggle background music
  const handleToggleAudio = useCallback(() => {
    if (controller.isPlaying) {
      controller.pause();
    } else {
      if (musicUrl && (!controller.currentTrack || controller.currentTrack.url !== musicUrl)) {
        controller.loadTrack({
          url: musicUrl,
          title: musicTitle || "Ambient Soundtrack",
        });
      }
      controller.resumeFromUserGesture().catch((err) => {
        console.warn("Background music play blocked:", err);
      });
    }
  }, [controller, musicUrl, musicTitle]);

  // 6. Toggle voice note playback with smooth ducking
  const handleToggleVoice = useCallback(() => {
    const voiceAudio = voiceAudioRef.current;
    if (!voiceAudio) return;

    if (isVoicePlayingRef.current) {
      voiceAudio.pause();
      setIsPlayingVoice(false);
      controller.setVolumeIntent(baseIntentRef.current, 400);
    } else {
      controller.duck(400);
      voiceAudio
        .play()
        .then(() => {
          setIsPlayingVoice(true);
        })
        .catch((err) => {
          console.warn("Voice message playback blocked:", err);
          controller.setVolumeIntent(baseIntentRef.current, 400);
          setIsPlayingVoice(false);
        });
    }
  }, [controller]);

  // 7. Trigger music playback on PIN unlock or first user gesture
  const triggerUnlockAudio = useCallback(() => {
    if (musicUrl && !controller.isPlaying) {
      if (!controller.currentTrack || controller.currentTrack.url !== musicUrl) {
        controller.loadTrack({
          url: musicUrl,
          title: musicTitle || "Ambient Soundtrack",
        });
      }
      controller.resumeFromUserGesture().catch((e) => {
        console.warn("Audio play gesture required on unlock:", e);
      });
    }
  }, [musicUrl, musicTitle, controller]);

  return {
    isPlayingAudio: controller.isPlaying,
    isPlayingVoice,
    handleToggleAudio,
    handleToggleVoice,
    triggerUnlockAudio,
  };
}
