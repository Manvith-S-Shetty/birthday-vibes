import React from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Settings,
  ShieldCheck,
  Database,
  Lock,
  Server,
  Key,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/wishlight-control/entry");
  }

  const configured = isSupabaseConfigured();

  const securityControls = [
    {
      name: "Server-Side Service Role Isolation",
      status: "Enforced",
      desc: "SUPABASE_SERVICE_ROLE_KEY is strictly server-only and excluded from client bundles.",
    },
    {
      name: "Row Level Security (RLS) Boundaries",
      status: "Hardened",
      desc: "Anon/authenticated PostgREST queries strictly deny direct access to private child tables.",
    },
    {
      name: "Secret Sanitization & Filtering",
      status: "Active",
      desc: "pin_hash, pin_salt, and creator_session_token are stripped before serializing admin API responses.",
    },
    {
      name: "Confidential Letter Protection",
      status: "Enforced",
      desc: "Private personal messages require explicit confirmation and audit logging before unmasking.",
    },
    {
      name: "Storage Buckets Privacy",
      status: "Private",
      desc: "experience-media and voice-messages are private buckets; media is served via signed URLs.",
    },
    {
      name: "Admin Session Cryptographic HMAC",
      status: "Active",
      desc: "HTTP-only cookies signed with SHA-256 HMAC and constant-time verification.",
    },
    {
      name: "Content Backup Manifest Integrity",
      status: "Verified",
      desc: "ZIP backups bundle valid metadata JSON without authentication secrets.",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl font-semibold text-[var(--token-paper)]">
          Security Controls & Environment Status
        </h1>
        <p className="text-xs font-mono text-[var(--theme-text-secondary)] mt-1">
          Architectural boundaries, Supabase infrastructure ref, and operational parameters.
        </p>
      </div>

      {/* Infrastructure Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
          <div className="flex items-center space-x-2 text-[var(--token-paper)]">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="font-serif font-semibold text-base">Production Database Target</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Project Reference:</span>
              <span className="text-emerald-400 font-bold">kaakwyavwnrbwozqyylv</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Production URL:</span>
              <span className="text-[var(--token-paper)]">https://wishscene.vercel.app</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Supabase Client Status:</span>
              <span className={configured ? "text-emerald-400" : "text-amber-400"}>
                {configured ? "Connected & Configured" : "Placeholder Mode"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Storage Buckets:</span>
              <span className="text-[var(--token-paper)]">experience-media, voice-messages</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
          <div className="flex items-center space-x-2 text-[var(--token-paper)]">
            <Key className="w-5 h-5 text-[var(--token-champagne)]" />
            <h2 className="font-serif font-semibold text-base">Current Session Authentication</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Authenticated Identity:</span>
              <span className="text-[var(--token-paper)] font-bold">{session.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Role:</span>
              <span className="text-[var(--token-champagne)] uppercase font-semibold">{session.role}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Session Expires:</span>
              <span className="text-[var(--theme-text-secondary)]">
                {new Date(session.expiresAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[var(--theme-border-subtle)]">
              <span className="text-[var(--theme-text-secondary)]">Session Cookie:</span>
              <span className="text-emerald-400">wishlight_admin_session (HTTP-Only)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Checklist */}
      <div className="p-6 rounded-2xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-subtle)] space-y-4">
        <h2 className="font-serif font-semibold text-base text-[var(--token-paper)] flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-[var(--token-champagne)]" />
          <span>Security Architecture & Safeguards</span>
        </h2>

        <div className="divide-y divide-[var(--theme-border-subtle)]">
          {securityControls.map((ctrl) => (
            <div key={ctrl.name} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="font-medium text-[var(--token-paper)] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{ctrl.name}</span>
                </div>
                <div className="text-[11px] text-[var(--theme-text-secondary)] pl-5">
                  {ctrl.desc}
                </div>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-mono text-[10px] font-semibold">
                {ctrl.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
