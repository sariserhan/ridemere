"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronUp, Hand, House, Minus, Plus, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameRuntime } from "@/lib/game/runtime";

/** An explicit camera tool keeps dragging separate from building and selecting rides. */
export function CameraControls({ runtimeRef }: { runtimeRef: RefObject<GameRuntime | null> }) {
  const [moving, setMoving] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const wheelAt = useRef(0);

  useEffect(() => {
    if (!moving) return;
    surface.current?.focus();
    // Returning to a native toolbar tool also returns to normal park interaction.
    const nativeToolbar = (event: PointerEvent) => {
      if (event.target instanceof HTMLCanvasElement && event.clientY < 32) setMoving(false);
    };
    window.addEventListener("pointerdown", nativeToolbar, true);
    return () => {
      window.removeEventListener("pointerdown", nativeToolbar, true);
      drag.current = null;
    };
  }, [moving]);

  const pan = (x: number, y: number) => runtimeRef.current?.panView(x, y);
  return (
    <>
      {moving && (
        <div
          ref={surface}
          data-testid="camera-drag-surface"
          role="region"
          aria-label="Move park view. Drag or use arrow keys. Escape finishes moving."
          tabIndex={0}
          className="absolute inset-x-0 top-8 bottom-8 z-[5] touch-none cursor-grab outline-none active:cursor-grabbing"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            const previous = drag.current;
            if (!previous || previous.id !== event.pointerId) return;
            pan(previous.x - event.clientX, previous.y - event.clientY);
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            if (drag.current?.id !== event.pointerId) return;
            drag.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }}
          onContextMenu={(event) => event.preventDefault()}
          onWheel={(event) => {
            // One zoom step per gesture interval, including high-frequency trackpads.
            const now = performance.now();
            if (!event.deltaY || now - wheelAt.current < 180) return;
            wheelAt.current = now;
            runtimeRef.current?.cameraAction(event.deltaY < 0 ? "in" : "out");
          }}
          onKeyDown={(event) => {
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-48, 0], ArrowRight: [48, 0], ArrowUp: [0, -48], ArrowDown: [0, 48],
            };
            if (directions[event.key]) {
              event.preventDefault();
              event.stopPropagation();
              pan(...directions[event.key]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setMoving(false);
            }
          }}
        />
      )}
      {!expanded && (
        <Button className="absolute right-3 top-24 z-20" variant="secondary" onClick={() => setExpanded(true)}>
          <Hand data-icon="inline-start" /> Camera
        </Button>
      )}
      {expanded && <section
        aria-label="Camera controls"
        className="absolute right-3 top-24 z-20 flex w-40 max-h-[calc(100dvh-8rem)] overflow-y-auto flex-col gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lg sm:w-44"
      >
        <div className="flex items-center justify-between pl-1">
          <p className="text-xs font-medium text-muted-foreground">CAMERA</p>
          <Button variant="ghost" size="icon-sm" aria-label="Hide camera controls" title="Hide camera controls" onClick={() => { setMoving(false); setExpanded(false); }}><ChevronUp /></Button>
        </div>
        <Button variant={moving ? "default" : "secondary"} aria-pressed={moving} onClick={() => setMoving(!moving)}>
          {moving ? <X data-icon="inline-start" /> : <Hand data-icon="inline-start" />}
          {moving ? "Done moving" : "Move view"}
        </Button>
        <div className="grid grid-cols-3 justify-items-center gap-1">
          <span />
          <Button variant="ghost" size="icon" className="size-11" aria-label="Pan up" title="Pan up" onClick={() => pan(0, -96)}><ArrowUp /></Button>
          <span />
          <Button variant="ghost" size="icon" className="size-11" aria-label="Pan left" title="Pan left" onClick={() => pan(-96, 0)}><ArrowLeft /></Button>
          <Button variant="secondary" size="icon" className="size-11" aria-label="Return to park centre" title="Return to park centre" onClick={() => runtimeRef.current?.cameraAction("home")}><House /></Button>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Pan right" title="Pan right" onClick={() => pan(96, 0)}><ArrowRight /></Button>
          <span />
          <Button variant="ghost" size="icon" className="size-11" aria-label="Pan down" title="Pan down" onClick={() => pan(0, 96)}><ArrowDown /></Button>
          <span />
        </div>
        <div className="flex justify-between border-t border-border pt-2">
          <Button variant="ghost" size="icon" className="size-11" aria-label="Zoom out" title="Zoom out" onClick={() => runtimeRef.current?.cameraAction("out")}><Minus /></Button>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Zoom in" title="Zoom in" onClick={() => runtimeRef.current?.cameraAction("in")}><Plus /></Button>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Rotate park view" title="Rotate park view" onClick={() => runtimeRef.current?.cameraAction("rotate")}><RotateCw /></Button>
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          {moving ? "Drag to explore. Arrow keys move. Esc finishes." : "Move view to drag. Scroll to zoom. Right-drag also moves."}
        </p>
      </section>}
    </>
  );
}
