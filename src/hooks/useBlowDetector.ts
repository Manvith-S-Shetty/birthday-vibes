"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type BlowPermissionState =
  | "idle"
  | "prompting"
  | "listening"
  | "denied"
  | "unsupported"
  | "error"
  | "success";

/**
 * Tunable parameters for Blow Detection.
 * Easy to calibrate for different room environments and mic sensitivities.
 */
export const BLOW_DETECTOR_CONFIG = {
  /** Time in ms spent calibrating ambient noise background level */
  CALIBRATION_DURATION_MS: 500,

  /** FFT size for Web Audio AnalyserNode (512 -> 256 time domain / freq bins) */
  SAMPLE_FFT_SIZE: 512,

  /** Required sustained duration (in ms) of blow signal before triggering */
  MIN_BLOW_DURATION_MS: 220,

  /** Debounce cooldown (in ms) after a valid blow trigger */
  BLOW_COOLDOWN_MS: 800,

  /** Multiplier above ambient baseline RMS required to consider as blow candidate */
  BLOW_RMS_MULTIPLIER: 3.0,

  /** Absolute minimum RMS threshold to prevent triggering in total silence */
  MIN_RMS_THRESHOLD: 0.035,

  /** Upper limit ratio of mid/high speech frequencies to low wind noise (turbulence puff check) */
  SPEECH_ENERGY_RATIO_MAX: 0.7,
};

/**
 * Diagnostic data exposed only in development builds (NODE_ENV !== "production").
 * Returns null in production — never populated, never uploaded, never stored.
 *
 * Values updated at ~10 fps during active listening to limit render pressure.
 */
export interface BlowDiagnostics {
  rms: number;               // Raw RMS amplitude of the current frame
  baseline: number;          // Calibrated ambient RMS from the 500ms calibration window
  threshold: number;         // Actual required threshold = max(MIN_RMS_THRESHOLD, baseline × MULTIPLIER)
  rmsGatePass: boolean;      // Gate A: currentRMS >= threshold
  lowEnergy: number;         // Sum of FFT bins 0..7 (~0–656 Hz at 48kHz / 512 FFT)
  midHighEnergy: number;     // Sum of FFT bins 16..47 (~1.4–4.2 kHz at 48kHz / 512 FFT)
  speechEnergyRatio: number; // midHighEnergy / (lowEnergy + 1)
  spectralGatePass: boolean; // Gate B: speechEnergyRatio <= SPEECH_ENERGY_RATIO_MAX
  isBlowCandidate: boolean;  // Gate A && Gate B — input to the sustained-duration accumulator
  sustainedMs: number;       // How long the current blow candidate has been sustained
  durationGatePass: boolean; // Gate C: sustainedMs >= MIN_BLOW_DURATION_MS
  cooldownReady: boolean;    // Gate D: timeSinceLastTrigger > BLOW_COOLDOWN_MS
  firing: boolean;           // true on the exact frame onBlowDetected() fires
}

interface UseBlowDetectorOptions {
  onBlowDetected?: () => void;
  autoStart?: boolean;
}

export interface BlowDetectorResult {
  permissionState: BlowPermissionState;
  isListening: boolean;
  audioLevel: number; // Normalized 0.0 to 1.0 for UI visualizer
  isCalibrating: boolean;
  error: string | null;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  diagnostics: BlowDiagnostics | null; // null in production; populated at ~10fps in dev
}

/** true in development/test builds; false (and dead-code-eliminated) in production.
 *  Also true on Vercel Preview deployments (NEXT_PUBLIC_VERCEL_ENV === "preview"),
 *  so diagnostics populate for real-device HTTPS testing. */
const IS_DEV =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

