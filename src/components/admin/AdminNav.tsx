"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  FolderLock,
  Archive,
  ShieldAlert,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

interface AdminNavProps {
  userEmail: string;
}

export default function AdminNav({ userEmail }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Experiences", href: "/admin/experiences", icon: Sparkles },
    { label: "Storage & Files", href: "/admin/files", icon: FolderLock },
    { label: "Backups & Export", href: "/admin/backups", icon: Archive },
    { label: "Security Logs", href: "/admin/logs", icon: ShieldAlert },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/wishlight-control/entry");
      router.refresh();
    } catch {
      router.push("/wishlight-control/entry");
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-5 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border-subtle)] w-64">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-[var(--token-champagne)] flex items-center justify-center text-[var(--token-ink)] font-serif font-bold text-lg shadow-sm">
            W
          </div>
          <div>
            <div className="font-serif tracking-wider font-semibold text-[var(--token-paper)] text-base leading-tight">
              WISHLIGHT
            </div>
            <div className="text-[10px] tracking-widest uppercase text-[var(--token-champagne)] font-mono font-medium">
              Owner Admin
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const currentPath = pathname || "";
            const isActive =
              item.href === "/admin"
                ? currentPath === "/admin"
                : currentPath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--theme-border-subtle)] text-[var(--token-champagne)] font-semibold border-l-2 border-[var(--token-champagne)] pl-2.5 shadow-sm"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-card)]/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-[var(--token-champagne)]" : "text-[var(--theme-text-secondary)]"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User info & Logout */}
      <div className="pt-4 border-t border-[var(--theme-border-subtle)] space-y-3">
        <div className="px-2">
          <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--theme-text-secondary)]">
            Signed In As
          </div>
          <div className="text-xs text-[var(--token-paper)] font-medium truncate" title={userEmail}>
            {userEmail}
          </div>
        </div>

        <div className="flex flex-col space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-[var(--theme-text-secondary)] hover:text-[var(--token-champagne)] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Site</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-xs text-red-400/80 hover:text-red-300 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{loggingOut ? "Logging out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 min-h-screen sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile Drawer Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-subtle)] sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[var(--token-champagne)] flex items-center justify-center text-[var(--token-ink)] font-serif font-bold text-sm">
            W
          </div>
          <span className="font-serif tracking-wider font-semibold text-sm">WISHLIGHT ADMIN</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg text-[var(--theme-text-secondary)] hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw]">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
