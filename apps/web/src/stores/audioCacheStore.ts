import { create } from "zustand";
import { getToken, API_BASE_URL } from "../api";

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

const DB_NAME = "ainerspeak_audio_cache";
const STORE_NAME = "audio_entries";
const DB_VERSION = 1;
const MAX_ENTRIES = 200;

type AudioEntry = {
  key: string;
  blob: Blob;
  lastUsedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("lastUsedAt", "lastUsedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<AudioEntry | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as AudioEntry | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, entry: AudioEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClear(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbCount(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Return keys of the oldest entries (by lastUsedAt) to evict. */
function idbOldestKeys(db: IDBDatabase, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("lastUsedAt");
    const keys: string[] = [];
    const req = index.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && keys.length < count) {
        keys.push((cursor.value as AudioEntry).key);
        cursor.continue();
      } else {
        resolve(keys);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// Simple hash for cache keys
// ---------------------------------------------------------------------------

function hashKey(text: string, lang: string, voice: string, speed: number): string {
  const raw = `${text}|${lang}|${voice}|${speed}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return `tts_${h >>> 0}`;
}

// ---------------------------------------------------------------------------
// In-memory maps (not part of Zustand state — plain module-level singletons)
// ---------------------------------------------------------------------------

const objectURLs = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type AudioCacheState = {
  /** Fetch (or return cached) objectURL for the given TTS params. */
  getOrFetch: (text: string, lang?: string, voice?: string, speed?: number) => Promise<string>;
  /** Fire-and-forget prefetch. */
  prefetch: (text: string, lang?: string, voice?: string, speed?: number) => void;
  /** Wipe IndexedDB cache and revoke all object URLs. */
  clearCache: () => Promise<void>;
};

export const useAudioCacheStore = create<AudioCacheState>(() => ({
  getOrFetch: async (
    text: string,
    lang = "en",
    voice = "auto",
    speed = 1.0,
  ): Promise<string> => {
    const key = hashKey(text, lang, voice, speed);

    // 1. In-memory objectURL
    const cached = objectURLs.get(key);
    if (cached) return cached;

    // 2. Check inflight — single-flight dedup
    const existing = inflight.get(key);
    if (existing) return existing;

    // 3. Build the actual fetch promise
    const promise = (async (): Promise<string> => {
      try {
        const db = await openDB();

        // 2b. Check IndexedDB
        const entry = await idbGet(db, key);
        if (entry) {
          // Touch lastUsedAt
          await idbPut(db, { ...entry, lastUsedAt: Date.now() });
          const url = URL.createObjectURL(entry.blob);
          objectURLs.set(key, url);
          return url;
        }

        // 4. Fetch from TTS API
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/api/voice/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text, voice, speed, language: lang }),
        });

        if (!res.ok) {
          throw new Error(`TTS request failed: ${res.status}`);
        }

        const data = await res.json() as { audio_url?: string; audio_base64?: string; audio_mime?: string };
        let blob: Blob;

        if (data.audio_base64) {
          const binaryStr = atob(data.audio_base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: data.audio_mime || "audio/mpeg" });
        } else if (data.audio_url) {
          const audioRes = await fetch(data.audio_url.startsWith("http") ? data.audio_url : `${API_BASE_URL}${data.audio_url}`);
          blob = await audioRes.blob();
        } else {
          throw new Error("No audio returned from server");
        }

        // 5. Store in IndexedDB (with LRU eviction)
        const count = await idbCount(db);
        if (count >= MAX_ENTRIES) {
          const evictCount = count - MAX_ENTRIES + 1;
          const oldKeys = await idbOldestKeys(db, evictCount);
          for (const oldKey of oldKeys) {
            const oldURL = objectURLs.get(oldKey);
            if (oldURL) {
              URL.revokeObjectURL(oldURL);
              objectURLs.delete(oldKey);
            }
            await idbDelete(db, oldKey);
          }
        }

        await idbPut(db, { key, blob, lastUsedAt: Date.now() });

        const url = URL.createObjectURL(blob);
        objectURLs.set(key, url);
        return url;
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, promise);
    return promise;
  },

  prefetch: (text: string, lang?: string, voice?: string, speed?: number): void => {
    const { getOrFetch } = useAudioCacheStore.getState();
    void getOrFetch(text, lang, voice, speed);
  },

  clearCache: async (): Promise<void> => {
    // Revoke all in-memory object URLs
    for (const url of objectURLs.values()) {
      URL.revokeObjectURL(url);
    }
    objectURLs.clear();
    inflight.clear();

    const db = await openDB();
    await idbClear(db);
  },
}));
