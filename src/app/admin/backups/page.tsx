"use client";

import React, { useState, useEffect } from "react";
import {
  Archive,
  Download,
  AlertCircle,
  CheckCircle2,
  Shield,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function AdminBackupsPage() {
  const [exporting, setExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form options
  const [batchPage, setBatchPage] = useState(1);
  const [batchSize, setBatchSize] = useState(25);
  const [targetIdInput, setTargetIdInput] = useState("");

  // Recent backup logs
  const [backupLogs, setBackupLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchBackupLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/logs?action=backup.export_batch&limit=10");
      if (res.ok) {
        const data = await res.json();
        setBackupLogs(data.logs || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchBackupLogs();
  }, []);

  const handleExportBatch = async () => {
    setExporting(true);
    setError(null);
    setProgressMsg(`Initiating batch export (Batch page ${batchPage}, size ${batchSize})...`);
    try {
      setProgressMsg("Querying experiences and compiling storage media assets...");
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, page: batchPage, pageSize: batchSize }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Batch export failed.");
      }

      setProgressMsg("Packaging ZIP archive with manifest and verified media...");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wishlight-batch-export-page-${batchPage}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setProgressMsg("Backup successfully downloaded.");
      fetchBackupLogs();
    } catch (err: any) {
      setError(err.message || "Export error.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportSpecific = async () => {
    if (!targetIdInput.trim()) {
      alert("Please provide an experience UID or ID.");
      return;
    }
    setExporting(true);
    setError(null);
    setProgressMsg(`Fetching experience ${targetIdInput.trim()}...`);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceIds: [targetIdInput.trim()] }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Export failed.");
      }

      setProgressMsg("Packaging single experience ZIP archive...");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wishlight-experience-${targetIdInput.trim()}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setProgressMsg("Experience backup successfully downloaded.");
      fetchBackupLogs();
    } catch (err: any) {
      setError(err.message || "Export error.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--token-paper)]">
          Backup & Disaster Recovery Center
        </h1>
        <p className="text-xs font-mono text-[var(--theme-text-secondary)] mt-1">
          Export full application content archives containing validated manifests and media assets.
        </p>
      </div>

      {/* Security & Architectural Disclaimer */}
      <div className="p-5 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--token-champagne)]/30 space-y-3">
        <div className="flex items-center space-x-2 text-[var(--token-champagne)]">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold">
            Security Guarantee: Content Backups vs Full Database Backups
          </span>
        </div>
        <p className="text-xs text-[var(--theme-text-secondary)] leading-relaxed">
          The ZIP exports generated here are <strong>Application Content Backups</strong>. Each archive contains sanitized JSON metadata, relationships, photos/videos from <code>experience-media</code>, and audio clips from <code>voice-messages</code>. In strict compliance with zero-trust architecture, authentication secrets (<code>pin_hash</code>, <code>pin_salt</code>, and <code>creator_session_token</code>) are <strong>never</strong> exported in regular content ZIPs. Full database infrastructure recovery is managed separately via Supabase automated PostgreSQL WAL snapshots.
        </p>
      </div>

      {/* Export Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batched Export Card */}
        <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
          <div className="flex items-center space-x-2 text-[var(--token-paper)]">
            <Archive className="w-5 h-5 text-[var(--token-champagne)]" />
            <h2 className="font-serif font-semibold text-base">Export All Experiences in Batches</h2>
          </div>
          <p className="text-xs text-[var(--theme-text-secondary)]">
            Export a paginated batch of experiences. Designed for optimal memory and network throughput without timeouts.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] mb-1">
                Batch Page
              </label>
              <input
                type="number"
                min={1}
                value={batchPage}
                onChange={(e) => setBatchPage(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] mb-1">
                Batch Size (Max 50)
              </label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)]"
              >
                <option value={10}>10 records / batch</option>
                <option value={25}>25 records / batch</option>
                <option value={50}>50 records / batch</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleExportBatch}
            disabled={exporting}
            className="w-full py-2.5 rounded-xl bg-[var(--token-champagne)] text-[var(--token-ink)] font-semibold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{exporting ? "Generating ZIP..." : "Download Batch Archive"}</span>
          </button>
        </div>

        {/* Specific Experience Card */}
        <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
          <div className="flex items-center space-x-2 text-[var(--token-paper)]">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="font-serif font-semibold text-base">Export Single Experience</h2>
          </div>
          <p className="text-xs text-[var(--theme-text-secondary)]">
            Quickly download an archive of a single specific experience by pasting its UID.
          </p>

          <div className="pt-2">
            <label className="block text-[10px] font-mono uppercase text-[var(--theme-text-secondary)] mb-1">
              Experience UID
            </label>
            <input
              type="text"
              value={targetIdInput}
              onChange={(e) => setTargetIdInput(e.target.value)}
              placeholder="e.g. 1a2b3c4d-5e6f-..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs font-mono text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)]"
            />
          </div>

          <button
            onClick={handleExportSpecific}
            disabled={exporting || !targetIdInput.trim()}
            className="w-full py-2.5 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] text-[var(--theme-text-primary)] hover:border-[var(--token-champagne)] font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin text-[var(--token-champagne)]" /> : <Download className="w-4 h-4 text-[var(--token-champagne)]" />}
            <span>Download Single Archive</span>
          </button>
        </div>
      </div>

      {/* Status / Progress Banner */}
      {progressMsg && (
        <div className="p-4 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] flex items-center space-x-3 text-xs text-[var(--token-paper)] animate-fade-in">
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--token-champagne)]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{progressMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center space-x-3 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Manifest Specification Guide */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--token-champagne)] font-semibold">
          Archive Manifest Format Specification (manifest.json)
        </h3>
        <p className="text-xs text-[var(--theme-text-secondary)]">
          Every generated ZIP bundle includes an automated JSON manifest with the following structure:
        </p>
        <pre className="p-4 rounded-xl bg-black/40 border border-[var(--theme-border-subtle)] text-[11px] font-mono text-neutral-300 overflow-x-auto">
{`{
  "backup_version": "1.0.0",
  "backup_type": "Application Content Backup (Experiences & Storage Media)",
  "exported_at": "2026-11-14T...",
  "exported_by": "owner@wishscene.com",
  "experiences_count": 25,
  "files_summary": {
    "total_files_referenced": 82,
    "successfully_bundled": 82,
    "missing_or_failed_count": 0
  },
  "missing_or_failed_files": [],
  "experiences": [ ... ]
}`}
        </pre>
      </div>
    </div>
  );
}
