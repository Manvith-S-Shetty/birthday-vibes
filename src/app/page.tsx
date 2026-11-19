"use client";

import React, { useState } from "react";
import { Display, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Sparkles, ArrowRight, PlusCircle, Play } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MotionFilmModal } from "@/components/landing/MotionFilmModal";

export default function Home() {
  const [isFilmOpen, setIsFilmOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-film-grain text-[var(--theme-text-primary)]">
      {/* Top Navigation Bar with Direct Create Option */}
      <header className="w-full max-w-7xl mx-auto p-6 flex items-center justify-between z-10">
        <BrandLogo variant="lockup" size="sm" />
        <div className="flex items-center gap-3">
          <Button href="/create" variant="champagne-outline" size="sm">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Create Gift</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center text-center p-6 my-auto">
        <Container size="narrow" className="space-y-8">
          <Eyebrow className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--theme-accent-primary)]" />
            Cinematic Birthday Gifts
          </Eyebrow>

          <Display gradient className="text-4xl sm:text-6xl">
            Birthday Vibes
          </Display>

          <Body className="text-lg max-w-lg mx-auto">
            An elegant, personalized cinematic digital experience designed for the people who matter most.
          </Body>

          {/* Action CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href="/create" variant="gold-glow" size="lg">
              <PlusCircle className="w-4 h-4 mr-1" />
              <span>Create a Birthday Gift</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>

            <Button
              type="button"
              variant="champagne-outline"
              size="lg"
              onClick={() => setIsFilmOpen(true)}
            >
              <Play className="w-4 h-4 mr-1 fill-current" />
              <span>Watch the Film</span>
            </Button>
          </div>
        </Container>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto p-6 text-center text-xs text-[var(--theme-text-secondary)] z-10 opacity-70">
        Birthday Vibes — Elegant Digital Birthday Experience Platform
      </footer>

      {/* Motion Film Modal */}
      <MotionFilmModal isOpen={isFilmOpen} onClose={() => setIsFilmOpen(false)} />
    </div>
  );
}
