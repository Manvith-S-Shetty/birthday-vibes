"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0B] text-[#FAF9F5] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md space-y-5">
          <div className="w-16 h-16 rounded-full border border-amber-500/30 bg-stone-900/80 text-amber-400 flex items-center justify-center mx-auto shadow-xl">
            <svg className="w-8 h-8 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-amber-200">Something went wrong</h1>
          <p className="text-stone-400 text-sm leading-relaxed">
            An unexpected error occurred while loading this page.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-6 py-2.5 border border-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors"
            >
              Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
