import React from "react";
import { cn } from "@/lib/utils/cn";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  gradient?: boolean;
}

export function Display({ children, as: Component = "h1", className, gradient, ...props }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight leading-[1.08]",
        gradient ? "text-gold-gradient" : "text-[var(--theme-text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Heading({ children, as: Component = "h2", className, gradient, ...props }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-serif text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight leading-[1.15]",
        gradient ? "text-gold-gradient" : "text-[var(--theme-text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Eyebrow({ children, as: Component = "span", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-sans text-xs uppercase tracking-[0.25em] font-medium text-[var(--theme-text-accent)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Body({ children, as: Component = "p", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-sans text-base sm:text-lg font-light leading-relaxed text-[var(--theme-text-secondary)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function Caption({ children, as: Component = "span", className, ...props }: TypographyProps) {
  return (
    <Component
      className={cn(
        "font-sans text-xs sm:text-sm font-light leading-normal text-[var(--theme-text-secondary)] opacity-80",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
