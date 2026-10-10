"use client";

import React, { useState } from "react";
import { ExperienceData, MemoryQuizConfig } from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface MemoryQuizSceneProps {
  data: ExperienceData;
  onNext: () => void;
  onPrev: () => void;
}

export function MemoryQuizScene({ data, onNext, onPrev }: MemoryQuizSceneProps) {
  const quizMoment = data.moments?.find(
    (m) => m.momentType === "memory_quiz" && m.enabled !== false
  );
  const config = (quizMoment?.config || {}) as MemoryQuizConfig;

  const question = config.question || "Do you remember this special memory?";
  const options = config.options && config.options.length > 0
    ? config.options
    : [
        { id: "opt_1", text: "On our summer trip", isCorrect: true },
        { id: "opt_2", text: "At home celebrating", isCorrect: false },
      ];
  const explanation = config.explanation || "That moment holds a special place in our story.";
  const photoUrl = config.photoUrl;

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);

  const selectedOption = options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOption?.isCorrect ?? false;

  const handleSelectOption = (id: string) => {
    if (hasAnswered && isCorrect) return; // Freeze if already correctly answered
    setSelectedOptionId(id);
    setHasAnswered(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-8 space-y-8 animate-fade-in max-w-2xl mx-auto text-center">
      {/* Header */}
      <div className="space-y-3 pt-6">
        <Eyebrow>Memory Quiz</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">Do You Remember?</Heading>
        <Body>
          A quick trivia memory. Select the answer you think is right!
        </Body>
      </div>

      {/* Main Quiz Stage */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-4 space-y-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-3xl border border-[var(--theme-border-strong)] bg-[var(--theme-bg-card)] p-6 sm:p-8 shadow-2xl space-y-6 box-glow-md"
        >
          {/* Optional Photo Attachment */}
          {photoUrl && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10">
              <img
                src={photoUrl}
                alt="Quiz Memory"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs font-serif text-[var(--theme-text-accent)] uppercase tracking-widest font-semibold">
            <HelpCircle className="w-4 h-4" />
            <span>Trivia Question</span>
          </div>

          <h3 className="font-serif text-xl sm:text-2xl text-[var(--theme-text-primary)] font-bold leading-relaxed">
            {question}
          </h3>

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const showState = hasAnswered && isSelected;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectOption(option.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between gap-3 min-h-[52px]",
                    !hasAnswered && "hover:border-[var(--theme-accent-primary)] hover:bg-white/5 border-white/10 bg-black/20",
                    showState && option.isCorrect && "border-emerald-500 bg-emerald-500/15 text-emerald-200 box-glow-sm",
                    showState && !option.isCorrect && "border-rose-500 bg-rose-500/15 text-rose-200",
                    hasAnswered && !isSelected && option.isCorrect && "border-emerald-500/50 bg-emerald-500/5 opacity-80"
                  )}
                >
                  <span className="font-serif text-base text-[var(--theme-text-primary)]">
                    {option.text}
                  </span>
                  {showState && (
                    <span className="shrink-0">
                      {option.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Result Feedback Banner */}
          <AnimatePresence mode="wait">
            {hasAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "p-4 rounded-2xl border text-sm space-y-1.5",
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                )}
              >
                <div className="flex items-center justify-center gap-1.5 font-semibold">
                  {isCorrect ? (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>That&apos;s Spot On! 🎉</span>
                    </>
                  ) : (
                    <span>Not quite, but close! Try another option.</span>
                  )}
                </div>
                {explanation && <Caption className="text-xs opacity-90">{explanation}</Caption>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation Footer */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-xl pb-4">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
