"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from "react";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import {
  AudioController,
  AudioEngineState,
  AudioTrackSource,
  AudioVolumeIntent,
} from "@/types/audio";

const AudioContext = createContext<AudioController | null>(null);

export interface AudioProviderProps {
  children: React.ReactNode;
  initialMasterVolume?: number;
  initialVolumeIntent?: AudioVolumeIntent;
  initialTrack?: AudioTrackSource | string;
  autoPlay?: boolean;
}

/**
 * Scoped AudioProvider Component
 * Manages an AudioEngine instance lifecycle and provides AudioController context to children.
 */
export function AudioProvider({
  children,
  initialMasterVolume = 0.8,
  initialVolumeIntent = "normal",
  initialTrack,
  autoPlay = false,
}: AudioProviderProps) {
  // Create engine instance once per Provider instance using ref
  const engineRef = useRef<AudioEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AudioEngine({
      initialMasterVolume,
      initialVolumeIntent,
    });
  }

  const engine = engineRef.current;
  const [engineState, setEngineState] = useState<AudioEngineState>(() => engine.getState());

  // Subscribe to engine state updates
  useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setEngineState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, [engine]);

  // Handle initial track loading and autoplay
  useEffect(() => {
    if (initialTrack) {
      engine.loadTrack(initialTrack);
      if (autoPlay) {
        engine.play().catch(() => {});
      }
    }
  }, [initialTrack, autoPlay, engine]);

  // Clean up engine on provider unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Memoize controller API
  const controller: AudioController = useMemo(() => {
    return {
      state: engineState,
      transportState: engineState.transportState,
      volumeIntent: engineState.volumeIntent,
      masterVolume: engineState.masterVolume,
      effectiveVolume: engineState.effectiveVolume,
      isMuted: engineState.isMuted,
      currentTrack: engineState.currentTrack,
      errorMessage: engineState.errorMessage,
      isPlaying: engineState.transportState === "playing",
      isPaused: engineState.transportState === "paused",
      isBlocked: engineState.transportState === "blocked",

      // Actions
      loadTrack: (track) => engine.loadTrack(track),
      play: () => engine.play(),
      pause: () => engine.pause(),
      stop: () => engine.stop(),
      restart: () => engine.restart(),
      resumeFromUserGesture: () => engine.resumeFromUserGesture(),

      // Volume & Intent Actions
      setMasterVolume: (vol, dur) => engine.setMasterVolume(vol, dur),
      setVolumeIntent: (intent, dur) => engine.setVolumeIntent(intent, dur),
      fadeTo: (target, dur) => engine.fadeTo(target, dur),
      duck: (dur) => engine.duck(dur),
      restoreIntent: (dur) => engine.restoreIntent(dur),
      mute: () => engine.mute(),
      unmute: () => engine.unmute(),
      toggleMute: () => engine.toggleMute(),
    };
  }, [engine, engineState]);

  return <AudioContext.Provider value={controller}>{children}</AudioContext.Provider>;
}

/**
 * Context getter hook for useAudioController
 */
export function useAudioContext(): AudioController | null {
  return useContext(AudioContext);
}
