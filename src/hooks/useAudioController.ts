"use client";

import { useAudioContext } from "@/components/audio/AudioProvider";
import { AudioController, AudioEngineState } from "@/types/audio";

const FALLBACK_STATE: AudioEngineState = {
  transportState: "idle",
  volumeIntent: "normal",
  masterVolume: 0.8,
  effectiveVolume: 0.8,
  isMuted: false,
  currentTrack: null,
  errorMessage: null,
};

const NOOP_CONTROLLER: AudioController = {
  state: FALLBACK_STATE,
  transportState: "idle",
  volumeIntent: "normal",
  masterVolume: 0.8,
  effectiveVolume: 0.8,
  isMuted: false,
  currentTrack: null,
  errorMessage: null,
  isPlaying: false,
  isPaused: false,
  isBlocked: false,

  loadTrack: () => {},
  play: async () => false,
  pause: () => {},
  stop: () => {},
  restart: async () => false,
  resumeFromUserGesture: async () => false,

  setMasterVolume: () => {},
  setVolumeIntent: () => {},
  fadeTo: () => {},
  duck: () => {},
  restoreIntent: () => {},
  mute: () => {},
  unmute: () => {},
  toggleMute: () => {},
};

/**
 * Public hook to consume AudioController from nearest AudioProvider.
 * Safely falls back to no-op controller if no AudioProvider is in tree.
 */
export function useAudioController(): AudioController {
  const context = useAudioContext();
  if (!context) {
    return NOOP_CONTROLLER;
  }
  return context;
}
