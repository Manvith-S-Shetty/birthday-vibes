"use client";

import React from "react";
import { ExperienceData } from "@/types/experience";
import { RecipientSceneId } from "./ExperienceRenderer";
import { LockedCoverScene } from "./scenes/LockedCoverScene";
import { CinematicIntroScene } from "./scenes/CinematicIntroScene";
import { MemoryWallScene } from "./scenes/MemoryWallScene";
import { LetterScene } from "./scenes/LetterScene";
import { MysteryGiftScene } from "./scenes/MysteryGiftScene";
import { MemoryQuizScene } from "./scenes/MemoryQuizScene";
import { BirthdayRouletteScene } from "./scenes/BirthdayRouletteScene";
import { HiddenMessageScene } from "./scenes/HiddenMessageScene";
import { BirthdayCouponScene } from "./scenes/BirthdayCouponScene";
import { CountdownScene } from "./scenes/CountdownScene";
import { WishMomentScene } from "./scenes/WishMomentScene";
import { CakeCandlesScene } from "./scenes/CakeCandlesScene";
import { FinaleScene } from "./scenes/FinaleScene";

export interface ExperienceSceneSwitchProps {
  data: ExperienceData;
  activeSceneId: RecipientSceneId;
  isUnlocked: boolean;
  isPlayingVoice: boolean;
  onUnlock: () => void;
  onNext: (currentScene: RecipientSceneId) => void;
  onPrev: (currentScene: RecipientSceneId) => void;
  onToggleVoice: () => void;
  onReplay: () => void;
}

export function ExperienceSceneSwitch({
  data,
  activeSceneId,
  isUnlocked,
  isPlayingVoice,
  onUnlock,
  onNext,
  onPrev,
  onToggleVoice,
  onReplay,
}: ExperienceSceneSwitchProps) {
  if (!isUnlocked || activeSceneId === "locked") {
    return <LockedCoverScene data={data} onUnlock={onUnlock} />;
  }

  switch (activeSceneId) {
    case "intro":
      return <CinematicIntroScene data={data} onNext={() => onNext("intro")} />;
    case "memories":
      return (
        <MemoryWallScene
          data={data}
          onNext={() => onNext("memories")}
          onPrev={() => onPrev("memories")}
        />
      );
    case "letter":
      return (
        <LetterScene
          data={data}
          onNext={() => onNext("letter")}
          onPrev={() => onPrev("letter")}
          isPlayingVoice={isPlayingVoice}
          onToggleVoice={onToggleVoice}
        />
      );
    case "mystery_gift":
      return (
        <MysteryGiftScene
          data={data}
          onNext={() => onNext("mystery_gift")}
          onPrev={() => onPrev("mystery_gift")}
        />
      );
    case "memory_quiz":
      return (
        <MemoryQuizScene
          data={data}
          onNext={() => onNext("memory_quiz")}
          onPrev={() => onPrev("memory_quiz")}
        />
      );
    case "birthday_roulette":
      return (
        <BirthdayRouletteScene
          data={data}
          onNext={() => onNext("birthday_roulette")}
          onPrev={() => onPrev("birthday_roulette")}
        />
      );
    case "hidden_message":
      return (
        <HiddenMessageScene
          data={data}
          onNext={() => onNext("hidden_message")}
          onPrev={() => onPrev("hidden_message")}
        />
      );
    case "birthday_coupon":
      return (
        <BirthdayCouponScene
          data={data}
          onNext={() => onNext("birthday_coupon")}
          onPrev={() => onPrev("birthday_coupon")}
        />
      );
    case "countdown":
      return (
        <CountdownScene
          data={data}
          onNext={() => onNext("countdown")}
          onPrev={() => onPrev("countdown")}
        />
      );
    case "wish_moment":
      return (
        <WishMomentScene
          data={data}
          onNext={() => onNext("wish_moment")}
          onPrev={() => onPrev("wish_moment")}
        />
      );
    case "cake":
      return (
        <CakeCandlesScene
          data={data}
          onNext={() => onNext("cake")}
          onPrev={() => onPrev("cake")}
        />
      );
    case "finale":
    default:
      return <FinaleScene data={data} onReplay={onReplay} />;
  }
}
