/**
 * GameSaveStore: the only thing that knows how parks are stored.
 *
 * Interface code calls this and never touches the Origin Private File System or
 * IndexedDB directly, so the storage decision stays in one place and the two backends
 * stay interchangeable.
 */
import {
  generationKeys,
  META_STORE,
  selectBackend,
  type BlobBackend,
} from "./backends";
import {
  assertImportable,
  looksLikeParkFile,
  SAVE_RECORD_SCHEMA_VERSION,
  SaveValidationError,
  type LoadedSave,
  type ParkMetadata,
  type SavePayload,
  type SaveRecord,
  type StorageBackendName,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `park-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readRecords(db: IDBDatabase): Promise<SaveRecord[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readonly");
    const request = tx.objectStore(META_STORE).getAll();
    request.onsuccess = () => resolve(request.result as SaveRecord[]);
    request.onerror = () => reject(request.error);
  });
}

function writeRecord(db: IDBDatabase, record: SaveRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteRecord(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, "readwrite");
    tx.objectStore(META_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export class GameSaveStore {
  private constructor(
    private readonly blobs: BlobBackend,
    private readonly db: IDBDatabase,
  ) {}

  static async open(): Promise<GameSaveStore> {
    const { blobs, db } = await selectBackend();
    return new GameSaveStore(blobs, db);
  }

  get backend(): StorageBackendName {
    return this.blobs.name;
  }

  async list(): Promise<SaveRecord[]> {
    const records = await readRecords(this.db);
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<SaveRecord | undefined> {
    return (await this.list()).find((record) => record.id === id);
  }

  async create(displayName: string, scenarioId: string): Promise<SaveRecord> {
    const now = Date.now();
    const record: SaveRecord = {
      id: newId(),
      displayName,
      createdAt: now,
      updatedAt: now,
      scenarioId,
      hasScreenshot: false,
      sizeBytes: 0,
      lastSaveKind: "manual",
      schemaVersion: SAVE_RECORD_SCHEMA_VERSION,
      gameVersion: "",
      parkFormat: "",
    };
    await writeRecord(this.db, record);
    return record;
  }

  /**
   * Write a park, keeping the previous generation until the new one is verified.
   *
   * The sequence is: write pending, read it back and check it is a park file of the
   * expected length, then promote. An interrupted or failed save leaves the previous
   * park untouched, which is the whole point.
   */
  async write(id: string, payload: SavePayload): Promise<SaveRecord> {
    const existing = await this.get(id);
    if (!existing) throw new Error(`no such park: ${id}`);
    if (!looksLikeParkFile(payload.park)) {
      throw new SaveValidationError("The engine produced a file that is not a park.");
    }

    const parkKeys = generationKeys(id, "park");
    await this.blobs.put(parkKeys.pending, payload.park);

    const verify = await this.blobs.get(parkKeys.pending);
    if (!verify || verify.length !== payload.park.length || !looksLikeParkFile(verify)) {
      await this.blobs.remove(parkKeys.pending);
      throw new SaveValidationError("The park did not read back correctly, so it was not saved.");
    }
    await this.blobs.promote(parkKeys.current);

    if (payload.screenshot && payload.screenshot.length > 0) {
      const shotKeys = generationKeys(id, "shot");
      await this.blobs.put(shotKeys.pending, payload.screenshot);
      await this.blobs.promote(shotKeys.current);
    }

    // Re-read rather than trusting the copy taken before the bytes were written: a
    // rename may have happened while the engine was serialising the park, and the
    // player's name for it must win over a stale snapshot.
    const latest = (await this.get(id)) ?? existing;
    const record: SaveRecord = {
      ...latest,
      updatedAt: Date.now(),
      sizeBytes: payload.park.length,
      lastSaveKind: payload.kind,
      hasScreenshot: latest.hasScreenshot || Boolean(payload.screenshot?.length),
      parkMetadata: payload.parkMetadata ?? latest.parkMetadata,
      gameVersion: payload.gameVersion || latest.gameVersion,
      parkFormat: "PARK",
      schemaVersion: SAVE_RECORD_SCHEMA_VERSION,
    };
    await writeRecord(this.db, record);
    return record;
  }

  /**
   * Read a park back, falling back to the previous generation if the current one is
   * unreadable. One generation of recovery is all V1 offers, and it is enough to
   * survive a save that went wrong.
   */
  async load(id: string): Promise<LoadedSave> {
    const record = await this.get(id);
    if (!record) throw new SaveValidationError("That park is no longer in this browser.");

    const keys = generationKeys(id, "park");
    const current = await this.blobs.get(keys.current);
    if (current && looksLikeParkFile(current)) {
      return { record, park: current, recovered: false };
    }
    const previous = await this.blobs.get(keys.previous);
    if (previous && looksLikeParkFile(previous)) {
      return { record, park: previous, recovered: true };
    }
    throw new SaveValidationError("This park could not be read, and there is no earlier copy.");
  }

  async hasRecovery(id: string): Promise<boolean> {
    const previous = await this.blobs.get(generationKeys(id, "park").previous);
    return Boolean(previous && looksLikeParkFile(previous));
  }

  async screenshot(id: string): Promise<Uint8Array | undefined> {
    return this.blobs.get(generationKeys(id, "shot").current);
  }

  async rename(id: string, displayName: string): Promise<SaveRecord> {
    const record = await this.get(id);
    if (!record) throw new Error(`no such park: ${id}`);
    const trimmed = displayName.trim();
    if (!trimmed) throw new SaveValidationError("A park needs a name.");
    const updated = { ...record, displayName: trimmed.slice(0, 64), updatedAt: record.updatedAt };
    await writeRecord(this.db, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    for (const kind of ["park", "shot"] as const) {
      const keys = generationKeys(id, kind);
      await this.blobs.remove(keys.current);
      await this.blobs.remove(keys.pending);
      await this.blobs.remove(keys.previous);
    }
    await deleteRecord(this.db, id);
  }

  async duplicate(id: string): Promise<SaveRecord> {
    const source = await this.load(id);
    const copy = await this.create(`${source.record.displayName} copy`, source.record.scenarioId);
    return this.write(copy.id, {
      park: source.park,
      parkMetadata: source.record.parkMetadata,
      kind: "manual",
      gameVersion: source.record.gameVersion,
      screenshot: await this.screenshot(id),
    });
  }

  /** Validate then store an externally supplied park file. */
  async import(fileName: string, bytes: Uint8Array, scenarioId = "imported"): Promise<SaveRecord> {
    assertImportable(bytes);
    const name = fileName.replace(/\.park$/i, "").slice(0, 64) || "Imported park";
    const record = await this.create(name, scenarioId);
    return this.write(record.id, { park: bytes, kind: "import", gameVersion: "" });
  }

  /** Bytes for a download, plus a filename a person would recognise. */
  async export(id: string): Promise<{ fileName: string; bytes: Uint8Array }> {
    const { record, park } = await this.load(id);
    const safe = record.displayName.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "park";
    return { fileName: `${safe}.park`, bytes: park };
  }

  async estimate(): Promise<{ usage?: number; quota?: number }> {
    try {
      if (navigator.storage?.estimate) return await navigator.storage.estimate();
    } catch {
      /* not available */
    }
    return {};
  }
}

export type { ParkMetadata, SaveRecord };
