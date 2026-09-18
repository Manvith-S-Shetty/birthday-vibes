export type MusicMood =
  | "intimate"
  | "cinematic"
  | "warm"
  | "joyful"
  | "dreamy"
  | "playful";

export type MusicLicense =
  | "CC0"
  | "CC-BY-4.0"
  | "PUBLIC-DOMAIN"
  | "COMMERCIAL-LICENSE";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  url: string;
}

export interface CuratedMusicTrack extends MusicTrack {
  composer?: string;
  mood: MusicMood;
  durationSeconds: number;
  sourceType: "curated";
  license: MusicLicense;
  licenseUrl: string;
  sourceUrl: string;
  requiresAttribution: boolean;
  attributionText: string;
  enabled: boolean;
}

export const CURATED_MUSIC_TRACKS: CuratedMusicTrack[] = [
  {
    id: "track_none",
    title: "No Background Music",
    artist: "Silent Reverie",
    genre: "Silence",
    url: "",
    mood: "intimate",
    durationSeconds: 0,
    sourceType: "curated",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "",
    requiresAttribution: false,
    attributionText: "",
    enabled: true,
  },
  {
    id: "track_gymnopedie_1",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie / Kevin MacLeod",
    composer: "Erik Satie",
    genre: "Minimal Classical",
    url: "/audio/gymnopedie_1.mp3",
    mood: "cinematic",
    durationSeconds: 187,
    sourceType: "curated",
    license: "CC-BY-4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100787",
    requiresAttribution: true,
    attributionText: '"Gymnopedie No. 1" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/',
    enabled: true,
  },
  {
    id: "track_evening",
    title: "Evening",
    artist: "Kevin MacLeod",
    composer: "Kevin MacLeod",
    genre: "Acoustic Intimate",
    url: "/audio/evening.mp3",
    mood: "intimate",
    durationSeconds: 186,
    sourceType: "curated",
    license: "CC-BY-4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600032",
    requiresAttribution: true,
    attributionText: '"Evening" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/',
    enabled: true,
  },
  {
    id: "track_dream_culture",
    title: "Dream Culture",
    artist: "Kevin MacLeod",
    composer: "Kevin MacLeod",
    genre: "Ambient Soft Piano",
    url: "/audio/dream_culture.mp3",
    mood: "dreamy",
    durationSeconds: 214,
    sourceType: "curated",
    license: "CC-BY-4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300046",
    requiresAttribution: true,
    attributionText: '"Dream Culture" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/',
    enabled: true,
  },
  {
    id: "track_life_of_riley",
    title: "Life of Riley",
    artist: "Kevin MacLeod",
    composer: "Kevin MacLeod",
    genre: "Acoustic Warmth",
    url: "/audio/life_of_riley.mp3",
    mood: "joyful",
    durationSeconds: 235,
    sourceType: "curated",
    license: "CC-BY-4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400054",
    requiresAttribution: true,
    attributionText: '"Life of Riley" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/',
    enabled: true,
  },
  {
    id: "track_carefree",
    title: "Carefree",
    artist: "Kevin MacLeod",
    composer: "Kevin MacLeod",
    genre: "Playful Acoustic",
    url: "/audio/carefree.mp3",
    mood: "playful",
    durationSeconds: 205,
    sourceType: "curated",
    license: "CC-BY-4.0",
    licenseUrl: "http://creativecommons.org/licenses/by/4.0/",
    sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037",
    requiresAttribution: true,
    attributionText: '"Carefree" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/',
    enabled: true,
  },
];



