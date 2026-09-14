"use client";

import React, { useState, useEffect } from "react";
import { BirthdayDraft, CreatorStep } from "@/types/draft";
import { localDraftRepository } from "@/lib/draft/LocalDraftRepository";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { ExperienceData } from "@/types/experience";
import { useTheme } from "@/components/themes/ThemeProvider";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

import { StepRecipient } from "./steps/StepRecipient";
import { StepMood } from "./steps/StepMood";
import { StepMemories } from "./steps/StepMemories";
import { StepMessage } from "./steps/StepMessage";
import { StepMusic } from "./steps/StepMusic";
import { StepSecurity } from "./steps/StepSecurity";
import { StepPreview } from "./steps/StepPreview";
import { StepPublishPlaceholder } from "./steps/StepPublishPlaceholder";

import { Sparkles, Eye, X, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STEPS: { id: CreatorStep; label: string; number: string }[] = [
  { id: "recipient", label: "Recipient", number: "01" },
  { id: "mood", label: "Mood", number: "02" },
  { id: "memories", label: "Memories", number: "03" },
  { id: "message", label: "Message", number: "04" },
  { id: "music", label: "Music", number: "05" },
  { id: "security", label: "Security", number: "06" },
  { id: "preview", label: "Preview", number: "07" },
  { id: "publish", label: "Publish", number: "08" },
];

export function CreatorShell({ draftId }: { draftId?: string }) {
  const { setTheme } = useTheme();
  const [draft, setDraft] = useState<BirthdayDraft | null>(null);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load draft on mount / recovery
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setIsLoading(true);
        const loaded = await localDraftRepository.getDraft(draftId);
        if (isMounted && loaded) {
          setDraft(loaded);
          if (loaded.themeId) {
            setTheme(loaded.themeId);
          }
        }
      } catch (err) {
        console.warn("Failed to load Creator Studio draft:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [draftId, setTheme]);

  // Update draft helper + local autosave debounce
  const handleUpdateDraft = async (updates: Partial<BirthdayDraft>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextState = { ...prev, ...updates };
      localDraftRepository.saveDraft(nextState);
      return nextState;
    });
  };

  const handleSetStep = (step: CreatorStep) => {
    handleUpdateDraft({ currentStep: step });
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === (draft?.currentStep || "recipient"));

  const handleNextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      handleSetStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      handleSetStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleStartNewDraft = async () => {
    const created = await localDraftRepository.createDraft();
    setDraft(created);
    setTheme(created.themeId);
  };

  if (isLoading || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
        <div className="text-center space-y-3">
          <Sparkles className="w-8 h-8 text-[var(--theme-accent-primary)] animate-pulse mx-auto" />
          <p className="font-serif text-lg">Opening Creator Studio...</p>
        </div>
      </div>
    );
  }

  // Construct real-time experience data for live preview
  const livePreviewData: ExperienceData = {
    id: draft.id,
    slug: draft.recipientName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "live-preview",
    recipientName: draft.recipientName || "Recipient Name",
    birthdayDate: draft.birthdayDate,
    themeId: draft.themeId,
    personalMessage: draft.personalMessage || "Your personal message will be rendered here...",
    photos: draft.photos,
    musicTitle: draft.musicTitle,
    musicUrl: draft.musicUrl,
    isPinProtected: draft.isPinProtected,
    pin: draft.pin,
    createdAt: draft.createdAt,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] transition-colors duration-500">
      {/* Top Header / Progress Nav */}
      <header className="border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-secondary)]/90 backdrop-blur-md py-3 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg sm:text-xl font-normal text-gold-gradient tracking-wide">
            Wishlight Studio
          </span>
          <span className="text-xs text-[var(--theme-text-secondary)] hidden sm:inline-block border-l border-white/10 pl-3 uppercase tracking-widest font-sans">
            Gift Director
          </span>
        </div>

        {/* Step Indicator Pills */}
        <nav className="hidden lg:flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const isActive = draft.currentStep === s.id;
            const isDone = idx < currentStepIndex;

            return (
              <button
                key={s.id}
                onClick={() => handleSetStep(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-sans transition-all duration-300 min-h-[44px]",
                  isActive
                    ? "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] font-semibold shadow-md"
                    : isDone
                    ? "text-[var(--theme-text-primary)] hover:bg-[var(--theme-border-subtle)]"
                    : "text-[var(--theme-text-secondary)] opacity-60 hover:opacity-100"
                )}
              >
                <span>{s.number}.</span>
                <span>{s.label}</span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--theme-accent-primary)]" />}
              </button>
            );
          })}
        </nav>

        {/* Mobile Preview Trigger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button
            variant="champagne-outline"
            size="sm"
            onClick={() => setIsMobilePreviewOpen(true)}
            className="min-h-[44px]"
          >
            <Eye className="w-4 h-4 mr-1.5" />
            <span>Live Preview</span>
          </Button>
        </div>
      </header>

      {/* Main Studio Body Grid (Desktop: Form + Phone Preview) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl w-full mx-auto p-4 sm:p-8 gap-8 items-start">
        {/* Left / Main Creation Stage Area (Cols 7 on Desktop) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step Progress Bar for Mobile/Tablet */}
          <div className="lg:hidden flex items-center justify-between text-xs text-[var(--theme-text-secondary)] border-b border-white/5 pb-3">
            <span>
              Stage {currentStepIndex + 1} of {STEPS.length}:{" "}
              <strong className="text-[var(--theme-text-primary)]">
                {STEPS[currentStepIndex].label}
              </strong>
            </span>
            <span>{Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%</span>
          </div>

          <div className="min-h-[480px]">
            {draft.currentStep === "recipient" && (
              <StepRecipient draft={draft} onUpdate={handleUpdateDraft} onNext={handleNextStep} />
            )}
            {draft.currentStep === "mood" && (
              <StepMood
                draft={draft}
                onUpdate={handleUpdateDraft}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}
            {draft.currentStep === "memories" && (
              <StepMemories
                draft={draft}
                onUpdate={handleUpdateDraft}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}
            {draft.currentStep === "message" && (
              <StepMessage
                draft={draft}
                onUpdate={handleUpdateDraft}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}
            {draft.currentStep === "music" && (
              <StepMusic
                draft={draft}
                onUpdate={handleUpdateDraft}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}
            {draft.currentStep === "security" && (
              <StepSecurity
                draft={draft}
                onUpdate={handleUpdateDraft}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
              />
            )}
            {draft.currentStep === "preview" && (
              <StepPreview draft={draft} onNext={handleNextStep} onPrev={handlePrevStep} />
            )}
            {draft.currentStep === "publish" && (
              <StepPublishPlaceholder
                draft={draft}
                onPrev={handlePrevStep}
                onStartNew={handleStartNewDraft}
              />
            )}
          </div>
        </div>

        {/* Right Desktop Phone Preview Frame (Cols 5 on Desktop) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-24">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
              <span className="uppercase tracking-widest font-sans font-medium text-[var(--theme-text-accent)]">
                Live Phone Preview
              </span>
              <span className="text-[10px] opacity-70">Real-time Draft Sync</span>
            </div>

            {/* Realistic Smartphone Chassis Frame */}
            <div className="relative mx-auto w-full max-w-[360px] h-[640px] rounded-[40px] border-[6px] border-[var(--theme-border-strong)] bg-black overflow-hidden shadow-2xl box-glow-sm">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-[var(--theme-border-strong)] rounded-b-xl z-20" />

              <div className="w-full h-full overflow-y-auto">
                <ExperienceRenderer data={livePreviewData} isPreview />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fullscreen Preview Sheet Modal */}
      {isMobilePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-fade-in">
          <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/60">
            <span className="font-serif text-sm text-[var(--theme-text-primary)]">
              Live Recipient Preview
            </span>
            <button
              onClick={() => setIsMobilePreviewOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ExperienceRenderer data={livePreviewData} isPreview />
          </div>
        </div>
      )}
    </div>
  );
}
