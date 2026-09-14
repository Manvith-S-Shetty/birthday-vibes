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
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=clair-de-lune-111009.mp3",
  },
  {
    id: "track_gymnopédie",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie",
    genre: "Minimal Classical",
    url: "https://cdn.pixabay.com/download/audio/2021/08/09/audio_9b6577efbb.mp3?filename=gymnopedie-no-1-9878.mp3",
  },
  {
    id: "track_warm_acoustic",
    title: "Warm Memory Strings",
    artist: "Cinematic Ensemble",
    genre: "Acoustic Warmth",
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a149b1.mp3?filename=soft-piano-ambient-10499.mp3",
  },
  {
    id: "track_celebration_spark",
    title: "Celebration Spark",
    artist: "Gold Ambient",
    genre: "Gentle Festive",
    url: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939bc995f.mp3?filename=gentle-piano-wishes-1234.mp3",
  },
];
