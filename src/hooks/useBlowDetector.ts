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
 * Tunable parameters for the temporal amplitude-envelope blow detector (V2-A Rev 2).
 *
 * This revision removes the hard spectral gate (Gate B) that was incorrectly rejecting
 * valid blows on Android Chrome. Real Android microphone output for both blowing and
 * speech produces a spectral ratio of 2.24–2.46, making ratio-based discrimination
 * unreliable. The new detector uses temporal envelope analysis instead:
 *
 *   - Adaptive rolling baseline (slow EMA)
 *   - Minimum absolute RMS threshold above silence
 *   - Onset burst filter: minimum 3 consecutive frames above threshold before accumulating
 *   - Sustained duration: ≥ MIN_BLOW_DURATION_MS of contiguous above-threshold signal
 *   - Anti-spike guard: single peaks shorter than ONSET_GUARD_MS are rejected
 *   - Cooldown after trigger
 *   - Spectral ratio retained as diagnostic readout only (not a gate)
 */
export const BLOW_DETECTOR_CONFIG = {
  /** FFT size for Web Audio AnalyserNode (512 → 256 freq bins, ~10.67ms per frame @ 48kHz) */
  SAMPLE_FFT_SIZE: 512,

  /** Slow-adapting EMA coefficient for rolling baseline (α). ~10s time-constant.
   *  baseline_n = α × rms_n + (1−α) × baseline_{n−1} */
  BASELINE_EMA_ALPHA: 0.005,

  /** Initial baseline seed value. Prevents zero-baseline in totally silent rooms. */
  BASELINE_SEED: 0.012,

  /** Multiplier above adaptive baseline required to classify a frame as above-threshold. */
  BLOW_RMS_MULTIPLIER: 2.8,

  /** Absolute floor threshold. Prevents triggering from near-silence even with a
   *  very sensitive mic or in a completely silent room. */
  MIN_ABS_RMS_THRESHOLD: 0.04,

  /**
   * Number of consecutive frames that must be above threshold before the
   * sustained-duration accumulator starts. Rejects very short spikes and plosives.
   * At ~60fps, 3 frames ≈ 50ms.
   */
  ONSET_GUARD_FRAMES: 3,

  /** Required contiguous duration (ms) of above-threshold signal to fire a blow event.
   *  Should be >> typical speech burst but << a natural blow.
   *  Real blows last 500ms–3s; speech bursts peak at 80–150ms. */
  MIN_BLOW_DURATION_MS: 300,

  /** Debounce cooldown (ms) after a valid blow trigger fires. */
  BLOW_COOLDOWN_MS: 900,

  /** Smoothing constant for the UI audio level display (0..1).
   *  Higher = snappier response, lower = smoother bar. */
  AUDIO_LEVEL_SMOOTHING: 0.5,

  /** Time in ms spent in the initial static calibration phase at startup.
   *  Used to seed the adaptive baseline from real room ambient noise. */
  CALIBRATION_DURATION_MS: 600,
} as const;

/**
 * Diagnostic data exposed only in development and Vercel Preview builds.
 * Returns null in production — never populated, never uploaded, never stored.
 *
 * Updated at ~10 fps during active listening to limit render pressure.
 *
 * NOTE: spectralGatePass is diagnostic ONLY — it does NOT gate the blow
 * detection in this revision. It is retained so real-device testers can
 * observe how spectral ratio behaves during actual blowing vs speech.
 */
export interface BlowDiagnostics {
  // --- Amplitude gates ---
  rms: number;              // Raw RMS of the current frame
  baseline: number;         // Current adaptive baseline (slow EMA)
  threshold: number;        // Effective per-frame threshold = max(MIN_ABS, baseline × MULTIPLIER)
  rmsGatePass: boolean;     // Gate A: currentRMS >= threshold

  // --- Spectral (diagnostic only — NOT a gate) ---
  lowEnergy: number;        // Sum of FFT bins 0..7 (~0–656 Hz)
  midHighEnergy: number;    // Sum of FFT bins 16..47 (~1.4–4.2 kHz)
  speechEnergyRatio: number;// midHighEnergy / (lowEnergy + 1)
  spectralGatePass: boolean;// Diagnostic: ratio <= 0.7 (classic threshold — NOT gating)

