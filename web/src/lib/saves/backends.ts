/**
 * Where the bytes actually live.
 *
 * Two backends with one interface. The Origin Private File System is preferred
 * because it is designed for exactly this and handles large binaries well; IndexedDB
 * is the fallback for browsers that do not offer it, or offer it without the write
 * API we need. Nothing above this file knows which is in use, except the diagnostics
 * screen, which reports it on purpose: the browsers genuinely differ and pretending
 * otherwise would hide real behaviour.
 *
 * Both backends keep **one previous generation** of every park. A save writes a new
 * generation, verifies it can be read back, and only then promotes it. A failed or
 * interrupted save can therefore never destroy the last good park.
 */
import { StorageQuotaError, type StorageBackendName } from "./types";

export interface BlobBackend {
  readonly name: StorageBackendName;
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | undefined>;
  remove(key: string): Promise<void>;
  /** Copy current to previous, then promote pending to current. */
  promote(key: string): Promise<void>;
  list(): Promise<string[]>;
}

const PENDING = ".pending";
const PREVIOUS = ".previous";

export const generationKeys = (id: string, kind: "park" | "shot") => ({
  current: `${id}.${kind}`,
  pending: `${id}.${kind}${PENDING}`,
  previous: `${id}.${kind}${PREVIOUS}`,
});

function isQuotaError(error: unknown): boolean {
  const name = (error as { name?: string } | undefined)?.name ?? "";
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function wrapQuota(error: unknown): never {
  if (isQuotaError(error)) {
    throw new StorageQuotaError("The browser is out of storage space for this site.");
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Origin Private File System
// ---------------------------------------------------------------------------

async function opfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) return null;
    const root = await navigator.storage.getDirectory();
    const parks = await root.getDirectoryHandle("parks", { create: true });
    // Probe the write path: some browsers expose the directory but not a usable writer.
    const probe = await parks.getFileHandle(".probe", { create: true });
    const writer = await probe.createWritable();
    await writer.write(new Uint8Array([1]));
    await writer.close();
    await parks.removeEntry(".probe");
    return parks;
  } catch {
    return null;
  }
}

class OpfsBackend implements BlobBackend {
  readonly name = "opfs" as const;
  constructor(private readonly dir: FileSystemDirectoryHandle) {}

  async put(key: string, bytes: Uint8Array): Promise<void> {
    try {
      const handle = await this.dir.getFileHandle(key, { create: true });
      const writer = await handle.createWritable();
      await writer.write(bytes as unknown as BufferSource);
      await writer.close();
    } catch (error) {
      wrapQuota(error);
    }
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    try {
      const handle = await this.dir.getFileHandle(key);
      const file = await handle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return undefined;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.dir.removeEntry(key);
    } catch {
      /* already gone */
    }
  }

  async promote(key: string): Promise<void> {
    const pending = await this.get(`${key}${PENDING}`);
    if (pending === undefined) throw new Error(`nothing pending for ${key}`);
    const current = await this.get(key);
    if (current !== undefined) await this.put(`${key}${PREVIOUS}`, current);
    await this.put(key, pending);
    await this.remove(`${key}${PENDING}`);
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    // @ts-expect-error async iteration over directory handles is not in the DOM types yet
    for await (const name of this.dir.keys()) keys.push(name as string);
    return keys;
  }
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

const DB_NAME = "sunrise-parks";
const DB_VERSION = 1;
const BLOB_STORE = "blobs";
export const META_STORE = "records";

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = run(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

class IndexedDbBackend implements BlobBackend {
  readonly name = "indexeddb" as const;
  constructor(private readonly db: IDBDatabase) {}

  async put(key: string, bytes: Uint8Array): Promise<void> {
    try {
      await transact(this.db, BLOB_STORE, "readwrite", (store) => store.put(bytes, key));
    } catch (error) {
      wrapQuota(error);
    }
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const value = await transact<unknown>(this.db, BLOB_STORE, "readonly", (store) => store.get(key));
    if (value === undefined || value === null) return undefined;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return undefined;
  }

  async remove(key: string): Promise<void> {
    await transact(this.db, BLOB_STORE, "readwrite", (store) => store.delete(key));
  }

  /**
   * One transaction, so the promotion either happens completely or not at all.
   */
  async promote(key: string): Promise<void> {
    const pending = await this.get(`${key}${PENDING}`);
    if (pending === undefined) throw new Error(`nothing pending for ${key}`);
    const current = await this.get(key);
    await new Promise<void>((resolve, reject) => {
      const tx = this.db.transaction(BLOB_STORE, "readwrite");
      const store = tx.objectStore(BLOB_STORE);
      if (current !== undefined) store.put(current, `${key}${PREVIOUS}`);
      store.put(pending, key);
      store.delete(`${key}${PENDING}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }).catch(wrapQuota);
  }

  async list(): Promise<string[]> {
    const keys = await transact<IDBValidKey[]>(this.db, BLOB_STORE, "readonly", (store) => store.getAllKeys());
    return keys.map(String);
  }
}

/**
 * Pick a backend. The metadata index always lives in IndexedDB, because it is small,
 * queryable and available everywhere; only the binaries move.
 */
export async function selectBackend(): Promise<{ blobs: BlobBackend; db: IDBDatabase }> {
  const db = await openDatabase();
  const dir = await opfsRoot();
  return { blobs: dir ? new OpfsBackend(dir) : new IndexedDbBackend(db), db };
}
