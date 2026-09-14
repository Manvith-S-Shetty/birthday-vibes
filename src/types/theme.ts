export type ThemeId =
  | "midnight-cinema"
  | "champagne-noir"
  | "garden-afterglow"
  | "sunset-film"
  | "playful-confetti";

export interface ThemeTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  accentPrimary: string;
  accentSecondary: string;
  accentGlow: string;
  borderSubtle: string;
  borderStrong: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  tokens: ThemeTokens;
  fontSerifFamily: string;
  fontSansFamily: string;
  background: {
    type: "solid" | "gradient" | "pattern";
    css: string;
    overlayGrain?: boolean;
    vignette?: boolean;
  };
  decorativeLayers: {
    showParticles?: boolean;
    particleStyle?: "stars" | "bubbles" | "gold-dust" | "confetti" | "petals";
    glowPosition?: string;
  };
  motionPreset: {
    heroDurationMs: number;
    sceneDurationMs: number;
    microDurationMs: number;
    easeCurve: string;
  };
  componentVariants: {
    cardStyle: "minimal" | "bordered" | "editorial" | "polaroid";
    buttonStyle: "gold-glow" | "champagne-outline" | "solid-ink" | "velvet";
  };
}
