/**
 * The game and web bridge.
 *
 * This is the entire surface between the simulation and the product around it. It is
 * deliberately small and explicitly typed, because the alternative, letting the web
 * side reach into engine state, is how a narrow boundary becomes an accidental API
 * that can never be changed.
 *
 * Direction is part of the type. Nothing sends a message in the wrong direction.
 *
 * Today the game runs in the same document as the page that hosts it, so these travel
 * over an in-process typed event channel rather than postMessage. The shapes are
 * postMessage-safe on purpose: every payload is structured-cloneable, so moving the
 * runtime into a worker or a frame later is a transport change, not a redesign.
 */

/** Everything the web shell may ask the game to do. */
export type WebToGame =
  | { type: "NEW_GAME"; scenarioId: string; saveId: string }
  | { type: "LOAD_SAVE"; saveId: string; park: Uint8Array }
  | { type: "REQUEST_SAVE"; saveId: string; reason: "manual" | "autosave" | "exit" }
  | { type: "REQUEST_SCREENSHOT"; width: number; height: number }
  | { type: "REQUEST_PARK_METADATA" }
  | { type: "REQUEST_GUEST_ALERTS" };

/** Everything the game may tell the web shell. */
export type GameToWeb =
  | { type: "GAME_READY"; gameVersion: string; contentVersion: string }
  | {
      type: "SAVE_READY";
      saveId: string;
      park: Uint8Array;
      reason: "manual" | "autosave" | "exit";
      parkMetadata: ParkMetadataMessage;
    }
  | { type: "SCREENSHOT_READY"; png: Uint8Array; width: number; height: number }
  | { type: "PARK_METADATA"; metadata: ParkMetadataMessage }
  | { type: "GUEST_ALERTS"; alerts: GuestAlertMessage[] }
  | { type: "EXIT_GAME"; reason: "player" | "error" }
  | { type: "ERROR"; stage: ErrorStage; message: string; detail?: string };

export type ErrorStage =
  | "engine-download"
  | "engine-start"
  | "content-install"
  | "park-load"
  | "park-save"
  | "screenshot"
  | "runtime";

export interface ParkMetadataMessage {
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

/**
 * One thing the park is telling the player, already aggregated by the engine.
 *
 * The web side deliberately does not decide when something is worth saying: the
 * thresholds, the hysteresis and the cooldown all live in the simulation, because
 * they depend on guest state the bridge does not carry and should not start to.
 */
export interface GuestAlertMessage {
  /** Stable machine name, e.g. GUESTS_HUNGRY. Safe to switch on. */
  kind: string;
  severity: "INFO" | "WARNING" | "IMPORTANT";
  /** Guests currently signalling this. */
  guests: number;
  /** Share of guests in the park, per mille. */
  perMille: number;
  /** Whether anything in the park answers this need. */
  hasFacility: boolean;
  raisedAtTick: number;
  lastChangedTick: number;
  title: string;
  advice: string;
}

export type GameToWebType = GameToWeb["type"];

/** Distributes over the union, picking the one member with this `type`. */
type OfType<M, T> = M extends { type: T } ? M : never;

export type Extract<T extends GameToWebType> = OfType<GameToWeb, T>;

/**
 * A tiny typed event channel. One handler set per message type.
 */
export class MessageChannelBus {
  private readonly handlers = new Map<GameToWebType, Set<(message: GameToWeb) => void>>();

  on<T extends GameToWebType>(type: T, handler: (message: Extract<T>) => void): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as (message: GameToWeb) => void);
    this.handlers.set(type, set);
    return () => set.delete(handler as (message: GameToWeb) => void);
  }

  emit(message: GameToWeb): void {
    for (const handler of this.handlers.get(message.type) ?? []) handler(message);
  }

  clear(): void {
    this.handlers.clear();
  }
}
