import { test, expect } from "@playwright/test";
import { CURATED_MUSIC_TRACKS } from "../src/lib/constants/music";

test.describe("V2-B: Phase B2.3/B2.4 — Curated Music Library Standardization Tests", () => {
  test("1. Library completeness: contains exactly 6 approved tracks", () => {
    expect(CURATED_MUSIC_TRACKS).toHaveLength(6);
    const trackIds = CURATED_MUSIC_TRACKS.map((t) => t.id);
    expect(trackIds).toEqual([
      "track_none",
      "track_gymnopedie_1",
      "track_evening",
      "track_dream_culture",
      "track_life_of_riley",
      "track_carefree",
    ]);
  });

  test("2. Every track has non-empty required metadata", () => {
    for (const track of CURATED_MUSIC_TRACKS) {
      expect(track.id).toBeTruthy();
      expect(track.title).toBeTruthy();
      expect(track.artist).toBeTruthy();
      expect(track.genre).toBeTruthy();
      expect(track.mood).toBeTruthy();
      expect(typeof track.durationSeconds).toBe("number");
      expect(track.license).toBeTruthy();
      expect(track.enabled).toBe(true);
    }
  });

  test("3. All non-silent tracks point to valid public MP3 paths", () => {
    const audioTracks = CURATED_MUSIC_TRACKS.filter((t) => t.id !== "track_none");
    for (const track of audioTracks) {
      expect(track.url).toMatch(/^\/audio\/[a-z0-9_]+\.mp3$/);
    }
  });

  test("4. CC-BY 4.0 tracks specify attribution required and non-empty attribution text", () => {
    const ccTracks = CURATED_MUSIC_TRACKS.filter((t) => t.license === "CC-BY-4.0");
    expect(ccTracks.length).toBe(5);
    for (const track of ccTracks) {
      expect(track.requiresAttribution).toBe(true);
      expect(track.attributionText.length).toBeGreaterThan(10);
      expect(track.licenseUrl).toBe("http://creativecommons.org/licenses/by/4.0/");
    }
  });
});
