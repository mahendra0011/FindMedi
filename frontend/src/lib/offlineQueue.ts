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

const tx = async (mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest | void): Promise<any> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let out: any;
    try {
      const r = fn(store);
      if (r && 'onsuccess' in r) {
        (r as IDBRequest).onsuccess = () => { out = (r as IDBRequest).result; };
      }
    } catch (e) { reject(e); return; }
    t.oncomplete = () => { db.close(); resolve(out); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
};

export interface QueuedWrite {
  key: string;
  url: string;
  method: string;
  body: any;
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
}

export const queueWrite = async (url: string, method: string, body: any): Promise<QueuedWrite> => {
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
  return row;
};

export const pendingWrites = async (): Promise<QueuedWrite[]> =>
  tx('readonly', (s) => s.getAll());

export const dropWrite = async (key: string): Promise<void> => {
  await tx('readwrite', (s) => s.delete(key));
};

/** Draft autosave (namespaced key, e.g. `form:<templateKey>`). */
export const saveDraft = async (ns: string, value: any): Promise<void> => {
  try {
    localStorage.setItem(`fm-draft:${ns}`, JSON.stringify({ at: Date.now(), value }));
  } catch { /* storage full/blocked — draft stays in memory only */ }
};

export const loadDraft = (ns: string): any => {
  try {
    const raw = localStorage.getItem(`fm-draft:${ns}`);
    return raw ? JSON.parse(raw).value : null;
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
