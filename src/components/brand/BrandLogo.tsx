import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  variant?: "lockup" | "mark" | "wordmark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "lockup",
  size = "md",
  className = "",
}) => {
  const sizeMap = {
    sm: { width: 120, height: 32, icon: 28, text: "text-base" },
    md: { width: 160, height: 44, icon: 36, text: "text-xl" },
    lg: { width: 220, height: 60, icon: 48, text: "text-2xl" },
  };

  const currentSize = sizeMap[size];

  if (variant === "mark") {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <Image
          src="/logo.png"
          alt="Birthday Vibes"
          width={currentSize.icon}
          height={currentSize.icon}
          className="object-contain rounded-full shadow-lg border border-amber-500/20"
          priority
        />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={`font-serif font-bold tracking-wide bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent ${currentSize.text} ${className}`}
      >
        Birthday Vibes
      </span>
    );
  }

  // Lockup (Icon + Typography)
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt="Birthday Vibes"
        width={currentSize.icon}
        height={currentSize.icon}
        className="object-contain rounded-full shadow-md border border-amber-500/30"
        priority
      />
      <div className="flex flex-col">
        <span
          className={`font-serif font-bold tracking-tight bg-gradient-to-r from-amber-100 via-amber-300 to-amber-200 bg-clip-text text-transparent leading-none ${currentSize.text}`}
        >
          Birthday Vibes
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-amber-400/70 font-sans mt-0.5">
          Cinematic Experience
        </span>
      </div>
    </div>
  );
};
