import React from "react";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin/auth";
import AdminNav from "@/components/admin/AdminNav";
import AdminHeader from "@/components/admin/AdminHeader";

export const metadata = {
  title: "Admin Portal â€” Birthday Vibes & Wishlight",
  description: "Private Owner Administration & Security Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] font-sans flex flex-col md:flex-row antialiased">
      {/* If logged in, display full admin sidebar navigation */}
      {session && <AdminNav userEmail={session.email} />}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {session && <AdminHeader userEmail={session.email} />}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
