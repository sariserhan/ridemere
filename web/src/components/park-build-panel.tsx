"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildItemPicker } from "@/components/build-item-picker";
import { buildTools, type BuildResult, type BuildTile } from "@/lib/game/scene/build";
import type { ParkRenderer } from "@/lib/game/scene/renderer";
import type { GameRuntime } from "@/lib/game/runtime";
import type { SceneRide } from "@/lib/game/scene/types";

const money = (cost: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cost / 10);

export function ParkBuildPanel({ runtimeRef, rendererRef, rides, onClose, onAdvanced, onChange, saving }: {
  runtimeRef: RefObject<GameRuntime | null>; rendererRef: RefObject<ParkRenderer | null>;
  rides: SceneRide[]; onClose: () => void; onAdvanced: () => void; onChange: () => void; saving: boolean;
}) {
  const [toolId, setToolId] = useState("path"), [tile, setTile] = useState<BuildTile | null>(null);
  const [direction, setDirection] = useState(0), [ride, setRide] = useState<number>(rides[0]?.id ?? -1);
  const [quote, setQuote] = useState<BuildResult | null>(null), [message, setMessage] = useState("");
  const [browsing, setBrowsing] = useState(true);
  const [revision, setRevision] = useState(0);
  const placing = useRef(false);
  const tool = buildTools.find(t => t.id === toolId)!;
  const needsRide = tool.op === "entrance" || tool.op === "exit";
  useEffect(() => {
    const view = rendererRef.current;
    view?.setBuildMode(selected => { setTile(selected); setMessage(""); setQuote(null); });
    return () => view?.setBuildMode(null);
  }, [rendererRef]);
  useEffect(() => {
    if (!tile) { rendererRef.current?.clearBuildPreview(); return; }
    const frame = requestAnimationFrame(() => {
      const result = runtimeRef.current?.buildAction({ op: tool.op, object: tool.object, design: tool.design, ...tile, direction, ride, apply: false });
      setQuote(result || null);
      rendererRef.current?.showBuildPreview(tool, tile, direction, !!result?.ok, result?.footprint, result?.tracks);
    });
    return () => cancelAnimationFrame(frame);
  }, [tool, tile, direction, ride, revision, runtimeRef, rendererRef]);
  function place() {
    if (!tile || !quote?.ok || placing.current || saving) return;
    placing.current = true;
    try {
      const result = runtimeRef.current?.buildAction({ op: tool.op, object: tool.object, design: tool.design, ...tile, direction, ride, apply: true });
      if (!result?.ok) { setQuote(result || null); setMessage(result?.error || "The item could not be placed."); rendererRef.current?.showBuildPreview(tool, tile, direction, false, quote.footprint, quote.tracks); return; }
      setMessage(`${tool.label} ${tool.category === "Remove" ? "removed" : "built"}${result.cost ? ` · ${money(result.cost)}` : ""}.${result.needsEntrance ? " Add an entrance and exit beside the ride, then connect paths and open it." : ""}`);
      onChange();
      if (result.needsEntrance && result.rideId !== undefined) { setRide(result.rideId); setToolId("entrance"); setBrowsing(false); setTile(null); setQuote(null); }
      else { setTile(null); setQuote(null); }
      setRevision(value => value + 1);
    } finally { placing.current = false; }
  }
  return <section data-game-ui aria-label="Build in 3D" className="absolute inset-x-2 bottom-3 z-30 flex max-h-[48dvh] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-background/95 p-4 shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-28 sm:max-h-[calc(100dvh-9rem)] sm:w-[23rem]">
    <div className="flex items-center justify-between"><div><h2 className="font-semibold">Build your park</h2><p className="text-xs text-muted-foreground">Choose from {buildTools.filter(t => t.category !== "Remove").length} items, then tap a tile.</p></div><Button variant="ghost" size="icon-sm" aria-label="Close build tools" onClick={onClose}><X /></Button></div>
    <BuildItemPicker selected={tool} expanded={browsing} onExpanded={setBrowsing} onSelect={id => {
      if (id !== toolId) { setToolId(id); setQuote(null); setMessage(""); }
      if (window.matchMedia("(max-width: 639px)").matches) setBrowsing(false);
    }} />
    <div className={browsing ? "hidden flex-col gap-3 sm:flex" : "flex flex-col gap-3"}>
    {needsRide && <label className="flex flex-col gap-1 text-xs text-muted-foreground">Connect to ride
      <select aria-label="Connect to ride" value={ride} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground" onChange={e=>{ const id=Number(e.target.value); if (id !== ride) { setRide(id); setQuote(null); } }}>
        <option value={-1}>Choose a ride</option>{rides.filter(r=>!/stand|restroom|kiosk/.test(r.object)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </label>}
    <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{tile ? `Tile ${tile.x}, ${tile.y}` : "No tile selected"}</span><Button variant="secondary" size="sm" onClick={()=>{setDirection(d=>(d+1)%4);setQuote(null);}}><RotateCw data-icon="inline-start" />Rotate item · {direction * 90}°</Button></div>
    <p className="text-xs text-muted-foreground">{needsRide ? "The arrow must point into the ride. Connect a queue to the entrance and a normal path to the exit." : tool.op === "wall" || tool.op === "removeWall" ? "Rotate to choose the tile edge. Fences and walls sit along that edge." : tool.op === "addition" ? "Place on an existing path. One bench or bin per tile." : tool.op === "design" ? "Complete ride layout. The arrow marks the station start; add entrance and exit beside the station. Rotate to fit clear land. Final cost is checked when you build." : tool.category === "Rides" ? "Place on clear, level ground. Add an entrance and exit next. Final cost is checked when you build." : "Drag to pan without placing. Rotate the view or zoom with the camera controls."}</p>
    {tool.description && <p className="text-xs text-primary">{tool.description}. Try Coaster Frontier for plenty of building space.</p>}
    {quote?.stats && <p className="text-xs text-muted-foreground">{quote.stats.width} × {quote.stats.depth} tiles · {quote.stats.pieces} track pieces · {Math.round(quote.stats.height * 3)} m lift height</p>}
    {tile && quote && <p role={quote.ok ? "status" : "alert"} className={quote.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{quote.ok ? quote.cost === undefined ? "Footprint preview · clearance and cost checked on placement" : `Cost: ${money(quote.cost)}` : quote.error}</p>}
    {quote?.stats && <Button variant="secondary" size="sm" onClick={()=>rendererRef.current?.fitBuildPreview()}>Show whole layout</Button>}
    <Button disabled={!tile || !quote?.ok || saving} onClick={place}>{tool.category === "Remove" ? "Remove selected item" : "Place selected item"}</Button>
    {message && <p role="status" className="text-xs text-foreground">{message}</p>}
    <div className="flex flex-col gap-1 border-t border-border pt-2"><Button size="sm" variant="ghost" onClick={onAdvanced}>Advanced editor (2D)</Button><p className="text-center text-xs text-muted-foreground">Custom coaster tracks, terrain and staff management</p></div>
    </div>
  </section>;
}
