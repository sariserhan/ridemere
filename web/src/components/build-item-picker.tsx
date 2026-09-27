"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildCategories, buildTools, type BuildTool } from "@/lib/game/scene/build";

export function BuildItemPicker({ selected, expanded, onExpanded, onSelect }: {
  selected: BuildTool; expanded: boolean; onExpanded: (value: boolean) => void; onSelect: (id: string) => void;
}) {
  const [category, setCategory] = useState("All"), [search, setSearch] = useState("");
  const query=search.trim().toLocaleLowerCase();
  const matches=buildTools.filter(tool=>(category==="All"||tool.category===category)&&`${tool.label} ${tool.category} ${tool.description || ""}`.toLocaleLowerCase().includes(query));
  return <div className="flex min-h-0 flex-col gap-2" data-selected-build-item={selected.id}>
    <Button variant="outline" className="h-auto w-full justify-start gap-3 py-1 sm:py-2" aria-label={expanded ? "Hide build catalog" : "Browse build items"} aria-expanded={expanded} aria-controls="build-item-catalog" onClick={()=>onExpanded(!expanded)}>
      <Image src={`/art/build-items/${selected.id}.png`} alt="" width={48} height={36} className="h-auto w-8 rounded-md sm:w-12" unoptimized />
      <span className="flex flex-1 flex-col items-start"><span className="hidden text-xs text-muted-foreground sm:block">Selected item</span><span>{selected.label}</span></span>
      {expanded ? <ChevronUp /> : <ChevronDown />}
    </Button>
    {expanded && <div id="build-item-catalog" className="flex min-h-0 flex-col gap-2">
      <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Search build items" placeholder="Search items…" value={search} className="pl-8" onChange={e=>{setSearch(e.target.value);setCategory("All");}} /></div>
      <div role="group" aria-label="Item categories" className="flex flex-wrap gap-1">
        {["All",...buildCategories].map(name=><Button key={name} size="xs" variant={category===name?"default":"ghost"} aria-label={name==="All"?"All items":`${name} category`} aria-pressed={category===name} onClick={()=>{setCategory(name);setSearch("");}}>{name}</Button>)}
      </div>
      <p className="text-xs text-muted-foreground">{matches.length} {matches.length === 1 ? "item" : "items"}{matches.length > 6 ? " · Scroll to see more" : ""}</p>
      <div role="group" aria-label="Build items" className="grid max-h-[22dvh] shrink-0 auto-rows-max grid-cols-3 gap-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-60">
        {matches.map(tool=><button type="button" key={tool.id} data-build-item={tool.id} aria-label={`Build item: ${tool.label}`} aria-pressed={tool.id===selected.id} title={tool.description ? `${tool.label} · ${tool.description}` : tool.label} onClick={()=>onSelect(tool.id)}
          className="group relative flex min-h-28 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-secondary text-left outline-none transition hover:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary">
          <Image src={`/art/build-items/${tool.id}.png`} alt="" width={192} height={144} sizes="110px" className="aspect-[4/3] w-full shrink-0 object-contain" unoptimized />
          {tool.category==="Remove"&&<Trash2 aria-hidden="true" className="absolute left-1 top-1 size-5 rounded bg-background/90 p-0.5 text-destructive" />}
          {tool.id===selected.id&&<Check aria-hidden="true" className="absolute right-1 top-1 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />}
          <span className="min-h-9 shrink-0 px-2 py-1 text-xs leading-4">{tool.label}</span>
        </button>)}
        {!matches.length&&<p role="status" className="col-span-3 py-5 text-center text-xs text-muted-foreground">No items match “{search}”. Try another name.</p>}
      </div>
    </div>}
  </div>;
}
