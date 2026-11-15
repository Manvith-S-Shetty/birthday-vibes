"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

function ControlEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams?.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Robust response parsing: never call res.json() unsafely
      let data: any = null;
      try {
        const rawText = await res.text();
        if (rawText && rawText.trim().length > 0) {
          data = JSON.parse(rawText);
        }
      } catch {
        data = null;
      }

      if (!res.ok) {
        if (res.status === 401) {
          setError(data?.error || "Invalid admin credentials.");
        } else if (res.status === 429) {
          setError(data?.error || "Too many failed login attempts. Please wait 15 minutes before trying again.");
        } else if (res.status >= 500) {
          setError("Admin authentication service temporarily unavailable. Please try again shortly.");
        } else {
          setError(data?.error || `Authentication failed (status ${res.status}).`);
        }
        setLoading(false);
        return;
      }

      if (!data || !data.success) {
        setError("Invalid response received from authentication server.");
        setLoading(false);
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch {
      setError("Unable to connect to authentication server. Please check your network and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-strong)] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      {/* Subtle decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[var(--token-champagne)]/10 blur-3xl pointer-events-none rounded-full" />

      <div className="text-center mb-8 relative z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--token-champagne)] text-[var(--token-ink)] flex items-center justify-center font-serif text-2xl font-bold shadow-lg mb-4">
          W
        </div>
        <h1 className="font-serif text-2xl font-semibold tracking-wide text-[var(--token-paper)]">
          Wishlight Admin Portal
        </h1>
        <p className="text-xs text-[var(--theme-text-secondary)] mt-1 tracking-wider uppercase font-mono">
          Private Security & Review Access
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start space-x-3 text-red-300 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[var(--theme-text-secondary)] mb-1.5">
            Authorized Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@wishscene.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] text-sm placeholder-[var(--theme-text-secondary)]/50 focus:outline-none focus:border-[var(--token-champagne)] focus:ring-1 focus:ring-[var(--token-champagne)] transition-all font-sans"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[var(--theme-text-secondary)] mb-1.5">
            Admin Secret Key / Password
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-primary)] text-sm placeholder-[var(--theme-text-secondary)]/50 focus:outline-none focus:border-[var(--token-champagne)] focus:ring-1 focus:ring-[var(--token-champagne)] transition-all font-sans"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[var(--token-champagne)] text-[var(--token-ink)] font-sans font-semibold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Access...</span>
            </>
          ) : (
            <>
              <span>Sign In to Admin Portal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[var(--theme-border-subtle)] text-center text-[11px] font-mono text-[var(--theme-text-secondary)]/70">
        <div className="flex items-center justify-center space-x-1.5">
          <Lock className="w-3 h-3 text-[var(--token-champagne)]" />
          <span>Strict Server-Side Session & Audit Logging</span>
        </div>
        <div className="mt-1">Production Project Ref: kaakwyavwnrbwozqyylv</div>
      </div>
    </div>
  );
}

export default function ControlEntryPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--theme-bg-primary)]">
      <Suspense
        fallback={
          <div className="text-center py-12 text-xs font-mono text-[var(--theme-text-secondary)]">
            Loading authentication portal...
          </div>
        }
      >
        <ControlEntryForm />
      </Suspense>
    </div>
  );
}
