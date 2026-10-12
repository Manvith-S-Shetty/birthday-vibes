"use client";
import { VoiceRecordingCache } from "@/lib/draft/VoiceRecordingCache";
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

const PUBLISHED_CACHE = new Map<string, { slug: string; shareUrl: string }>();
const IN_FLIGHT_PUBLISH = new Map<string, Promise<{ success: boolean; slug?: string; shareUrl?: string; error?: string }>>();

export function StepPublishPlaceholder({ draft, onPrev, onStartNew }: StepPublishPlaceholderProps) {
  const [isPublishing, setIsPublishing] = useState(() => !PUBLISHED_CACHE.has(draft.id));
  const [publishResult, setPublishResult] = useState<{ slug?: string; shareUrl?: string } | null>(
    () => PUBLISHED_CACHE.get(draft.id) || null
  );
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (PUBLISHED_CACHE.has(draft.id)) {
      setPublishResult(PUBLISHED_CACHE.get(draft.id)!);
      setIsPublishing(false);
      return;
    }

    async function handlePublish() {
      setIsPublishing(true);
      setError(null);

      try {
        let publishPromise = IN_FLIGHT_PUBLISH.get(draft.id);
        if (!publishPromise) {
          const voiceRecording = VoiceRecordingCache.get(draft.id);
          publishPromise = publishExperience(draft, voiceRecording?.blob);
          IN_FLIGHT_PUBLISH.set(draft.id, publishPromise);
        }

        const res = await publishPromise;

        if (res.success && res.slug && res.shareUrl) {
          const cached = { slug: res.slug, shareUrl: res.shareUrl };
          PUBLISHED_CACHE.set(draft.id, cached);
          if (isMountedRef.current) {
            setPublishResult(cached);
          }
        } else {
          console.error("[PUBLISH_DIAG] Publish returned error:", res.error);
          if (isMountedRef.current) {
            setError(res.error || "Failed to publish experience. Please try again.");
          }
        }
      } catch (err: any) {
        console.error("[PUBLISH_DIAG] Exception caught in StepPublishPlaceholder:", err);
        if (isMountedRef.current) {
          setError(err?.message || "Failed to publish experience. Please try again.");
        }
      } finally {
        IN_FLIGHT_PUBLISH.delete(draft.id);
        if (isMountedRef.current) {
          setIsPublishing(false);
        }
      }
    }

    handlePublish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const handleRetry = () => {
    console.log("[PUBLISH_DIAG] Manual retry requested for draft ID:", draft.id);
    IN_FLIGHT_PUBLISH.delete(draft.id);
    PUBLISHED_CACHE.delete(draft.id);
    setError(null);
    setIsPublishing(true);

    const voiceRecording = VoiceRecordingCache.get(draft.id);
    const retryPromise = publishExperience(draft, voiceRecording?.blob);
    IN_FLIGHT_PUBLISH.set(draft.id, retryPromise);

    retryPromise
      .then((res) => {
        if (res.success && res.slug && res.shareUrl) {
          const cached = { slug: res.slug, shareUrl: res.shareUrl };
          PUBLISHED_CACHE.set(draft.id, cached);
          if (isMountedRef.current) {
            setPublishResult(cached);
          }
        } else {
          if (isMountedRef.current) {
            setError(res.error || "Failed to publish experience. Please try again.");
          }
        }
      })
      .catch((err: any) => {
        console.error("[PUBLISH_DIAG] Retry exception caught:", err);
        if (isMountedRef.current) {
          setError(err?.message || "Failed to publish experience. Please try again.");
        }
      })
      .finally(() => {
        IN_FLIGHT_PUBLISH.delete(draft.id);
        if (isMountedRef.current) {
          setIsPublishing(false);
        }
      });
  };

  const isSuccess = !!publishResult?.shareUrl;
  const slug = publishResult?.slug;
  const shareUrl = publishResult?.shareUrl;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-xl mx-auto text-center py-4 sm:py-6 px-2 sm:px-0">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--theme-accent-primary)] text-[var(--token-ink)] flex items-center justify-center mx-auto box-glow-lg shrink-0">
        {isPublishing ? (
          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] animate-spin" />
        ) : error && !isSuccess ? (
          <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5] text-rose-300" />
        ) : (
          <Check className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
        )}
      </div>

      <div className="space-y-2 sm:space-y-3">
        <Eyebrow>Step 10 • Complete & Shared</Eyebrow>
        <Display gradient className="text-2xl sm:text-4xl">
          {isPublishing
            ? "Publishing your gift..."
            : error && !isSuccess
            ? "Publishing Issue Encountered"
            : "Your Wishlight gift is ready"}
        </Display>
        <Body className="text-xs sm:text-sm max-w-md mx-auto">
          You have crafted a personalized cinematic digital gift for{" "}
          <strong className="text-[var(--theme-text-primary)]">{draft.recipientName}</strong>.
        </Body>
      </div>

      {error && (
        <div className="p-3 sm:p-4 rounded-xl border border-red-500/30 bg-red-950/40 text-red-300 text-xs font-sans text-left space-y-3">
          <div>
            <strong className="font-semibold text-red-200">Publish Notice:</strong> {error}
          </div>
          {!isSuccess && (
            <div className="pt-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <Button variant="champagne-outline" size="sm" onClick={handleRetry} className="text-xs min-h-[44px]">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Retry Publishing</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={onPrev} className="text-xs min-h-[44px]">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>Edit Voice / Draft</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {isSuccess && shareUrl && slug && (
        <>
          {/* Security PIN Warning Box */}
          <div className="p-3 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs font-sans text-left space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Passcode Protected</span>
            </div>
            <p className="text-stone-300 leading-relaxed text-xs">
              This gift is protected by your 4-digit passcode ({draft.pin || "Set"}). Send the passcode to{" "}
              <strong>{draft.recipientName}</strong> separately over text or chat. The passcode is <strong>NEVER</strong> encoded inside the share link or QR code.
            </p>
          </div>

          {/* Share Actions Box */}
          <ShareDialog shareUrl={shareUrl} recipientName={draft.recipientName} />

          {/* Printable QR Code Card */}
          <QRCodeCard url={shareUrl} recipientName={draft.recipientName} slug={slug} />

          {/* Navigation & Controls */}
          <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
            <a
              href={`/g/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors min-h-[44px]"
            >
              <span>Preview Experience</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <Button variant="champagne-outline" size="md" onClick={onPrev} className="min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span>Edit Draft</span>
            </Button>

            <Button variant="gold-glow" size="md" onClick={onStartNew} className="min-h-[44px]">
              <RefreshCw className="w-4 h-4 mr-1" />
              <span>Create Another Gift</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
