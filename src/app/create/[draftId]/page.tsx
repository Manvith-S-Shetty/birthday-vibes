import React from "react";
import { CreatorShell } from "@/components/creator/CreatorShell";

export const metadata = {
  title: "Edit Birthday Draft — Wishlight Creator Studio",
  description: "Continue editing your custom birthday experience draft.",
};

export default function EditDraftPage({ params }: { params: { draftId: string } }) {
  return <CreatorShell draftId={params.draftId} />;
}
