"use client";

import React, { useState, useRef } from "react";
import { BirthdayDraft, MemoryDisplayMode, MEMORY_CHAPTER_PRESETS } from "@/types/draft";
import { MediaItem } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import {
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Layers,
  GitCommit,
  Calendar,
  MapPin,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { uploadPhotoFile, fetchPreviewUrls } from "@/lib/media/uploadHelper";
import { MediaPreviewCache } from "@/lib/media/previewCache";

interface StepMemoriesProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return Number.MAX_SAFE_INTEGER;
  const trimmed = dateStr.trim();
  const parsedDate = Date.parse(trimmed);
  if (!isNaN(parsedDate)) {
    return parsedDate;
  }
  const yearMatch = trimmed.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1).getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}

export function StepMemories({ draft, onUpdate, onNext, onPrev }: StepMemoriesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>("");
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [failedUploads, setFailedUploads] = useState<{ id: string; file: File; error: string }[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const currentMode: MemoryDisplayMode = draft.memoryDisplayMode || "grid";

  // Resolve signed preview URLs for any stored photos on mount / update
  React.useEffect(() => {
    const internalPaths = draft.photos
      .map((p) => p.storagePath || p.url)
      .filter(
        (path) =>
          path &&
          !path.startsWith("data:") &&
          !path.startsWith("blob:") &&
          !path.startsWith("http://") &&
          !path.startsWith("https://")
      );

    if (internalPaths.length > 0) {
      fetchPreviewUrls(internalPaths).then((urls) => {
        setPreviewUrls((prev) => ({ ...prev, ...urls }));
      });
    }
  }, [draft.photos]);

  const getPhotoDisplayUrl = (item: MediaItem): string => {
    const key = item.storagePath || item.url;
    return (
      previewUrls[key] ||
      MediaPreviewCache.get(key) ||
      item.previewUrl ||
      item.url
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (draft.photos.length + files.length > 12) {
      setError("Maximum 12 photos allowed in V1.");
      return;
    }

    setError("");
    const fileList = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileList) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files (JPG, PNG, WebP) are supported.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("File size should be under 10MB per image.");
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploadProgress({ current: 0, total: validFiles.length });
    const newItems: MediaItem[] = [];
    const currentCount = draft.photos.length;

    for (let idx = 0; idx < validFiles.length; idx++) {
      const file = validFiles[idx];
      setUploadProgress({ current: idx + 1, total: validFiles.length });

      try {
        const result = await uploadPhotoFile(draft.id, file);
        const itemId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`;
        newItems.push({
          id: itemId,
          url: result.path,
          storagePath: result.path,
          previewUrl: result.previewUrl,
          type: "image",
          caption: file.name.replace(/\.[^/.]+$/, ""),
          sortOrder: currentCount + newItems.length + 1,
        });
        setPreviewUrls((prev) => ({ ...prev, [result.path]: result.previewUrl }));
      } catch (err: any) {
        console.error("Failed to upload photo:", file.name, err);
        const failId = `fail_${Date.now()}_${idx}`;
        setFailedUploads((prev) => [
          ...prev,
          { id: failId, file, error: err?.message || "Storage upload failed" },
        ]);
      }
    }

    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (newItems.length > 0) {
      onUpdate({ photos: [...draft.photos, ...newItems] });
    }
  };

  const handleRetryUpload = async (failed: { id: string; file: File; error: string }) => {
    setFailedUploads((prev) => prev.filter((f) => f.id !== failed.id));
    setError("");
    try {
      const result = await uploadPhotoFile(draft.id, failed.file);
      const itemId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newItem: MediaItem = {
        id: itemId,
        url: result.path,
        storagePath: result.path,
        previewUrl: result.previewUrl,
        type: "image",
        caption: failed.file.name.replace(/\.[^/.]+$/, ""),
        sortOrder: draft.photos.length + 1,
      };
      setPreviewUrls((prev) => ({ ...prev, [result.path]: result.previewUrl }));
      onUpdate({ photos: [...draft.photos, newItem] });
    } catch (err: any) {
      setFailedUploads((prev) => [
        ...prev,
        { ...failed, error: err?.message || "Storage upload failed" },
      ]);
    }
  };

  const handleRemove = (id: string) => {
    const updated = draft.photos
      .filter((p) => p.id !== id)
      .map((p, index) => ({ ...p, sortOrder: index + 1 }));
    onUpdate({ photos: updated });
    if (expandedPhotoId === id) setExpandedPhotoId(null);
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

  const handleUpdatePhoto = (id: string, updates: Partial<MediaItem>) => {
    const updatedPhotos = draft.photos.map((p) => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });
    onUpdate({ photos: updatedPhotos });
  };

  const handleSortChronologically = () => {
    const sorted = [...draft.photos].sort((a, b) => {
      const timeA = parseDateToTimestamp(a.date);
      const timeB = parseDateToTimestamp(b.date);
      if (timeA === timeB) return a.sortOrder - b.sortOrder;
      return timeA - timeB;
    });
    const reordered = sorted.map((p, idx) => ({ ...p, sortOrder: idx + 1 }));
    onUpdate({ photos: reordered });
  };

  const displayModes: { id: MemoryDisplayMode; label: string; icon: any; description: string }[] = [
    {
      id: "grid",
      label: "Classic Gallery",
      icon: LayoutGrid,
      description: "Clean, balanced photo grid with full focus previews.",
    },
    {
      id: "polaroid",
      label: "Polaroid Keepsakes",
      icon: Layers,
      description: "Tilted vintage polaroid cards with organic handwritten feel.",
    },
    {
      id: "timeline",
      label: "Story Timeline",
      icon: GitCommit,
      description: "Chronological journey with chapters, dates, and locations.",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 03 — Memory Wall & Timeline</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">
          Curate their life story & memories
        </Heading>
        <Body>
          Upload cherished photos, choose your presentation style, and optionally add dates, locations, and chapters to craft a cinematic story.
        </Body>
      </div>

      {/* Memory Display Mode Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-sans uppercase tracking-wider text-[var(--theme-text-secondary)]">
          <span>Display Mode</span>
          <span className="text-[var(--theme-text-accent)] font-semibold lowercase">
            {currentMode} mode active
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {displayModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onUpdate({ memoryDisplayMode: mode.id })}
                className={cn(
                  "p-3.5 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between gap-2 focus:outline-none min-h-[90px]",
                  isSelected
                    ? "border-[var(--theme-accent-primary)] bg-[var(--theme-accent-glow)]/10 ring-1 ring-[var(--theme-accent-primary)] shadow-md"
                    : "border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-strong)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isSelected
                          ? "text-[var(--theme-accent-primary)]"
                          : "text-[var(--theme-text-secondary)]"
                      )}
                    />
                    <span className="text-sm font-medium text-[var(--theme-text-primary)]">
                      {mode.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[var(--theme-accent-primary)] shadow-sm" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--theme-text-secondary)] line-clamp-2 leading-snug">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
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
          "border-2 border-dashed border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent-primary)] bg-[var(--theme-bg-card)] rounded-2xl p-7 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center gap-2.5",
          draft.photos.length >= 12 && "opacity-50 pointer-events-none"
        )}
      >
        <div className="p-3.5 rounded-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] group-hover:scale-110 transition-transform">
          <Upload className="w-5 h-5 text-[var(--theme-accent-primary)]" />
        </div>
        <div>
          <span className="font-serif text-base font-medium text-[var(--theme-text-primary)] block">
            {uploadProgress
              ? `Uploading photos (${uploadProgress.current}/${uploadProgress.total})...`
              : `Click to upload photos (${draft.photos.length}/12)`}
          </span>
          <Caption>PNG, JPG, WebP up to 10MB each</Caption>
        </div>
      </div>

      {/* Upload Progress Banner */}
      {uploadProgress && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] text-xs text-[var(--theme-text-primary)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-accent-primary)] shrink-0" />
          <span>Uploading photo {uploadProgress.current} of {uploadProgress.total} directly to storage...</span>
        </div>
      )}

      {/* Failed Uploads Banner with Retry */}
      {failedUploads.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs">
          <div className="flex items-center gap-1.5 text-rose-300 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Some photos failed to upload:</span>
          </div>
          {failedUploads.map((failed) => (
            <div key={failed.id} className="flex items-center justify-between gap-2 pl-5 text-rose-200">
              <span className="truncate">{failed.file.name}: {failed.error}</span>
              <button
                type="button"
                onClick={() => handleRetryUpload(failed)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-medium shrink-0 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-400 font-sans text-center">{error}</p>}

      {/* Photos Management Section */}
      {draft.photos.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-sans text-[var(--theme-text-secondary)] uppercase tracking-wider">
            <span>Photos & Story Chapters ({draft.photos.length})</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSortChronologically}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent-primary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] hover:text-[var(--theme-accent-primary)] transition-all font-sans text-[11px] font-medium"
                title="Sort photos chronologically by date/year"
              >
                <Clock className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />
                <span>Sort Chronologically</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {draft.photos.map((item, index) => {
              const isExpanded = expandedPhotoId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] transition-all overflow-hidden"
                >
                  {/* Photo Item Summary Bar */}
                  <div className="flex items-center justify-between p-2.5 gap-2.5">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/20 shrink-0 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getPhotoDisplayUrl(item)}
                          alt={item.caption || "Uploaded photo"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="truncate flex-1">
                        <span className="text-xs font-medium text-[var(--theme-text-primary)] truncate block">
                          {item.caption || `Photo ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                          {item.chapter && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans px-1.5 py-0.5 rounded bg-[var(--theme-accent-glow)]/20 text-[var(--theme-text-accent)] border border-[var(--theme-accent-primary)]/30">
                              <Bookmark className="w-2.5 h-2.5" />
                              {item.chapter}
                            </span>
                          )}
                          {item.date && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/5 text-[var(--theme-text-secondary)]">
                              <Calendar className="w-2.5 h-2.5" />
                              {item.date}
                            </span>
                          )}
                          {item.location && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/5 text-[var(--theme-text-secondary)]">
                              <MapPin className="w-2.5 h-2.5" />
                              {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedPhotoId(isExpanded ? null : item.id)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors",
                          isExpanded
                            ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)]"
                            : "bg-[var(--theme-bg-card)] hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)]"
                        )}
                        title="Edit story details"
                      >
                        <span>Details</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

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
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Story Metadata Form */}
                  {isExpanded && (
                    <div className="p-3.5 bg-[var(--theme-bg-card)] border-t border-[var(--theme-border-subtle)] space-y-3 animate-fade-in">
                      {/* Caption Input */}
                      <div>
                        <label
                          htmlFor={`caption_${item.id}`}
                          className="block text-[11px] font-sans font-medium uppercase tracking-wider text-[var(--theme-text-secondary)] mb-1"
                        >
                          Memory Caption
                        </label>
                        <input
                          id={`caption_${item.id}`}
                          type="text"
                          value={item.caption || ""}
                          onChange={(e) => handleUpdatePhoto(item.id, { caption: e.target.value })}
                          placeholder="e.g. Sunset in Amalfi or The Day We Met"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-primary)]"
                        />
                      </div>

                      {/* Date / Year & Location Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`date_${item.id}`}
                            className="block text-[11px] font-sans font-medium uppercase tracking-wider text-[var(--theme-text-secondary)] mb-1"
                          >
                            Date or Year (Optional)
                          </label>
                          <div className="relative">
                            <Calendar className="w-3.5 h-3.5 text-[var(--theme-text-secondary)] absolute left-2.5 top-2.5" />
                            <input
                              id={`date_${item.id}`}
                              type="text"
                              value={item.date || ""}
                              onChange={(e) => handleUpdatePhoto(item.id, { date: e.target.value })}
                              placeholder="e.g. 2019 or Summer 2022"
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-primary)]"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor={`location_${item.id}`}
                            className="block text-[11px] font-sans font-medium uppercase tracking-wider text-[var(--theme-text-secondary)] mb-1"
                          >
                            Location (Optional)
                          </label>
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-[var(--theme-text-secondary)] absolute left-2.5 top-2.5" />
                            <input
                              id={`location_${item.id}`}
                              type="text"
                              value={item.location || ""}
                              onChange={(e) =>
                                handleUpdatePhoto(item.id, { location: e.target.value })
                              }
                              placeholder="e.g. Kyoto, Japan or Lake Tahoe"
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-primary)]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Chapter Heading Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor={`chapter_${item.id}`}
                            className="text-[11px] font-sans font-medium uppercase tracking-wider text-[var(--theme-text-secondary)]"
                          >
                            Story Chapter (Optional)
                          </label>
                          {item.chapter && (
                            <button
                              type="button"
                              onClick={() => handleUpdatePhoto(item.id, { chapter: undefined })}
                              className="text-[10px] text-rose-400 hover:underline"
                            >
                              Clear chapter
                            </button>
                          )}
                        </div>

                        {/* Preset Chapter Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {MEMORY_CHAPTER_PRESETS.map((preset) => {
                            const isSelected = item.chapter === preset;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleUpdatePhoto(item.id, { chapter: preset })}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[11px] font-sans font-medium transition-colors border",
                                  isSelected
                                    ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] border-[var(--theme-accent-primary)]"
                                    : "bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)]"
                                )}
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Chapter Text Input */}
                        <input
                          id={`chapter_${item.id}`}
                          type="text"
                          value={item.chapter || ""}
                          onChange={(e) => handleUpdatePhoto(item.id, { chapter: e.target.value })}
                          placeholder="Or enter custom chapter (e.g. College Years, The Road Trip)..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent-primary)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center rounded-2xl border border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)]">
          <ImageIcon className="w-8 h-8 text-[var(--theme-text-secondary)] opacity-30 mx-auto mb-2" />
          <Caption>
            No photos added yet. Upload memories to preview them in Classic Grid, Polaroid, or Timeline mode.
          </Caption>
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
