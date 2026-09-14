"use client";

import React, { useState, useEffect } from "react";
import { BirthdayDraft } from "@/types/draft";
import { Display, Body, Eyebrow } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { Check, Lock, ArrowLeft, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { publishExperience } from "@/app/actions/experienceActions";
import { ShareDialog } from "@/components/share/ShareDialog";
import { QRCodeCard } from "@/components/share/QRCodeCard";

interface StepPublishPlaceholderProps {
  draft: BirthdayDraft;
  onPrev: () => void;
  onStartNew: () => void;
}

export function StepPublishPlaceholder({ draft, onPrev, onStartNew }: StepPublishPlaceholderProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ slug?: string; shareUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handlePublish() {
      if (publishResult) return;
      setIsPublishing(true);
      setError(null);

      const res = await publishExperience(draft);
      if (res.success && res.slug && res.shareUrl) {
        setPublishResult({ slug: res.slug, shareUrl: res.shareUrl });
      } else {
        setError(res.error || "Failed to publish experience. Please try again.");
      }
      setIsPublishing(false);
    }

    handlePublish();
  }, [draft.id, publishResult]);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const slug = publishResult?.slug || draft.recipientName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "gift";
  const shareUrl = publishResult?.shareUrl || `${origin}/g/${slug}`;

  return (
    <div className="space-y-8 animate-fade-in max-w-xl mx-auto text-center py-6">
      <div className="w-16 h-16 rounded-full bg-[var(--theme-accent-primary)] text-[var(--token-ink)] flex items-center justify-center mx-auto box-glow-lg">
        {isPublishing ? (
          <Loader2 className="w-8 h-8 stroke-[2.5] animate-spin" />
        ) : (
          <Check className="w-8 h-8 stroke-[3]" />
        )}
      </div>

      <div className="space-y-3">
        <Eyebrow>Step 08 • Complete & Shared</Eyebrow>
        <Display gradient className="text-3xl sm:text-4xl">
          {isPublishing ? "Publishing your gift..." : "Your Wishlight gift is ready"}
        </Display>
        <Body>
          You have crafted a personalized cinematic digital gift for{" "}
          <strong className="text-[var(--theme-text-primary)]">{draft.recipientName}</strong>.
        </Body>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/40 text-red-300 text-xs font-sans text-left">
          <strong>Publish Notice:</strong> {error}
        </div>
      )}

      {/* Security PIN Warning Box */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs font-sans text-left space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Passcode Protected</span>
        </div>
        <p className="text-stone-300 leading-relaxed">
          This gift is protected by your 4-digit passcode ({draft.pin || "Set"}). Send the passcode to{" "}
          <strong>{draft.recipientName}</strong> separately over text or chat. The passcode is <strong>NEVER</strong> encoded inside the share link or QR code.
        </p>
      </div>

      {/* Share Actions Box */}
      <ShareDialog shareUrl={shareUrl} recipientName={draft.recipientName} />

      {/* Printable QR Code Card */}
      <QRCodeCard url={shareUrl} recipientName={draft.recipientName} slug={slug} />

      {/* Navigation & Controls */}
      <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
        <a
          href={`/g/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors"
        >
          <span>Preview Experience</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        <Button variant="champagne-outline" size="md" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Edit Draft</span>
        </Button>

        <Button variant="gold-glow" size="md" onClick={onStartNew}>
          <RefreshCw className="w-4 h-4 mr-1" />
          <span>Create Another Gift</span>
        </Button>
      </div>
    </div>
  );
}
