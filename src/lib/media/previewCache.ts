/**
 * MediaPreviewCache — In-memory client cache for media preview URLs (Blob URLs / Signed URLs).
 * Prevents unnecessary network refetches and ensures instant image previews during creator sessions.
 */

const previewCache = new Map<string, string>();

export const MediaPreviewCache = {
  get(key: string): string | undefined {
    if (!key) return undefined;
    return previewCache.get(key);
  },

  set(key: string, url: string): void {
    if (!key || !url) return;
    previewCache.set(key, url);
  },

  has(key: string): boolean {
    if (!key) return false;
    return previewCache.has(key);
  },

  delete(key: string): void {
    if (!key) return;
    const existing = previewCache.get(key);
    if (existing && existing.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(existing);
      } catch {
        // Ignore revoke errors
      }
    }
    previewCache.delete(key);
  },

  clear(): void {
    previewCache.forEach((url) => {
      if (url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore revoke errors
        }
      }
    });
    previewCache.clear();
  },
};
