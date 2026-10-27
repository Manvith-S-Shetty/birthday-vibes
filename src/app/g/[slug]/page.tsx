import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseExperienceRepository } from "@/lib/experience/SupabaseExperienceRepository";
import { ExperienceRenderer } from "@/components/experience/ExperienceRenderer";
import { ExpiredExperienceView } from "@/components/experience/ExpiredExperienceView";
import { isRecipientAuthorized } from "@/lib/security/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const metadata = await supabaseExperienceRepository.getLockedMetadata(params.slug);
  if (!metadata) {
    return {
      title: "Experience Not Found — Birthday Vibes",
      description: "The requested birthday experience could not be found.",
    };
  }

  const recipientName = metadata.recipientName || "Someone Special";

  if (metadata.isExpired) {
    return {
      title: `Experience Expired — Birthday Vibes`,
      description: `The birthday celebration crafted for ${recipientName} has expired.`,
      robots: {
        index: false,
        follow: false,
        noarchive: true,
      },
    };
  }

  return {
    title: `A Birthday Gift for ${recipientName} — Birthday Vibes`,
    description: `An elegant cinematic digital gift created for ${recipientName} with Birthday Vibes.`,
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
      title: `A Birthday Gift for ${recipientName}`,
      description: "An elegant cinematic digital gift created with Birthday Vibes.",
      siteName: "Birthday Vibes",
      type: "website",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: "Birthday Vibes — Elegant Cinematic Birthday Experience",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `A Birthday Gift for ${recipientName}`,
      description: "An elegant cinematic digital gift created with Birthday Vibes.",
      images: ["/logo.png"],
    },
  };
}

export default async function RecipientExperiencePage({
  params,
}: {
  params: { slug: string };
}) {
  const metadata = await supabaseExperienceRepository.getLockedMetadata(params.slug);

  if (!metadata) {
    notFound();
  }

  // Consistent, polished expired experience view
  if (metadata.isExpired) {
    return (
      <ExpiredExperienceView
        recipientName={metadata.recipientName}
        themeId={metadata.themeId}
      />
    );
  }

  const isProtected = Boolean(metadata.isPinProtected);
  const authorized = isProtected ? isRecipientAuthorized(params.slug) : true;

  if (authorized) {
    const payload = await supabaseExperienceRepository.getProtectedPayload(params.slug);
    if (payload) {
      return (
        <ExperienceRenderer
          key={params.slug}
          data={payload}
          initialUnlocked={true}
          isPreview={false}
          showSceneNavigation={false}
        />
      );
    }
  }

  // PIN-protected experience with no active authorization:
  // Render ONLY the locked cover scene data. Do NOT expose private messages, photos, or media.
  return (
    <ExperienceRenderer
      key={params.slug}
      data={{
        id: params.slug,
        slug: params.slug,
        recipientName: metadata.recipientName,
        birthdayDate: metadata.birthdayDate,
        themeId: metadata.themeId as any,
        personalMessage: "",
        photos: [],
        isPinProtected: isProtected,
        isExpired: false,
        expiresAt: metadata.expiresAt,
        createdAt: new Date().toISOString(),
      }}
      initialUnlocked={!isProtected}
      isPreview={false}
      showSceneNavigation={false}
    />
  );
}
