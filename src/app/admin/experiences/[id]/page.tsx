"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Lock,
  Unlock,
  ShieldAlert,
  Download,
  Archive,
  Trash2,
  FileImage,
  Mic,
  Music,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";

export default function ExperienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sensitive Message State & Confirmation Modal
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealReason, setRevealReason] = useState("Security & abuse review");
  const [revealing, setRevealing] = useState(false);
  const [revealedMessage, setRevealedMessage] = useState<string | null>(null);

  // Media Preview Modal
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Soft Archive & Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchExperience = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/experiences/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load experience details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchExperience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sensitive Letter Reveal Handler
  const handleRevealMessage = async () => {
    setRevealing(true);
    try {
      const res = await fetch(`/api/admin/experiences/${id}/reveal-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmReveal: true, reason: revealReason }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reveal message.");
      setRevealedMessage(result.personal_message);
      setShowRevealModal(false);
    } catch (err: any) {
      alert(`Error revealing message: ${err.message}`);
    } finally {
      setRevealing(false);
    }
  };

  // Export Single Experience Handler
  const handleExportSingle = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceIds: [data.experience.id] }),
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wishlight-${data.experience.slug || data.experience.id}-backup.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Soft Archive Handler
  const handleSoftArchive = async () => {
    const isExpired = data.experience.status === "expired";
    const newStatus = isExpired ? "published" : "expired";
    const confirmText = isExpired
      ? "Restore this experience to published status?"
      : "Soft-archive this experience? Status will be set to 'expired' and public access disabled.";

    if (!confirm(confirmText)) return;

    setArchiving(true);
    try {
      const res = await fetch(`/api/admin/experiences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed.");
      await fetchExperience();
    } catch (err: any) {
      alert(`Archive error: ${err.message}`);
    } finally {
      setArchiving(false);
    }
  };

  // Destructive Delete Handler
  const handleHardDelete = async () => {
    if (deleteInput !== data.experience.id) {
      alert("Input does not match experience UID.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/experiences/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmDelete: true, targetId: data.experience.id }),
      });
      if (!res.ok) throw new Error("Deletion failed.");
      alert("Experience and associated storage files deleted successfully.");
      router.push("/admin/experiences");
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 animate-fade-in">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--token-champagne)] mx-auto" />
        <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
          Inspecting experience & verifying authorization...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 space-y-4 animate-fade-in">
        <Link
          href="/admin/experiences"
          className="inline-flex items-center space-x-1.5 text-xs text-[var(--theme-text-secondary)] hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Experiences</span>
        </Link>
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs space-y-2">
          <div className="font-semibold text-sm">Error Loading Experience</div>
          <div>{error || "Experience not found."}</div>
        </div>
      </div>
    );
  }

  const exp = data.experience;
  const mediaList = data.media || [];
  const voiceMsg = data.voice_message;
  const momentsList = data.moments || [];
  const musicTrack = data.music;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/experiences"
            className="inline-flex items-center space-x-1.5 text-xs text-[var(--theme-text-secondary)] hover:text-white mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Experiences</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--token-paper)]">
              {exp.recipient_name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                exp.status === "published"
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                  : exp.status === "expired"
                  ? "bg-red-950/60 text-red-400 border border-red-800/50"
                  : "bg-amber-950/60 text-amber-400 border border-amber-800/50"
              }`}
            >
              {exp.status}
            </span>
          </div>
          <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
            UID: <span className="text-[var(--token-paper)] select-all">{exp.id}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportSingle}
            disabled={exporting}
            className="px-3.5 py-2 rounded-xl bg-[var(--token-champagne)] text-[var(--token-ink)] font-sans text-xs font-semibold uppercase tracking-wider hover:brightness-110 transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? "Bundling..." : "Export Content ZIP"}</span>
          </button>

          <button
            onClick={handleSoftArchive}
            disabled={archiving}
            className="px-3.5 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] text-[var(--theme-text-primary)] font-sans text-xs font-semibold uppercase tracking-wider hover:border-[var(--token-champagne)] transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>{exp.status === "expired" ? "Restore to Active" : "Soft Archive"}</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 font-sans text-xs font-semibold uppercase tracking-wider hover:bg-red-900/40 transition-all flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Metadata Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
            Public Slug
          </div>
          <div className="text-sm font-mono text-[var(--token-champagne)] truncate">
            {exp.slug ? (
              <a href={`/g/${exp.slug}`} target="_blank" rel="noreferrer" className="hover:underline flex items-center space-x-1">
                <span>{exp.slug}</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            ) : (
              "None (Draft)"
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
            Birthday Date
          </div>
          <div className="text-sm font-serif font-semibold text-[var(--token-paper)]">
            {exp.birthday_date || "Not specified"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
            PIN Protection
          </div>
          <div className="text-sm flex items-center space-x-1.5">
            {exp.is_pin_protected ? (
              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                <Lock className="w-3.5 h-3.5" />
                <span>Protected (Hash in DB)</span>
              </span>
            ) : (
              <span className="text-[var(--theme-text-secondary)]">Unprotected (Direct)</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
            Expiration Policy
          </div>
          <div className="text-sm font-mono text-[var(--token-paper)]">
            {exp.expiration_option || "never"}{" "}
            {exp.expires_at && `(expires ${new Date(exp.expires_at).toLocaleDateString()})`}
          </div>
        </div>
      </div>

      {/* Presentation & Personalization Settings */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)] flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[var(--token-champagne)]" />
          <span>Theme & Personalization Settings</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)]">Visual Theme</div>
            <div className="font-medium text-[var(--token-paper)] mt-0.5">{exp.theme_id}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)]">Relationship</div>
            <div className="font-medium text-[var(--token-paper)] mt-0.5">{exp.relationship || "Not set"}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)]">Opening Style</div>
            <div className="font-medium text-[var(--token-paper)] mt-0.5">{exp.opening_style || "cinematic-premiere"}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)]">Memory Layout</div>
            <div className="font-medium text-[var(--token-paper)] mt-0.5">{exp.memory_display_mode || "grid"}</div>
          </div>
        </div>
      </div>

      {/* SENSITIVE PERSONAL LETTER SECTION */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-strong)] relative overflow-hidden space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-wider font-semibold">
              Confidential Recipient Letter
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-400">
            Audit Enforced
          </span>
        </div>

        {revealedMessage !== null ? (
          <div className="p-5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--token-champagne)]/30 space-y-2 animate-fade-in">
            <div className="text-[11px] font-mono text-[var(--token-champagne)] flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unmasked for Review (Audit Logged)</span>
            </div>
            <p className="font-serif text-base text-[var(--token-paper)] whitespace-pre-wrap leading-relaxed">
              {revealedMessage}
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-[var(--token-paper)]">
                Personal Message is Masked by Default
              </div>
              <p className="text-[11px] text-[var(--theme-text-secondary)]">
                Recipient letters contain private correspondence. Viewing unmasked letters requires explicit owner confirmation and is recorded in the security audit logs.
              </p>
            </div>
            <button
              onClick={() => setShowRevealModal(true)}
              className="px-4 py-2 rounded-xl bg-[var(--theme-border-subtle)] hover:bg-[var(--token-champagne)] hover:text-[var(--token-ink)] text-xs font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Reveal Message</span>
            </button>
          </div>
        )}
      </div>

      {/* Associated Media Files */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)] flex items-center space-x-2">
            <FileImage className="w-4 h-4 text-blue-400" />
            <span>Associated Media ({mediaList.length} files)</span>
          </h2>
          <span className="text-[10px] font-mono text-[var(--theme-text-secondary)]">
            Bucket: experience-media
          </span>
        </div>

        {mediaList.length === 0 ? (
          <div className="text-xs text-[var(--theme-text-secondary)] font-mono py-4">
            No media files uploaded for this experience.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaList.map((m: any) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] space-y-2 group"
              >
                <div className="aspect-square rounded-lg bg-black/40 overflow-hidden relative flex items-center justify-center">
                  {m.preview_url ? (
                    <img
                      src={m.preview_url}
                      alt={m.alt_text || "Preview"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <FileImage className="w-8 h-8 text-[var(--theme-text-secondary)] opacity-40" />
                  )}
                  {m.preview_url && (
                    <button
                      onClick={() => setPreviewMediaUrl(m.preview_url)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Zoom</span>
                    </button>
                  )}
                </div>
                <div className="text-[10px] space-y-0.5">
                  <div className="font-mono text-[var(--token-paper)] truncate" title={m.storage_path}>
                    Order #{m.sort_order}: {m.storage_path.split("/").pop()}
                  </div>
                  {m.caption && (
                    <div className="text-[var(--theme-text-secondary)] italic truncate" title={m.caption}>
                      &ldquo;{m.caption}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Message & Music Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Voice Message */}
        <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)] flex items-center space-x-2">
            <Mic className="w-4 h-4 text-purple-400" />
            <span>Voice Audio Recording</span>
          </h2>

          {voiceMsg ? (
            <div className="space-y-3">
              <div className="text-xs space-y-1 font-mono text-[var(--theme-text-secondary)]">
                <div>Path: <span className="text-[var(--token-paper)]">{voiceMsg.storage_path}</span></div>
                <div>Duration: <span className="text-[var(--token-paper)]">{Math.round((voiceMsg.duration_ms || 0) / 1000)}s</span></div>
                <div>Size: <span className="text-[var(--token-paper)]">{Math.round((voiceMsg.file_size_bytes || 0) / 1024)} KB</span></div>
                <div>MIME: <span className="text-[var(--token-paper)]">{voiceMsg.mime_type}</span></div>
              </div>

              {voiceMsg.preview_url && (
                <div className="pt-2">
                  <audio controls className="w-full h-8" src={voiceMsg.preview_url}>
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {voiceMsg.transcript && (
                <div className="p-3 rounded-lg bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--token-paper)]">
                  <div className="text-[10px] font-mono text-[var(--theme-text-secondary)] uppercase">Transcript</div>
                  <div className="mt-1">{voiceMsg.transcript}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[var(--theme-text-secondary)] font-mono py-2">
              No voice recording attached to this experience.
            </div>
          )}
        </div>

        {/* Music Track */}
        <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)] flex items-center space-x-2">
            <Music className="w-4 h-4 text-emerald-400" />
            <span>Background Music</span>
          </h2>

          {musicTrack ? (
            <div className="space-y-2 text-xs font-mono">
              <div>Title: <span className="text-[var(--token-paper)] font-semibold">{musicTrack.title || "Custom Track"}</span></div>
              <div>Artist: <span className="text-[var(--token-paper)]">{musicTrack.artist || "Unknown"}</span></div>
              <div>Type: <span className="text-[var(--token-paper)]">{musicTrack.source_type}</span></div>
              <div>Status: <span className={musicTrack.enabled ? "text-emerald-400" : "text-red-400"}>{musicTrack.enabled ? "Enabled" : "Disabled"}</span></div>
            </div>
          ) : (
            <div className="text-xs text-[var(--theme-text-secondary)] font-mono py-2">
              No custom music track configured.
            </div>
          )}
        </div>
      </div>

      {/* Interactive Moments */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)] flex items-center space-x-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Interactive Moments & Timeline ({momentsList.length})</span>
        </h2>

        {momentsList.length === 0 ? (
          <div className="text-xs text-[var(--theme-text-secondary)] font-mono py-2">
            No interactive moments configured.
          </div>
        ) : (
          <div className="space-y-2">
            {momentsList.map((mo: any) => (
              <div
                key={mo.id}
                className="p-3.5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-serif font-semibold text-xs text-[var(--token-paper)]">
                    Order #{mo.sort_order}: {mo.moment_type}
                  </div>
                  <pre className="text-[10px] font-mono text-[var(--theme-text-secondary)] mt-1 max-w-xl overflow-x-auto">
                    {JSON.stringify(mo.config_json, null, 2)}
                  </pre>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded self-start ${
                    mo.enabled ? "text-emerald-400 bg-emerald-950/40" : "text-neutral-400 bg-neutral-900"
                  }`}
                >
                  {mo.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Sensitive Message Reveal */}
      {showRevealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-strong)] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-serif font-semibold text-base text-[var(--token-paper)]">
                Reveal Sensitive Recipient Letter
              </h3>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
              This letter contains private correspondence written by the creator. Revealing it is strictly logged with your administrator identity, IP address, and review reason.
            </p>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] mb-1">
                Security Review Reason
              </label>
              <input
                type="text"
                value={revealReason}
                onChange={(e) => setRevealReason(e.target.value)}
                placeholder="e.g. Security & abuse review"
                className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRevealModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-[var(--theme-text-secondary)] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRevealMessage}
                disabled={revealing}
                className="px-4 py-2 rounded-xl bg-[var(--token-champagne)] text-[var(--token-ink)] text-xs font-semibold hover:brightness-110 disabled:opacity-50"
              >
                {revealing ? "Verifying..." : "Confirm & Reveal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Zoom Modal */}
      {previewMediaUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewMediaUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--theme-border-strong)]">
            <img src={previewMediaUrl} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain" />
          </div>
        </div>
      )}

      {/* Destructive Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[var(--theme-bg-secondary)] border border-red-800/60 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-serif font-semibold text-base text-red-300">
                Confirm Permanent Deletion
              </h3>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
              This action will permanently delete experience <strong>{exp.recipient_name}</strong>, all {mediaList.length} storage files in <code>experience-media</code>, the voice message in <code>voice-messages</code>, and all associated timeline database records.
            </p>
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-[11px] text-red-300">
              To proceed, please type the experience UID below:
              <div className="font-mono font-bold select-all mt-1">{exp.id}</div>
            </div>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Paste experience UID..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-red-800/50 text-xs text-white focus:outline-none focus:border-red-400 font-mono"
            />
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs text-[var(--theme-text-secondary)] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleHardDelete}
                disabled={deleting || deleteInput !== exp.id}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
