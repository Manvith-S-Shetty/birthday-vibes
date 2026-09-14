export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  url: string;
}

export const CURATED_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "track_none",
    title: "No Background Music",
    artist: "Silent Reverie",
    genre: "Silence",
    url: "",
  },
  {
    id: "track_clair_de_lune",
    title: "Clair de Lune",
    artist: "Claude Debussy",
    genre: "Classical Piano",
    url: "/audio/clair_de_lune.wav",
  },
  {
    id: "track_gymnopédie",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie",
    genre: "Minimal Classical",
    url: "/audio/gymnopedie_1.wav",
  },
  {
    id: "track_warm_acoustic",
    title: "Warm Memory Strings",
    artist: "Cinematic Ensemble",
    genre: "Acoustic Warmth",
    url: "/audio/warm_strings.wav",
  },
  {
    id: "track_celebration_spark",
    title: "Celebration Spark",
    artist: "Gold Ambient",
    genre: "Gentle Festive",
    url: "/audio/celebration_spark.wav",
  },
];

