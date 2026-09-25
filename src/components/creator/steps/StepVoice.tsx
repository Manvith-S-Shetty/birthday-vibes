"use client";

import React, { useState, useEffect, useRef } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowRight,
  ArrowLeft,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SupportedAudioCodec {
  mimeType: string;
  extension: string;
}

const PREFERRED_CODECS: SupportedAudioCodec[] = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "mp4" },
  { mimeType: "audio/mp4", extension: "mp4" },
  { mimeType: "audio/aac", extension: "aac" },
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
];

export function getSupportedAudioCodec(): SupportedAudioCodec | null {
  if (typeof window === "undefined" || !window.MediaRecorder) return null;
  for (const codec of PREFERRED_CODECS) {
    if (MediaRecorder.isTypeSupported(codec.mimeType)) {
      return codec;
    }
  }
  return null;
}

interface StepVoiceProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
  skipCountdownForTesting?: boolean;
}

type RecordState = "idle" | "requesting" | "countdown" | "recording" | "recorded" | "error";

export function StepVoice({ draft, onUpdate, onNext, onPrev, skipCountdownForTesting }: StepVoiceProps) {
  const [status, setStatus] = useState<RecordState>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [amplitude, setAmplitude] = useState<number>(0);
  const [selectedCodec, setSelectedCodec] = useState<SupportedAudioCodec | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>(
    draft.voiceMessage?.transcript || ""
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [isRefreshStateExpired, setIsRefreshStateExpired] = useState<boolean>(false);

  // References for Web API objects
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Initial check for unsupported browser / cached session recovery
  useEffect(() => {
    const codec = getSupportedAudioCodec();
    setSelectedCodec(codec);

    // Pause any playing preview if draft changed
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setIsPlayingPreview(false);
      setPreviewCurrentTime(0);
    }

    // Check if in-memory Blob exists for this draft ID
    const cached = VoiceRecordingCache.get(draft.id);
    if (cached) {
      setPreviewUrl(cached.objectUrl);
      setStatus("recorded");
      if (draft.voiceMessage?.durationMs) {
        setDurationSeconds(Math.round(draft.voiceMessage.durationMs / 1000));
      }
      setIsRefreshStateExpired(false);
    } else if (draft.voiceMessage && draft.voiceMessage.status === "recorded") {
      // Refresh occurred: draft metadata exists but Blob expired from heap
      setPreviewUrl(null);
      setStatus("idle");
      setIsRefreshStateExpired(true);
      setDurationSeconds(draft.voiceMessage.durationMs ? Math.round(draft.voiceMessage.durationMs / 1000) : 0);
    } else {
      setPreviewUrl(null);
      setStatus("idle");
      setIsRefreshStateExpired(false);
      setDurationSeconds(0);
    }
    setTranscript(draft.voiceMessage?.transcript || "");
  }, [draft.id, draft.voiceMessage]);

  // 2. Full cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStreamAndTimers();
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const cleanupStreamAndTimers = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  // 3. Initiate Microphone Access & Countdown
  const handleStartRecordingClick = async () => {
    setErrorMessage(null);
    setPermissionDenied(false);
    setIsRefreshStateExpired(false);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Audio recording is not supported in this browser environment.");
      setStatus("error");
      return;
    }

    const codec = selectedCodec || getSupportedAudioCodec();
    if (!codec) {
      setErrorMessage("No supported audio recording codecs were found in your browser.");
      setStatus("error");
      return;
    }

    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const isTestMode =
        skipCountdownForTesting ||
        (typeof window !== "undefined" && Boolean((window as any).__SKIP_VOICE_COUNTDOWN__));

      if (isTestMode) {
        startActualRecording(stream, codec);
        return;
      }

      // Start 3-2-1 Countdown
      setStatus("countdown");
      setCountdown(3);
      setCountdown(3);

      let currentCount = 3;
      countdownIntervalRef.current = setInterval(() => {
        currentCount--;
        if (currentCount > 0) {
          setCountdown(currentCount);
        } else {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          setCountdown(null);
          startActualRecording(stream, codec);
        }
      }, 1000);
    } catch (err: any) {
      cleanupStreamAndTimers();
      const errName = err?.name || "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setPermissionDenied(true);
        setErrorMessage("Microphone access was denied. Please allow microphone permissions to record.");
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setErrorMessage("No microphone device was detected on your system.");
      } else {
        setErrorMessage("Failed to access microphone. Please check your browser settings.");
      }
      setStatus("error");
    }
  };

  // 4. Start MediaRecorder & Amplitude Visualization
  const startActualRecording = (stream: MediaStream, codec: SupportedAudioCodec) => {
    try {
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: codec.mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: codec.mimeType });
        const objectUrl = VoiceRecordingCache.set(draft.id, audioBlob);
        setPreviewUrl(objectUrl);
        setStatus("recorded");

        // Sync metadata with draft
        onUpdate({
          voiceMessage: {
            status: "recorded",
            durationMs: durationSeconds * 1000,
            mimeType: codec.mimeType,
            transcript: transcript.trim() || undefined,
            updatedAt: new Date().toISOString(),
          },
        });
      };

      recorder.start(100); // 100ms timeslice
      setStatus("recording");
      setDurationSeconds(0);

      // Duration Timer with 180s Limit
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => {
          if (prev >= 179) {
            handleStopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);

      // Web Audio Analyser for Real-time Amplitude Visualizer
      setupAmplitudeVisualizer(stream);
    } catch (err: any) {
      cleanupStreamAndTimers();
      setErrorMessage("Failed to initialize audio recorder with codec: " + codec.mimeType);
      setStatus("error");
    }
  };

  // Web Audio RMS Amplitude Detection
  const setupAmplitudeVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAmplitude = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128);
        setAmplitude(normalized);
        animFrameRef.current = requestAnimationFrame(updateAmplitude);
      };

      updateAmplitude();
    } catch (e) {
      // Amplitude visualization error fallback
    }
  };

  // 5. Stop Recording Action
  const handleStopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
    }
  };

  // 6. Preview Transport Actions
  const togglePlayPreview = () => {
    if (!previewUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(previewUrl);
      audio.onplay = () => setIsPlayingPreview(true);
      audio.onpause = () => setIsPlayingPreview(false);
      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewCurrentTime(0);
      };
      audio.ontimeupdate = () => {
        setPreviewCurrentTime(audio.currentTime);
      };
      previewAudioRef.current = audio;
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play().catch(() => {
        setIsPlayingPreview(false);
      });
    }
  };

  // 7. Re-record Action
  const handleReRecord = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    VoiceRecordingCache.clear(draft.id);
    setPreviewUrl(null);
    setStatus("idle");
    setDurationSeconds(0);
    setPreviewCurrentTime(0);
    setIsPlayingPreview(false);
    onUpdate({ voiceMessage: undefined });
  };

  // 8. Delete Action
  const handleDeleteVoice = () => {
    handleReRecord();
  };

  // 9. Transcript Change Handler
  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setTranscript(text);
    if (draft.voiceMessage) {
      onUpdate({
        voiceMessage: {
          ...draft.voiceMessage,
          transcript: text.trim() || undefined,
        },
      });
    }
  };

  // Format Helper: Seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 06 — Voice Message</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Add a Personal Voice Message <span className="text-xs font-sans font-normal opacity-60 uppercase tracking-widest">(Optional)</span>
        </Heading>
        <Body>
          Record a spoken birthday note. Hearing your real voice creates an intimate, unforgettable gift moment.
        </Body>
      </div>

      {/* Screen Reader Live Status Announcement */}
      <div className="sr-only" aria-live="polite">
        {status === "countdown" && `Recording starting in ${countdown}`}
        {status === "recording" && `Recording in progress, ${durationSeconds} seconds elapsed`}
        {status === "recorded" && `Voice message recorded, duration ${formatTime(durationSeconds)}`}
        {status === "error" && `Error: ${errorMessage}`}
      </div>

      {/* Main Recording Interactive Stage Card */}
      <div className="border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
        {/* State: IDLE */}
        {status === "idle" && (
          <div className="text-center py-6 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-accent-primary)] shadow-inner">
              <Mic className="w-9 h-9" />
            </div>

            {isRefreshStateExpired && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-sans flex items-center gap-2 justify-center max-w-md mx-auto">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>This recording is no longer available in this session. Please record again.</span>
              </div>
            )}

            <div className="space-y-2 max-w-md mx-auto">
              <p className="font-serif text-lg text-[var(--theme-text-primary)]">
                Ready to record your message?
              </p>
              <Caption>
                Up to 3 minutes of high-clarity stereo audio (128 kbps). Tap below when you are ready to speak.
              </Caption>
            </div>

            <Button
              variant="gold-glow"
              size="lg"
              onClick={handleStartRecordingClick}
              className="min-h-[48px] px-8"
            >
              <Mic className="w-5 h-5 mr-2" />
              <span>Record Voice Note</span>
            </Button>
          </div>
        )}

        {/* State: REQUESTING PERMISSION */}
        {status === "requesting" && (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <Mic className="w-8 h-8" />
            </div>
            <p className="font-serif text-lg text-[var(--theme-text-primary)]">
              Requesting Microphone Access...
            </p>
            <Caption>Please allow microphone permissions in your browser dialog.</Caption>
          </div>
        )}

        {/* State: COUNTDOWN */}
        {status === "countdown" && (
          <div className="text-center py-12 space-y-4">
            <div className="text-6xl font-serif font-bold text-[var(--theme-accent-primary)] animate-ping">
              {countdown}
            </div>
            <p className="text-xs uppercase tracking-widest font-sans text-[var(--theme-text-secondary)]">
              Get ready to speak...
            </p>
          </div>
        )}

        {/* State: RECORDING IN PROGRESS */}
        {status === "recording" && (
          <div className="text-center py-6 space-y-6">
            {/* Live Audio Visualizer Amplitude Bar Meter */}
            <div className="flex items-center justify-center gap-1.5 h-16 py-2">
              {[0.4, 0.7, 1.0, 0.6, 0.8, 0.5, 0.9, 0.7, 0.4].map((multiplier, i) => (
                <div
                  key={i}
                  className="w-2 rounded-full bg-rose-500 transition-all duration-75"
                  style={{
                    height: `${Math.max(12, Math.min(56, amplitude * 56 * multiplier))}px`,
                  }}
                />
              ))}
            </div>

            {/* Recording Timer & Red Pulse Dot */}
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
              <span className="font-mono text-2xl font-semibold text-[var(--theme-text-primary)]">
                {formatTime(durationSeconds)} / 3:00
              </span>
            </div>

            {/* Stop Button */}
            <Button
              variant="champagne-outline"
              size="lg"
              onClick={handleStopRecording}
              className="min-h-[48px] border-rose-500/50 text-rose-300 hover:bg-rose-500/20 px-8"
            >
              <Square className="w-5 h-5 mr-2 fill-current" />
              <span>Done Recording</span>
            </Button>
          </div>
        )}

        {/* State: RECORDED & PREVIEW PLAYER */}
        {status === "recorded" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border-subtle)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-serif text-sm font-medium text-[var(--theme-text-primary)]">
                  Voice Note Recorded
                </span>
              </div>
              <span className="font-mono text-xs text-[var(--theme-text-secondary)]">
                {formatTime(durationSeconds)} duration
              </span>
            </div>

            {/* Local Preview Audio Controls */}
            <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] flex items-center gap-4">
              <button
                type="button"
                onClick={togglePlayPreview}
                className="w-12 h-12 rounded-full bg-[var(--theme-accent-primary)] text-[var(--token-ink)] flex items-center justify-center hover:scale-105 transition-transform shrink-0 min-h-[44px]"
                aria-label={isPlayingPreview ? "Pause preview" : "Play preview"}
              >
                {isPlayingPreview ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--theme-text-secondary)]">
                  <span>{formatTime(previewCurrentTime)}</span>
                  <span>{formatTime(durationSeconds)}</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--theme-accent-primary)] h-full transition-all duration-100"
                    style={{
                      width: `${durationSeconds > 0 ? (previewCurrentTime / durationSeconds) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons: Re-record & Delete */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReRecord}
                className="text-xs min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span>Re-record</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteVoice}
                className="text-xs text-rose-400 hover:bg-rose-500/10 min-h-[44px]"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>Delete Recording</span>
              </Button>
            </div>

            {/* Optional Manual Transcript Field */}
            <div className="pt-4 border-t border-[var(--theme-border-subtle)] space-y-2">
              <label
                htmlFor="voice-transcript-input"
                className="flex items-center gap-2 text-xs font-sans text-[var(--theme-text-secondary)] uppercase tracking-wider cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[var(--theme-accent-primary)]" />
                <span>Written Transcript (Optional)</span>
              </label>
              <textarea
                id="voice-transcript-input"
                value={transcript}
                onChange={handleTranscriptChange}
                placeholder="Add a written transcript of what you said for accessibility..."
                className="w-full h-24 p-3 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-primary)] text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-secondary)]/50 focus:outline-none focus:border-[var(--theme-accent-primary)] transition-colors resize-none"
              />
              <Caption>
                A transcript ensures your birthday wish can be enjoyed silently or by hearing-impaired recipients.
              </Caption>
            </div>
          </div>
        )}

        {/* State: ERROR STATE */}
        {status === "error" && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <strong className="font-semibold text-rose-200">Recording Failed</strong>
            </div>
            <p className="leading-relaxed">{errorMessage}</p>

            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="champagne-outline"
                size="sm"
                onClick={handleStartRecordingClick}
                className="text-xs min-h-[44px]"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Step Navigation Bar */}
      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev} className="min-h-[44px]">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext} className="min-h-[48px]">
          <span>Security & Lock</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
