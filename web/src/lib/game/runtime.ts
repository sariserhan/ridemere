/**
 * Loads the engine and implements the game side of the bridge.
 *
 * Replaces the bare technical launcher: it reports readable stages, turns engine
 * failures into typed ERROR messages rather than letting Emscripten exceptions reach
 * the player, and exposes the simulation only through the five calls the bridge needs.
 */
import JSZip from "jszip";
import { PRODUCT } from "@/lib/product";
import {
  MessageChannelBus,
  type GameToWeb,
  type GuestAlertMessage,
  type ScenarioStateMessage,
  type ParkMetadataMessage,
  type WebToGame,
} from "@/lib/bridge/messages";

/** Where the engine and content are served from. Isolated by the header rules. */
const GAME_BASE = "/game";

/**
 * The scenarios a player can start, and where the engine finds them.
 *
 * Release scenarios only, and by design: development scenes ship in a directory the
 * engine never scans and are stripped from the player build entirely, so naming one
 * here is the one way left to leak one. `check_scenario_visibility.py` reads this
 * file for exactly that reason.
 */
const SCENARIO_PATHS: Record<string, string> = {
  "coaster-frontier": "/OpenRCT2/standalone/Scenarios/coaster-frontier.park",
  "first-park": "/OpenRCT2/standalone/Scenarios/first-park.park",
  "small-footprint": "/OpenRCT2/standalone/Scenarios/small-footprint.park",
  "growing-destination": "/OpenRCT2/standalone/Scenarios/growing-destination.park",
};

export type LoadStage =
  | "idle"
  | "engine-download"
  | "engine-start"
  | "content-install"
  | "park-open"
  | "running"
  | "failed";

export interface LoadProgress {
  stage: LoadStage;
  label: string;
  fraction: number;
}

interface EmscriptenModule {
  ccall: (name: string, ret: string | null, argTypes: string[], args: unknown[]) => unknown;
  callMain: (args: string[]) => void;
  pauseMainLoop: () => void;
  PThread?: { terminateAllThreads(): void };
  SDL2?: {
    audioContext?: AudioContext;
    audio?: { silenceTimer?: number; scriptProcessorNode?: ScriptProcessorNode };
  };
  FS: {
    mkdir(path: string): void;
    mount(type: unknown, opts: unknown, path: string): void;
    syncfs(populate: boolean, callback: (error?: unknown) => void): void;
    readFile(path: string, opts?: { encoding: "utf8" }): Uint8Array | string;
    writeFile(path: string, data: Uint8Array | string): void;
    readdir(path: string): string[];
    unlink(path: string): void;
    rmdir(path: string): void;
    stat(path: string): { size: number; mode: number };
    isDir(mode: number): boolean;
    filesystems: { IDBFS: unknown };
  };
}

declare global {
  interface Window {
    OPENRCT2_WEB?: (options: Record<string, unknown>) => Promise<EmscriptenModule>;
    Module?: EmscriptenModule;
  }
}

const SCREENSHOT_DIR = "/persistent/screenshot";
const SAVE_DIR = "/persistent/save";
const THEME_DIR = "/persistent/themes";
const BRIDGE_SAVE_PATH = `${SAVE_DIR}/bridge.park`;
const BRIDGE_SHOT_NAME = "bridge-thumb.png";

/** Emscripten signals "main returned to the event loop" by throwing. */
function isExpectedUnwind(error: unknown): boolean {
  if (error === "unwind") return true;
  const name = (error as { name?: string } | null)?.name;
  const message = (error as { message?: string } | null)?.message ?? "";
  return name === "ExitStatus" || message === "unwind" || /unwind/i.test(String(error));
}

export class GameRuntime {
  readonly bus = new MessageChannelBus();
  private module: EmscriptenModule | null = null;
  private gameVersion = "unknown";
  private contentVersion = "unknown";
  private saving = false;
  private stopped = false;
  private uiKeyboardGuard: AbortController | null = null;

  constructor(private readonly onProgress: (progress: LoadProgress) => void) {}

  private report(stage: LoadStage, label: string, fraction: number) {
    this.onProgress({ stage, label, fraction });
  }

  private fail(stage: GameToWeb extends { type: "ERROR" } ? never : Parameters<typeof this.emitError>[0], message: string, detail?: string) {
    this.emitError(stage, message, detail);
  }

