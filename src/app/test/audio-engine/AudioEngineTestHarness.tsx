"use client";

import React, { useEffect } from "react";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { useAudioController } from "@/hooks/useAudioController";

if (typeof window !== "undefined") {
  (window as any).__AUDIO_ENGINE_CLASS__ = AudioEngine;
}

const SILENT_WAV_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

function TestChildComponent() {
  const controller = useAudioController();

  useEffect(() => {
    (window as any).__TEST_AUDIO_CONTROLLER__ = controller;
  }, [controller]);

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg space-y-2">
      <h2 className="text-xl font-bold">Audio Engine Controller Test Component</h2>
      
      <div id="test-transport-state" data-state={controller.transportState}>
        Transport State: <span>{controller.transportState}</span>
      </div>

      <div id="test-volume-intent" data-intent={controller.volumeIntent}>
        Volume Intent: <span>{controller.volumeIntent}</span>
      </div>

      <div id="test-master-volume" data-volume={controller.masterVolume}>
        Master Volume: <span>{controller.masterVolume}</span>
      </div>

      <div id="test-effective-volume" data-volume={controller.effectiveVolume}>
        Effective Volume: <span>{controller.effectiveVolume}</span>
      </div>

      <div id="test-is-muted" data-muted={String(controller.isMuted)}>
        Is Muted: <span>{String(controller.isMuted)}</span>
      </div>

      <div id="test-current-track" data-track={controller.currentTrack?.id || "none"}>
        Current Track: <span>{controller.currentTrack?.title || "None"}</span>
      </div>

      <div id="test-error-message" data-error={controller.errorMessage || ""}>
        Error Message: <span>{controller.errorMessage || "None"}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-4">
        <button
          id="btn-load-track"
          onClick={() => controller.loadTrack({ id: "test_silent", url: SILENT_WAV_URI, title: "Test Silent" })}
          className="px-3 py-1 bg-blue-600 rounded text-sm"
        >
          Load Track
        </button>

        <button
          id="btn-load-invalid-track"
          onClick={() => controller.loadTrack({ id: "invalid", url: "https://invalid-domain-xyz123.test/broken.mp3", title: "Broken" })}
          className="px-3 py-1 bg-red-600 rounded text-sm"
        >
          Load Broken Track
        </button>

        <button
          id="btn-play"
          onClick={() => controller.play()}
          className="px-3 py-1 bg-green-600 rounded text-sm"
        >
          Play
        </button>

        <button
          id="btn-pause"
          onClick={() => controller.pause()}
          className="px-3 py-1 bg-yellow-600 rounded text-sm"
        >
          Pause
        </button>

        <button
          id="btn-mute"
          onClick={() => controller.mute()}
          className="px-3 py-1 bg-gray-600 rounded text-sm"
        >
          Mute
        </button>

        <button
          id="btn-unmute"
          onClick={() => controller.unmute()}
          className="px-3 py-1 bg-gray-500 rounded text-sm"
        >
          Unmute
        </button>

        <button
          id="btn-set-volume-50"
          onClick={() => controller.setMasterVolume(0.5, 0)}
          className="px-3 py-1 bg-indigo-600 rounded text-sm"
        >
          Set Vol 0.5
        </button>

        <button
          id="btn-duck"
          onClick={() => controller.duck(0)}
          className="px-3 py-1 bg-purple-600 rounded text-sm"
        >
          Duck
        </button>

        <button
          id="btn-restore-intent"
          onClick={() => controller.restoreIntent(0)}
          className="px-3 py-1 bg-teal-600 rounded text-sm"
        >
          Restore Intent
        </button>
      </div>
    </div>
  );
}

export function AudioEngineTestHarness() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 font-mono text-sm">
      <h1 className="text-2xl font-bold text-yellow-400">Audio Engine Test Harness</h1>
      <AudioProvider initialMasterVolume={0.8} initialVolumeIntent="normal">
        <TestChildComponent />
      </AudioProvider>
    </div>
  );
}
