// IndexedDB cache: template catalog + currently-open project.
// Lets the editor & templates page work fully offline, and queues
// project edits for replay when the connection returns.
import type { ProjectContent } from "./blocks";

const DB_NAME = "sitely-offline";
// Bumped to 2: adds `baseUpdatedAt` tracking on cached projects + queued
// edits so we can detect concurrent remote writes (conflict).
const DB_VER = 2;
const STORE_TEMPLATES = "templates";
const STORE_PROJECT = "project";
const STORE_QUEUE = "queue";
const STORE_PROJECT_LIST = "project_list";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) db.createObjectStore(STORE_TEMPLATES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_PROJECT)) db.createObjectStore(STORE_PROJECT, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(STORE_PROJECT_LIST)) db.createObjectStore(STORE_PROJECT_LIST, { keyPath: "id" });
      // No schema change on existing stores; new optional fields are
      // added to records lazily.
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result: T | undefined;
    const req = fn(s);
    if (req) req.onsuccess = () => { result = req.result as T; };
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export type CachedTemplate = { id: string; name: string; category: string; content: ProjectContent; cachedAt: number };
/** `baseUpdatedAt` is the remote `updated_at` (ms epoch) the local copy
 *  was forked from. Used to detect concurrent edits at sync time. */
export type CachedProject = { id: string; content: ProjectContent; updatedAt: number; baseUpdatedAt?: number };
export type QueuedEdit = {
  id?: number;
  projectId: string;
  content: ProjectContent;
  queuedAt: number;
  baseUpdatedAt?: number;
  /** number of failed sync attempts so far. */
  attempts?: number;
  /** epoch ms — earliest the scheduler should retry this edit. */
  nextRetryAt?: number;
  /** last error message, surfaced in the offline summary UI. */
  lastError?: string;
};

export async function cacheTemplate(t: CachedTemplate) {
  try { await tx(STORE_TEMPLATES, "readwrite", (s) => s.put(t)); } catch { /* ignore */ }
}
export async function listCachedTemplates(): Promise<CachedTemplate[]> {
  try {
    return await new Promise((resolve, reject) => {
      openDb().then((db) => {
        const t = db.transaction(STORE_TEMPLATES, "readonly").objectStore(STORE_TEMPLATES).getAll();
        t.onsuccess = () => resolve(t.result as CachedTemplate[]);
        t.onerror = () => reject(t.error);
      });
    });
  } catch { return []; }
}

export async function cacheProject(p: CachedProject) {
  try { await tx(STORE_PROJECT, "readwrite", (s) => s.put(p)); } catch { /* ignore */ }
}
export async function getCachedProject(id: string): Promise<CachedProject | null> {
  try {
    return await new Promise((resolve, reject) => {
      openDb().then((db) => {
        const r = db.transaction(STORE_PROJECT, "readonly").objectStore(STORE_PROJECT).get(id);
        r.onsuccess = () => resolve((r.result as CachedProject) || null);
        r.onerror = () => reject(r.error);
      });
    });
  } catch { return null; }
}

export async function queueEdit(edit: QueuedEdit) {
  try { await tx(STORE_QUEUE, "readwrite", (s) => s.add(edit)); } catch { /* ignore */ }
}
export async function drainQueue(): Promise<QueuedEdit[]> {
  try {
    const all: QueuedEdit[] = await new Promise((resolve, reject) => {
      openDb().then((db) => {
        const r = db.transaction(STORE_QUEUE, "readonly").objectStore(STORE_QUEUE).getAll();
        r.onsuccess = () => resolve(r.result as QueuedEdit[]);
        r.onerror = () => reject(r.error);
      });
    });
    await tx(STORE_QUEUE, "readwrite", (s) => s.clear());
    return all;
  } catch { return []; }
}

/** Read all queued edits without clearing them — needed by the
 *  replay scheduler so it can manage per-edit attempts/backoff. */
export async function listQueue(): Promise<QueuedEdit[]> {
  try {
    return await new Promise<QueuedEdit[]>((resolve, reject) => {
      openDb().then((db) => {
        const r = db.transaction(STORE_QUEUE, "readonly").objectStore(STORE_QUEUE).getAll();
        r.onsuccess = () => resolve((r.result as QueuedEdit[]) ?? []);
        r.onerror = () => reject(r.error);
      });
    });
  } catch { return []; }
}

/** Remove a single queued edit by its IndexedDB autoincrement id. */
export async function removeQueuedEdit(id: number): Promise<void> {
  try { await tx(STORE_QUEUE, "readwrite", (s) => s.delete(id)); } catch { /* ignore */ }
}

/** Persist updated metadata (attempts, nextRetryAt, lastError) for a
 *  retryable edit. Requires a record with an existing `id`. */
export async function updateQueuedEdit(edit: QueuedEdit): Promise<void> {
  if (typeof edit.id !== "number") return;
  try { await tx(STORE_QUEUE, "readwrite", (s) => s.put(edit)); } catch { /* ignore */ }
}

/** Read-only count of pending queued edits, useful for UI banners. */
export async function pendingEditCount(): Promise<number> {
  try {
    return await new Promise<number>((resolve, reject) => {
      openDb().then((db) => {
        const r = db.transaction(STORE_QUEUE, "readonly").objectStore(STORE_QUEUE).count();
        r.onsuccess = () => resolve(r.result || 0);
        r.onerror = () => reject(r.error);
      });
    });
  } catch { return 0; }
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

// ---- Project list cache (dashboard offline hydration) ----

export type CachedProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  published: boolean;
  updated_at: string;
};

export type CachedProjectList = {
  id: string; // user id (keyPath)
  items: CachedProjectListItem[];
  cachedAt: number;
};

export async function cacheProjectList(userId: string, items: CachedProjectListItem[]): Promise<void> {
  if (!userId) return;
  try {
    await tx(STORE_PROJECT_LIST, "readwrite", (s) =>
      s.put({ id: userId, items, cachedAt: Date.now() } satisfies CachedProjectList),
    );
  } catch { /* ignore */ }
}

export async function getCachedProjectList(userId: string): Promise<CachedProjectListItem[] | null> {
  if (!userId) return null;
  try {
    const row = await new Promise<CachedProjectList | null>((resolve, reject) => {
      openDb().then((db) => {
        const r = db.transaction(STORE_PROJECT_LIST, "readonly").objectStore(STORE_PROJECT_LIST).get(userId);
        r.onsuccess = () => resolve((r.result as CachedProjectList) || null);
        r.onerror = () => reject(r.error);
      });
    });
    return row?.items ?? null;
  } catch { return null; }
}
