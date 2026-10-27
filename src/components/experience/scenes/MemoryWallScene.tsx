"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ExperienceData, MediaItem } from "@/types/experience";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  ArrowLeft,
  Maximize2,
  X,
  Heart,
  Calendar,
  MapPin,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface MemoryWallSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function MemoryWallScene({ data, onNext, onPrev }: MemoryWallSceneProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null);

  const rawPhotos = data.photos;
  const photos = useMemo(
    () => (rawPhotos && rawPhotos.length > 0 ? rawPhotos : []),
    [rawPhotos]
  );
  const displayMode = data.memoryDisplayMode || "grid";

  // Keyboard Escape key handler to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPhoto) {
        setSelectedPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);

  // Lock body scroll when lightbox is active
  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedPhoto]);

  // Group or identify chapter transitions for the Story Timeline
  const timelineItemsWithChapters = useMemo(() => {
    let lastChapter: string | undefined = undefined;
    return photos.map((item) => {
      const isNewChapter = !!item.chapter && item.chapter !== lastChapter;
      if (item.chapter) lastChapter = item.chapter;
      return {
        item,
        isNewChapter,
        chapterTitle: isNewChapter ? item.chapter : undefined,
      };
    });
  }, [photos]);

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Atmosphere Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
        <div className="w-[500px] h-[500px] rounded-full bg-[var(--theme-accent-glow)] blur-[120px]" />
      </div>

      {/* Header Stage */}
      <div className="relative z-10 text-center space-y-3 max-w-xl mx-auto">
        <Eyebrow>
          {displayMode === "timeline" ? "Story Timeline" : "Step 02 — Memory Wall"}
        </Eyebrow>
        <Heading className="text-3xl sm:text-5xl">
          Treasured Moments
        </Heading>
        <Body>
          {displayMode === "timeline"
            ? "A chronological walk through cherished memories and defining chapters. Tap any moment to inspect in full focus."
            : "A curated gallery of cherished memories. Tap any photo to expand into full focus."}
        </Body>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-4xl my-8">
        {photos.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] max-w-md mx-auto">
            <Heart className="w-8 h-8 text-[var(--theme-accent-primary)] opacity-40 mx-auto mb-2" />
            <Body className="text-sm font-serif italic">
              &ldquo;The best memories are the ones written in our hearts.&rdquo;
            </Body>
          </div>
        ) : displayMode === "timeline" ? (
          /* ==================================================================== */
          /* DISPLAY MODE: STORY TIMELINE                                         */
          /* ==================================================================== */
          <div className="relative max-w-3xl mx-auto px-2 sm:px-4 py-4">
            {/* Timeline Vertical Spine */}
            <div className="absolute left-6 sm:left-1/2 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-gradient-to-b from-[var(--theme-accent-primary)]/80 via-[var(--theme-accent-primary)]/30 to-transparent pointer-events-none" />

            <div className="space-y-8 sm:space-y-12">
              {timelineItemsWithChapters.map(({ item, isNewChapter, chapterTitle }, idx) => {
                const isEven = idx % 2 === 0;

                return (
                  <div key={item.id} className="relative space-y-4">
                    {/* Chapter Header Badge (if chapter starts here) */}
                    {isNewChapter && chapterTitle && (
                      <div className="relative z-20 flex items-center justify-start sm:justify-center my-6 pl-10 sm:pl-0">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-accent-primary)]/40 shadow-lg"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                          <span className="font-serif text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-accent)]">
                            Chapter: {chapterTitle}
                          </span>
                        </motion.div>
                      </div>
                    )}

                    {/* Timeline Node + Card Row */}
                    <div className="relative flex items-center sm:items-start">
                      {/* Timeline Central Dot / Marker */}
                      <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-[var(--theme-accent-primary)] ring-4 ring-[var(--theme-bg-primary)] shadow-md flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-black/60" />
                        </div>
                      </div>

                      {/* Timeline Card Container */}
                      <div
                        className={cn(
                          "w-full pl-12 sm:pl-0 sm:w-1/2 flex",
                          isEven ? "sm:pr-8 sm:justify-end" : "sm:pl-8 sm:ml-auto sm:justify-start"
                        )}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          transition={{ duration: 0.5, delay: 0.05 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedPhoto(item)}
                          tabIndex={0}
                          role="button"
                          aria-label={`Expand timeline memory: ${item.caption || `Memory ${idx + 1}`}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedPhoto(item);
                            }
                          }}
                          className="w-full max-w-sm bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] p-3 sm:p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] space-y-3"
                        >
                          {/* Image Box */}
                          <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-black/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt={item.caption || "Memory photo"}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                            </div>
                          </div>

                          {/* Story Metadata & Caption */}
                          <div className="space-y-1.5">
                            {/* Date & Location Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.date && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-md bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-accent)] font-medium">
                                  <Calendar className="w-3 h-3" />
                                  <span>{item.date}</span>
                                </span>
                              )}
                              {item.location && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded-md bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)]">
                                  <MapPin className="w-3 h-3" />
                                  <span>{item.location}</span>
                                </span>
                              )}
                            </div>

                            {/* Caption */}
                            <h4 className="font-serif text-base font-medium text-[var(--theme-text-primary)] group-hover:text-[var(--theme-text-accent)] transition-colors leading-snug">
                              {item.caption || `Memory ${idx + 1}`}
                            </h4>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : displayMode === "polaroid" ? (
          /* ==================================================================== */
          /* DISPLAY MODE: POLAROID KEEPSAKES                                     */
          /* ==================================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2">
            {photos.map((item, idx) => {
              const rotation =
                (idx % 3 === 0 ? -2.5 : idx % 3 === 1 ? 3 : -1.5) * (idx % 2 === 0 ? 1 : -1);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 24, rotate: 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: rotation }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: idx * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.04, rotate: 0, zIndex: 20 }}
                  onClick={() => setSelectedPhoto(item)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Expand polaroid memory: ${item.caption || `Memory ${idx + 1}`}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPhoto(item);
                    }
                  }}
                  className="bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] p-3 rounded-2xl shadow-2xl cursor-pointer transition-all duration-300 group hover:box-glow-sm flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)]"
                >
                  <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.caption || "Memory photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>

                  <div className="pt-3 pb-1 text-center space-y-1">
                    <span className="font-serif text-sm font-medium text-[var(--theme-text-primary)] block truncate">
                      {item.caption || `Memory ${idx + 1}`}
                    </span>
                    {(item.date || item.location) && (
                      <span className="text-[11px] text-[var(--theme-text-secondary)] font-sans block truncate opacity-80">
                        {[item.date, item.location].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* ==================================================================== */
          /* DISPLAY MODE: CLASSIC GRID (DEFAULT)                                 */
          /* ==================================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 px-2">
            {photos.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: idx * 0.06, duration: 0.5 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedPhoto(item)}
                tabIndex={0}
                role="button"
                aria-label={`Expand photo memory: ${item.caption || `Memory ${idx + 1}`}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedPhoto(item);
                  }
                }}
                className="bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent-primary)] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.caption || "Memory photo"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                </div>

                <div className="p-3 text-center space-y-1">
                  <span className="font-serif text-sm font-medium text-[var(--theme-text-primary)] block truncate">
                    {item.caption || `Memory ${idx + 1}`}
                  </span>
                  {(item.date || item.location) && (
                    <span className="text-[11px] text-[var(--theme-text-secondary)] font-sans block truncate opacity-80">
                      {[item.date, item.location].filter(Boolean).join(" • ")}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Fullscreen Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close Lightbox"
                className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="max-h-[65vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Expanded memory"}
                  className="max-h-[65vh] w-auto object-contain"
                />
              </div>

              {/* Lightbox Metadata Banner */}
              <div className="text-center space-y-2 pt-1">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {selectedPhoto.chapter && (
                    <span className="inline-flex items-center gap-1 text-xs font-sans px-2.5 py-1 rounded-full bg-[var(--theme-accent-glow)]/20 border border-[var(--theme-accent-primary)]/40 text-[var(--theme-text-accent)] font-semibold">
                      <Bookmark className="w-3.5 h-3.5" />
                      Chapter: {selectedPhoto.chapter}
                    </span>
                  )}
                  {selectedPhoto.date && (
                    <span className="inline-flex items-center gap-1 text-xs font-sans px-2.5 py-1 rounded-full bg-white/10 text-[var(--theme-text-secondary)]">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedPhoto.date}
                    </span>
                  )}
                  {selectedPhoto.location && (
                    <span className="inline-flex items-center gap-1 text-xs font-sans px-2.5 py-1 rounded-full bg-white/10 text-[var(--theme-text-secondary)]">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedPhoto.location}
                    </span>
                  )}
                </div>

                {selectedPhoto.caption && (
                  <h3 className="font-serif text-xl sm:text-2xl font-medium text-[var(--theme-text-primary)]">
                    {selectedPhoto.caption}
                  </h3>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene Navigation */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-xl pt-4">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Read Letter</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
