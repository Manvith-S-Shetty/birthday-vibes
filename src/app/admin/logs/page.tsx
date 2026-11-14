"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target_id: string | null;
  target_type: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  status: "success" | "failure";
  created_at: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [searchTarget, setSearchTarget] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (searchTarget) params.set("targetId", searchTarget);
      params.set("limit", "50");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs.");
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const actionLabels: Record<string, string> = {
    "admin.login": "Admin Sign In",
    "admin.login_failed": "Failed Sign In Attempt",
    "admin.logout": "Admin Sign Out",
    "experience.view_detail": "Inspected Experience",
    "experience.reveal_sensitive_message": "Revealed Confidential Letter",
    "experience.soft_archive": "Soft-Archived Experience",
    "experience.update_status": "Updated Experience Status",
    "experience.hard_delete": "Permanently Deleted Experience",
    "file.preview": "Generated File Preview URL",
    "file.download": "Downloaded Storage File",
    "backup.export_single": "Exported Single Backup",
    "backup.export_batch": "Exported Batch Backup",
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--token-paper)]">
            Security & Compliance Audit Trail
          </h1>
          <p className="text-xs font-mono text-[var(--theme-text-secondary)] mt-1">
            Tamper-evident logs of administrative access, file previews, unmasked letters, and backups.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="p-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-secondary)] hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh audit logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--token-champagne)] font-sans"
          >
            <option value="all">All Administrative Actions</option>
            <option value="admin.login">Admin Sign In</option>
            <option value="admin.login_failed">Failed Sign In Attempts</option>
            <option value="experience.reveal_sensitive_message">Revealed Confidential Letters</option>
            <option value="file.preview">File Previews</option>
            <option value="file.download">File Downloads</option>
            <option value="backup.export_batch">Batch Backup Exports</option>
            <option value="backup.export_single">Single Backup Exports</option>
            <option value="experience.hard_delete">Destructive Deletions</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]" />
            <input
              type="text"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
              placeholder="Filter by target UID (press Enter)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-subtle)] text-xs text-[var(--theme-text-primary)] placeholder-[var(--theme-text-secondary)]/50 focus:outline-none focus:border-[var(--token-champagne)] font-sans"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-4 md:p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
          Showing {logs.length} Audit Events
        </div>

        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--token-champagne)] mx-auto" />
            <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
              Loading security audit records...
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-xs text-[var(--theme-text-secondary)] font-mono">
            No audit records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--theme-border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target ID</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-subtle)]">
                {logs.map((log) => {
                  const label = actionLabels[log.action] || log.action;
                  const isSensitive = log.action === "experience.reveal_sensitive_message" || log.action === "experience.hard_delete";
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-[var(--theme-bg-card)]/50 transition-colors ${
                        isSensitive ? "bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-[10px] text-[var(--theme-text-secondary)] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--token-paper)]">
                        {log.actor}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold text-xs ${
                            isSensitive ? "text-amber-300 font-mono" : "text-[var(--token-paper)]"
                          }`}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[var(--theme-text-secondary)] truncate max-w-[140px]" title={log.target_id || ""}>
                        {log.target_id || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-[var(--theme-text-secondary)]">
                        {log.ip_address || "—"}
                      </td>
                      <td className="py-3 px-3">
                        {log.status === "success" ? (
                          <span className="flex items-center space-x-1 text-emerald-400 text-[10px] font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>SUCCESS</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-red-400 text-[10px] font-mono">
                            <XCircle className="w-3 h-3" />
                            <span>FAILED</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--theme-border-subtle)] hover:bg-[var(--token-champagne)] hover:text-[var(--token-ink)] text-[10px] font-mono font-medium transition-all"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-strong)] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
              <span className="text-xs font-mono uppercase text-[var(--token-champagne)] font-semibold">
                Audit Record Details
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs text-[var(--theme-text-secondary)] hover:text-white"
              >
                Close (ESC)
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-black/50 border border-[var(--theme-border-subtle)] text-[11px] font-mono text-neutral-300 max-h-96 overflow-y-auto">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