export function useBlowDetector({
  onBlowDetected,
}: UseBlowDetectorOptions = {}): BlowDetectorResult {
  const [permissionState, setPermissionState] = useState<BlowPermissionState>("idle");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Audio refs for cleanup and analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // DEV-ONLY: Diagnostic state — useState initialises to null; never populated in production
  const [diagnostics, setDiagnostics] = useState<BlowDiagnostics | null>(null);
  const lastDiagUpdateRef = useRef<number>(0); // throttle: last time setDiagnostics was called

  // Calibration and detection state refs
  const baselineRMSRef = useRef<number>(0.01);
  const calibrationSumRef = useRef<number>(0);
  const calibrationCountRef = useRef<number>(0);
  const calibrationStartTimeRef = useRef<number>(0);

  const blowStartTimeRef = useRef<number | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);
  const onBlowDetectedRef = useRef(onBlowDetected);

  useEffect(() => {
    onBlowDetectedRef.current = onBlowDetected;
  }, [onBlowDetected]);

  // Teardown function to ensure total release of Web Audio & mic resources
  const stopListening = useCallback(() => {
    // 1. Cancel requestAnimationFrame
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // 2. Stop all MediaStream tracks (releases microphone hardware)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // 3. Disconnect Web Audio nodes
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (analyserNodeRef.current) {
      analyserNodeRef.current.disconnect();
      analyserNodeRef.current = null;
    }

    // 4. Close AudioContext
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    if (IS_DEV) setDiagnostics(null);
    setIsListening(false);
    setIsCalibrating(false);
    setAudioLevel(0);
    blowStartTimeRef.current = null;
  }, []);

  // Primary start function (Must be invoked on user gesture)
  const startListening = useCallback(async (): Promise<boolean> => {
    setError(null);

    // Check browser compatibility and secure context
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setPermissionState("unsupported");
      setError("Microphone access is not supported by your browser or requires HTTPS.");
      return false;
    }

    setPermissionState("prompting");

    try {
      // 1. Request microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Keep noise suppression off to preserve natural air turbulence puff sound
          autoGainControl: false,
        },
      });

      mediaStreamRef.current = stream;

      // 2. Initialize AudioContext (handle iOS webkit fallback)
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        setPermissionState("unsupported");
        setError("AudioContext is not supported on this browser.");
        return false;
      }

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      // Resume context if suspended (iOS requirement)
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // 3. Setup Web Audio source & AnalyserNode
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = BLOW_DETECTOR_CONFIG.SAMPLE_FFT_SIZE;
      analyser.smoothingTimeConstant = 0.2; // Fast response for sudden puff

      // Connect source to analyser ONLY (do NOT connect to audioCtx.destination!)
      source.connect(analyser);

      sourceNodeRef.current = source;
      analyserNodeRef.current = analyser;

      // 4. Update permission & listening state
      setPermissionState("listening");
      setIsListening(true);
      setIsCalibrating(true);

      // Reset calibration counters
      calibrationSumRef.current = 0;
      calibrationCountRef.current = 0;
      calibrationStartTimeRef.current = performance.now();
      baselineRMSRef.current = 0.01;

      // Pre-allocate analysis typed arrays for frame loop memory efficiency
      const timeDomainData = new Uint8Array(analyser.fftSize);
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);

      // 5. Main analysis animation frame loop
      const analyzeFrame = () => {
        if (!analyserNodeRef.current) return;

        const now = performance.now();

        // Get time-domain data (samples range 0..255, centered at 128)
        analyserNodeRef.current.getByteTimeDomainData(timeDomainData);
        analyserNodeRef.current.getByteFrequencyData(frequencyData);

        // Calculate Root Mean Square (RMS) amplitude
        let sumSq = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const val = (timeDomainData[i] - 128) / 128; // Normalize to -1.0 .. 1.0
          sumSq += val * val;
        }
        const currentRMS = Math.sqrt(sumSq / timeDomainData.length);

        // Update UI audio level indicator (smoothed 0..1 range)
        const normalizedLevel = Math.min(1.0, currentRMS * 4);
        setAudioLevel((prev) => prev * 0.4 + normalizedLevel * 0.6);

        // A. Calibration Phase (First ~500ms)
        if (now - calibrationStartTimeRef.current < BLOW_DETECTOR_CONFIG.CALIBRATION_DURATION_MS) {
          calibrationSumRef.current += currentRMS;
          calibrationCountRef.current += 1;
          animFrameRef.current = requestAnimationFrame(analyzeFrame);
          return;
        }

        // Complete calibration if newly finished
        if (calibrationCountRef.current > 0) {
          const computedBaseline = calibrationSumRef.current / calibrationCountRef.current;
          // Set baseline with floor to avoid ultra-sensitive zero-baseline in silent rooms
          baselineRMSRef.current = Math.max(0.008, computedBaseline);
          calibrationCountRef.current = 0; // Lock calibration
          setIsCalibrating(false);
        }

        // B. Blow Detection Analysis Phase
        const baseline = baselineRMSRef.current;
        const requiredRMSThreshold = Math.max(
          BLOW_DETECTOR_CONFIG.MIN_RMS_THRESHOLD,
          baseline * BLOW_DETECTOR_CONFIG.BLOW_RMS_MULTIPLIER
        );

        // Spectral Turbulance Check (Low frequency wind noise vs High frequency vocalization)
        // Frequency bins: Low (0..8) vs Mid/High (16..48)
        let lowEnergy = 0;
        let midHighEnergy = 0;
        const lowBinCount = Math.min(8, frequencyData.length);
        const midHighBinCount = Math.min(48, frequencyData.length);

        for (let i = 0; i < lowBinCount; i++) {
          lowEnergy += frequencyData[i];
        }
        for (let i = 16; i < midHighBinCount; i++) {
          midHighEnergy += frequencyData[i];
        }

        const speechEnergyRatio = midHighEnergy / (lowEnergy + 1);

        const isBlowCandidate =
          currentRMS >= requiredRMSThreshold &&
          speechEnergyRatio <= BLOW_DETECTOR_CONFIG.SPEECH_ENERGY_RATIO_MAX;

        const timeSinceLastTrigger = now - lastTriggerTimeRef.current;

        // Capture sustained duration BEFORE the detection block modifies blowStartTimeRef
        const sustainedMsNow =
          blowStartTimeRef.current !== null ? now - blowStartTimeRef.current : 0;
        let isAboutToFire = false;

        if (isBlowCandidate && timeSinceLastTrigger > BLOW_DETECTOR_CONFIG.BLOW_COOLDOWN_MS) {
          if (blowStartTimeRef.current === null) {
            blowStartTimeRef.current = now;
          } else {
            const blowDuration = now - blowStartTimeRef.current;
            if (blowDuration >= BLOW_DETECTOR_CONFIG.MIN_BLOW_DURATION_MS) {
              // Valid sustained blow detected!
              isAboutToFire = true;
              lastTriggerTimeRef.current = now;
              blowStartTimeRef.current = null;
              if (onBlowDetectedRef.current) {
                onBlowDetectedRef.current();
              }
            }
          }
        } else {
          blowStartTimeRef.current = null;
        }

        // DEV-ONLY: Throttled diagnostic update (~10fps — readable on mobile, low render cost)
        if (IS_DEV) {
          const diagNow = performance.now();
          if (diagNow - lastDiagUpdateRef.current >= 100) {
            lastDiagUpdateRef.current = diagNow;
            setDiagnostics({
              rms: currentRMS,
              baseline,
              threshold: requiredRMSThreshold,
              rmsGatePass: currentRMS >= requiredRMSThreshold,
              lowEnergy,
              midHighEnergy,
              speechEnergyRatio,
              spectralGatePass:
                speechEnergyRatio <= BLOW_DETECTOR_CONFIG.SPEECH_ENERGY_RATIO_MAX,
              isBlowCandidate,
              sustainedMs: sustainedMsNow,
              durationGatePass:
                sustainedMsNow >= BLOW_DETECTOR_CONFIG.MIN_BLOW_DURATION_MS,
              cooldownReady:
                timeSinceLastTrigger > BLOW_DETECTOR_CONFIG.BLOW_COOLDOWN_MS,
              firing: isAboutToFire,
            });
          }
        }

        animFrameRef.current = requestAnimationFrame(analyzeFrame);
      };

      animFrameRef.current = requestAnimationFrame(analyzeFrame);
      return true;
    } catch (err: unknown) {
      stopListening();
      const errMessage = err instanceof Error ? err.message : String(err);

      if (
        errMessage.includes("Permission denied") ||
        errMessage.includes("NotAllowedError") ||
        errMessage.includes("PermissionDismissedError")
      ) {
        setPermissionState("denied");
        setError("Microphone permission was denied.");
      } else {
        setPermissionState("error");
        setError(`Microphone error: ${errMessage}`);
      }
      return false;
    }
  }, [stopListening]);

  // Teardown cleanup on component unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    permissionState,
    isListening,
    audioLevel,
    isCalibrating,
    error,
    startListening,
    stopListening,
    diagnostics,
  };
}
