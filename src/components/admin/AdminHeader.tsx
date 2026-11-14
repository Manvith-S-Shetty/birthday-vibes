"use client";

import React from "react";
import Link from "next/link";
import { Shield, Database, Lock } from "lucide-react";

interface AdminHeaderProps {
  userEmail: string;
}

export default function AdminHeader({ userEmail }: AdminHeaderProps) {
  return (
    <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-primary)]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] text-[10px] font-mono text-[var(--token-champagne)]">
          <Shield className="w-3 h-3 text-[var(--token-champagne)]" />
          <span>PRODUCTION OWNER SESSION</span>
        </span>
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[10px] font-mono text-emerald-400">
          <Database className="w-3 h-3" />
          <span>REF: kaakwyavwnrbwozqyylv</span>
        </span>
      </div>

      <div className="flex items-center space-x-4 text-xs">
        <div className="flex items-center space-x-1.5 text-[var(--theme-text-secondary)] font-mono text-[11px]">
          <Lock className="w-3.5 h-3.5 text-[var(--token-champagne)]" />
          <span>RLS & SERVICE ROLE ENFORCED</span>
        </div>
      </div>
    </header>
  );
}
