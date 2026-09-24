/**
 * The save model.
 *
 * The park file produced by the engine is the only authoritative record of a park.
 * Nothing here duplicates simulation state: no guests, no rides, no finances, no
 * paths, no entities. The metadata below exists so a web page can describe a park it
 * is not running, and every field of it is either chosen by the player or a cheap
 * read-only snapshot taken from the engine at save time.
 */

/** Bumped when the shape of a stored record changes, so a future migration can tell. */
export const SAVE_RECORD_SCHEMA_VERSION = 1;

/** A read-only snapshot for a save card. Never a source of truth. */
export interface ParkMetadata {
  parkName: string;
  guestCount: number;
  parkRating: number;
  cash: number;
  rideCount: number;
  year: number;
  month: number;
  day: number;
  ticks: number;
  parkOpen: boolean;
}

export interface SaveRecord {
  /** Stable generated identifier. Never the park name: names are not unique and change. */
  id: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  scenarioId: string;
  /** Present once a thumbnail has been captured. PNG bytes. */
  hasScreenshot: boolean;
  parkMetadata?: ParkMetadata;
  /** Size of the park file in bytes, for display and for a cheap integrity check. */
  sizeBytes: number;
  /** Whether the last write was an autosave or a deliberate one. */
  lastSaveKind: "manual" | "autosave" | "import";
  /** Enough to support a migration that does not exist yet. */
  schemaVersion: number;
  /** The engine build that wrote it, from GetVersion. */
  gameVersion: string;
  /** The park file format marker, read from the file itself. */
  parkFormat: string;
}

/** What a caller hands to the store when writing. */
export interface SavePayload {
  park: Uint8Array;
  screenshot?: Uint8Array;
  parkMetadata?: ParkMetadata;
  kind: SaveRecord["lastSaveKind"];
  gameVersion: string;
}

export interface LoadedSave {
  record: SaveRecord;
  park: Uint8Array;
  /** True when the current generation failed validation and the previous one was used. */
  recovered: boolean;
}

export type StorageBackendName = "opfs" | "indexeddb";

export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export class SaveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveValidationError";
  }
}

/** Park files start with the four ASCII bytes "PARK". */
export const PARK_MAGIC = [0x50, 0x41, 0x52, 0x4b];

/** Refuse anything implausible before it reaches storage. */
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;

export function looksLikeParkFile(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  return PARK_MAGIC.every((byte, index) => bytes[index] === byte);
}

export function assertImportable(bytes: Uint8Array): void {
  if (bytes.length === 0) {
    throw new SaveValidationError("That file is empty.");
  }
  if (bytes.length > MAX_IMPORT_BYTES) {
    throw new SaveValidationError(
      `That file is ${(bytes.length / 1e6).toFixed(0)} MB, which is larger than a park should ever be.`,
    );
  }
  if (!looksLikeParkFile(bytes)) {
    throw new SaveValidationError("That does not look like a park file.");
  }
}
