/**
 * VoiceRecordingCache — In-Memory Session Storage for Audio Blobs
 * Statically stores binary recorded audio Blobs in browser heap memory.
 * Never serializes to localStorage or persistent storage.
 */
class VoiceRecordingCache {
  private static blobMap = new Map<string, { blob: Blob; objectUrl: string }>();

  /**
   * Store a recorded Blob for a draft ID and generate a local object URL.
   * Revokes any existing object URL for the draft ID to prevent memory leaks.
   */
  public static set(draftId: string, blob: Blob): string {
  console.log("[VOICE_CACHE] SET", {
    draftId,
    size: blob.size,
    type: blob.type,
  });

  this.clear(draftId);

  const objectUrl = URL.createObjectURL(blob);

  this.blobMap.set(draftId, { blob, objectUrl });

  console.log("[VOICE_CACHE] STORED", {
    draftId,
    size: this.blobMap.get(draftId)?.blob.size,
    type: this.blobMap.get(draftId)?.blob.type,
  });

  return objectUrl;
}

  /**
   * Retrieve the in-memory Blob and object URL for a draft ID.
   * Includes fallback checks for default draft ID or single session recording.
   */
  public static get(draftId?: string): { blob: Blob; objectUrl: string } | null {
    if (draftId && this.blobMap.has(draftId)) {
      return this.blobMap.get(draftId)!;
    }
    if (this.blobMap.has("draft_default")) {
      return this.blobMap.get("draft_default")!;
    }
    if (this.blobMap.size === 1) {
      return Array.from(this.blobMap.values())[0] || null;
    }
    return null;
  }

  /**
   * Clear and revoke memory for a draft ID.
   */
  public static clear(draftId: string): void {
    const existing = this.blobMap.get(draftId);
    if (existing) {
      try {
        URL.revokeObjectURL(existing.objectUrl);
      } catch (e) {
        // Ignore revocation errors in synthetic/mock environments
      }
      this.blobMap.delete(draftId);
    }
  }

  /**
   * Clear all cached recordings (e.g. on session reset).
   */
  public static clearAll(): void {
    this.blobMap.forEach((entry) => {
      try {
        URL.revokeObjectURL(entry.objectUrl);
      } catch (e) {}
    });
    this.blobMap.clear();
  }
}

export { VoiceRecordingCache };
