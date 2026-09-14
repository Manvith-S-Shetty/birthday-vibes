"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeDefinition, ThemeId } from "@/types/theme";
import { defaultThemeId, themes } from "@/lib/themes/definitions";

interface ThemeContextType {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  initialThemeId = defaultThemeId,
}: {
  children: React.ReactNode;
  initialThemeId?: ThemeId;
}) {
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
  const currentTheme = themes[themeId] || themes[defaultThemeId];

  useEffect(() => {
    const root = document.documentElement;
    const tokens = currentTheme.tokens;

    root.style.setProperty("--theme-bg-primary", tokens.bgPrimary);
    root.style.setProperty("--theme-bg-secondary", tokens.bgSecondary);
    root.style.setProperty("--theme-bg-card", tokens.bgCard);
    root.style.setProperty("--theme-text-primary", tokens.textPrimary);
    root.style.setProperty("--theme-text-secondary", tokens.textSecondary);
    root.style.setProperty("--theme-text-accent", tokens.textAccent);
    root.style.setProperty("--theme-accent-primary", tokens.accentPrimary);
    root.style.setProperty("--theme-accent-secondary", tokens.accentSecondary);
    root.style.setProperty("--theme-accent-glow", tokens.accentGlow);
    root.style.setProperty("--theme-border-subtle", tokens.borderSubtle);
    root.style.setProperty("--theme-border-strong", tokens.borderStrong);

    // Apply font variables
    root.style.setProperty("--font-serif", currentTheme.fontSerifFamily);
    root.style.setProperty("--font-sans", currentTheme.fontSansFamily);
  }, [currentTheme]);

  const value: ThemeContextType = {
    themeId,
    theme: currentTheme,
    setTheme: setThemeId,
    availableThemes: Object.values(themes),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
