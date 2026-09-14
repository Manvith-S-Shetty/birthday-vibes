"use client";

import React, { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Display, Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { useTheme } from "@/components/themes/ThemeProvider";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { ExperienceData } from "@/types/experience";
import { Sparkles, Eye, Smartphone, Monitor, Activity, ShieldCheck, Palette, Type } from "lucide-react";
import { motion } from "framer-motion";

const demoExperienceData: ExperienceData = {
  id: "demo-1",
  slug: "demo-birthday",
  recipientName: "Eleanor",
  birthdayDate: "October 24",
  themeId: "midnight-cinema",
  personalMessage: "May your day be filled with timeless moments, quiet laughter, and endless wonder.",
  photos: [
    {
      id: "p1",
      url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=1000",
      type: "image",
      sortOrder: 1,
      caption: "Paris Memory",
    },
  ],
  musicTitle: "Clair de Lune — Debussy",
  isPinProtected: true,
  pin: "1234",
  createdAt: new Date().toISOString(),
};

export default function DesignSystemPage() {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showRendererModal, setShowRendererModal] = useState<boolean>(false);

  return (
    <main className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] py-12 px-4 transition-colors duration-500">
      <Container size="wide" className="space-y-16">
        {/* Header */}
        <div className="border-b border-[var(--theme-border-subtle)] pb-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Eyebrow className="mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Phase 1 Design System & Architecture Showcase
              </Eyebrow>
              <Display gradient className="text-3xl sm:text-5xl">
                Wishlight Design Engine
              </Display>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "desktop" ? "gold-glow" : "solid-ink"}
                size="sm"
                onClick={() => setViewMode("desktop")}
              >
                <Monitor className="w-3.5 h-3.5 mr-1" />
                Desktop
              </Button>
              <Button
                variant={viewMode === "mobile" ? "gold-glow" : "solid-ink"}
                size="sm"
                onClick={() => setViewMode("mobile")}
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" />
                Mobile View
              </Button>
            </div>
          </div>
          <Body>
            A luxury editorial foundation engineered for personalized cinematic birthday gifts.
          </Body>
        </div>

        {/* 1. Theme Engine Switcher */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--theme-border-subtle)] pb-3">
            <Palette className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <Heading className="text-xl">1. Dynamic Theme Engine (5 Themes)</Heading>
          </div>
          <ThemeSelector />
          <div className="p-4 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] text-xs space-y-2">
            <div className="font-serif text-sm font-medium text-[var(--theme-text-accent)]">
              Active Theme: {theme.name}
            </div>
            <p className="text-[var(--theme-text-secondary)]">{theme.description}</p>
          </div>
        </section>

        {/* 2. Typography Scale */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--theme-border-subtle)] pb-3">
            <Type className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <Heading className="text-xl">2. Editorial Typography System</Heading>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-6 rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)]">
              <div>
                <Eyebrow className="block mb-1">Display Hero Serif</Eyebrow>
                <Display gradient className="text-4xl sm:text-5xl">
                  Eleanor Vance
                </Display>
              </div>
              <div>
                <Eyebrow className="block mb-1">Section Heading</Eyebrow>
                <Heading>A Memory Written in Stars</Heading>
              </div>
              <div>
                <Eyebrow className="block mb-1">Body Text</Eyebrow>
                <Body>
                  Every year brings a new chapter of light, warmth, and unmistakable grace.
                </Body>
              </div>
              <div>
                <Eyebrow className="block mb-1">Caption / Micro Label</Eyebrow>
                <Caption>PARIS, OCTOBER 2026 — PRIVATE COLLECTION</Caption>
              </div>
            </div>

            <div className="space-y-4 p-6 rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] flex flex-col justify-between">
              <div>
                <Eyebrow className="block mb-2">Design Tokens Palette</Eyebrow>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-white/10 bg-[var(--theme-bg-primary)]">
                    <span className="block text-[var(--theme-text-secondary)]">Primary BG</span>
                    <span className="font-mono text-[var(--theme-text-primary)]">{theme.tokens.bgPrimary}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/10 bg-[var(--theme-bg-card)]">
                    <span className="block text-[var(--theme-text-secondary)]">Card BG</span>
                    <span className="font-mono text-[var(--theme-text-primary)]">{theme.tokens.bgCard}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-white/10 bg-[var(--theme-bg-secondary)]">
                    <span className="block text-[var(--theme-text-secondary)]">Accent Gold</span>
                    <span className="font-mono text-[var(--theme-text-accent)]">{theme.tokens.accentPrimary}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] box-glow-sm">
                <Eyebrow className="block mb-1">Luxury Editorial Card Primitive</Eyebrow>
                <Body className="text-sm italic font-serif">
                  &ldquo;Simplicity is the ultimate sophistication.&rdquo;
                </Body>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Button & Micro-Interactions */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--theme-border-subtle)] pb-3">
            <Activity className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <Heading className="text-xl">3. Button Variants & Micro-Interactions</Heading>
          </div>
          <div className="flex flex-wrap items-center gap-4 p-6 rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)]">
            <Button variant="gold-glow">Gold Glow</Button>
            <Button variant="champagne-outline">Champagne Outline</Button>
            <Button variant="solid-ink">Solid Ink</Button>
            <Button variant="velvet">Velvet Gradient</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
        </section>

        {/* 4. Experience Renderer Shell Demo */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--theme-accent-primary)]" />
              <Heading className="text-xl">4. ExperienceRenderer Shell</Heading>
            </div>
            <Button
              variant="champagne-outline"
              size="sm"
              onClick={() => setShowRendererModal(!showRendererModal)}
            >
              {showRendererModal ? "Hide Fullscreen Shell" : "Preview Fullscreen Shell"}
            </Button>
          </div>

          <div
            className={`mx-auto transition-all duration-500 rounded-3xl overflow-hidden border border-[var(--theme-border-strong)] shadow-2xl ${
              viewMode === "mobile" ? "max-w-[375px] min-h-[667px]" : "w-full max-w-4xl"
            }`}
          >
            <ExperienceRenderer data={{ ...demoExperienceData, themeId: theme.id }} isPreview />
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-[var(--theme-border-subtle)] pt-8 flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            <span>Phase 1 Foundation Verified — Next.js App Router + TypeScript + Tailwind</span>
          </div>
          <span>Wishlight v1.0.0</span>
        </div>
      </Container>
    </main>
  );
}
