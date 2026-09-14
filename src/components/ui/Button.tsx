"use client";

import React from "react";
import Link from "next/link";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { microHoverScale } from "@/lib/motion";

const MotionLink = motion.create(Link);

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: "gold-glow" | "champagne-outline" | "solid-ink" | "velvet" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string;
  target?: string;
  rel?: string;
}

export function Button({
  children,
  variant = "gold-glow",
  size = "md",
  className,
  href,
  target,
  rel,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-sans tracking-widest uppercase font-medium transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "text-[10px] px-4 py-2 gap-1.5",
    md: "text-xs px-6 py-3 gap-2",
    lg: "text-xs px-8 py-4 gap-3",
  };

  const variantStyles = {
    "gold-glow":
      "bg-[var(--theme-accent-primary)] text-[var(--token-ink)] box-glow-sm hover:box-glow-lg border border-[var(--theme-accent-primary)]",
    "champagne-outline":
      "bg-transparent text-[var(--theme-text-primary)] border border-[var(--theme-border-strong)] hover:border-[var(--theme-accent-primary)] hover:bg-[var(--theme-border-subtle)]",
    "solid-ink":
      "bg-[var(--theme-bg-card)] text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)]",
    velvet:
      "bg-gradient-to-r from-[var(--theme-bg-card)] to-[var(--theme-bg-secondary)] text-[var(--theme-text-accent)] border border-[var(--theme-border-strong)] hover:shadow-lg",
    ghost:
      "bg-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-border-subtle)]",
  };

  const combinedClasses = cn(baseStyles, sizeStyles[size], variantStyles[variant], className);

  if (href) {
    return (
      <MotionLink
        href={href}
        target={target}
        rel={rel}
        variants={microHoverScale}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        className={combinedClasses}
      >
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button
      variants={microHoverScale}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className={combinedClasses}
      {...props}
    >
      {children}
    </motion.button>
  );
}
