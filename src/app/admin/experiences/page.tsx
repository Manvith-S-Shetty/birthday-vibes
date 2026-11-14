"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  Unlock,
  Archive,
  Eye,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  CheckSquare,
  Square,
  Download,
  AlertCircle,
  FileImage,
  Mic,
  Activity,
} from "lucide-react";

interface ExperienceSummary {
  id: string;
  slug: string | null;
  recipient_name: string;
  birthday_date: string | null;
  theme_id: string;
  status: "draft" | "ready" | "published" | "expired";
  is_pin_protected: boolean;
  current_step: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at: string | null;
  expiration_option: string;
  media_count: number;
  moments_count: number;
  voice_count: number;
}

export default function AdminExperiencesPage() {
  const [experiences, setExperiences] = useState<ExperienceSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at">("created_at");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection for Batch Export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("sort", sortBy);
      params.set("order", sortOrder);
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/experiences?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load experiences: ${res.statusText}`);
      }
      const data = await res.json();
      setExperiences(data.experiences || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, page, pageSize, startDate, endDate]);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAllCurrentPage = () => {
    if (selectedIds.size === experiences.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(experiences.map((e) => e.id)));
    }
  };

  const handleExportSelected = async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceIds: Array.from(selectedIds) }),
      });

      if (!res.ok) throw new Error("Export failed.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wishlight-selected-backup-${Date.now()}.zip`;
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--token-paper)]">
            Experiences Explorer
          </h1>
          <p className="text-xs font-mono text-[var(--theme-text-secondary)] mt-1">
            Browse, search, review safe metadata, and inspect all created experiences.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleExportSelected}
              disabled={exporting}
              className="px-3.5 py-2 rounded-xl bg-[var(--token-champagne)] text-[var(--token-ink)] font-sans text-xs font-semibold uppercase tracking-wider hover:brightness-110 transition-all flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? "Exporting..." : `Export (${selectedIds.size})`}</span>
            </button>
          )}

          <button
            onClick={() => fetchExperiences()}
            className="p-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search recipient, slug, or UID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-secondary)]/50 focus:outline-none focus:border-[var(--token-champagne)] font-sans"
            />
          </div>

          {/* Status selector */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
            >
              <option value="created_at">Sort by Created Date</option>
              <option value="updated_at">Sort by Updated Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-secondary)] hover:text-white"
              title={`Switch to ${sortOrder === "asc" ? "descending" : "ascending"}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page size selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[var(--theme-text-secondary)] whitespace-nowrap">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
            >
              <option value={10}>10 records</option>
              <option value={25}>25 records</option>
              <option value={50}>50 records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center space-x-3 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table / List View */}
      <div className="p-4 md:p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)] font-mono">
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllCurrentPage}
              className="flex items-center space-x-1.5 text-xs text-[var(--theme-text-secondary)] hover:text-white"
            >
              {selectedIds.size === experiences.length && experiences.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--token-champagne)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>Select Current Page</span>
            </button>
          </div>
          <div>
            Showing {experiences.length} of {total} Experiences
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--token-champagne)] mx-auto" />
            <div className="text-xs font-mono text-[var(--theme-text-secondary)]">Loading experiences...</div>
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-center py-16 text-xs text-[var(--theme-text-secondary)] font-mono">
            No experiences match the search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--theme-border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Recipient & UID</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Protection</th>
                  <th className="py-2.5 px-3">Theme</th>
                  <th className="py-2.5 px-3">Content Counts</th>
                  <th className="py-2.5 px-3">Created / Updated</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-subtle)]">
                {experiences.map((exp) => {
                  const isSelected = selectedIds.has(exp.id);
                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-[var(--theme-bg-card)]/50 transition-colors ${
                        isSelected ? "bg-[var(--theme-border-subtle)]/30" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleSelect(exp.id)}
                          className="text-[var(--theme-text-secondary)] hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--token-champagne)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-serif font-semibold text-[var(--token-paper)] text-sm">
                          {exp.recipient_name}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--theme-text-secondary)] truncate max-w-[140px]" title={exp.id}>
                          UID: {exp.id}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-[11px] text-[var(--token-champagne)] truncate max-w-[120px]" title={exp.slug || ""}>
                          {exp.slug || "â€”"}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                            exp.status === "published"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                              : exp.status === "expired"
                              ? "bg-red-950/60 text-red-400 border border-red-800/50"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/50"
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {exp.is_pin_protected ? (
                          <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                            <Lock className="w-3 h-3" />
                            <span>PIN Locked</span>
                          </span>
                        ) : (
                          <span className="text-[var(--theme-text-secondary)] text-[11px]">Unprotected</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--theme-text-secondary)]">
                        {exp.theme_id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-[var(--theme-text-secondary)]">
                          <span className="flex items-center space-x-1" title="Photos/Videos">
                            <FileImage className="w-3 h-3 text-blue-400" />
                            <span>{exp.media_count}</span>
                          </span>
                          <span className="flex items-center space-x-1" title="Moments">
                            <Activity className="w-3 h-3 text-amber-400" />
                            <span>{exp.moments_count}</span>
                          </span>
                          <span className="flex items-center space-x-1" title="Voice messages">
                            <Mic className="w-3 h-3 text-purple-400" />
                            <span>{exp.voice_count}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[var(--theme-text-secondary)]">
                        <div>Created: {new Date(exp.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] opacity-75">
                          Updated: {new Date(exp.updated_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/admin/experiences/${exp.id}`}
                          className="px-3 py-1.5 rounded-lg bg-[var(--theme-border-subtle)] hover:bg-[var(--token-champagne)] hover:text-[var(--token-ink)] text-[var(--token-paper)] text-[11px] font-medium transition-all inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-border-subtle)]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-secondary)] hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-[var(--theme-text-secondary)]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-secondary)] hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
