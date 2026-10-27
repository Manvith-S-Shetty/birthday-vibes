/**
 * VoiceRecordingCache — In-Memory & IndexedDB Backed Session Storage for Audio Blobs
 *
 * 1. Synchronous in-memory Map for real-time low-latency playback during editing.
 * 2. Asynchronous IndexedDB backing store so audio recordings survive page reloads
 *    during active draft creation sessions.
 * 3. Gracefully degrades if IndexedDB is blocked, unsupported, or in restricted environments.
 */

const DB_NAME = "wishlight_voice_cache";
const STORE_NAME = "recordings";
const DB_VERSION = 1;

interface CachedEntry {
  blob: Blob;
  objectUrl: string;
}

interface StoredAudioRecord {
  draftId: string;
  blob?: Blob;
  arrayBuffer?: ArrayBuffer;
  mimeType: string;
  updatedAt: string;
}

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "draftId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.warn("[VOICE_CACHE] IndexedDB open error:", e);
        resolve(null);
      };
    } catch (err) {
      console.warn("[VOICE_CACHE] IndexedDB open exception:", err);
      resolve(null);
    }
  });
}

async function saveBlobToIdb(draftId: string, blob: Blob): Promise<void> {
  const db = await openAudioDb();
  if (!db) return;

  const mimeType = blob.type || "audio/webm";
  const updatedAt = new Date().toISOString();

  // Try storing Blob directly first; fallback to ArrayBuffer if DataCloneError occurs
  const tryStore = async (targetId: string, record: any): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = async () => {
          // Fallback to storing ArrayBuffer if Blob clone failed
          try {
            const buffer = await blob.arrayBuffer();
            const fallbackTx = db.transaction(STORE_NAME, "readwrite");
            fallbackTx.objectStore(STORE_NAME).put({
              draftId: targetId,
              arrayBuffer: buffer,
              mimeType,
              updatedAt,
            });
            fallbackTx.oncomplete = () => resolve();
            fallbackTx.onerror = () => resolve();
          } catch {
            resolve();
          }
        };
      } catch (err) {
        console.warn("[VOICE_CACHE] IndexedDB put exception:", err);
        resolve();
      }
    });
  };

  await tryStore(draftId, {
    draftId,
    blob,
    mimeType,
    updatedAt,
  });

  if (draftId !== "draft_default") {
    await tryStore("draft_default", {
      draftId: "draft_default",
      blob,
      mimeType,
      updatedAt,
    }).catch(() => {});
  }
}

function normalizeStoredRecord(record: any): StoredAudioRecord | null {
  if (!record) return null;
  if (record.blob && record.blob instanceof Blob && record.blob.size > 0) {
    return {
      draftId: record.draftId,
      blob: record.blob,
      mimeType: record.mimeType || record.blob.type || "audio/webm",
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
  }
  if (record.arrayBuffer && record.arrayBuffer.byteLength > 0) {
    const mimeType = record.mimeType || "audio/webm";
    const blob = new Blob([record.arrayBuffer], { type: mimeType });
    return {
      draftId: record.draftId,
      blob,
      mimeType,
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
  }
  return null;
}

async function loadBlobFromIdb(draftId?: string): Promise<StoredAudioRecord | null> {
  const db = await openAudioDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const inspectAllAndResolve = () => {
        try {
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const records: any[] = allReq.result || [];
            if (!records || records.length === 0) {
              resolve(null);
              return;
            }

            // 1. Direct draftId match
            if (draftId) {
              const direct = records.find((r) => r.draftId === draftId);
              const normalized = normalizeStoredRecord(direct);
              if (normalized) {
                resolve(normalized);
                return;
              }
            }

            // 2. Default draft match
            const defRecord = records.find((r) => r.draftId === "draft_default");
            const defNorm = normalizeStoredRecord(defRecord);
            if (defNorm) {
              resolve(defNorm);
              return;
            }

            // 3. Most recent recording in database
            const validRecords = records
              .map(normalizeStoredRecord)
              .filter((r): r is StoredAudioRecord => r !== null && Boolean(r.blob && r.blob.size > 0));

            if (validRecords.length > 0) {
              validRecords.sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
              resolve(validRecords[0]);
              return;
            }

            resolve(null);
          };
          allReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };

      if (draftId) {
        const req = store.get(draftId);
        req.onsuccess = () => {
          const normalized = normalizeStoredRecord(req.result);
          if (normalized) {
            resolve(normalized);
          } else {
            // Check default draft or scan store
            const defReq = store.get("draft_default");
            defReq.onsuccess = () => {
              const defNorm = normalizeStoredRecord(defReq.result);
              if (defNorm) {
                resolve(defNorm);
              } else {
                inspectAllAndResolve();
              }
            };
            defReq.onerror = () => inspectAllAndResolve();
          }
        };
        req.onerror = () => inspectAllAndResolve();
      } else {
        inspectAllAndResolve();
      }
    } catch (err) {
      console.warn("[VOICE_CACHE] IndexedDB read exception:", err);
      resolve(null);
    }
  });
}

