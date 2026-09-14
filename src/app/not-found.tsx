import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--token-ink,#0A0A0B)] text-[var(--token-ivory,#FAF9F5)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-stone-900/80 text-amber-300 flex items-center justify-center mx-auto shadow-xl">
          <svg className="w-8 h-8 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold font-sans">
            404 • Experience Unavailable
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-amber-200">
            This Wishlight Gift is Unavailable
          </h1>
          <p className="text-stone-400 text-sm leading-relaxed font-sans max-w-sm mx-auto">
            The gift link may be incorrect, unpublished, or has been updated by the creator.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-lg"
          >
            Return Home
          </Link>
          <Link
            href="/create"
            className="px-6 py-3 border border-amber-500/40 bg-stone-900 hover:bg-stone-800 text-amber-200 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors"
          >
            Create a Gift
          </Link>
        </div>
      </div>
    </div>
  );
}
