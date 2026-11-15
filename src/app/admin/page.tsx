import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { supabaseAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Sparkles,
  FolderLock,
  Archive,
  ShieldCheck,
  Lock,
  Clock,
  ArrowRight,
  FileCheck,
  AlertTriangle,
} from "lucide-react";

export default async function AdminDashboardOverview() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/wishlight-control/entry");
  }

  let totalExperiences = 0;
  let publishedCount = 0;
  let draftCount = 0;
  let expiredCount = 0;
  let pinProtectedCount = 0;
  let totalMedia = 0;
  let totalVoice = 0;
  let recentExperiences: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const [expRes, mediaCountRes, voiceCountRes, recentRes] = await Promise.all([
        (supabaseAdminClient as any).from("experiences").select("status, is_pin_protected"),
        (supabaseAdminClient as any).from("media").select("id", { count: "exact", head: true }),
        (supabaseAdminClient as any).from("voice_messages").select("id", { count: "exact", head: true }),
        (supabaseAdminClient as any)
          .from("experiences")
          .select("id, slug, recipient_name, status, is_pin_protected, created_at, theme_id")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const allExp = expRes.data || [];
      totalExperiences = allExp.length;
      publishedCount = allExp.filter((e: any) => e.status === "published").length;
      draftCount = allExp.filter((e: any) => e.status === "draft" || e.status === "ready").length;
      expiredCount = allExp.filter((e: any) => e.status === "expired").length;
      pinProtectedCount = allExp.filter((e: any) => e.is_pin_protected).length;

      totalMedia = mediaCountRes.count || 0;
      totalVoice = voiceCountRes.count || 0;
      recentExperiences = recentRes.data || [];
    } catch (e) {
      console.warn("Error loading dashboard metrics:", e);
    }
  }

  const cards = [
    {
      title: "Total Experiences",
      value: totalExperiences,
      sub: `${publishedCount} published, ${draftCount} drafts`,
      icon: Sparkles,
      color: "text-amber-300",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
    },
    {
      title: "PIN-Protected Ratio",
      value: totalExperiences > 0 ? `${Math.round((pinProtectedCount / totalExperiences) * 100)}%` : "0%",
      sub: `${pinProtectedCount} of ${totalExperiences} locked`,
      icon: Lock,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
    },
    {
      title: "Storage Media Files",
      value: totalMedia,
      sub: `Across experience-media bucket`,
      icon: FolderLock,
      color: "text-blue-300",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
    },
    {
      title: "Voice Messages",
      value: totalVoice,
      sub: `Across voice-messages bucket`,
      icon: FileCheck,
      color: "text-purple-300",
      bg: "bg-purple-400/10",
      border: "border-purple-400/20",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[var(--token-paper)]">
            Owner Security Dashboard
          </h1>
          <p className="text-xs font-mono text-[var(--theme-text-secondary)] mt-1 tracking-wide">
            System overview, experience review, private storage, and automated backups.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/experiences"
            className="px-4 py-2 rounded-xl bg-[var(--token-champagne)] text-[var(--token-ink)] font-sans text-xs font-semibold uppercase tracking-wider hover:brightness-110 transition-all flex items-center space-x-2 shadow-sm"
          >
            <span>Inspect Experiences</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/backups"
            className="px-4 py-2 rounded-xl bg-[var(--theme-bg-card)] border border-[var(--theme-border-strong)] text-[var(--theme-text-primary)] font-sans text-xs font-semibold uppercase tracking-wider hover:border-[var(--token-champagne)] transition-all flex items-center space-x-2"
          >
            <Archive className="w-3.5 h-3.5 text-[var(--token-champagne)]" />
            <span>Create Backup</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`p-5 rounded-2xl bg-[var(--theme-bg-secondary)] border ${card.border} shadow-sm relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="text-3xl font-serif font-bold text-[var(--token-paper)]">
                {card.value}
              </div>
              <div className="text-[11px] text-[var(--theme-text-secondary)] mt-1">
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown Bar */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)]">
            Experience Lifecycle Distribution
          </h2>
          <span className="text-xs font-mono text-[var(--token-champagne)]">
            {totalExperiences} Total Records
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-[var(--theme-bg-card)] border border-emerald-900/40">
            <div className="text-lg font-serif font-bold text-emerald-400">{publishedCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
              Published
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--theme-bg-card)] border border-amber-900/40">
            <div className="text-lg font-serif font-bold text-amber-400">{draftCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
              Drafts / In-Progress
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--theme-bg-card)] border border-red-900/40">
            <div className="text-lg font-serif font-bold text-red-400">{expiredCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
              Expired
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--theme-bg-card)] border border-purple-900/40">
            <div className="text-lg font-serif font-bold text-purple-400">{pinProtectedCount}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
              PIN-Protected
            </div>
          </div>
        </div>
      </div>

      {/* Recent Experiences Table */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-[var(--token-paper)]">
              Recently Created Experiences
            </h2>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Latest experiences created across the platform.
            </p>
          </div>
          <Link
            href="/admin/experiences"
            className="text-xs text-[var(--token-champagne)] hover:underline flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentExperiences.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--theme-text-secondary)]">
            No experiences found in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--theme-border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-secondary)]">
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Security</th>
                  <th className="py-2.5 px-3">Theme</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-subtle)]">
                {recentExperiences.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-[var(--theme-bg-card)]/40 transition-colors">
                    <td className="py-3 px-3 font-medium text-[var(--token-paper)]">
                      {exp.recipient_name}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--theme-text-secondary)]">
                      {exp.slug || "â€”"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
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
                        <span className="text-[var(--theme-text-secondary)] text-[11px]">Public</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--theme-text-secondary)]">
                      {exp.theme_id}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[var(--theme-text-secondary)]">
                      {new Date(exp.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/admin/experiences/${exp.id}`}
                        className="px-2.5 py-1 rounded-lg bg-[var(--theme-border-subtle)] hover:bg-[var(--token-champagne)] hover:text-[var(--token-ink)] text-[var(--token-paper)] text-[11px] font-medium transition-all"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