  // --- Temporal gates ---
  onsetFrames: number;      // Consecutive above-threshold frames (onset guard)
  onsetGuardPass: boolean;  // Gate B: onsetFrames >= ONSET_GUARD_FRAMES
  sustainedMs: number;      // Contiguous above-threshold duration so far
  durationGatePass: boolean;// Gate C: sustainedMs >= MIN_BLOW_DURATION_MS
  cooldownReady: boolean;   // Gate D: timeSinceLastTrigger > BLOW_COOLDOWN_MS

  // --- Summary ---
  isBlowCandidate: boolean; // Gate A && Gate B (amplitude + onset guard)
  firing: boolean;          // true on the exact frame onBlowDetected() fires
}

interface UseBlowDetectorOptions {
  onBlowDetected?: () => void;
}

export interface BlowDetectorResult {
  permissionState: BlowPermissionState;
  isListening: boolean;
  audioLevel: number;   // Normalized 0.0–1.0 for UI level bar
  isCalibrating: boolean;
  error: string | null;
  startListening: () => Promise<boolean>;
  stopListening: () => void;
  diagnostics: BlowDiagnostics | null; // null in production
}

/** true in development and Vercel Preview deployments; dead-code-eliminated in production. */
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

  // Web Audio resource refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // DEV-ONLY diagnostics state
  const [diagnostics, setDiagnostics] = useState<BlowDiagnostics | null>(null);
  const lastDiagUpdateRef = useRef<number>(0);

  // --- Temporal envelope detector state refs ---

  /** Slow-adapting RMS baseline. Seeded at startup from the calibration window,
   *  then updated each frame via EMA so it tracks gradual environmental changes
   *  (e.g., the room gets louder over time) without reacting to a blow itself. */
  const adaptiveBaselineRef = useRef<number>(BLOW_DETECTOR_CONFIG.BASELINE_SEED);

  /** Count of consecutive above-threshold frames (onset guard accumulator). */
  const onsetFrameCountRef = useRef<number>(0);

  /** Timestamp (performance.now()) when the sustained accumulation phase began.
   *  null = no active blow candidate. */
  const blowStartTimeRef = useRef<number | null>(null);

  /** Timestamp of the last fired blow event (for cooldown). */
  const lastTriggerTimeRef = useRef<number>(0);

  /** Static calibration state */
  const calibrationSumRef = useRef<number>(0);
  const calibrationCountRef = useRef<number>(0);
  const calibrationStartTimeRef = useRef<number>(0);
  const calibrationCompleteRef = useRef<boolean>(false);

  /** Stable ref to the callback (avoids stale closure in rAF loop). */
  const onBlowDetectedRef = useRef(onBlowDetected);
  useEffect(() => {
    onBlowDetectedRef.current = onBlowDetected;
  }, [onBlowDetected]);

  // ----------------------------------------------------------------
  // Teardown — fully releases mic and Web Audio resources
  // ----------------------------------------------------------------
  const stopListening = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (analyserNodeRef.current) {
      analyserNodeRef.current.disconnect();
      analyserNodeRef.current = null;
    }
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

    // Reset detection state
    onsetFrameCountRef.current = 0;
    blowStartTimeRef.current = null;
    calibrationCompleteRef.current = false;
  }, []);

  // ----------------------------------------------------------------
  // startListening — must be called inside a user gesture
  // ----------------------------------------------------------------
  const startListening = useCallback(async (): Promise<boolean> => {
    setError(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setPermissionState("unsupported");
      setError("Microphone access requires HTTPS and a compatible browser.");
      return false;
    }

    setPermissionState("prompting");

    try {
      // 1. Request microphone stream.
      //    noiseSuppression: false → preserve natural airflow turbulence spectrum.
      //    autoGainControl: false  → prevent AGC from amplifying quiet room noise
      //                             and masking the relative amplitude of a blow.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Create AudioContext (iOS webkit fallback)
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

      // Resume for iOS Safari (context starts suspended in response to user gesture)
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // 3. Wire source → analyser (do NOT connect to destination — no playback)
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = BLOW_DETECTOR_CONFIG.SAMPLE_FFT_SIZE;
      // Lower smoothing = faster response to sudden amplitude changes
      analyser.smoothingTimeConstant = 0.15;

      source.connect(analyser);
      sourceNodeRef.current = source;
      analyserNodeRef.current = analyser;

      // 4. Update UI state
      setPermissionState("listening");
      setIsListening(true);
      setIsCalibrating(true);

      // 5. Seed detector state
      adaptiveBaselineRef.current = BLOW_DETECTOR_CONFIG.BASELINE_SEED;
      onsetFrameCountRef.current = 0;
      blowStartTimeRef.current = null;
      lastTriggerTimeRef.current = 0;
      calibrationSumRef.current = 0;
      calibrationCountRef.current = 0;
      calibrationStartTimeRef.current = performance.now();
      calibrationCompleteRef.current = false;

      // Pre-allocate typed arrays (avoids GC pressure in the rAF hot path)
      const timeDomainData = new Uint8Array(analyser.fftSize);
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);

      // ----------------------------------------------------------------
      // 6. Main analysis loop (runs via requestAnimationFrame)
      // ----------------------------------------------------------------
      const analyzeFrame = () => {
        if (!analyserNodeRef.current) return;

        const now = performance.now();

        analyserNodeRef.current.getByteTimeDomainData(timeDomainData);
        analyserNodeRef.current.getByteFrequencyData(frequencyData);

        // --- Compute RMS amplitude ---
        // Samples are Uint8 in 0..255, centred at 128.
        // Normalise to -1..+1 then compute sqrt(mean(x²)).
        let sumSq = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const v = (timeDomainData[i] - 128) / 128;
          sumSq += v * v;
        }
        const currentRMS = Math.sqrt(sumSq / timeDomainData.length);

        // --- Update UI audio level bar (smoothed 0..1) ---
        const normalizedLevel = Math.min(1.0, currentRMS * 5);
        setAudioLevel((prev) =>
          prev * (1 - BLOW_DETECTOR_CONFIG.AUDIO_LEVEL_SMOOTHING) +
          normalizedLevel * BLOW_DETECTOR_CONFIG.AUDIO_LEVEL_SMOOTHING
        );

        // ----------------------------------------------------------------
        // Phase A — Static calibration window (first ~600ms)
        // ----------------------------------------------------------------
        // Accumulate ambient RMS from the room at rest.
        // The final average seeds the adaptive baseline.
        if (!calibrationCompleteRef.current) {
          const elapsed = now - calibrationStartTimeRef.current;
          if (elapsed < BLOW_DETECTOR_CONFIG.CALIBRATION_DURATION_MS) {
            calibrationSumRef.current += currentRMS;
            calibrationCountRef.current += 1;
            animFrameRef.current = requestAnimationFrame(analyzeFrame);
            return;
          }
          // Calibration window complete — seed adaptive baseline
          const measured = calibrationCountRef.current > 0
            ? calibrationSumRef.current / calibrationCountRef.current
            : BLOW_DETECTOR_CONFIG.BASELINE_SEED;
          // Use a higher floor here so a silent room doesn't become over-sensitive
          adaptiveBaselineRef.current = Math.max(
            BLOW_DETECTOR_CONFIG.BASELINE_SEED,
            measured
          );
          calibrationCompleteRef.current = true;
          setIsCalibrating(false);
        }

        // ----------------------------------------------------------------
        // Phase B — Adaptive baseline update (slow EMA)
        // ----------------------------------------------------------------
        // Update only when below the detection threshold to avoid the
        // baseline "chasing" the blow signal upward.
        const prevBaseline = adaptiveBaselineRef.current;
        const detectionThreshold = Math.max(
          BLOW_DETECTOR_CONFIG.MIN_ABS_RMS_THRESHOLD,
          prevBaseline * BLOW_DETECTOR_CONFIG.BLOW_RMS_MULTIPLIER
        );

        // Only update baseline from frames that are NOT a blow candidate.
        // This keeps the baseline stable during an active blow event.
        if (currentRMS < detectionThreshold) {
          adaptiveBaselineRef.current =
            BLOW_DETECTOR_CONFIG.BASELINE_EMA_ALPHA * currentRMS +
            (1 - BLOW_DETECTOR_CONFIG.BASELINE_EMA_ALPHA) * prevBaseline;
        }

        // ----------------------------------------------------------------
        // Phase C — Gate A: Per-frame amplitude gate
        // ----------------------------------------------------------------
        const baseline = adaptiveBaselineRef.current;
        const threshold = Math.max(
          BLOW_DETECTOR_CONFIG.MIN_ABS_RMS_THRESHOLD,
          baseline * BLOW_DETECTOR_CONFIG.BLOW_RMS_MULTIPLIER
        );
        const rmsGatePass = currentRMS >= threshold;

        // ----------------------------------------------------------------
        // Phase D — Gate B: Onset guard (consecutive frames above threshold)
        // ----------------------------------------------------------------
        // Purpose: reject microphone plosives, transient spikes, and very
        // short speech phonemes (< ~50ms). A real blow is continuous.
        //
        // onsetFrameCount increments each consecutive above-threshold frame
        // and resets immediately on ANY below-threshold frame.
        if (rmsGatePass) {
          onsetFrameCountRef.current = Math.min(
            onsetFrameCountRef.current + 1,
            // Cap to avoid integer overflow during a very long blow
            BLOW_DETECTOR_CONFIG.ONSET_GUARD_FRAMES + 10
          );
        } else {
          onsetFrameCountRef.current = 0;
        }

        const onsetGuardPass =
          onsetFrameCountRef.current >= BLOW_DETECTOR_CONFIG.ONSET_GUARD_FRAMES;
        const isBlowCandidate = rmsGatePass && onsetGuardPass;

        // ----------------------------------------------------------------
        // Phase E — Gate C: Sustained duration accumulator
        // ----------------------------------------------------------------
        // Accumulate contiguous time above threshold.
        // Any interruption (below-threshold frame) resets the timer.
        const timeSinceLastTrigger = now - lastTriggerTimeRef.current;
        const cooldownReady =
          timeSinceLastTrigger > BLOW_DETECTOR_CONFIG.BLOW_COOLDOWN_MS;

        const sustainedMsNow =
          blowStartTimeRef.current !== null ? now - blowStartTimeRef.current : 0;
        let isAboutToFire = false;

        if (isBlowCandidate && cooldownReady) {
          if (blowStartTimeRef.current === null) {
            // Start the sustained accumulator
            blowStartTimeRef.current = now;
          } else {
            const blowDuration = now - blowStartTimeRef.current;
            if (blowDuration >= BLOW_DETECTOR_CONFIG.MIN_BLOW_DURATION_MS) {
              // ✅ Valid sustained blow detected — FIRE
              isAboutToFire = true;
              lastTriggerTimeRef.current = now;
              blowStartTimeRef.current = null;
              onsetFrameCountRef.current = 0;
              if (onBlowDetectedRef.current) {
                onBlowDetectedRef.current();
              }
            }
          }
        } else if (!isBlowCandidate) {
          // Signal dropped below candidate threshold — reset accumulator
          blowStartTimeRef.current = null;
        }
        // Note: if isBlowCandidate && !cooldownReady, we don't reset the
        // accumulator — we simply don't fire yet. This prevents the user
        // from having to "restart" a blow during cooldown.

        // ----------------------------------------------------------------
        // Spectral info — diagnostic only (NOT gating)
        // ----------------------------------------------------------------
        let lowEnergy = 0;
        let midHighEnergy = 0;
        const lowBinCount = Math.min(8, frequencyData.length);
        const midHighStart = 16;
        const midHighEnd = Math.min(48, frequencyData.length);
        for (let i = 0; i < lowBinCount; i++) lowEnergy += frequencyData[i];
        for (let i = midHighStart; i < midHighEnd; i++) midHighEnergy += frequencyData[i];
        const speechEnergyRatio = midHighEnergy / (lowEnergy + 1);

        // ----------------------------------------------------------------
        // DEV-ONLY: Throttled diagnostic update (~10fps)
        // ----------------------------------------------------------------
        if (IS_DEV) {
          const diagNow = performance.now();
          if (diagNow - lastDiagUpdateRef.current >= 100) {
            lastDiagUpdateRef.current = diagNow;
            setDiagnostics({
              rms: currentRMS,
              baseline,
              threshold,
              rmsGatePass,
              lowEnergy,
              midHighEnergy,
              speechEnergyRatio,
              spectralGatePass: speechEnergyRatio <= 0.7, // classic value — diagnostic only
              onsetFrames: onsetFrameCountRef.current,
              onsetGuardPass,
              sustainedMs: sustainedMsNow,
              durationGatePass:
                sustainedMsNow >= BLOW_DETECTOR_CONFIG.MIN_BLOW_DURATION_MS,
              cooldownReady,
              isBlowCandidate,
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

  // Teardown on unmount
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
