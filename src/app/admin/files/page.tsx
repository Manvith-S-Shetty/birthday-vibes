"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderLock,
  Search,
  Filter,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  RefreshCw,
  FileImage,
  Mic,
  ArrowRight,
} from "lucide-react";

interface StorageFile {
  id: string;
  name: string;
  path: string;
  bucket: string;
  size: number;
  mimeType: string;
  lastModified: string;
  status: "active" | "orphaned" | "missing";
  experience_id: string | null;
  experience_slug: string | null;
  recipient_name: string | null;
}

export default function AdminFilesPage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, orphaned: 0, missing: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [bucketFilter, setBucketFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Preview Modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState<"image" | "audio" | "other">("other");

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (bucketFilter !== "all") params.set("bucket", bucketFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/files?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load storage files.");
      const data = await res.json();
      setFiles(data.files || []);
      setStats(data.stats || { total: 0, active: 0, orphaned: 0, missing: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to fetch files.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketFilter, statusFilter]);

  const handlePreview = async (file: StorageFile) => {
    if (file.status === "missing") {
      alert("This file is marked missing from storage and cannot be previewed.");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/files/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: file.bucket, path: file.path, expiresIn: 1800 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get preview URL.");

      if (file.mimeType.startsWith("image/") || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        setPreviewType("image");
      } else if (file.mimeType.startsWith("audio/") || file.name.match(/\.(webm|mp3|wav|ogg|m4a)$/i)) {
        setPreviewType("audio");
      } else {
        setPreviewType("other");
      }

      setPreviewUrl(data.signedUrl);
    } catch (err: any) {
      alert(`Preview error: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = (file: StorageFile) => {
    if (file.status === "missing") {
      alert("This file is marked missing from storage and cannot be downloaded.");
      return;
    }
    const downloadUrl = `/api/admin/files/download?bucket=${encodeURIComponent(
      file.bucket
    )}&path=${encodeURIComponent(file.path)}`;
    window.open(downloadUrl, "_blank");
  };

  const filteredFiles = files.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q) ||
      (f.recipient_name && f.recipient_name.toLowerCase().includes(q)) ||
      (f.experience_slug && f.experience_slug.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--token-paper)]">
            Private Storage & Files Manager
          </h1>
          <p className="text-xs font-mono text-[var(--theme-text-secondary)] mt-1">
            Review uploaded experience media, audio voice clips, orphaned objects, and storage health.
          </p>
        </div>

        <button
          onClick={() => fetchFiles()}
          className="p-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh storage inventory"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)]">
          <div className="text-[10px] font-mono uppercase text-[var(--theme-text-secondary)]">Total Inventory</div>
          <div className="text-2xl font-serif font-bold text-[var(--token-paper)] mt-0.5">{stats.total}</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-emerald-900/40">
          <div className="text-[10px] font-mono uppercase text-emerald-400">Active (Linked)</div>
          <div className="text-2xl font-serif font-bold text-emerald-400 mt-0.5">{stats.active}</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-amber-900/40">
          <div className="text-[10px] font-mono uppercase text-amber-400">Orphaned Objects</div>
          <div className="text-2xl font-serif font-bold text-amber-400 mt-0.5">{stats.orphaned}</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-red-900/40">
          <div className="text-[10px] font-mono uppercase text-red-400">Missing from Storage</div>
          <div className="text-2xl font-serif font-bold text-red-400 mt-0.5">{stats.missing}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file name, path, recipient..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-secondary)]/50 focus:outline-none focus:border-[var(--token-champagne)] font-sans"
            />
          </div>

          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
          >
            <option value="all">All Buckets (experience-media & voice-messages)</option>
            <option value="experience-media">experience-media</option>
            <option value="voice-messages">voice-messages</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
          >
            <option value="all">All Storage Statuses</option>
            <option value="active">Active Only</option>
            <option value="orphaned">Orphaned Objects Only</option>
            <option value="missing">Missing Objects Only</option>
          </select>
        </div>
      </div>

      {/* File List */}
      <div className="p-4 md:p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
          Showing {filteredFiles.length} of {files.length} Files
        </div>

        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--token-champagne)] mx-auto" />
            <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
              Scanning storage buckets and correlating records...
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-16 text-xs text-[var(--theme-text-secondary)] font-mono">
            No storage files found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--theme-border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
                  <th className="py-2.5 px-3">File / Path</th>
                  <th className="py-2.5 px-3">Bucket</th>
                  <th className="py-2.5 px-3">Size / Type</th>
                  <th className="py-2.5 px-3">Associated Experience</th>
                  <th className="py-2.5 px-3">Storage Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-subtle)]">
                {filteredFiles.map((file) => {
                  const isVoice = file.bucket === "voice-messages";
                  return (
                    <tr key={`${file.bucket}-${file.path}`} className="hover:bg-[var(--theme-bg-card)]/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-1.5 rounded-lg bg-[var(--theme-bg-card)] text-[var(--theme-text-secondary)]">
                            {isVoice ? <Mic className="w-4 h-4 text-purple-400" /> : <FileImage className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div>
                            <div className="font-mono text-[11px] text-[var(--token-paper)] font-medium truncate max-w-[200px]" title={file.name}>
                              {file.name}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--theme-text-secondary)] truncate max-w-[220px]" title={file.path}>
                              {file.path}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[var(--token-champagne)]">
                        {file.bucket}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[var(--theme-text-secondary)]">
                        <div>{file.size > 0 ? `${Math.round(file.size / 1024)} KB` : "0 KB"}</div>
                        <div className="text-[9px] opacity-75">{file.mimeType}</div>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {file.experience_id ? (
                          <div>
                            <Link
                              href={`/admin/experiences/${file.experience_id}`}
                              className="font-medium text-[var(--token-paper)] hover:text-[var(--token-champagne)] transition-colors flex items-center space-x-1"
                            >
                              <span>{file.recipient_name || "View Experience"}</span>
                              <ArrowRight className="w-3 h-3 text-[var(--token-champagne)]" />
                            </Link>
                            <div className="text-[10px] font-mono text-[var(--theme-text-secondary)]">
                              Slug: {file.experience_slug || "draft"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-amber-400/80 italic">
                            Unlinked (Orphaned)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                            file.status === "active"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                              : file.status === "orphaned"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/50"
                              : "bg-red-950/60 text-red-400 border border-red-800/50"
                          }`}
                        >
                          {file.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handlePreview(file)}
                            disabled={file.status === "missing" || previewLoading}
                            className="px-2.5 py-1 rounded-lg bg-[var(--theme-border-subtle)] hover:bg-[var(--token-champagne)] hover:text-[var(--token-ink)] text-[11px] font-medium transition-all disabled:opacity-40"
                            title="Preview file"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={file.status === "missing"}
                            className="px-2.5 py-1 rounded-lg bg-[var(--theme-border-subtle)] hover:bg-[var(--token-champagne)] hover:text-[var(--token-ink)] text-[11px] font-medium transition-all disabled:opacity-40"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-strong)] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
              <span className="text-xs font-mono uppercase text-[var(--token-champagne)] font-semibold">
                Short-Lived Authorized Preview
              </span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-xs text-[var(--theme-text-secondary)] hover:text-white"
              >
                Close (ESC)
              </button>
            </div>

            <div className="flex items-center justify-center min-h-[200px]">
              {previewType === "image" ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              ) : previewType === "audio" ? (
                <div className="w-full max-w-md py-8">
                  <audio controls autoPlay className="w-full" src={previewUrl}>
                    Audio preview not supported.
                  </audio>
                </div>
              ) : (
                <div className="text-xs text-center space-y-2 py-8">
                  <div>Direct browser preview not supported for this MIME type.</div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--token-champagne)] hover:underline inline-block"
                  >
                    Open in External Tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
