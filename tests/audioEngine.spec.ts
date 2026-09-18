import { test, expect } from "@playwright/test";

const TEST_ROUTE = "/test/audio-engine";

test.describe("V2-B: Phase B1 — Audio Engine & Provider Unit Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_ROUTE);
    await expect(page.getByRole("heading", { name: "Audio Engine Test Harness" })).toBeVisible();
  });

  test("1. initial state of AudioEngine", async ({ page }) => {
    const transportState = await page.getAttribute("#test-transport-state", "data-state");
    const volumeIntent = await page.getAttribute("#test-volume-intent", "data-intent");
    const masterVolume = await page.getAttribute("#test-master-volume", "data-volume");
    const isMuted = await page.getAttribute("#test-is-muted", "data-muted");

    expect(transportState).toBe("idle");
    expect(volumeIntent).toBe("normal");
    expect(masterVolume).toBe("0.8");
    expect(isMuted).toBe("false");
  });

  test("2. load track & play request", async ({ page }) => {
    await page.click("#btn-load-track");
    const currentTrack = await page.getAttribute("#test-current-track", "data-track");
    expect(currentTrack).toBe("test_silent");

    await page.click("#btn-play");
    const transportState = await page.getAttribute("#test-transport-state", "data-state");
    expect(["playing", "blocked", "loading"]).toContain(transportState);
  });

  test("3. pause action", async ({ page }) => {
    await page.click("#btn-load-track");
    await page.click("#btn-play");
    await page.click("#btn-pause");

    const transportState = await page.getAttribute("#test-transport-state", "data-state");
    expect(transportState).toBe("paused");
  });

  test("4. mute and unmute", async ({ page }) => {
    await page.click("#btn-mute");
    let isMuted = await page.getAttribute("#test-is-muted", "data-muted");
    let effectiveVolume = await page.getAttribute("#test-effective-volume", "data-volume");

    expect(isMuted).toBe("true");
    expect(effectiveVolume).toBe("0");

    await page.click("#btn-unmute");
    isMuted = await page.getAttribute("#test-is-muted", "data-muted");
    effectiveVolume = await page.getAttribute("#test-effective-volume", "data-volume");

    expect(isMuted).toBe("false");
    expect(effectiveVolume).toBe("0.8");
  });

  test("5. volume updates", async ({ page }) => {
    await page.click("#btn-set-volume-50");
    const masterVolume = await page.getAttribute("#test-master-volume", "data-volume");
    const effectiveVolume = await page.getAttribute("#test-effective-volume", "data-volume");

    expect(masterVolume).toBe("0.5");
    expect(effectiveVolume).toBe("0.5");
  });

  test("6. volume intent transition & ducking", async ({ page }) => {
    await page.click("#btn-duck");
    let volumeIntent = await page.getAttribute("#test-volume-intent", "data-intent");
    let effectiveVolume = await page.getAttribute("#test-effective-volume", "data-volume");

    expect(volumeIntent).toBe("ducked");
    // 0.8 * 0.2 = 0.16
    expect(parseFloat(effectiveVolume || "0")).toBeCloseTo(0.16, 2);

    await page.click("#btn-restore-intent");
    volumeIntent = await page.getAttribute("#test-volume-intent", "data-intent");
    effectiveVolume = await page.getAttribute("#test-effective-volume", "data-volume");

    expect(volumeIntent).toBe("normal");
    expect(parseFloat(effectiveVolume || "0")).toBeCloseTo(0.8, 2);
  });

  test("7. autoplay rejection → blocked state handling", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const AudioEngineClass = (window as any).__AUDIO_ENGINE_CLASS__;
      const engine = new AudioEngineClass();

      engine.loadTrack({ id: "test", url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" });

      const audioEl = (engine as any).audioElement as HTMLAudioElement;
      if (audioEl) {
        audioEl.play = async () => {
          const err = new Error("Autoplay blocked by browser policy");
          err.name = "NotAllowedError";
          throw err;
        };
      }

      const res = await engine.play();
      const state = engine.getState();
      engine.destroy();
      return { res, state };
    });

    expect(result?.res).toBe(false);
    expect(result?.state.transportState).toBe("blocked");
    expect(result?.state.errorMessage).toContain("autoplay");
  });

  test("8. audio error → error state handling", async ({ page }) => {
    await page.click("#btn-load-invalid-track");
    const transportState = await page.getAttribute("#test-transport-state", "data-state");
    expect(["idle", "loading", "error"]).toContain(transportState);
  });

  test("9. engine destroy and cleanup", async ({ page }) => {
    const result = await page.evaluate(() => {
      const AudioEngineClass = (window as any).__AUDIO_ENGINE_CLASS__;
      const engine = new AudioEngineClass();
      engine.destroy();
      return {
        state: engine.getState(),
        audioElementIsCleared: (engine as any).audioElement === null,
      };
    });

    expect(result.state.transportState).toBe("idle");
    expect(result.audioElementIsCleared).toBe(true);
  });

  test("10. Web Audio nodes created only once (no duplicate source nodes)", async ({ page }) => {
    const result = await page.evaluate(() => {
      const AudioEngineClass = (window as any).__AUDIO_ENGINE_CLASS__;
      const engine = new AudioEngineClass();
      const setup1 = (engine as any).ensureWebAudioNodes();
      const setup2 = (engine as any).ensureWebAudioNodes();
      engine.destroy();
      return { setup1, setup2 };
    });

    expect(result.setup1).toBe(result.setup2);
  });
});
