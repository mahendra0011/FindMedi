/**
 * File 15 §15.5 (offline-first, no new deps): IndexedDB-backed write queue
 * for ward tablets. Drafts autosave locally; failed POSTs queue with a
 * clientId + idempotencyKey and replay on reconnect (manual "Sync now" +
 * auto on `online` event). Append-only clinical entries are never merged —
 * each queued write replays verbatim in order. No dependency: raw IndexedDB.
 */

const DB = 'findmedi-offline';
const STORE = 'queue';

const openDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const tx = async <T = undefined>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest | void): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let out: T | undefined;
    try {
      const r = fn(store);
      if (r && 'onsuccess' in r) {
        (r as IDBRequest<T>).onsuccess = () => { out = (r as IDBRequest<T>).result; };
      }
    } catch (error: unknown) { reject(error); return; }
    t.oncomplete = () => { db.close(); resolve(out as T); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
};

export interface QueuedWrite {
  key: string;
  url: string;
  method: string;
  body: unknown;
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
}

export const queueWrite = async (url: string, method: string, body: unknown): Promise<QueuedWrite> => {
  const row: QueuedWrite = {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url, method, body,
    idempotencyKey: (globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx('readwrite', (s) => s.put(row));
  // First offline write of the session marks offline-mode entry (once per
  // page load; analytics must never break queueing).
  try {
    const tracker = globalThis as typeof globalThis & { __fmOfflineTracked?: boolean };
    if (typeof navigator !== 'undefined' && navigator.onLine === false && !tracker.__fmOfflineTracked) {
      tracker.__fmOfflineTracked = true;
      const { track } = await import('./track');
      track('offline_mode_entered', { network_type: 'offline' });
    }
  } catch { /* ignore */ }
  return row;
};

export const pendingWrites = async (): Promise<QueuedWrite[]> =>
  tx('readonly', (s) => s.getAll());

export const dropWrite = async (key: string): Promise<void> => {
  await tx('readwrite', (s) => s.delete(key));
};

/** Draft autosave (namespaced key, e.g. `form:<templateKey>`). */
export const saveDraft = async (ns: string, value: unknown): Promise<void> => {
  try {
    localStorage.setItem(`fm-draft:${ns}`, JSON.stringify({ at: Date.now(), value }));
  } catch { /* storage full/blocked — draft stays in memory only */ }
};

export const loadDraft = (ns: string): unknown => {
  try {
    const raw = localStorage.getItem(`fm-draft:${ns}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : null;
  } catch { return null; }
};

export const clearDraft = (ns: string): void => {
  try { localStorage.removeItem(`fm-draft:${ns}`); } catch { /* noop */ }
};

/**
 * Replay queued writes in order. `send` performs the authed fetch and must
 * throw on failure (row kept, attempts+1) and return on success (row dropped).
 * Stops at the first failure to preserve order.
 */
export const syncNow = async (send: (w: QueuedWrite) => Promise<unknown>): Promise<{ synced: number; pending: number }> => {
  const rows = (await pendingWrites()).sort((a, b) => a.createdAt - b.createdAt);
  let synced = 0;
  for (const w of rows) {
    try {
      await send(w);
      await dropWrite(w.key);
      synced += 1;
    } catch {
      break;
    }
  }
  return { synced, pending: rows.length - synced };
};

export const onReconnect = (cb: () => void): (() => void) => {
  window.addEventListener('online', cb);
  return () => window.removeEventListener('online', cb);
};

// ---- Field-PWA offline queue (doc 24) ----
// Disclosed check-in policy: every queued check-in stores a `disclosed: true`
// flag confirming the rep disclosed the visit purpose before recording it.

const FIELD_DB = 'findmedi-field';
const FIELD_STORE = 'queue';

function openFieldDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(FIELD_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FIELD_STORE)) db.createObjectStore(FIELD_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export type FieldQueuedAction = { type: string; payload: unknown; disclosed: boolean; createdAt: number };

export async function enqueueFieldAction(action: FieldQueuedAction): Promise<void> {
  const db = await openFieldDb();
  if (db) {
    const tx = db.transaction(FIELD_STORE, 'readwrite');
    tx.objectStore(FIELD_STORE).add({ ...action, createdAt: action.createdAt || Date.now() });
    return new Promise((res) => { tx.oncomplete = () => res(); tx.onerror = () => res(); });
  }
  const key = 'fm_field_queue';
  const raw = localStorage.getItem(key);
  const arr = raw ? JSON.parse(raw) : [];
  arr.push({ ...action, createdAt: action.createdAt || Date.now(), id: Date.now() });
  localStorage.setItem(key, JSON.stringify(arr));
}

export async function drainFieldQueue(handler: (a: FieldQueuedAction) => Promise<void>): Promise<number> {
  const db = await openFieldDb();
  let count = 0;
  if (db) {
    const tx = db.transaction(FIELD_STORE, 'readwrite');
    const store = tx.objectStore(FIELD_STORE);
    const req = store.getAll();
    await new Promise<void>((res) => {
      req.onsuccess = async () => {
        const items = (req.result || []) as (FieldQueuedAction & { id: number })[];
        for (const it of items) {
          try { await handler(it); store.delete(it.id); count++; } catch { /* keep for retry */ }
        }
        res();
      };
      req.onerror = () => res();
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
    return count;
  }
  const key = 'fm_field_queue';
  const raw = localStorage.getItem(key);
  const arr: (FieldQueuedAction & { id?: number })[] = raw ? JSON.parse(raw) : [];
  const remaining: (FieldQueuedAction & { id?: number })[] = [];
  for (const it of arr) {
    try { await handler(it); count++; } catch { remaining.push(it); }
  }
  localStorage.setItem(key, JSON.stringify(remaining));
  return count;
}

export function startFieldAutoSync(handler: (a: FieldQueuedAction) => Promise<void>) {
  const replay = () => { if (navigator.onLine) drainFieldQueue(handler).catch(() => {}); };
  window.addEventListener('online', replay);
  if (navigator.onLine) setTimeout(replay, 2000);
  return () => window.removeEventListener('online', replay);
}
