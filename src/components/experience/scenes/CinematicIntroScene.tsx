"use client";

import React from "react";
import { ExperienceData } from "@/types/experience";
import { RecipientRelationship, OpeningStyleId } from "@/types/draft";
import { Display, Eyebrow, Body } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Sparkles, ArrowRight, Film, Mail, Heart, PartyPopper, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface CinematicIntroSceneProps {
  data: ExperienceData;
  onNext: () => void;
}

function getRelationshipDedication(relationship?: RecipientRelationship): string {
  switch (relationship) {
    case "partner":
      return "To the Love of My Life";
    case "best_friend":
      return "To My Greatest Confidant & Best Friend";
    case "parent":
      return "To the Guiding Light of Our Family";
    case "sibling":
      return "To My Lifelong Companion & Partner-in-Crime";
    case "colleague":
      return "To an Exceptional Teammate & Friend";
    case "other":
    default:
      return "A Celebration of You";
  }
}

function getOpeningTagline(style: OpeningStyleId, relationship?: RecipientRelationship): string {
  if (style === "warm-letter") {
    switch (relationship) {
      case "partner":
        return "With all my love, devotion, and gratitude";
      case "best_friend":
        return "Written with gratitude for every memory we share";
      case "parent":
        return "With deepest love, respect, and enduring gratitude";
      case "sibling":
        return "Celebrating the irreplaceable bond only we share";
      case "colleague":
        return "With sincere appreciation and warmest birthday wishes";
      default:
        return "Written from the heart, just for your day";
    }
  }

  if (style === "celebration-spark") {
    switch (relationship) {
      case "partner":
        return "Today we celebrate the one who makes everything brighter!";
      case "best_friend":
        return "Another year of unstoppable laughter, wild stories, and adventures!";
      case "parent":
        return "Celebrating a lifetime of love, warmth, and generosity!";
      case "sibling":
        return "Cheers to the most fun, unforgettable person in the world!";
      case "colleague":
        return "Cheers to an outstanding colleague and wonderful person!";
      default:
        return "Let the joy, laughter, and celebration begin!";
    }
  }

  // cinematic-premiere (default)
  switch (relationship) {
    case "partner":
      return "Starring the one who lights up every chapter.";
    case "best_friend":
      return "Starring an irreplaceable legend and best friend.";
    case "parent":
      return "Honoring a lifetime of devotion, strength, and love.";
    case "sibling":
      return "Starring my favorite partner-in-crime.";
    case "colleague":
      return "Honoring a brilliant teammate and friend.";
    default:
      return "The day is yours. The spotlight is on you.";
  }
}

function getOpeningQuote(style: OpeningStyleId, relationship?: RecipientRelationship): string {
  if (style === "warm-letter") {
    switch (relationship) {
      case "partner":
        return "Loving you is the most beautiful journey. May this new year bring back all the joy and warmth you endlessly bring to me.";
      case "best_friend":
        return "Through every high, low, and late-night laugh, having you as my best friend has been one of life's greatest blessings.";
      case "parent":
        return "Thank you for being my constant anchor and inspiration. Today we celebrate the wonderful, generous heart you have.";
      case "sibling":
        return "From childhood memories to every milestone ahead, having you by my side means the absolute world. Happy Birthday.";
      case "colleague":
        return "Thank you for bringing positivity and brilliance to every endeavor. Wishing you a year of immense success and happiness.";
      default:
        return "May every moment today remind you of how deeply cherished and appreciated you are by everyone around you.";
    }
  }

  if (style === "celebration-spark") {
    switch (relationship) {
      case "partner":
        return "Here is to another spectacular year of adventures, smiles, and dreaming big together. Happy Birthday, my love!";
      case "best_friend":
        return "Get ready for the best year yet! Full of wild stories, new milestones, and endless good times together.";
      case "parent":
        return "May your day be filled with music, laughter, and all your favorite things in the world. You deserve the best celebration!";
      case "sibling":
        return "Time to turn up the celebration and make this birthday completely unforgettable. Cheers to you!";
      case "colleague":
        return "May your birthday bring as much energy and joy as you bring to everyone you work with. Celebrate big today!";
      default:
        return "Throw your arms wide open to a brand new chapter filled with wonder, laughter, and pure celebration!";
    }
  }

  // cinematic-premiere (default)
  switch (relationship) {
    case "partner":
      return "Every great love story has a heartbeat. Today, the world celebrates the most extraordinary person in mine.";
    case "best_friend":
      return "True friendship is a once-in-a-lifetime masterpiece. Today, the world celebrates an absolute legend.";
    case "parent":
      return "A lifetime of quiet sacrifices, endless warmth, and unwavering love. Today, we put your story center stage.";
    case "sibling":
      return "From the very beginning to every new horizon ahead. Today, we celebrate someone truly one-of-a-kind.";
    case "colleague":
      return "Excellence, warmth, and inspiring energy every single day. Today, we celebrate your special milestone.";
    default:
      return "“May every moment today remind you of how deeply cherished and remarkable you are.”";
  }
}

