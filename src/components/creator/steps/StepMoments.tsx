"use client";

import React, { useState } from "react";
import { BirthdayDraft } from "@/types/draft";
import {
  InteractiveMomentData,
  MomentType,
  MysteryGiftConfig,
  MemoryQuizConfig,
  BirthdayRouletteConfig,
  HiddenMessageConfig,
  BirthdayCouponConfig,
  CountdownConfig,
  WishMomentConfig,
} from "@/types/experience";
import { Heading, Body, Eyebrow, Caption } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import {
  Gift,
  HelpCircle,
  Dices,
  EyeOff,
  Ticket,
  Clock,
  Wand2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepMomentsProps {
  draft: BirthdayDraft;
  onUpdate: (updates: Partial<BirthdayDraft>) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface MomentDefinition {
  type: MomentType;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultConfig: any;
}

const MOMENT_DEFINITIONS: MomentDefinition[] = [
  {
    type: "mystery_gift",
    title: "Mystery Gift Box",
    description: "A surprise digital gift box the recipient unwrap by tapping.",
    icon: Gift,
    defaultConfig: {
      title: "A Special Gift",
      giftText: "Happy Birthday! Here is your special surprise.",
      buttonLabel: "Open Gift",
    } as MysteryGiftConfig,
  },
  {
    type: "memory_quiz",
    title: "Memory Quiz Trivia",
    description: "Test their memory with a personalized trivia question.",
    icon: HelpCircle,
    defaultConfig: {
      question: "Do you remember where this photo was taken?",
      options: [
        { id: "opt_1", text: "On our summer trip", isCorrect: true },
        { id: "opt_2", text: "At home", isCorrect: false },
      ],
      explanation: "That weekend was truly unforgettable!",
    } as MemoryQuizConfig,
  },
  {
    type: "birthday_roulette",
    title: "Birthday Surprise Roulette",
    description: "A fun wheel for the recipient to spin for a surprise.",
    icon: Dices,
    defaultConfig: {
      title: "Spin for a Birthday Surprise",
      options: [
        { id: "r_1", label: "Free Coffee & Donut", description: "On me next time we meet!" },
        { id: "r_2", label: "Movie Night Pick", description: "You get total control of the remote." },
        { id: "r_3", label: "Big Birthday Hug", description: "Redeemable anytime." },
        { id: "r_4", label: "Home Cooked Dinner", description: "Your favorite meal, cooked by me." },
        { id: "r_5", label: "Weekend Getaway", description: "A fun day trip together." },
        { id: "r_6", label: "Wildcard Surprise", description: "Anything you wish for!" },
      ],
    } as BirthdayRouletteConfig,
  },
  {
    type: "hidden_message",
    title: "Hidden Secret Message",
    description: "A secret message revealed through interactive scratch or tap.",
    icon: EyeOff,
    defaultConfig: {
      teaserText: "Tap or hold to reveal a secret note...",
      hiddenMessage: "You mean the absolute world to me. Happy Birthday!",
      revealType: "tap",
    } as HiddenMessageConfig,
  },
  {
    type: "birthday_coupon",
    title: "Birthday Coupon / Voucher",
    description: "A redeemable digital gift voucher from you.",
    icon: Ticket,
    defaultConfig: {
      couponTitle: "One Dinner of Your Choice",
      couponDescription: "Valid for any restaurant, any time this year!",
      terms: "No expiration date.",
      code: "BDAY-2026",
    } as BirthdayCouponConfig,
  },
  {
    type: "countdown",
    title: "Birthday Countdown",
    description: "A countdown timer anticipating the birthday date.",
    icon: Clock,
    defaultConfig: {
      targetDate: new Date().toISOString().split("T")[0],
      preBirthdayMessage: "Counting down to your special day!",
      onBirthdayMessage: "Today is your day! Celebrate big!",
      postBirthdayMessage: "Hope your birthday was unforgettable!",
    } as CountdownConfig,
  },
  {
    type: "wish_moment",
    title: "Wish Sealing Sequence",
    description: "A quiet moment guiding the recipient to make a wish.",
    icon: Wand2,
    defaultConfig: {
      promptText: "Close your eyes, take a breath, and make your birthday wish...",
      sealedMessage: "Your wish has been sealed ✨",
    } as WishMomentConfig,
  },
];

export function StepMoments({ draft, onUpdate, onNext, onPrev }: StepMomentsProps) {
  const currentMoments = draft.moments || [];
  const [expandedType, setExpandedType] = useState<MomentType | null>(null);

  const getMomentState = (type: MomentType): InteractiveMomentData | undefined => {
    return currentMoments.find((m) => m.momentType === type);
  };

  const isEnabled = (type: MomentType): boolean => {
    const found = getMomentState(type);
    return !!found && found.enabled;
  };

  const handleToggleMoment = (def: MomentDefinition) => {
    const existing = getMomentState(def.type);
    let updated: InteractiveMomentData[];

    if (existing) {
      updated = currentMoments.map((m) =>
        m.momentType === def.type ? { ...m, enabled: !m.enabled } : m
      );
    } else {
      let initialConfig = { ...def.defaultConfig };
      if (def.type === "countdown" && draft.birthdayDate) {
        initialConfig.targetDate = draft.birthdayDate;
      }
      const newMoment: InteractiveMomentData = {
        id: `mom_${def.type}_${Date.now()}`,
        momentType: def.type,
        config: initialConfig,
        sortOrder: currentMoments.length + 1,
        enabled: true,
      };
      updated = [...currentMoments, newMoment];
    }

    // Re-index sort order
    const reindexed = updated.map((m, idx) => ({ ...m, sortOrder: idx + 1 }));
    onUpdate({ moments: reindexed });

    if (!isEnabled(def.type)) {
      setExpandedType(def.type);
    }
  };

  const handleUpdateConfig = (type: MomentType, newConfigPartial: any) => {
    const updated = currentMoments.map((m) => {
      if (m.momentType === type) {
        return {
          ...m,
          config: { ...m.config, ...newConfigPartial },
        };
      }
      return m;
    });
    onUpdate({ moments: updated });
  };

  const handleMove = (type: MomentType, direction: "up" | "down") => {
    const enabledList = currentMoments.filter((m) => m.enabled);
    const index = enabledList.findIndex((m) => m.momentType === type);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= enabledList.length) return;

    const reordered = [...enabledList];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const newMoments = currentMoments.map((m) => {
      const newPos = reordered.findIndex((r) => r.id === m.id);
      if (newPos !== -1) {
        return { ...m, sortOrder: newPos + 1 };
      }
      return m;
    });

    onUpdate({ moments: newMoments });
  };

  const activeCount = currentMoments.filter((m) => m.enabled).length;

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">
      <div className="space-y-3 text-center sm:text-left">
        <Eyebrow>Step 07 — Interactive Moments</Eyebrow>
        <Heading className="text-3xl sm:text-4xl">Add Interactive Surprises</Heading>
        <Body>
          Choose interactive moments to weave into their experience. Each moment invites your recipient to actively participate.
        </Body>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)] px-1">
          <span>{activeCount} of {MOMENT_DEFINITIONS.length} moments active</span>
          <span>Optional — enable as many as you like</span>
        </div>

        <div className="space-y-3">
          {MOMENT_DEFINITIONS.map((def) => {
            const momentState = getMomentState(def.type);
            const active = !!momentState && momentState.enabled;
            const Icon = def.icon;
            const isExpanded = expandedType === def.type;
            const config = momentState?.config || def.defaultConfig;

            return (
              <div
                key={def.type}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  active
                    ? "bg-[var(--theme-bg-card)] border-[var(--theme-border-strong)] shadow-md"
                    : "bg-[var(--theme-bg-card)]/40 border-white/5 opacity-80 hover:opacity-100"
                )}
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        active
                          ? "bg-[var(--theme-text-accent)]/15 text-[var(--theme-text-accent)]"
                          : "bg-white/5 text-[var(--theme-text-secondary)]"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base text-[var(--theme-text-primary)] truncate">
                          {def.title}
                        </h4>
                        {active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-text-accent)]/20 text-[var(--theme-text-accent)] font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--theme-text-secondary)] truncate">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {active && (
                      <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
                        <button
                          type="button"
                          onClick={() => handleMove(def.type, "up")}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--theme-text-secondary)] transition-colors"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(def.type, "down")}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--theme-text-secondary)] transition-colors"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <Button
                      variant={active ? "champagne-outline" : "ghost"}
                      size="sm"
                      onClick={() => handleToggleMoment(def)}
                      className="min-h-[36px]"
                    >
                      {active ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>Enable</span>
                        </>
                      )}
                    </Button>

                    {active && (
                      <button
                        type="button"
                        onClick={() => setExpandedType(isExpanded ? null : def.type)}
                        className="p-2 rounded-lg hover:bg-white/10 text-[var(--theme-text-secondary)] transition-colors"
                        title="Configure settings"
                      >
                        <ChevronDown
                          className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Configuration Drawer */}
                {active && isExpanded && (
                  <div className="border-t border-white/10 p-5 bg-black/20 space-y-4 animate-fade-in">
                    <h5 className="text-xs font-serif uppercase tracking-widest text-[var(--theme-text-accent)]">
                      Configure {def.title}
                    </h5>

                    {/* Mystery Gift Config */}
                    {def.type === "mystery_gift" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Gift Header / Title</label>
                          <input
                            type="text"
                            value={config.title || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { title: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Surprise Gift Message</label>
                          <textarea
                            value={config.giftText || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { giftText: e.target.value })}
                            rows={3}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)] resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Button Label</label>
                          <input
                            type="text"
                            value={config.buttonLabel || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { buttonLabel: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Memory Quiz Config */}
                    {def.type === "memory_quiz" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Question Prompt</label>
                          <input
                            type="text"
                            value={config.question || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { question: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Quiz Options</label>
                          <div className="space-y-2">
                            {(config.options || []).map((opt: any, optIdx: number) => (
                              <div key={opt.id} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`quiz_correct_${def.type}`}
                                  checked={opt.isCorrect}
                                  onChange={() => {
                                    const updatedOpts = config.options.map((o: any) => ({
                                      ...o,
                                      isCorrect: o.id === opt.id,
                                    }));
                                    handleUpdateConfig(def.type, { options: updatedOpts });
                                  }}
                                  title="Mark as correct answer"
                                />
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const updatedOpts = [...config.options];
                                    updatedOpts[optIdx] = { ...opt, text: e.target.value };
                                    handleUpdateConfig(def.type, { options: updatedOpts });
                                  }}
                                  className="flex-1 bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-[var(--theme-text-primary)]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Explanation Message</label>
                          <input
                            type="text"
                            value={config.explanation || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { explanation: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Birthday Roulette Config */}
                    {def.type === "birthday_roulette" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Roulette Header Title</label>
                          <input
                            type="text"
                            value={config.title || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { title: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Roulette Items</label>
                          <div className="space-y-2">
                            {(config.options || []).map((opt: any, optIdx: number) => (
                              <div key={opt.id} className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Option Title"
                                  value={opt.label}
                                  onChange={(e) => {
                                    const updatedOpts = [...config.options];
                                    updatedOpts[optIdx] = { ...opt, label: e.target.value };
                                    handleUpdateConfig(def.type, { options: updatedOpts });
                                  }}
                                  className="bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-[var(--theme-text-primary)]"
                                />
                                <input
                                  type="text"
                                  placeholder="Short Description"
                                  value={opt.description || ""}
                                  onChange={(e) => {
                                    const updatedOpts = [...config.options];
                                    updatedOpts[optIdx] = { ...opt, description: e.target.value };
                                    handleUpdateConfig(def.type, { options: updatedOpts });
                                  }}
                                  className="bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-1.5 text-sm text-[var(--theme-text-primary)]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hidden Message Config */}
                    {def.type === "hidden_message" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Teaser Prompt</label>
                          <input
                            type="text"
                            value={config.teaserText || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { teaserText: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Hidden Secret Message</label>
                          <textarea
                            value={config.hiddenMessage || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { hiddenMessage: e.target.value })}
                            rows={3}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)] resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Birthday Coupon Config */}
                    {def.type === "birthday_coupon" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Voucher Title</label>
                          <input
                            type="text"
                            value={config.couponTitle || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { couponTitle: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Description</label>
                          <input
                            type="text"
                            value={config.couponDescription || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { couponDescription: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Countdown Config */}
                    {def.type === "countdown" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Target Date</label>
                          <input
                            type="date"
                            value={config.targetDate || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { targetDate: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Wish Moment Config */}
                    {def.type === "wish_moment" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[var(--theme-text-secondary)] mb-1 block">Prompt Text</label>
                          <input
                            type="text"
                            value={config.promptText || ""}
                            onChange={(e) => handleUpdateConfig(def.type, { promptText: e.target.value })}
                            className="w-full bg-[var(--theme-bg-primary)] border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--theme-text-primary)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between">
        <Button variant="ghost" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back</span>
        </Button>
        <Button variant="gold-glow" size="lg" onClick={onNext}>
          <span>Passcode & Security</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