  private emitError(
    stage: "engine-download" | "engine-start" | "content-install" | "park-load" | "park-save" | "screenshot" | "runtime",
    message: string,
    detail?: string,
  ) {
    this.report("failed", message, 1);
    this.bus.emit({ type: "ERROR", stage, message, detail });
  }

  /** Fetch with byte progress, so the loading screen means something on a slow link. */
  private async fetchWithProgress(url: string, label: string, from: number, to: number): Promise<Uint8Array> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const total = Number(response.headers.get("content-length") ?? 0);
    const reader = response.body?.getReader();
    if (!reader) return new Uint8Array(await response.arrayBuffer());

    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      const fraction = total > 0 ? received / total : 0;
      this.report(
        label === "Loading game" ? "engine-download" : "content-install",
        `${label}… ${(received / 1e6).toFixed(1)} MB`,
        from + (to - from) * fraction,
      );
    }
    const out = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  async start(canvas: HTMLCanvasElement): Promise<boolean> {
    // SDL otherwise cancels typing and native button activation in HTML overlays.
    // Register before the engine, intercept only marked web UI, and retain browser
    // defaults (text editing, Tab, Enter and Space). Input/click events reach React.
    this.uiKeyboardGuard?.abort();
    this.uiKeyboardGuard = new AbortController();
    const guard = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-game-ui]")) event.stopImmediatePropagation();
    };
    for (const type of ["keydown", "keypress", "keyup"] as const)
      window.addEventListener(type, guard, { capture: true, signal: this.uiKeyboardGuard.signal });
    // Tell the engine how big its window is before it opens one.
    //
    // SDL takes the window size from the canvas element's width and height
    // attributes. A canvas with none is 300x150, and the engine lays out and draws
    // into a surface of that size while the browser stretches it across the real
    // canvas. The result is a band of five-times-scale toolbar icons across the top
    // of the park, which no later frame repaints because the engine only redraws what
    // it believes is dirty.
    //
    // Sizing from the laid-out element, rather than to a fixed 1280x800, is what makes
    // this right on a window that is not that size.
    this.sizeCanvas(canvas);

    if (!self.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
      this.emitError(
        "engine-start",
        "This page is not set up correctly to run the game.",
        "The document is not cross-origin isolated, so SharedArrayBuffer is unavailable.",
      );
      return false;
    }

    let engineJs: string;
    let engineWasm: string;
    try {
      this.report("engine-download", "Loading game…", 0.02);
      const data = await this.fetchWithProgress(`${GAME_BASE}/openrct2.zip`, "Loading game", 0.02, 0.35);
      const zip = await JSZip.loadAsync(data);
      const js = await zip.file("openrct2.js")?.async("uint8array");
      const wasm = await zip.file("openrct2.wasm")?.async("uint8array");
      if (this.stopped) return false;
      if (!js || !wasm) throw new Error("the engine archive is missing its contents");
      engineJs = URL.createObjectURL(new Blob([js as BlobPart], { type: "text/javascript" }));
      engineWasm = URL.createObjectURL(new Blob([wasm as BlobPart], { type: "application/wasm" }));
    } catch (error) {
      this.emitError("engine-download", "The game could not be downloaded.", String(error));
      return false;
    }

    try {
      this.report("engine-start", "Starting game…", 0.38);
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = engineJs;
        script.addEventListener("load", () => resolve());
        script.addEventListener("error", () => reject(new Error("the engine script did not load")));
        document.body.appendChild(script);
      });
      if (this.stopped) return false;
      if (!window.OPENRCT2_WEB) throw new Error("the engine did not register itself");

      this.module = await window.OPENRCT2_WEB({
        noInitialRun: true,
        arguments: [],
        canvas,
        print: (text: string) => console.log(text),
        printErr: (text: string) => console.warn(text),
        monitorRunDependencies: () => undefined,
        locateFile: (name: string) => (name === "openrct2.wasm" ? engineWasm : `${GAME_BASE}/${name}`),
      });
      if (this.stopped) {
        this.stopEngine();
        return false;
      }
      window.Module = this.module;
    } catch (error) {
      this.emitError("engine-start", "The game could not start.", String(error));
      return false;
    }

    const FS = this.module.FS;
    try {
      this.report("content-install", "Preparing storage…", 0.42);
      for (const dir of ["/persistent", "/OpenRCT2"]) {
        try {
          FS.mkdir(dir);
        } catch {
          /* already there */
        }
        FS.mount(FS.filesystems.IDBFS, { autoPersist: true }, dir);
      }
      await new Promise<void>((resolve) => FS.syncfs(true, () => resolve()));
      for (const dir of [SCREENSHOT_DIR, SAVE_DIR]) {
        try {
          FS.mkdir(dir);
        } catch {
          /* already there */
        }
      }
    } catch (error) {
      this.emitError("engine-start", "The game could not prepare browser storage.", String(error));
      return false;
    }

    if (this.stopped) return false;
    try {
      this.gameVersion = String(this.module.ccall("GetVersion", "string", [], []) ?? "unknown");
    } catch {
      this.gameVersion = "unknown";
    }

    try {
      await this.installContent();
      if (this.stopped) return false;
      this.installTheme();
      this.installBrowserDefaults();
    } catch (error) {
      this.emitError("content-install", "The game content could not be installed.", String(error));
      return false;
    }

    this.report("park-open", "Opening park…", 0.97);
    try {
      this.module.callMain(["--user-data-path=/persistent/", "--openrct2-data-path=/OpenRCT2/"]);
    } catch (error) {
      // Emscripten unwinds the C stack by throwing once the engine hands control to
      // the browser event loop, which is how a main loop works here and is not a
      // failure. Anything else is.
      if (!isExpectedUnwind(error)) {
        this.emitError("runtime", "The game stopped unexpectedly.", String(error));
        return false;
      }
    }

    // callMain hands control to the browser event loop and returns immediately, so the
    // engine is not ready the instant it comes back. Loading a park too early is
    // silently undone by the rest of start-up, which produces an empty default park
    // rather than an error. Wait for evidence that the simulation loop is actually
    // turning before declaring the game ready.
    if (!(await this.waitUntilSimulating())) {
      if (this.stopped) return false;
      this.emitError("runtime", "The game started but never began simulating.");
      return false;
    }

    // SDL sets its upstream window title during startup. Restore the shell identity.
    document.title = PRODUCT.name;
    this.report("running", "Ready", 1);
    this.bus.emit({ type: "GAME_READY", gameVersion: this.gameVersion, contentVersion: this.contentVersion });
    return true;
  }

  /** Poll until the engine's tick counter advances, or give up. */
  private async waitUntilSimulating(timeoutMs = 60_000): Promise<boolean> {
    const readTicks = (): number | null => {
      try {
        const raw = this.module!.ccall("SunriseParkStatsJson", "string", [], []) as string;
        return (JSON.parse(raw) as { ticks: number }).ticks;
      } catch {
        return null;
      }
    };
    const deadline = Date.now() + timeoutMs;
    let first: number | null = null;
    while (!this.stopped && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const ticks = readTicks();
      if (ticks === null) continue;
      if (first === null) {
        first = ticks;
        continue;
      }
      if (ticks > first) return true;
    }
    return false;
  }

  /** Browser-friendly defaults for a fresh profile; retain existing preferences. */
  private installBrowserDefaults(): void {
    const FS = this.module!.FS;
    const path = "/persistent/config.ini";
    let config = "[general]\nedge_scrolling = false\n";
    try { config = FS.readFile(path, { encoding: "utf8" }) as string; } catch { /* Fresh profile. */ }
    // Theme discovery precedes standalone detection during engine startup. Select the
    // installed theme explicitly, once, while retaining players' custom presets.
    const marker = "/persistent/.ridemere-theme-v1";
    let migrated = false;
    try { FS.stat(marker); migrated = true; } catch { /* First migration. */ }
    if (!migrated) {
      const preset = /^current_theme\s*=\s*(.+)$/m.exec(config);
      if (preset && /^(?:"?\*RCT2"?|"")$/.test(preset[1].trim())) {
        config = config.replace(/^current_theme\s*=.*$/m, 'current_theme = "Ridemere"');
      } else if (!preset) {
        if (/^\[interface\]\s*$/m.test(config)) config = config.replace(/^\[interface\]\s*$/m, '[interface]\ncurrent_theme = "Ridemere"');
        else config += '\n[interface]\ncurrent_theme = "Ridemere"\n';
      }
      FS.writeFile(marker, "1");
    }
    FS.writeFile(path, config);
  }

  /**
   * Copy the content pack's window theme into the player's theme directory.
   *
   * Themes are read from the user directory, not from the content, so the product
   * installs its own the same way it installs content. A theme the player has edited
   * is left alone: this only writes a file that is not already there.
   */
  private installTheme(): void {
    const FS = this.module!.FS;
    try {
      FS.mkdir(THEME_DIR);
    } catch {
      /* already there */
    }
    const target = `${THEME_DIR}/Ridemere.json`;
    try {
      const installed = JSON.parse(FS.readFile(target, { encoding: "utf8" }) as string);
      // Upgrade the previous bundled palette, whose extended colours hid icons.
      // Keep other theme files and any differently customised toolbar palette.
      const oldBundled = installed.entries?.WC_TOP_TOOLBAR?.colours?.[0]?.colour === "dull_brown_dark"
        && installed.use3dImageButtons === false;
      if (!oldBundled) return;
    } catch {
      /* not installed yet */
    }
    try {
      const theme = FS.readFile("/OpenRCT2/themes/Ridemere.json");
      FS.writeFile(target, theme as Uint8Array);
    } catch (error) {
      // Not fatal: the game runs with the engine's stock colours.
      console.warn("could not install the window theme", error);
    }
  }

  /** Content is re-extracted only when the build changes. */
  private async installContent(): Promise<void> {
    const FS = this.module!.FS;
    // Content can change without an engine commit (for example, scenario tuning).
    // Compare the shipped archive hash rather than silently reusing an old park pack.
    const response = await fetch("/game/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Content manifest: HTTP ${response.status}`);
    const manifest = await response.json();
    if (typeof manifest.contentVersion !== "string" || !/^[a-f0-9]{64}$/.test(manifest.contentVersion)) {
      throw new Error("Content manifest has no archive hash. Run npm run sync-game.");
    }
    this.contentVersion = manifest.contentVersion;
    const readVersion = () => {
      try {
        return FS.readFile("/OpenRCT2/version", { encoding: "utf8" }) as string;
      } catch {
        return "";
      }
    };
    if (readVersion() === this.contentVersion) {
      this.report("content-install", "Game content ready", 0.95);
      return;
    }

    const clearTree = (dir: string) => {
      let entries: string[] = [];
      try {
        entries = FS.readdir(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry === "." || entry === "..") continue;
        const path = `${dir}${entry}`;
        try {
          FS.stat(path);
        } catch {
          continue;
        }
        try {
          FS.unlink(path);
        } catch {
          clearTree(`${path}/`);
          try {
            FS.rmdir(path);
          } catch {
            /* not empty */
          }
        }
      }
    };
    await new Promise<void>((resolve) => FS.syncfs(false, () => resolve()));
    clearTree("/OpenRCT2/");

    const data = await this.fetchWithProgress(`${GAME_BASE}/assets.zip`, "Loading content", 0.45, 0.9);
    const zip = await JSZip.loadAsync(data);
    this.report("content-install", "Installing content…", 0.9);
    const names = Object.keys(zip.files);
    let done = 0;
    for (const name of names) {
      const entry = zip.files[name];
      const target = `/OpenRCT2/${name}`;
      if (entry.dir) {
        try {
          FS.mkdir(target.replace(/\/$/, ""));
        } catch {
          /* already there */
        }
      } else {
        const parts = target.split("/");
        parts.pop();
        let built = "";
        for (const part of parts) {
          if (!part) continue;
          built += `/${part}`;
          try {
            FS.mkdir(built);
          } catch {
            /* already there */
          }
        }
        FS.writeFile(target, await entry.async("uint8array"));
      }
      if (++done % 64 === 0) this.report("content-install", "Installing content…", 0.9 + 0.06 * (done / names.length));
    }
    FS.writeFile("/OpenRCT2/version", this.contentVersion);
    await new Promise<void>((resolve) => FS.syncfs(false, () => resolve()));
  }

  // -------------------------------------------------------------------------
  // Bridge: web to game
  // -------------------------------------------------------------------------

  async send(message: WebToGame): Promise<void> {
    if (this.stopped) return;
    if (!this.module) {
      this.emitError("runtime", "The game is not running.");
      return;
    }
    switch (message.type) {
      case "NEW_GAME":
        return this.openScenario(message.scenarioId);
      case "LOAD_SAVE":
        return this.loadPark(message.park);
      case "REQUEST_SAVE":
        return this.savePark(message.saveId, message.reason);
      case "REQUEST_SCREENSHOT":
        return this.capture(message.width, message.height);
      case "REQUEST_PARK_METADATA": {
        const metadata = this.readMetadata();
        if (metadata) this.bus.emit({ type: "PARK_METADATA", metadata });
        return;
      }
      case "REQUEST_GUEST_ALERTS": {
        const alerts = this.readAlerts();
        if (alerts) this.bus.emit({ type: "GUEST_ALERTS", alerts });
        return;
      }
      case "REQUEST_SCENARIO_STATE": {
        const state = this.readJson<ScenarioStateMessage>("SunriseScenarioStateJson");
        if (state) this.bus.emit({ type: "SCENARIO_STATE", state });
        return;
      }
    }
  }

  getAudioEnabled(): boolean {
    return this.readJson<{ enabled: boolean }>("SunriseAudioStateJson")?.enabled ?? true;
  }

  setAudioEnabled(enabled: boolean): void {
    if (!this.module) return;
    this.module.ccall("SunriseSetAudioEnabled", "number", ["number"], [enabled ? 1 : 0]);
    if (enabled) void this.module.SDL2?.audioContext?.resume().catch(() => {});
  }

  sceneSnapshot(includeMap = false): import("./scene/types").ParkSceneSnapshot | null {
    if (!this.module || this.stopped) return null;
    try {
      return JSON.parse(this.module.ccall("SunriseSceneJson", "string", ["number"], [includeMap ? 1 : 0]) as string);
    } catch { return null; }
  }

  buildAction(request: import("./scene/build").BuildRequest): import("./scene/build").BuildResult {
    if (!this.module || this.stopped) return { ok: false, error: "The park is not ready." };
    try { return JSON.parse(this.module.ccall("SunriseBuildAction", "string", ["string"], [JSON.stringify(request)]) as string); }
    catch { return { ok: false, error: "Construction could not complete. Reload the game to update its engine." }; }
  }

  setViewTarget(x: number, y: number, z: number): void {
    if (!this.module || this.stopped) return;
    this.module.ccall("SunriseViewAt", "number", ["number", "number", "number"], [Math.round(x * 32), Math.round(z * 32), Math.round(y * 32)]);
  }

  togglePause(): void {
    if (!this.module || this.stopped) return;
    this.module.ccall("SunriseCameraAction", "number", ["number"], [3]);
  }

  hireStaff(role: "cleaner" | "mechanic"): boolean {
    if (!this.module || this.stopped) return false;
    return !!this.module.ccall(role === "cleaner" ? "SunriseHireHandyman" : "SunriseHireMechanic", "number", [], []);
  }

  setRideOpen(id: number, open: boolean): boolean {
    return !!this.module?.ccall("SunriseSetRideStatus", "number", ["number", "number"], [id, open ? 1 : 0]);
  }

  panView(dx: number, dy: number): void {
    if (!this.module || this.stopped || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.module.ccall("SunrisePanView", "number", ["number", "number"], [Math.round(dx), Math.round(dy)]);
  }

  cameraAction(action: "in" | "out" | "rotate" | "home"): void {
    if (!this.module || this.stopped) return;
    if (action === "home") {
      this.module.ccall("SunriseCentreView", "number", [], []);
    } else {
      this.module.ccall("SunriseCameraAction", "number", ["number"], [{ in: 0, out: 1, rotate: 2 }[action]]);
    }
  }

  /** Match the canvas backing store to its laid-out size, in device pixels. */
  private sizeCanvas(canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  }

  private openScenario(scenarioId: string): void {
    const path = SCENARIO_PATHS[scenarioId];
    if (!path) {
      this.emitError("park-load", "That scenario is not part of this build.", scenarioId);
      return;
    }
    const ok = this.module!.ccall("SunriseLoadPark", "number", ["string"], [path]);
    if (ok !== 1) this.emitError("park-load", "The scenario could not be opened.", scenarioId);
  }

  private loadPark(park: Uint8Array): void {
    const FS = this.module!.FS;
    try {
      FS.writeFile(BRIDGE_SAVE_PATH, park);
    } catch (error) {
      this.emitError("park-load", "The park could not be handed to the game.", String(error));
      return;
    }
    const ok = this.module!.ccall("SunriseLoadPark", "number", ["string"], [BRIDGE_SAVE_PATH]);
    if (ok !== 1) this.emitError("park-load", "This park could not be opened.");
  }

  /** One save at a time; an autosave that overlaps a manual one is simply skipped. */
  private async savePark(saveId: string, reason: "manual" | "autosave" | "exit"): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try {
      const ok = this.module!.ccall("SunriseSavePark", "number", ["string"], [BRIDGE_SAVE_PATH]);
      if (ok !== 1) {
        this.emitError("park-save", "The game could not write this park.");
        return;
      }
      const park = this.module!.FS.readFile(BRIDGE_SAVE_PATH) as Uint8Array;
      const metadata = this.readMetadata();
      if (!metadata) {
        this.emitError("park-save", "The game could not describe this park.");
        return;
      }
      this.bus.emit({ type: "SAVE_READY", saveId, park: new Uint8Array(park), reason, parkMetadata: metadata });
    } catch (error) {
      this.emitError("park-save", "This park could not be saved.", String(error));
    } finally {
      this.saving = false;
    }
  }

  private capture(width: number, height: number): void {
    try {
      const raw = this.module!.ccall(
        "SunriseCaptureThumbnail",
        "string",
        ["string", "number", "number"],
        [BRIDGE_SHOT_NAME, width, height],
      ) as string;
      const result = JSON.parse(raw) as { ok: number; error?: string };
      if (result.ok !== 1) {
        this.emitError("screenshot", "The thumbnail could not be captured.", result.error);
        return;
      }
      const png = this.module!.FS.readFile(`${SCREENSHOT_DIR}/${BRIDGE_SHOT_NAME}`) as Uint8Array;
      this.bus.emit({ type: "SCREENSHOT_READY", png: new Uint8Array(png), width, height });
    } catch (error) {
      this.emitError("screenshot", "The thumbnail could not be captured.", String(error));
    }
  }

  /**
   * The aggregated alert list. An unreadable or malformed answer is treated as "the
   * game has nothing to say" rather than as an error, because the alert panel must
   * never be the thing that interrupts a park.
   */
  private readAlerts(): GuestAlertMessage[] | null {
    const parsed = this.readJson<GuestAlertMessage[]>("SunriseGuestAlertsJson");
    return Array.isArray(parsed) ? parsed : null;
  }

  /** Read one of the engine's JSON summaries. A bad answer is "nothing to report". */
  private readJson<T>(name: string): T | null {
    try {
      return JSON.parse(this.module!.ccall(name, "string", [], []) as string) as T;
    } catch {
      return null;
    }
  }

  private readMetadata(): ParkMetadataMessage | null {
    try {
      const raw = this.module!.ccall("SunriseParkMetadataJson", "string", [], []) as string;
      return JSON.parse(raw) as ParkMetadataMessage;
    } catch {
      return null;
    }
  }

  private stopEngine(): void {
    const engine = this.module;
    if (!engine) return;
    // Stop scheduling frames before terminating workers. A detached WebGL canvas
    // otherwise keeps receiving draws after Save & exit, especially in Firefox.
    engine.pauseMainLoop();
    const audio = engine.SDL2?.audio;
    if (audio?.silenceTimer !== undefined) clearInterval(audio.silenceTimer);
    if (audio?.scriptProcessorNode) {
      audio.scriptProcessorNode.onaudioprocess = null;
      audio.scriptProcessorNode.disconnect();
    }
    const context = engine.SDL2?.audioContext;
    if (context && context.state !== "closed") void context.close().catch(() => {});
    engine.PThread?.terminateAllThreads();
    if (window.Module === engine) delete window.Module;
    this.module = null;
  }

  exit(reason: "player" | "error"): void {
    if (this.stopped) return;
    this.stopped = true;
    this.uiKeyboardGuard?.abort(); this.uiKeyboardGuard = null;
    this.stopEngine();
    this.bus.emit({ type: "EXIT_GAME", reason });
    this.bus.clear();
  }

  get version(): string {
    return this.gameVersion;
  }
}
