import {
  AudioEngineState,
  AudioEngineOptions,
  AudioTransportState,
  AudioVolumeIntent,
  AudioTrackSource,
  INTENT_VOLUME_MULTIPLIERS,
} from "@/types/audio";

type StateChangeListener = (state: AudioEngineState) => void;

/**
 * AudioEngine — Central Audio Controller
 * Manages a single HTMLAudioElement with optional Web Audio API GainNode integration.
 */
export class AudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private webAudioSupported: boolean = false;
  private webAudioInitialized: boolean = false;

  private listeners: Set<StateChangeListener> = new Set();
  private volumeRampTimer: any = null;
  private previousVolumeIntent: AudioVolumeIntent = "normal";

  private state: AudioEngineState = {
    transportState: "idle",
    volumeIntent: "normal",
    masterVolume: 0.8,
    effectiveVolume: 0.8,
    isMuted: false,
    currentTrack: null,
    errorMessage: null,
  };

  constructor(options?: AudioEngineOptions) {
    if (options?.initialMasterVolume !== undefined) {
      this.state.masterVolume = Math.max(0, Math.min(1, options.initialMasterVolume));
    }
    if (options?.initialVolumeIntent) {
      this.state.volumeIntent = options.initialVolumeIntent;
    }
    this.updateEffectiveVolumeState();

    this.initAudioElement();
  }

  /**
   * Safe initialization of HTMLAudioElement
   */
  private initAudioElement() {
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      return;
    }

    try {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.preload = "metadata";
      this.audioElement.crossOrigin = "anonymous";

      // Attach HTML5 audio event listeners
      this.audioElement.addEventListener("play", this.handleAudioPlay);
      this.audioElement.addEventListener("pause", this.handleAudioPause);
      this.audioElement.addEventListener("ended", this.handleAudioEnded);
      this.audioElement.addEventListener("error", this.handleAudioError);
      this.audioElement.addEventListener("waiting", this.handleAudioWaiting);
      this.audioElement.addEventListener("canplaythrough", this.handleAudioCanPlay);
    } catch (e) {
      console.warn("AudioEngine: Failed to instantiate HTMLAudioElement", e);
    }
  }

  /**
   * Lazily initialize Web Audio API nodes (AudioContext -> MediaElementAudioSourceNode -> GainNode -> destination)
   * Ensures MediaElementAudioSourceNode is created ONCE for the lifespan of audioElement.
   */
  private ensureWebAudioNodes(): boolean {
    if (this.webAudioInitialized) {
      return this.webAudioSupported;
    }

    if (
      typeof window === "undefined" ||
      !this.audioElement ||
      !(window.AudioContext || (window as any).webkitAudioContext)
    ) {
      this.webAudioSupported = false;
      this.webAudioInitialized = true;
      return false;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Create source node ONLY ONCE per audioElement
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
      this.gainNode = this.audioCtx.createGain();

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      // Set initial gain value
      const targetGain = this.state.effectiveVolume;
      this.gainNode.gain.setValueAtTime(targetGain, this.audioCtx.currentTime);

      // Keep HTMLAudioElement volume at 1.0 so GainNode controls output volume
      this.audioElement.volume = 1.0;

      this.webAudioSupported = true;
      this.webAudioInitialized = true;
      return true;
    } catch (e) {
      console.warn("AudioEngine: Web Audio API initialization failed/fallback to HTML5 volume", e);
      this.webAudioSupported = false;
      this.webAudioInitialized = true;
      return false;
    }
  }

  /**
   * Calculate effective volume based on master volume, intent multiplier, and mute state
   */
  private calculateEffectiveVolume(): number {
    if (this.state.isMuted) return 0;
    const multiplier = INTENT_VOLUME_MULTIPLIERS[this.state.volumeIntent] ?? 1.0;
    return Math.max(0, Math.min(1, this.state.masterVolume * multiplier));
  }

  /**
   * Update internal state's effectiveVolume and notify subscribers
   */
  private updateEffectiveVolumeState() {
    this.state.effectiveVolume = this.calculateEffectiveVolume();
  }

  /**
   * Apply a smooth volume transition to target volume over durationMs
   */
  private applyVolumeRamp(targetVolume: number, durationMs: number = 400) {
    const target = Math.max(0, Math.min(1, targetVolume));

    // Try Web Audio GainNode ramping first if available
    if (this.ensureWebAudioNodes() && this.gainNode && this.audioCtx) {
      try {
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }
        const now = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);

        if (durationMs > 0) {
          this.gainNode.gain.linearRampToValueAtTime(target, now + durationMs / 1000);
        } else {
          this.gainNode.gain.setValueAtTime(target, now);
        }

        if (this.audioElement) {
          this.audioElement.volume = 1.0;
        }
        return;
      } catch (e) {
        console.warn("AudioEngine: Web Audio ramp error, using fallback", e);
      }
    }

    // Fallback: Programmatic volume ramp on HTMLAudioElement.volume
    if (!this.audioElement) return;

    if (this.volumeRampTimer) {
      clearInterval(this.volumeRampTimer);
      this.volumeRampTimer = null;
    }

    if (durationMs <= 0) {
      this.audioElement.volume = target;
      return;
    }

    const startVol = this.audioElement.volume;
    const steps = Math.max(1, Math.floor(durationMs / 20)); // 20ms steps
    const delta = (target - startVol) / steps;
    let stepCount = 0;

    this.volumeRampTimer = setInterval(() => {
      stepCount++;
      if (!this.audioElement) {
        clearInterval(this.volumeRampTimer);
        return;
      }

      if (stepCount >= steps) {
        this.audioElement.volume = target;
        clearInterval(this.volumeRampTimer);
        this.volumeRampTimer = null;
      } else {
        const nextVol = Math.max(0, Math.min(1, startVol + delta * stepCount));
        this.audioElement.volume = nextVol;
      }
    }, 20);
  }

  // --- HTML5 Audio Event Handlers ---

  private handleAudioPlay = () => {
    if (this.state.transportState !== "playing") {
      this.setState({ transportState: "playing", errorMessage: null });
    }
  };

  private handleAudioPause = () => {
    if (this.state.transportState === "playing" || this.state.transportState === "loading") {
      this.setState({ transportState: "paused" });
    }
  };

  private handleAudioEnded = () => {
    // If loop is set, HTML5 audio repeats automatically, but if ended fires:
    this.setState({ transportState: "paused" });
  };

  private handleAudioWaiting = () => {
    if (this.state.transportState === "playing") {
      this.setState({ transportState: "loading" });
    }
  };

  private handleAudioCanPlay = () => {
    if (this.state.transportState === "loading") {
      // Standby or playing
    }
  };

  private handleAudioError = (e: Event) => {
    const error = (e.target as HTMLAudioElement)?.error;
    const msg = error ? `Audio error code ${error.code}: ${error.message}` : "Audio loading failed.";
    this.setState({ transportState: "error", errorMessage: msg });
  };

  // --- Public State & Subscription API ---

  public getState(): AudioEngineState {
    return { ...this.state };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partialState: Partial<AudioEngineState>) {
    this.state = { ...this.state, ...partialState };
    this.updateEffectiveVolumeState();
    const currentSnapshot = this.getState();
    this.listeners.forEach((listener) => listener(currentSnapshot));
  }

  // --- Public Transport Actions ---

  public loadTrack(track: AudioTrackSource | string): void {
    const trackObj: AudioTrackSource | null =
      typeof track === "string" ? { url: track } : track;

    if (!trackObj || !trackObj.url) {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.removeAttribute("src");
        this.audioElement.load();
      }
      this.setState({
        currentTrack: null,
        transportState: "idle",
        errorMessage: null,
      });
      return;
    }

    // Avoid redundant reload if track URL is unchanged
    if (this.state.currentTrack?.url === trackObj.url && this.audioElement?.src) {
      return;
    }

    this.setState({
      currentTrack: trackObj,
      transportState: "loading",
      errorMessage: null,
    });

    if (this.audioElement) {
      this.audioElement.src = trackObj.url;
      this.audioElement.load();
    }
  }

  public async play(): Promise<boolean> {
    if (!this.audioElement || !this.state.currentTrack?.url) {
      return false;
    }

    // Try Web Audio context resume if initialized
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn("AudioEngine: AudioContext resume failed:", e);
      }
    }

    // Sync current effective volume before playing
    const effective = this.calculateEffectiveVolume();
    this.applyVolumeRamp(effective, 0);

    try {
      await this.audioElement.play();
      this.setState({ transportState: "playing", errorMessage: null });
      return true;
    } catch (err: any) {
      const errName = err?.name || "";
      const errMsg = err?.message || String(err);

      if (errName === "NotAllowedError" || errMsg.toLowerCase().includes("user gesture") || errMsg.toLowerCase().includes("autoplay")) {
        this.setState({
          transportState: "blocked",
          errorMessage: "Playback blocked by browser autoplay policy. User interaction required.",
        });
      } else {
        this.setState({
          transportState: "error",
          errorMessage: errMsg || "Failed to play audio.",
        });
      }
      return false;
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.setState({ transportState: "paused" });
  }

  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      try {
        this.audioElement.currentTime = 0;
      } catch {}
    }
    this.setState({ transportState: "idle" });
  }

  public async restart(): Promise<boolean> {
    if (this.audioElement) {
      try {
        this.audioElement.currentTime = 0;
      } catch {}
    }
    return this.play();
  }

  public async resumeFromUserGesture(): Promise<boolean> {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch {}
    }
    return this.play();
  }

  // --- Volume & Intent Actions ---

  public setMasterVolume(volume: number, durationMs: number = 400): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.masterVolume = clamped;
    this.updateEffectiveVolumeState();
    this.applyVolumeRamp(this.state.effectiveVolume, durationMs);
    this.setState({ masterVolume: clamped });
  }

  public setVolumeIntent(intent: AudioVolumeIntent, durationMs: number = 400): void {
    this.previousVolumeIntent = this.state.volumeIntent;
    this.state.volumeIntent = intent;
    this.updateEffectiveVolumeState();
    this.applyVolumeRamp(this.state.effectiveVolume, durationMs);
    this.setState({ volumeIntent: intent });
  }

  public fadeTo(targetVolume: number, durationMs: number = 400): void {
    const clamped = Math.max(0, Math.min(1, targetVolume));
    this.state.masterVolume = clamped;
    this.updateEffectiveVolumeState();
    this.applyVolumeRamp(this.state.effectiveVolume, durationMs);
    this.setState({ masterVolume: clamped });
  }

  public duck(durationMs: number = 400): void {
    this.setVolumeIntent("ducked", durationMs);
  }

  public restoreIntent(durationMs: number = 400): void {
    const targetIntent = this.previousVolumeIntent || "normal";
    this.setVolumeIntent(targetIntent, durationMs);
  }

  public mute(): void {
    this.state.isMuted = true;
    this.updateEffectiveVolumeState();
    this.applyVolumeRamp(0, 200);
    this.setState({ isMuted: true });
  }

  public unmute(): void {
    this.state.isMuted = false;
    this.updateEffectiveVolumeState();
    this.applyVolumeRamp(this.state.effectiveVolume, 200);
    this.setState({ isMuted: false });
  }

  public toggleMute(): void {
    if (this.state.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  // --- Cleanup / Unmount Lifecycle ---

  public destroy(): void {
    if (this.volumeRampTimer) {
      clearInterval(this.volumeRampTimer);
      this.volumeRampTimer = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeEventListener("play", this.handleAudioPlay);
      this.audioElement.removeEventListener("pause", this.handleAudioPause);
      this.audioElement.removeEventListener("ended", this.handleAudioEnded);
      this.audioElement.removeEventListener("error", this.handleAudioError);
      this.audioElement.removeEventListener("waiting", this.handleAudioWaiting);
      this.audioElement.removeEventListener("canplaythrough", this.handleAudioCanPlay);

      this.audioElement.removeAttribute("src");
      this.audioElement.load();
      this.audioElement = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== "closed") {
          this.audioCtx.close().catch(() => {});
        }
      } catch {}
      this.audioCtx = null;
    }

    this.listeners.clear();
    this.state = {
      transportState: "idle",
      volumeIntent: "normal",
      masterVolume: 0.8,
      effectiveVolume: 0.8,
      isMuted: false,
      currentTrack: null,
      errorMessage: null,
    };
  }
}
