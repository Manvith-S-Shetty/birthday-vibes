import { BirthdayDraft, DraftRepository } from "@/types/draft";
import { LocalDraftRepository, localDraftRepository } from "./LocalDraftRepository";
import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase/client";
import { hashCreatorSecret } from "@/lib/security/hash";

export class SupabaseDraftRepository implements DraftRepository {
  private fallbackRepo: LocalDraftRepository;

  constructor() {
    this.fallbackRepo = localDraftRepository;
  }

  async getDraft(id?: string): Promise<BirthdayDraft | null> {
    if (!isSupabaseConfigured()) {
      return this.fallbackRepo.getDraft(id);
    }

    try {
      const targetId = id || "draft_default";
      const { data, error } = await (supabaseClient as any)
        .from("experiences")
        .select("*")
        .eq("id", targetId)
        .single();

      if (error || !data) {
        return this.fallbackRepo.getDraft(id);
      }

      return {
        id: data.id,
        recipientName: data.recipient_name,
        birthdayDate: data.birthday_date || undefined,
        themeId: data.theme_id as any,
        personalMessage: data.personal_message,
        photos: [],
        pin: "",
        isPinProtected: data.is_pin_protected,
        currentStep: data.current_step as any,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return this.fallbackRepo.getDraft(id);
    }
  }

  async saveDraft(draft: BirthdayDraft): Promise<BirthdayDraft> {
    // Always persist to local repository as backup
    await this.fallbackRepo.saveDraft(draft);

    if (!isSupabaseConfigured()) {
      return draft;
    }

    try {
      const defaultHash = hashCreatorSecret("draft_session_local");
      await (supabaseClient as any).from("experiences").upsert({
        id: draft.id.startsWith("draft_") ? undefined : draft.id,
        creator_token_hash: defaultHash,
        recipient_name: draft.recipientName,
        birthday_date: draft.birthdayDate || null,
        theme_id: draft.themeId,
        personal_message: draft.personalMessage,
        is_pin_protected: draft.isPinProtected,
        current_step: draft.currentStep,
        status: "draft",
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Supabase save draft error:", e);
    }

    return draft;
  }

  async createDraft(initial?: Partial<BirthdayDraft>): Promise<BirthdayDraft> {
    return this.fallbackRepo.createDraft(initial);
  }

  async deleteDraft(id: string): Promise<void> {
    await this.fallbackRepo.deleteDraft(id);
  }
}

export const supabaseDraftRepository = new SupabaseDraftRepository();
