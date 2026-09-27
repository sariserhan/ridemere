"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hammer, Home, Minus, Pause, Play, Plus, RotateCw, Users, Volume2, VolumeX, X } from "lucide-react";
import { ParkManagementPanel } from "@/components/park-management-panel";
import { ParkBuildPanel } from "@/components/park-build-panel";
import { Button } from "@/components/ui/button";
import { ParkRenderer } from "@/lib/game/scene/renderer";
import type { ParkSceneSnapshot, SceneRide } from "@/lib/game/scene/types";
import type { GameRuntime } from "@/lib/game/runtime";

export default function Park3D({ runtimeRef, onAdvanced, onSave, saving, audioEnabled, onAudio, parkLabel, building, onBuilding }: {
  runtimeRef: RefObject<GameRuntime | null>; onAdvanced: () => void; building: boolean; onBuilding: (value: boolean) => void; onSave: () => void;
  parkLabel: string; saving: boolean; audioEnabled: boolean; onAudio: () => void;
}) {
  const host = useRef<HTMLDivElement>(null), renderer = useRef<ParkRenderer | null>(null);
  const savingRef=useRef(saving);
  useEffect(()=>{savingRef.current=saving;renderer.current?.setSuspended(saving);},[saving]);
  const [snapshot, setSnapshot] = useState<ParkSceneSnapshot | null>(null);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<SceneRide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rideError, setRideError] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    let view: ParkRenderer | null = null, poll = 0, count = 0;
    const start = requestAnimationFrame(() => {
      const failed = (e: unknown) => {
        clearInterval(poll);
        setError(e instanceof Error ? e.message : "The 3D view could not start.");
      };
      try {
        view = new ParkRenderer(host.current!, ride => { setSelected(ride); setRideError(null); }, target => runtimeRef.current?.setViewTarget(target.x, target.y, target.z)); renderer.current = view;view.setSuspended(savingRef.current);
        const update = () => {
          try {
            const scene = runtimeRef.current?.sceneSnapshot(count++ % 12 === 0);
            if (!scene) throw new Error("The 3D view could not read this park. Your park is still available in the construction view.");
            view!.update(scene); setSnapshot(scene);
            setSelected(previous => previous ? scene.rides.find(r => r.id === previous.id) || null : null);
          } catch (e) { failed(e); }
        };
        poll = window.setInterval(update, 250); update();
      } catch (e) { failed(e); }
    });
    return () => { cancelAnimationFrame(start); clearInterval(poll); view?.dispose(); renderer.current = null; };
  }, [runtimeRef]);
  return (
    <>
      <div ref={host} data-testid="park-3d" className="absolute inset-0 z-[2] touch-none" />
      <header className="absolute inset-x-0 top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-background/95 px-4 py-3 shadow-lg sm:px-6">
        <div className="flex items-center gap-5">
          <span className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">Ridemere</span>
          <span className="hidden border-l border-border pl-5 text-sm text-muted-foreground lg:inline">{parkLabel}</span>
        </div>
        <div className="flex items-center gap-5 text-sm tabular-nums" aria-live="off">
          <span className="text-primary">{snapshot ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(snapshot.cash / 10) : "…"}</span>
          <span className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" />{snapshot?.guests ?? 0} <span className="hidden sm:inline">{snapshot?.guests === 1 ? "guest" : "guests"}</span></span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="ghost" size="icon" aria-label={snapshot?.paused ? "Resume park" : "Pause park"} onClick={() => runtimeRef.current?.togglePause()}>{snapshot?.paused ? <Play /> : <Pause />}</Button>
          <Button variant="ghost" size="icon" aria-label={audioEnabled ? "Mute sound" : "Enable sound"} onClick={onAudio}>{audioEnabled ? <Volume2 /> : <VolumeX />}</Button>
          <Button aria-pressed={building} onClick={() => { onBuilding(!building); setSelected(null); setManaging(false); }}><Hammer data-icon="inline-start" />{building ? "Done building" : "Build park"}</Button>
          <Button variant="secondary" aria-pressed={managing} onClick={() => { setManaging(!managing); onBuilding(false); setSelected(null); }}>Manage park</Button>
          <Button variant="secondary" disabled={saving} onClick={onSave}>{saving ? "Saving…" : "Save & exit"}</Button>
        </div>
      </header>
      <div className="pointer-events-none absolute inset-x-0 top-28 z-10 flex justify-center px-4 sm:top-20">
        <p className="rounded-full bg-background/85 px-4 py-2 text-center text-xs text-foreground shadow-sm">Drag to pan · Scroll or pinch to zoom · Right-drag to orbit · {building ? "Tap a tile to preview construction" : "Click a ride to manage"}</p>
      </div>
      <section aria-label="3D camera controls" className="absolute right-3 top-44 z-20 flex flex-col gap-1 rounded-xl border border-border bg-background/90 p-2 shadow-lg sm:top-auto sm:bottom-12">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => renderer.current?.zoom(1 / 1.25)}><Minus /></Button>
          <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => renderer.current?.zoom(1.25)}><Plus /></Button>
          <Button variant="ghost" size="icon" aria-label="Rotate park view" onClick={() => renderer.current?.rotate()}><RotateCw /></Button>
          <Button variant="ghost" size="icon" aria-label="Return to park centre" onClick={() => renderer.current?.home()}><Home /></Button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Pan left" onClick={() => renderer.current?.pan(-2, 0)}><ArrowLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Pan up" onClick={() => renderer.current?.pan(0, -2)}><ArrowUp /></Button>
          <Button variant="ghost" size="icon" aria-label="Pan down" onClick={() => renderer.current?.pan(0, 2)}><ArrowDown /></Button>
          <Button variant="ghost" size="icon" aria-label="Pan right" onClick={() => renderer.current?.pan(2, 0)}><ArrowRight /></Button>
        </div>
      </section>
      {building && <ParkBuildPanel runtimeRef={runtimeRef} rendererRef={renderer} rides={snapshot?.rides || []} saving={saving} onClose={() => onBuilding(false)} onAdvanced={() => { onBuilding(false); onAdvanced(); }} onChange={() => {
        const scene = runtimeRef.current?.sceneSnapshot(true);
        if (scene) { renderer.current?.update(scene); setSnapshot(scene); }
      }} />}
      {managing && <ParkManagementPanel snapshot={snapshot} runtimeRef={runtimeRef} onClose={() => setManaging(false)} saving={saving} />}
      {!building && !managing && selected && <section aria-label="Selected ride" className="absolute left-3 top-44 z-20 w-64 rounded-xl border border-border bg-background/95 p-4 shadow-lg sm:top-28">
        <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{selected.name}</h2><Button variant="ghost" size="icon-sm" aria-label="Close ride details" onClick={() => setSelected(null)}><X /></Button></div>
        <p className="mt-1 text-sm text-muted-foreground">{selected.broken ? "Broken down · mechanic needed" : selected.open ? "Open to guests" : "Closed"}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs text-muted-foreground">Customers</dt><dd>{selected.customers ?? 0}</dd></div><div><dt className="text-xs text-muted-foreground">In queue</dt><dd>{selected.queue ?? 0}</dd></div><div><dt className="text-xs text-muted-foreground">Price</dt><dd>${((selected.price ?? 0)/10).toFixed(2)}</dd></div><div><dt className="text-xs text-muted-foreground">Total profit</dt><dd>${((selected.profit ?? 0)/10).toFixed(2)}</dd></div></dl>
        <Button className="mt-4 w-full" variant="secondary" onClick={() => {
          const ok = runtimeRef.current?.setRideOpen(selected.id, !selected.open);
          setRideError(ok ? null : "The ride could not change status. Check its entrance, exit and testing in Build park.");
        }}>{selected.open ? "Close ride" : "Open ride"}</Button>
        {rideError && <p className="mt-2 text-xs text-destructive" role="alert">{rideError}</p>}
      </section>}
      {error && <div role="alert" className="absolute inset-0 z-40 flex items-center justify-center bg-background/90 p-6"><div className="max-w-md"><h2 className="text-xl font-semibold">Open your park in construction view</h2><p className="my-4 text-sm text-muted-foreground">{error}</p><Button onClick={onAdvanced}>Open advanced editor</Button></div></div>}
    </>
  );
}
