"use client";

import React, { useState, useRef } from "react";
import { BirthdayDraft } from "@/types/draft";
import { MediaItem } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Upload, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, ArrowRight, ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepMemoriesProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepMemories({ draft, onUpdate, onNext, onPrev }: StepMemoriesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (draft.photos.length + files.length > 12) {
      setError("Maximum 12 photos allowed in V1.");
      return;
    }

    setError("");
    const newItems: MediaItem[] = [];

    Array.from(files).forEach((file, idx) => {
      if (!file.type.startsWith("image/")) {
        setError("Only image files (JPG, PNG, WebP) are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File size should be under 10MB per image.");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      newItems.push({
        id: `img_${Date.now()}_${idx}`,
        url: objectUrl,
        type: "image",
        caption: file.name.replace(/\.[^/.]+$/, ""),
        sortOrder: draft.photos.length + idx + 1,
      });
    });

    onUpdate({ photos: [...draft.photos, ...newItems] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (id: string) => {
    const updated = draft.photos
      .filter((p) => p.id !== id)
      .map((p, index) => ({ ...p, sortOrder: index + 1 }));
    onUpdate({ photos: updated });
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draft.photos.length) return;

    const list = [...draft.photos];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
    onUpdate({ photos: reordered });
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 03 — Memory Wall</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Curate their favorite moments
        </Heading>
        <Body>
          Upload up to 12 cherished photos. They will be rendered into a cinematic polaroid memory gallery.
        </Body>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Upload Drop Zone / Button */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center gap-3",
          draft.photos.length >= 12 && "opacity-50 pointer-events-none"
        )}
      >
        <div className="p-4 rounded-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6 text-[var(--theme-accent-primary)]" />
        </div>
        <div>
          <span className="font-serif text-lg font-medium text-[var(--theme-text-primary)] block">
            Click to upload photos ({draft.photos.length}/12)
          </span>
          <Caption>PNG, JPG, WebP up to 10MB each</Caption>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400 font-sans text-center">{error}</p>}

      {/* Photo List Grid */}
      {draft.photos.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-sans text-[var(--theme-text-secondary)] uppercase tracking-wider">
            <span>Uploaded Photos ({draft.photos.length})</span>
            <span>Reorder / Remove</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {draft.photos.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] gap-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/20 shrink-0 border border-white/10">
                    <img
                      src={item.url}
                      alt={item.caption || "Uploaded photo"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-sans text-[var(--theme-text-primary)] truncate">
                    {item.caption || `Photo ${index + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, "down")}
                    disabled={index === draft.photos.length - 1}
                    className="p-1.5 rounded-lg hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)]">
          <ImageIcon className="w-8 h-8 text-[var(--theme-text-secondary)] opacity-30 mx-auto mb-2" />
          <Caption>No photos added yet. Photos will render as interactive polaroid cards.</Caption>
        </div>
      )}

      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Write Message</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
