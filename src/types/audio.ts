/**
 * Audio Types for Birthday Vibes V2-B Architecture
 */

export type AudioTransportState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "blocked"
  | "error";

export type AudioVolumeIntent = "normal" | "intimate" | "ducked" | "finale";

export const INTENT_VOLUME_MULTIPLIERS: Record<AudioVolumeIntent, number> = {
  normal: 1.0,
  intimate: 0.6,
  ducked: 0.2,
  finale: 1.0,
};

export interface AudioTrackSource {
  id?: string;
  url: string;
  title?: string;
  artist?: string;
}

export interface AudioEngineState {
  transportState: AudioTransportState;
  volumeIntent: AudioVolumeIntent;
  masterVolume: number; // 0.0 to 1.0
  effectiveVolume: number; // calculated 0.0 to 1.0
  isMuted: boolean;
  currentTrack: AudioTrackSource | null;
  errorMessage: string | null;
}

export interface AudioEngineOptions {
  initialMasterVolume?: number;
  initialVolumeIntent?: AudioVolumeIntent;
  autoPlay?: boolean;
}

export interface AudioController {
  // Snapshot State
  state: AudioEngineState;
  transportState: AudioTransportState;
  volumeIntent: AudioVolumeIntent;
  masterVolume: number;
  effectiveVolume: number;
  isMuted: boolean;
  currentTrack: AudioTrackSource | null;
  errorMessage: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  isBlocked: boolean;

  // Playback Controls
  loadTrack: (track: AudioTrackSource | string) => void;
  play: () => Promise<boolean>;
  pause: () => void;
  stop: () => void;
  restart: () => Promise<boolean>;
  resumeFromUserGesture: () => Promise<boolean>;

  // Volume & Intent Controls
  setMasterVolume: (volume: number, durationMs?: number) => void;
  setVolumeIntent: (intent: AudioVolumeIntent, durationMs?: number) => void;
  fadeTo: (targetVolume: number, durationMs?: number) => void;
  duck: (durationMs?: number) => void;
  restoreIntent: (durationMs?: number) => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
}
