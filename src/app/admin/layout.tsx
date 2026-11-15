import React from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import AdminNav from "@/components/admin/AdminNav";
import AdminHeader from "@/components/admin/AdminHeader";

export const metadata = {
  title: "Admin Portal — Birthday Vibes & Wishlight",
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
  if (!session) {
    redirect("/wishlight-control/entry");
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] font-sans flex flex-col md:flex-row antialiased">
      {/* Authenticated Admin Sidebar Navigation */}
      <AdminNav userEmail={session.email} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader userEmail={session.email} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
