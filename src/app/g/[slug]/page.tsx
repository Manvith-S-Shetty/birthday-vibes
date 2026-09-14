import React from "react";
import { Metadata } from "next";
import { supabaseExperienceRepository } from "@/lib/experience/SupabaseExperienceRepository";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const metadata = await supabaseExperienceRepository.getLockedMetadata(params.slug);
  const recipientName = metadata.recipientName || "Someone Special";

  return {
    title: `A Birthday Wishlight for ${recipientName}`,
    description: `An elegant cinematic digital gift created for ${recipientName} with Wishlight.`,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    alternates: {
      canonical: `/g/${params.slug}`,
    },
    openGraph: {
      title: `A Birthday Wishlight for ${recipientName}`,
      description: "An elegant cinematic digital gift created with Wishlight.",
      siteName: "Wishlight",
      type: "website",
      images: [
        {
          url: "/images/og-wishlight-cover.png",
          width: 1200,
          height: 630,
          alt: "Wishlight — Elegant Cinematic Birthday Experience",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `A Birthday Wishlight for ${recipientName}`,
      description: "An elegant cinematic digital gift created with Wishlight.",
      images: ["/images/og-wishlight-cover.png"],
    },
  };
}

export default async function RecipientExperiencePage({
  params,
}: {
  params: { slug: string };
}) {
  const metadata = await supabaseExperienceRepository.getLockedMetadata(params.slug);

  return (
    <ExperienceRenderer
      data={{
        id: params.slug,
        slug: params.slug,
        recipientName: metadata.recipientName,
        birthdayDate: metadata.birthdayDate,
        themeId: metadata.themeId as any,
        personalMessage: "",
        photos: [],
        isPinProtected: metadata.isPinProtected,
        createdAt: new Date().toISOString(),
      }}
    />
  );
}
