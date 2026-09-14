"use client";

import React, { useState, useEffect } from "react";
import { ExperienceData, MediaItem } from "@/types/experience";
import { Heading, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { ArrowRight, ArrowLeft, Maximize2, X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MemoryWallSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function MemoryWallScene({ data, onNext, onPrev }: MemoryWallSceneProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<MediaItem | null>(null);

  const photos = data.photos && data.photos.length > 0 ? data.photos : [];

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

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between items-center px-4 py-12 md:py-20 bg-film-grain overflow-hidden">
      {/* Atmosphere Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
        <div className="w-[500px] h-[500px] rounded-full bg-[var(--theme-accent-glow)] blur-[120px]" />
      </div>

      <div className="relative z-10 text-center space-y-3 max-w-xl mx-auto">
        <Eyebrow>Step 02 — Memory Wall</Eyebrow>
        <Heading className="text-3xl sm:text-5xl">
          Treasured Moments
        </Heading>
        <Body>
          A curated gallery of cherished memories. Tap any photo to expand into full focus.
        </Body>
      </div>

      {/* Polaroid Memory Wall Grid */}
      <div className="relative z-10 w-full max-w-4xl my-8">
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-2">
            {photos.map((item, idx) => {
              // Organic rotation angles
              const rotation = (idx % 3 === 0 ? -2.5 : idx % 3 === 1 ? 3 : -1.5) * (idx % 2 === 0 ? 1 : -1);

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
                  aria-label={`Expand photo memory: ${item.caption || `Memory ${idx + 1}`}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPhoto(item);
                    }
                  }}
                  className="bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] p-3 rounded-2xl shadow-2xl cursor-pointer transition-all duration-300 group hover:box-glow-sm flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)]"
                >
                  <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-black/40">
                    <img
                      src={item.url}
                      alt={item.caption || "Memory photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>

                  <div className="pt-3 pb-1 text-center">
                    <span className="font-serif text-sm font-medium text-[var(--theme-text-primary)] block truncate">
                      {item.caption || `Memory ${idx + 1}`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-card)] max-w-md mx-auto">
            <Heart className="w-8 h-8 text-[var(--theme-accent-primary)] opacity-40 mx-auto mb-2" />
            <Body className="text-sm font-serif italic">
              &ldquo;The best memories are the ones written in our hearts.&rdquo;
            </Body>
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
                className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="max-h-[70vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Expanded memory"}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>

              {selectedPhoto.caption && (
                <div className="text-center pt-2">
                  <span className="font-serif text-xl font-medium text-[var(--theme-text-primary)]">
                    {selectedPhoto.caption}
                  </span>
                </div>
              )}
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
