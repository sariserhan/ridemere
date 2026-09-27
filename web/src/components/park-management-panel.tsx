"use client";

import { useState, type RefObject } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameRuntime } from "@/lib/game/runtime";
import type { ParkSceneSnapshot } from "@/lib/game/scene/types";

const duties: Record<number, string> = { 0: "Arriving", 9: "Awaiting placement", 10: "Patrolling", 11: "Mowing", 12: "Sweeping", 15: "Answering a call", 16: "Repairing a ride", 19: "Emptying a bin", 21: "Watering", 22: "Heading to inspection", 23: "Inspecting a ride" };
export function ParkManagementPanel({ snapshot, runtimeRef, onClose, saving }: {
  snapshot: ParkSceneSnapshot | null; runtimeRef: RefObject<GameRuntime | null>; onClose: () => void; saving: boolean;
}) {
  const [message, setMessage] = useState("");
  const staff = snapshot?.staff || [];
  const health = snapshot?.wellbeing;
  function hire(role: "cleaner" | "mechanic") {
    const ok = runtimeRef.current?.hireStaff(role);
    setMessage(ok ? `${role === "cleaner" ? "Cleaner" : "Mechanic"} hired. Staff wages are paid from park funds.` : "Could not hire staff. Check your funds and available paths.");
  }
  return <section aria-label="Park management" className="absolute left-3 top-36 bottom-6 z-30 w-[min(360px,calc(100%-24px))] overflow-y-auto rounded-xl border border-border bg-background/95 p-4 shadow-xl sm:top-24">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Park management</h2><Button variant="ghost" size="icon-sm" aria-label="Close park management" onClick={onClose}><X /></Button></div>
    <h3 className="mt-4 text-sm font-semibold">Guest wellbeing</h3>
    <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
      {[["Happiness", health ? `${health.happiness}%` : "—"], ["Nauseous guests", health?.sick ?? "—"], ["Litter on paths", snapshot?.litter?.length ?? "—"], ["Vomit patches", health?.vomit ?? "—"]].map(([label,value])=><div key={label} className="rounded-lg bg-muted p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg tabular-nums">{value}</dd></div>)}
    </dl>
    <p className="mt-3 text-xs text-muted-foreground">Intense rides can make guests sick. Benches and first aid help them recover. Cleaners sweep litter and vomit and empty bins.</p>
    <h3 className="mt-5 text-sm font-semibold">Staff · {staff.length}</h3>
    <div className="mt-2 flex gap-2"><Button className="flex-1" variant="secondary" disabled={saving} onClick={()=>hire("cleaner")}>Hire cleaner</Button><Button className="flex-1" variant="secondary" disabled={saving} onClick={()=>hire("mechanic")}>Hire mechanic</Button></div>
    <p className="mt-2 text-xs text-muted-foreground">Mechanics inspect and repair rides. Connect rides and facilities with paths so guests and staff can reach them.</p>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    <ul className="mt-3 space-y-2">{staff.map(member=><li key={member.id} className="rounded-lg border border-border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{["Cleaner", "Mechanic", "Security", "Entertainer"][member.type] || "Staff"} #{member.id}</strong><span className="text-xs text-muted-foreground">{duties[member.state] || "Walking"}</span></div>{member.type===0 && <p className="mt-1 text-xs text-muted-foreground">{member.litterSwept} swept · {member.binsEmptied} bins emptied</p>}</li>)}</ul>
    {staff.length===0 && <p className="mt-4 text-sm text-muted-foreground">No staff yet. Hire a cleaner and a mechanic to care for your park.</p>}
  </section>;
}