async function deleteBlobFromIdb(draftId: string): Promise<void> {
  const db = await openAudioDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(draftId);
      if (draftId !== "draft_default") {
        tx.objectStore(STORE_NAME).delete("draft_default");
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function clearAllIdb(): Promise<void> {
  const db = await openAudioDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

class VoiceRecordingCache {
  private static blobMap = new Map<string, CachedEntry>();
  private static lastActiveKey: string | null = null;

  /**
   * Store a recorded Blob for a draft ID.
   * Updates in-memory map immediately and persists to IndexedDB.
   */
  public static set(draftId: string, blob: Blob): string {
    console.log("[VOICE_CACHE] SET", {
      draftId,
      size: blob.size,
      type: blob.type,
    });

    this.clearMemoryOnly(draftId);

    let objectUrl = "";
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      try {
        objectUrl = URL.createObjectURL(blob);
      } catch (err) {
        console.warn("[VOICE_CACHE] createObjectURL error:", err);
      }
    }

    const entry: CachedEntry = { blob, objectUrl };
    this.blobMap.set(draftId, entry);
    this.lastActiveKey = draftId;

    if (draftId !== "draft_default") {
      this.blobMap.set("draft_default", entry);
    }

    // Persist to IndexedDB backing store
    saveBlobToIdb(draftId, blob).catch((err) => {
      console.warn("[VOICE_CACHE] Failed to persist blob to IndexedDB:", err);
    });

    return objectUrl;
  }

  /**
   * Synchronously retrieve the in-memory Blob and object URL for a draft ID.
   * Includes fallback checks for active session draft or default draft.
   */
  public static get(draftId?: string): CachedEntry | null {
    if (draftId && this.blobMap.has(draftId)) {
      return this.blobMap.get(draftId)!;
    }
    if (this.lastActiveKey && this.blobMap.has(this.lastActiveKey)) {
      return this.blobMap.get(this.lastActiveKey)!;
    }
    if (this.blobMap.has("draft_default")) {
      return this.blobMap.get("draft_default")!;
    }
    if (this.blobMap.size === 1) {
      return Array.from(this.blobMap.values())[0] || null;
    }
    if (this.blobMap.size > 0) {
      const entries = Array.from(this.blobMap.values());
      return entries[entries.length - 1] || null;
    }
    return null;
  }

  /**
   * Asynchronously restore Blob from IndexedDB backing store if not present in memory.
   * Recreates object URL and populates in-memory cache.
   */
  public static async restore(draftId?: string): Promise<CachedEntry | null> {
    const memoryHit = this.get(draftId);
    if (memoryHit) {
      return memoryHit;
    }

    const stored = await loadBlobFromIdb(draftId);
    if (!stored || !stored.blob) {
      return null;
    }

    let objectUrl = "";
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      try {
        objectUrl = URL.createObjectURL(stored.blob);
      } catch (err) {
        console.warn("[VOICE_CACHE] createObjectURL error during restore:", err);
      }
    }

    const entry: CachedEntry = { blob: stored.blob, objectUrl };
    const targetKey = draftId || stored.draftId || "draft_default";
    this.blobMap.set(targetKey, entry);
    this.lastActiveKey = targetKey;

    if (targetKey !== "draft_default") {
      this.blobMap.set("draft_default", entry);
    }

    console.log("[VOICE_CACHE] RESTORED from IndexedDB", {
      draftId: targetKey,
      size: stored.blob.size,
      type: stored.blob.type,
    });

    return entry;
  }

  /**
   * Check if a recording is currently available in memory.
   */
  public static has(draftId?: string): boolean {
    return this.get(draftId) !== null;
  }

  /**
   * Clear in-memory URL and entry only (without deleting from IndexedDB).
   */
  private static clearMemoryOnly(draftId: string): void {
    const existing = this.blobMap.get(draftId);
    if (existing) {
      if (existing.objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(existing.objectUrl);
        } catch {}
      }
      this.blobMap.delete(draftId);
    }
    if (this.lastActiveKey === draftId) {
      this.lastActiveKey = null;
    }
  }

  /**
   * Clear and revoke memory for a draft ID and remove from IndexedDB.
   */
  public static clear(draftId: string): void {
    this.clearMemoryOnly(draftId);
    if (draftId !== "draft_default") {
      this.clearMemoryOnly("draft_default");
    }
    deleteBlobFromIdb(draftId).catch(() => {});
  }

  /**
   * Alias for clear to support delete semantics.
   */
  public static delete(draftId: string): void {
    this.clear(draftId);
  }

  /**
   * Clear all cached recordings from memory and IndexedDB.
   */
  public static clearAll(): void {
    this.blobMap.forEach((entry) => {
      if (entry.objectUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(entry.objectUrl);
        } catch {}
      }
    });
    this.blobMap.clear();
    this.lastActiveKey = null;
    clearAllIdb().catch(() => {});
  }
}

export { VoiceRecordingCache };