export function CinematicIntroScene({ data, onNext }: CinematicIntroSceneProps) {
  const openingStyle: OpeningStyleId = data.openingStyle || "cinematic-premiere";
  const relationship = data.relationship;
  const recipientName = (data.recipientName || "").trim() || "Special Person";

  const dedication = getRelationshipDedication(relationship);
  const tagline = getOpeningTagline(openingStyle, relationship);
  const quote = getOpeningQuote(openingStyle, relationship);

  return (
    <div
      className={cn(
        "relative w-full min-h-screen flex flex-col justify-between items-center text-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden transition-all duration-700",
        openingStyle === "cinematic-premiere" && "intro-style-cinematic",
        openingStyle === "warm-letter" && "intro-style-letter",
        openingStyle === "celebration-spark" && "intro-style-spark"
      )}
    >
      {/* Dynamic Background Lighting Ambient Glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.5, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
      >
        <div
          className={cn(
            "w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full blur-[150px] transition-colors duration-700",
            openingStyle === "warm-letter"
              ? "bg-amber-600/25"
              : openingStyle === "celebration-spark"
              ? "bg-rose-500/25"
              : "bg-[var(--theme-accent-glow)]"
          )}
        />
      </motion.div>

      {/* STYLE 1: CINEMATIC PREMIERE */}
      {openingStyle === "cinematic-premiere" && (
        <>
          {/* Eyebrow Stage */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 space-y-2 max-w-md pt-4"
          >
            <Eyebrow className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-semibold">
              <Film className="w-3.5 h-3.5" />
              <span>World Premiere • {dedication}</span>
            </Eyebrow>
          </motion.div>

          {/* Center Title Sequence */}
          <div className="relative z-10 my-auto py-8 sm:py-12 max-w-4xl w-full px-2 space-y-6">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="font-serif text-lg sm:text-2xl italic tracking-[0.25em] text-[var(--theme-text-secondary)] uppercase block"
            >
              FOR
            </motion.span>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="py-1"
            >
              <Display
                gradient
                className="text-4xl sm:text-7xl md:text-8xl tracking-tight capitalize break-words leading-tight animate-tracking-cinematic max-w-full px-2"
              >
                {recipientName}
              </Display>
            </motion.div>

            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="font-serif text-base sm:text-2xl tracking-[0.2em] uppercase text-[var(--theme-text-accent)] block pt-3 font-medium"
            >
              {tagline}
            </motion.span>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.9, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <Body className="max-w-md sm:max-w-lg mx-auto text-base sm:text-xl font-serif italic text-[var(--theme-text-primary)] leading-relaxed pt-3">
                &ldquo;{quote}&rdquo;
              </Body>
            </motion.div>
          </div>

          {/* Action Callout Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.8 }}
            className="relative z-10 pb-4"
          >
            <Button variant="gold-glow" size="lg" onClick={onNext} className="shadow-2xl">
              <span>Explore Memories</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </motion.div>
        </>
      )}

      {/* STYLE 2: WARM LETTER */}
      {openingStyle === "warm-letter" && (
        <>
          {/* Eyebrow Stage */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 space-y-2 max-w-md pt-4"
          >
            <Eyebrow className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-[var(--theme-text-accent)] font-semibold">
              <Mail className="w-3.5 h-3.5" />
              <span>A Personal Letter • {dedication}</span>
            </Eyebrow>
          </motion.div>

          {/* Editorial Letter Card Container */}
          <div className="relative z-10 my-auto py-6 sm:py-8 max-w-2xl w-full px-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)]/85 backdrop-blur-md p-6 sm:p-10 shadow-2xl space-y-6 box-glow-sm relative overflow-hidden"
            >
              {/* Wax Seal / Letter Emblem */}
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--theme-accent-primary)]/20 border border-[var(--theme-accent-primary)] flex items-center justify-center text-[var(--theme-accent-primary)] shadow-md">
                <Heart className="w-5 h-5 fill-current opacity-80" />
              </div>

              <div className="space-y-3">
                <span className="font-serif text-lg sm:text-xl italic text-[var(--theme-text-secondary)] block">
                  Dearest
                </span>
                <h1 className="font-serif text-4xl sm:text-6xl text-[var(--theme-text-primary)] tracking-normal capitalize">
                  {recipientName}
                </h1>
                <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--theme-text-accent)] font-medium pt-1">
                  {tagline}
                </p>
              </div>

              <div className="pt-2 pb-1 border-t border-white/10">
                <p className="text-base sm:text-lg font-serif italic text-[var(--theme-text-primary)] leading-relaxed">
                  &ldquo;{quote}&rdquo;
                </p>
              </div>
            </motion.div>
          </div>

          {/* Action Callout Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="relative z-10 pb-4"
          >
            <Button variant="champagne-outline" size="lg" onClick={onNext} className="shadow-2xl">
              <span>Open the Experience</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </motion.div>
        </>
      )}

      {/* STYLE 3: CELEBRATION SPARK */}
      {openingStyle === "celebration-spark" && (
        <>
          {/* Eyebrow Stage */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10 space-y-2 max-w-md pt-4"
          >
            <Eyebrow className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-amber-300 font-semibold">
              <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
              <span>It’s Time to Celebrate • {dedication}</span>
            </Eyebrow>
          </motion.div>

          {/* Festive Animated Stage */}
          <div className="relative z-10 my-auto py-8 sm:py-12 max-w-3xl w-full px-2 space-y-6">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: [0.95, 1.05, 1], opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 text-xs sm:text-sm font-sans font-medium shadow-inner"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Happy Birthday!</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.7, type: "spring", stiffness: 180 }}
              className="py-1"
            >
              <Display
                gradient
                className="text-5xl sm:text-7xl md:text-8xl tracking-tight capitalize break-words leading-tight filter drop-shadow-[0_4px_16px_rgba(212,175,55,0.4)] px-2"
              >
                {recipientName}
              </Display>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="font-serif text-lg sm:text-2xl text-[var(--theme-text-accent)] font-medium tracking-wide"
            >
              {tagline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 0.95, y: 0 }}
              transition={{ duration: 0.8, delay: 1.6 }}
              className="max-w-md sm:max-w-lg mx-auto bg-black/30 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm"
            >
              <p className="text-sm sm:text-base font-sans text-[var(--theme-text-primary)] leading-relaxed">
                {quote}
              </p>
            </motion.div>
          </div>

          {/* Action Callout Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
            className="relative z-10 pb-4"
          >
            <Button variant="gold-glow" size="lg" onClick={onNext} className="shadow-2xl">
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span>Join the Celebration</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </motion.div>
        </>
      )}
    </div>
  );
}

