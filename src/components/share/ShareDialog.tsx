"use client";

import React, { useState } from "react";

interface ShareDialogProps {
  shareUrl: string;
  recipientName: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ shareUrl, recipientName }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback input select
      const input = document.getElementById("wishlight-share-url-input") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `A Birthday Gift for ${recipientName} — Birthday Vibes`,
          text: `I created a private cinematic birthday gift for ${recipientName}. Take a look!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }
  };

  const whatsappMessage = encodeURIComponent(
    `✨ I created a private cinematic birthday gift for ${recipientName}. Open the link to unlock: ${shareUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/80 p-6 backdrop-blur-md space-y-6">
      <div>
        <label className="block text-xs uppercase tracking-widest text-stone-400 font-semibold mb-2">
          Private Experience Link
        </label>
        <div className="flex items-center gap-2">
          <input
            id="wishlight-share-url-input"
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5 text-sm text-stone-200 font-mono focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-medium text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800/80">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.553 4.197 1.604 6.02L.03 24l6.096-1.579a11.966 11.966 0 005.905 1.54h.005c6.645 0 12.03-5.385 12.03-12.03 0-3.216-1.252-6.241-3.524-8.514A11.948 11.948 0 0012.031 0zm0 21.963h-.004a9.934 9.934 0 01-5.064-1.39l-.363-.216-3.765.974.992-3.67-.236-.376a9.957 9.957 0 01-1.528-5.254c0-5.495 4.47-9.965 9.966-9.965 2.662 0 5.165 1.036 7.045 2.917a9.914 9.914 0 012.913 7.043c0 5.496-4.47 9.966-9.956 9.966z" />
          </svg>
          Share on WhatsApp
        </a>

        {typeof window !== "undefined" && typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleNativeShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Mobile Share
          </button>
        )}
      </div>
    </div>
  );
};
