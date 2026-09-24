"use client";

/**
 * The isolated game route.
 *
 * This document carries COOP and COEP, so it must stay same-origin and free of
 * third-party scripts. No analytics here, ever: an isolated document cannot load them,
 * and reaching for a workaround would cost either Safari support or the isolation the
 * engine needs.
 *
 * The game runs in this document rather than in a frame, so the bridge is an
 * in-process typed channel. Its message shapes are postMessage-safe so that moving the
 * runtime later is a transport change.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GameRuntime, type LoadProgress } from "@/lib/game/runtime";
import { GameSaveStore } from "@/lib/saves/store";
import { StorageQuotaError, type SaveRecord } from "@/lib/saves/types";
import { Wordmark } from "@/components/wordmark";
import { GuestAlerts } from "@/components/guest-alerts";
import type { GuestAlertMessage } from "@/lib/bridge/messages";

/** How often the park is written while playing. */
const AUTOSAVE_INTERVAL_MS = 60_000;
/**
 * How often the alert list is refreshed. The engine re-counts the park every 256
 * ticks, roughly six seconds of play, so asking more often than this would return the
 * same answer; asking much less often would let a player fix something and keep being
 * told about it.
 */
const ALERT_POLL_MS = 5_000;
const THUMBNAIL = { width: 480, height: 270 };

type Phase = "loading" | "playing" | "failed";

function PlayScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const saveId = params.get("save");
  const scenarioId = params.get("scenario");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);
  const storeRef = useRef<GameSaveStore | null>(null);
  const recordRef = useRef<SaveRecord | null>(null);
  const pendingShot = useRef<Uint8Array | undefined>(undefined);
  const startedRef = useRef(false);
  const dirtyRef = useRef(false);
  // The write a save is currently performing. Leaving the page before it settles is
  // how a save lands after a rename and quietly reverts it.
  const persistingRef = useRef<Promise<void>>(Promise.resolve());

  const [progress, setProgress] = useState<LoadProgress>({ stage: "idle", label: "Starting…", fraction: 0 });
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Recovery is not a transient status. It stays until the player dismisses it,
  // because it tells them their last few minutes of play were lost.
  const [recovery, setRecovery] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<GuestAlertMessage[]>([]);
  const [alertsCollapsed, setAlertsCollapsed] = useState(false);

  const persist = useCallback(
    async (park: Uint8Array, metadata: SaveRecord["parkMetadata"], kind: "manual" | "autosave" | "exit") => {
      const store = storeRef.current;
      const record = recordRef.current;
      if (!store || !record) return;
      try {
        const updated = await store.write(record.id, {
          park,
          parkMetadata: metadata,
          screenshot: pendingShot.current,
          kind: kind === "exit" ? "manual" : kind,
          gameVersion: runtimeRef.current?.version ?? "",
        });
        recordRef.current = updated;
        pendingShot.current = undefined;
        dirtyRef.current = false;
        setNotice(kind === "autosave" ? "Autosaved" : "Saved");
        window.setTimeout(() => setNotice(null), 2500);
      } catch (writeError) {
        if (writeError instanceof StorageQuotaError) {
          setNotice(null);
          setError({
            message: "We couldn't save this park locally.",
            detail: "The browser is out of storage for this site. Export a copy before closing the game.",
          });
        } else {
          setError({ message: "This park could not be saved.", detail: String(writeError) });
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    let autosaveTimer = 0;
    let alertTimer = 0;

    (async () => {
      const store = await GameSaveStore.open();
      storeRef.current = store;

      let record: SaveRecord | null = null;
      if (saveId) {
        record = (await store.get(saveId)) ?? null;
        if (!record) {
          setError({ message: "That park is no longer in this browser." });
          setPhase("failed");
          return;
        }
      } else if (scenarioId) {
        record = await store.create("New park", scenarioId);
      } else {
        router.replace("/parks");
        return;
      }
      recordRef.current = record;

      const runtime = new GameRuntime((next) => {
        if (!cancelled) setProgress(next);
      });
      runtimeRef.current = runtime;

      runtime.bus.on("ERROR", (message) => {
        setError({ message: message.message, detail: message.detail });
        setPhase("failed");
      });
      runtime.bus.on("GUEST_ALERTS", (message) => {
        if (!cancelled) setAlerts(message.alerts);
      });
      runtime.bus.on("SCREENSHOT_READY", (message) => {
        pendingShot.current = message.png;
      });
      runtime.bus.on("SAVE_READY", (message) => {
        persistingRef.current = persist(message.park, message.parkMetadata, message.reason);
      });
      runtime.bus.on("GAME_READY", async () => {
        if (cancelled) return;
        if (saveId && record) {
          try {
            const loaded = await store.load(record.id);
            if (loaded.recovered) {
              setRecovery("This park could not be read, so the previous autosave was recovered.");
            }
            await runtime.send({ type: "LOAD_SAVE", saveId: record.id, park: loaded.park });
          } catch (loadError) {
            setError({ message: "This park could not be opened.", detail: String(loadError) });
            setPhase("failed");
            return;
          }
        } else if (record) {
          await runtime.send({ type: "NEW_GAME", scenarioId: record.scenarioId, saveId: record.id });
        }
        setPhase("playing");
        dirtyRef.current = true;

        // First save straight away, so a park exists even if the tab dies early.
        window.setTimeout(() => {
          void runtime.send({ type: "REQUEST_SCREENSHOT", ...THUMBNAIL });
          void runtime.send({ type: "REQUEST_SAVE", saveId: record!.id, reason: "autosave" });
        }, 4000);

        alertTimer = window.setInterval(() => {
          void runtime.send({ type: "REQUEST_GUEST_ALERTS" });
        }, ALERT_POLL_MS);

        autosaveTimer = window.setInterval(() => {
          if (!dirtyRef.current) dirtyRef.current = true;
          void runtime.send({ type: "REQUEST_SCREENSHOT", ...THUMBNAIL });
          void runtime.send({ type: "REQUEST_SAVE", saveId: record!.id, reason: "autosave" });
        }, AUTOSAVE_INTERVAL_MS);
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      await runtime.start(canvas);
    })();

    return () => {
      cancelled = true;
      if (autosaveTimer) window.clearInterval(autosaveTimer);
      if (alertTimer) window.clearInterval(alertTimer);
    };
  }, [persist, router, saveId, scenarioId]);

  /**
   * Unload protection is a backstop, not the mechanism. Browsers cancel asynchronous
   * storage work during unload, so the real protection is the autosave interval; this
   * only warns when there is unsaved progress.
   */
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (phase === "playing" && dirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  const saveAndExit = useCallback(async () => {
    const runtime = runtimeRef.current;
    const record = recordRef.current;
    if (!runtime || !record) return;
    setSaving(true);
    await new Promise<void>((resolve) => {
      const off = runtime.bus.on("SAVE_READY", () => {
        off();
        resolve();
      });
      void runtime.send({ type: "REQUEST_SCREENSHOT", ...THUMBNAIL });
      void runtime.send({ type: "REQUEST_SAVE", saveId: record.id, reason: "exit" });
      window.setTimeout(resolve, 15000);
    });
    // Let the write finish before navigating. Anything that reads or edits this park
    // on the next screen must see the final state, not race it.
    await persistingRef.current;
    dirtyRef.current = false;
    runtime.exit("player");
    router.push("/parks");
  }, [router]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden" style={{ background: "var(--rm-bg)" }}>
      {/*
        The canvas is always laid out at full size, even while the loading screen is
        over it. Hiding it with display:none gives it a zero client size, and the
        engine divides by that when it sets up its viewport.

        It carries no width or height attributes on purpose. Those set the backing
        store, the engine sets it again when it opens its window, and in between the
        browser stretches whatever was drawn at the old size across the new one. The
        result is a band of five-times-scale toolbar icons that no later frame
        repaints, because the engine only redraws what it knows is dirty.
      */}
      <canvas
        ref={canvasRef}
        id="canvas"
        tabIndex={0}
        className="absolute inset-0 block h-full w-full"
      />

      {phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
          <div className="pointer-events-auto">
            <Button size="sm" variant="secondary" onClick={saveAndExit} disabled={saving}>
              {saving ? "Saving…" : "Save & exit"}
            </Button>
          </div>
          {notice && (
            <div
              className="rounded-md px-3 py-1.5 text-sm"
              data-testid="notice"
              style={{ background: "rgba(13,19,27,0.85)", color: "var(--rm-text)" }}
            >
              {notice}
            </div>
          )}
        </div>
      )}

      {/*
        Bottom right, over the map rather than beside it: the park is the subject, and
        an alert is worth the corner of the frame it covers only while it is true.
      */}
      {phase === "playing" && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex justify-end">
          <GuestAlerts
            alerts={alerts}
            collapsed={alertsCollapsed}
            onToggle={() => setAlertsCollapsed((was) => !was)}
          />
        </div>
      )}

      {recovery && (
        <div className="pointer-events-auto absolute inset-x-0 top-14 z-20 mx-auto w-fit max-w-lg rounded-md bg-amber-500/95 px-4 py-2 text-sm text-slate-950 shadow">
          <span data-testid="recovery-notice">{recovery}</span>{" "}
          <button className="font-semibold underline" onClick={() => setRecovery(null)}>
            Dismiss
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"
          style={{ background: "var(--rm-bg)" }}
        >
          <Wordmark size="lg" />
          <p className="min-h-6 text-sm" data-testid="loading-label" style={{ color: "var(--rm-text-quiet)" }}>
            {progress.label}
          </p>
          <div
            className="h-1.5 w-72 overflow-hidden rounded-full"
            style={{ background: "var(--rm-sunken)" }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: `${Math.round(progress.fraction * 100)}%`, background: "var(--rm-accent)" }}
            />
          </div>
        </div>
      )}

      {phase === "failed" && error && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: "var(--rm-bg)" }}
        >
          <Wordmark size="md" />
          <h2 className="text-lg font-semibold" style={{ color: "var(--rm-text)" }}>
            The game could not start.
          </h2>
          <p className="max-w-md text-sm" style={{ color: "var(--rm-text-quiet)" }}>{error.message}</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="secondary" onClick={() => router.push("/parks")}>
              Return to parks
            </Button>
          </div>
          {error.detail && (
            <details className="max-w-lg text-left text-xs" style={{ color: "var(--rm-disabled)" }}>
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">{error.detail}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="h-dvh w-dvw" style={{ background: "var(--rm-bg)" }} />}>
      <PlayScreen />
    </Suspense>
  );
}
