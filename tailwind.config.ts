import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        token: {
          ink: "var(--token-ink)",
          paper: "var(--token-paper)",
          "warm-white": "var(--token-warm-white)",
          champagne: "var(--token-champagne)",
          "muted-gold": "var(--token-muted-gold)",
          smoke: "var(--token-smoke)",
          mist: "var(--token-mist)",
        },
        theme: {
          bg: {
            primary: "var(--theme-bg-primary)",
            secondary: "var(--theme-bg-secondary)",
            card: "var(--theme-bg-card)",
          },
          text: {
            primary: "var(--theme-text-primary)",
            secondary: "var(--theme-text-secondary)",
            accent: "var(--theme-text-accent)",
          },
          accent: {
            primary: "var(--theme-accent-primary)",
            secondary: "var(--theme-accent-secondary)",
            glow: "var(--theme-accent-glow)",
          },
          border: {
            subtle: "var(--theme-border-subtle)",
            strong: "var(--theme-border-strong)",
          },
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cormorant Garamond", "DM Serif Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        "spring-micro": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring-scene": "cubic-bezier(0.22, 1, 0.36, 1)",
        "spring-hero": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        shimmer: "shimmer 2.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
