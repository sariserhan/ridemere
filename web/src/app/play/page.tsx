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
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GameRuntime, type LoadProgress } from "@/lib/game/runtime";
import { GameSaveStore } from "@/lib/saves/store";
import { StorageQuotaError, type SaveRecord } from "@/lib/saves/types";
import { Wordmark } from "@/components/wordmark";
import { markScenarioComplete } from "@/lib/game/progression";
import { CameraControls } from "@/components/camera-controls";
import { GuestAlerts } from "@/components/guest-alerts";
import { OnboardingPanel } from "@/components/onboarding-panel";
import { currentStep, progress as stepsCompleted, type ScenarioState } from "@/lib/game/onboarding";
import type { GuestAlertMessage } from "@/lib/bridge/messages";

const Park3D = dynamic(() => import("@/components/park-3d"), { ssr: false });

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
  const dirtyRef = useRef(false);
  const rescuePark = useRef<Uint8Array | null>(null);
  // The write a save is currently performing. Leaving the page before it settles is
  // how a save lands after a rename and quietly reverts it.
  const persistingRef = useRef<Promise<void>>(Promise.resolve());

  const [progress, setProgress] = useState<LoadProgress>({ stage: "idle", label: "Starting…", fraction: 0 });
  const [smoothView, setSmoothView] = useState(true);
  const [building, setBuilding] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Recovery is not a transient status. It stays until the player dismisses it,
  // because it tells them their last few minutes of play were lost.
  const [recovery, setRecovery] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hasRescue, setHasRescue] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState("first-park");
  const [alerts, setAlerts] = useState<GuestAlertMessage[]>([]);
  const [alertsCollapsed, setAlertsCollapsed] = useState(false);
  const [scenario, setScenario] = useState<ScenarioState | null>(null);
  const [tipsHidden, setTipsHidden] = useState(false);
  // Where the camera was when this park opened. "Look around your park" is complete
  // when it has moved, which cannot be known without remembering where it started.

  const persist = useCallback(
    async (park: Uint8Array, metadata: SaveRecord["parkMetadata"], kind: "manual" | "autosave" | "exit") => {
      const store = storeRef.current;
      const record = recordRef.current;
      if (!store || !record) return;
      rescuePark.current = park;
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
        rescuePark.current = null;
        setHasRescue(false);
        setError(null);
        setNotice(kind === "autosave" ? "Autosaved" : "Saved");
        window.setTimeout(() => setNotice(null), 2500);
      } catch (writeError) {
        dirtyRef.current = true;
        setHasRescue(true);
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
    let cancelled = false;
    let autosaveTimer = 0;
    let alertTimer = 0;
    let initialSaveTimer = 0;
    let mountedRuntime: GameRuntime | null = null;

    (async () => {
      const store = await GameSaveStore.open();
      if (cancelled) return;
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
      if (cancelled) return;
      recordRef.current = record;
      setActiveScenarioId(record.scenarioId);
      setTipsHidden(record.tipsHidden === true);

      const runtime = new GameRuntime((next) => {
        if (!cancelled) setProgress(next);
      });
      mountedRuntime = runtime;
      runtimeRef.current = runtime;

      runtime.bus.on("ERROR", (message) => {
        setError({ message: message.message, detail: message.detail });
        if (message.stage === "park-save") { dirtyRef.current = true; setSaving(false); }
        else setPhase("failed");
      });
      runtime.bus.on("GUEST_ALERTS", (message) => {
        if (!cancelled) setAlerts(message.alerts);
      });
      runtime.bus.on("SCENARIO_STATE", (message) => {
        if (cancelled) return;
        setScenario(message.state);
        setAudioEnabled(runtime.getAudioEnabled());
        if (message.state.scenarioComplete && recordRef.current) markScenarioComplete(recordRef.current.scenarioId);
      });
      runtime.bus.on("SCREENSHOT_READY", (message) => {
        pendingShot.current = message.png;
      });
      runtime.bus.on("SAVE_READY", (message) => {
        persistingRef.current = persistingRef.current.then(() => persist(message.park, message.parkMetadata, message.reason));
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
        initialSaveTimer = window.setTimeout(() => {
          void runtime.send({ type: "REQUEST_SCREENSHOT", ...THUMBNAIL });
          void runtime.send({ type: "REQUEST_SAVE", saveId: record!.id, reason: "autosave" });
        }, 4000);

        alertTimer = window.setInterval(() => {
          void runtime.send({ type: "REQUEST_GUEST_ALERTS" });
          void runtime.send({ type: "REQUEST_SCENARIO_STATE" });
        }, ALERT_POLL_MS);
        // Ask once straight away, so the first instruction and the objective line are
        // there before the first poll rather than five seconds into the park.
        void runtime.send({ type: "REQUEST_SCENARIO_STATE" });

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
      if (initialSaveTimer) window.clearTimeout(initialSaveTimer);
      mountedRuntime?.exit("player");
    };
  }, [persist, router, saveId, scenarioId]);

  /**
   * Unload protection is a backstop, not the mechanism. Browsers cancel asynchronous
   * storage work during unload, so the real protection is the autosave interval; this
   * only warns when there is unsaved progress.
   */
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (phase === "playing") event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  const saveAndExit = useCallback(async () => {
    const runtime = runtimeRef.current;
    const record = recordRef.current;
    if (!runtime || !record) return;
    setSaving(true);
    dirtyRef.current = true;
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
    if (dirtyRef.current) {
      setSaving(false);
      setError(previous => previous ?? { message: "The park was not saved. Please retry before leaving." });
      return;
    }
    dirtyRef.current = false;
    runtime.exit("player");
    router.push("/parks");
  }, [router]);

  // Onboarding is derived, never stored: this recomputes on every scenario update,
  // so a resumed park lands on the step that park is actually at.
  const onboardingContext = scenario
    ? { state: scenario, alerts }
    : null;
  const nativeStep = onboardingContext ? currentStep(onboardingContext, activeScenarioId) : null;
  const step = nativeStep && smoothView
    ? { ...nativeStep, body: nativeStep.id === "camera"
      ? "Drag the park to explore. Scroll or pinch to zoom, and right-drag to orbit. Click a ride to manage it; choose Build park to construct paths, rides and scenery."
      : nativeStep.body + " Use Build park for construction or Manage park to hire cleaners and mechanics." }
    : nativeStep;
  const stepProgress = onboardingContext ? stepsCompleted(onboardingContext, activeScenarioId) : { done: 0, total: 0 };

  const hideTips = useCallback(() => {
    setTipsHidden(true);
    const record = recordRef.current;
    if (record) void storeRef.current?.setTipsHidden(record.id, true);
  }, []);

  const showTips = useCallback(() => {
    setTipsHidden(false);
    const record = recordRef.current;
    if (record) void storeRef.current?.setTipsHidden(record.id, false);
  }, []);

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
        style={{ visibility: phase === "playing" && smoothView ? "hidden" : "visible" }}
        tabIndex={0}
        className="absolute inset-0 block h-full w-full"
      />

      {phase === "playing" && smoothView && <Park3D parkLabel={activeScenarioId.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join(" ")} runtimeRef={runtimeRef} onAdvanced={() => setSmoothView(false)} building={building} onBuilding={setBuilding} onSave={saveAndExit} saving={saving} audioEnabled={audioEnabled} onAudio={() => { runtimeRef.current?.setAudioEnabled(!audioEnabled); setAudioEnabled(!audioEnabled); }} />}
      {phase === "playing" && !smoothView && <CameraControls runtimeRef={runtimeRef} />}

      {phase === "playing" && !smoothView && (
        <div className="pointer-events-none absolute inset-x-0 top-8 z-10 flex items-start justify-between p-3">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setSmoothView(true)}>View in 3D</Button>
            <Button size="sm" variant="secondary" onClick={saveAndExit} disabled={saving}>
              {saving ? "Saving…" : "Save & exit"}
            </Button>
            <Button size="sm" variant="secondary" aria-pressed={!audioEnabled}
              onClick={() => { runtimeRef.current?.setAudioEnabled(!audioEnabled); setAudioEnabled(!audioEnabled); }}>
              {audioEnabled ? "Mute sound" : "Enable sound"}
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

      {/*
        The objective and the current instruction, bottom left, opposite the alerts.
        The objective stays for the whole scenario; the instruction stops once the
        guided opening is done, which is the point at which a tutorial should get out
        of the way.
      */}
      {phase === "playing" && scenario && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col items-start gap-2">
          {scenario.scenarioFailed && (
            <div className="pointer-events-auto w-80 max-w-[calc(100vw-1.5rem)] rounded-md border border-destructive/50 p-3 shadow-lg"
              data-testid="scenario-failed" style={{ background: "var(--rm-sunken)" }}>
              <p className="font-semibold">The park missed its goal</p>
              <p className="mt-1 text-xs">The park rating stayed too low. Save this park and start another attempt from My parks.</p>
              <Button className="mt-3" size="sm" disabled={saving} onClick={saveAndExit}>Save and choose a park</Button>
            </div>
          )}
          {scenario.scenarioComplete && (
            <div className="pointer-events-auto w-80 max-w-[calc(100vw-1.5rem)] rounded-md border p-3 shadow-lg"
              data-testid="scenario-complete" style={{ background: "var(--rm-sunken)", borderColor: "var(--rm-positive)" }}>
              <p className="font-semibold">Objective complete!</p>
              <p className="mt-1 text-xs">Your park has reached its goal. Keep building or choose another scenario.</p>
              <Button className="mt-3" size="sm" disabled={saving} onClick={saveAndExit}>Save and choose a park</Button>
            </div>
          )}
          {step && !tipsHidden && !building && (
            <OnboardingPanel
              step={step}
              done={stepProgress.done}
              total={stepProgress.total}
              onDismiss={hideTips}
            />
          )}
          {step && tipsHidden && !building && (
            <button
              className="pointer-events-auto rounded-md px-3 py-1.5 text-xs"
              data-testid="onboarding-show"
              style={{ background: "rgba(30,40,54,0.96)", border: "1px solid var(--rm-line)", color: "var(--rm-text-quiet)" }}
              onClick={showTips}
            >
              Show tips
            </button>
          )}
          <div
            className="pointer-events-auto rounded-md px-3 py-1.5 text-xs"
            data-testid="objective"
            data-steps-done={stepProgress.done}
            data-steps-total={stepProgress.total}
            style={{ background: "rgba(13,19,27,0.85)", color: "var(--rm-text-quiet)" }}
          >
            <span style={{ color: "var(--rm-text)" }}>{scenario.guests}</span>
            {` of ${scenario.objectiveGuests} guests`}
            {scenario.objectiveRating > 0 && (
              <>
                {" · rating "}
                <span style={{ color: scenario.rating >= scenario.objectiveRating ? "var(--rm-positive)" : "var(--rm-warning)" }}>
                  {scenario.rating}
                </span>
                {`/${scenario.objectiveRating}`}
              </>
            )}
          </div>
        </div>
      )}

      {phase === "playing" && error && (
        <div role="alert" className="absolute inset-x-3 top-14 z-20 mx-auto flex max-w-lg flex-col gap-2 rounded-md border bg-background p-4 shadow-lg">
          <p className="font-semibold">{error.message}</p>
          {error.detail && <p className="text-sm text-muted-foreground">{error.detail}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { const record = recordRef.current; if (record) void runtimeRef.current?.send({ type: "REQUEST_SAVE", saveId: record.id, reason: "manual" }); }}>Retry save</Button>
            {hasRescue && <Button size="sm" variant="secondary" onClick={() => {
              const bytes = rescuePark.current; if (!bytes) return;
              const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
              const link = document.createElement("a"); link.href = url; link.download = "ridemere-rescue.park"; link.click();
              window.setTimeout(() => URL.revokeObjectURL(url), 2000);
            }}>Download rescue copy</Button>}
          </div>
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
