"use client";

/**
 * Local park manager. Not isolated, not the game: an ordinary web page that reads the
 * save store. Everything here works with no account and no network.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/wordmark";
import { completedScenarios } from "@/lib/game/progression";
import { enterGame } from "@/lib/game/navigation";
import { GameSaveStore } from "@/lib/saves/store";
import { SaveValidationError, StorageQuotaError, type SaveRecord } from "@/lib/saves/types";

/**
 * The scenarios a player can start.
 *
 * Release scenarios only. Development scenes are shipped in their own directory that
 * the engine never scans, and stripped from the player build entirely, so they cannot
 * appear here; listing them here would be the one way left to expose them, which is
 * why `check_scenario_visibility.py` reads this file.
 */
const SCENARIOS = [
  { id: "coaster-frontier", name: "Coaster Frontier", difficulty: "Creative", blurb: "Wide open land for giant coasters. Start with $150,000 and build for 1,500 guests." },
  { id: "small-footprint", name: "Small Footprint", difficulty: "Intermediate", blurb: "Fit 300 guests into a compact garden. Make paths and queues work harder." },
  { id: "growing-destination", name: "Growing Destination", difficulty: "Advanced", blurb: "Build for 750 guests. Paid entry, free rides, and a larger park to maintain." },
  {
    id: "first-park",
    name: "First Park",
    difficulty: "Beginner",
    blurb: "Open your first coaster, look after your guests, and grow the park.",
  },
].sort((a, b) => ["first-park", "small-footprint", "growing-destination", "coaster-frontier"].indexOf(a.id) - ["first-park", "small-footprint", "growing-destination", "coaster-frontier"].indexOf(b.id));

function formatDate(value: number): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ParksPage() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [store, setStore] = useState<GameSaveStore | null>(null);
  const [records, setRecords] = useState<SaveRecord[] | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ backend: string; usage?: number; quota?: number } | null>(null);

  const refresh = useCallback(
    async (target?: GameSaveStore) => {
      const active = target ?? store;
      if (!active) return;
      const list = await active.list();
      setRecords(list);
      const shots: Record<string, string> = {};
      for (const record of list) {
        if (!record.hasScreenshot) continue;
        const png = await active.screenshot(record.id);
        if (png) shots[record.id] = URL.createObjectURL(new Blob([png as BlobPart], { type: "image/png" }));
      }
      setThumbnails(shots);
      const estimate = await active.estimate();
      setStorage({ backend: active.backend, ...estimate });
    },
    [store],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opened = await GameSaveStore.open();
      if (cancelled) return;
      setStore(opened);
      setCompleted(completedScenarios());
      await refresh(opened);
    })();
    return () => {
      cancelled = true;
    };
    // refresh depends on store, which is what this effect sets; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    for (const url of Object.values(thumbnails)) URL.revokeObjectURL(url);
  }, [thumbnails]);

  const startNew = useCallback(
    (scenarioId: string) => {
      enterGame({ scenario: scenarioId });
    },
    [],
  );

  const onExport = useCallback(
    async (record: SaveRecord) => {
      if (!store) return;
      try {
        const { fileName, bytes } = await store.export(record.id);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (error) {
        setMessage(String(error instanceof Error ? error.message : error));
      }
    },
    [store],
  );

  const onImport = useCallback(
    async (file: File) => {
      if (!store) return;
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        await store.import(file.name, bytes);
        setMessage(null);
        await refresh();
      } catch (error) {
        if (error instanceof SaveValidationError || error instanceof StorageQuotaError) setMessage(error.message);
        else setMessage("That file could not be imported.");
      }
    },
    [refresh, store],
  );

  const onDelete = useCallback(
    async (record: SaveRecord) => {
      if (!store) return;
      if (!window.confirm(`Delete “${record.displayName}”? This cannot be undone.`)) return;
      await store.remove(record.id);
      await refresh();
    },
    [refresh, store],
  );

  const commitRename = useCallback(
    async (record: SaveRecord) => {
      if (!store) return;
      try {
        await store.rename(record.id, draftName);
        setRenaming(null);
        await refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [draftName, refresh, store],
  );

  const quotaLine = useMemo(() => {
    if (!storage) return null;
    const backend = storage.backend === "opfs" ? "Origin Private File System" : "IndexedDB";
    if (storage.usage === undefined || storage.quota === undefined) return `Stored in this browser using ${backend}.`;
    return `Stored in this browser using ${backend}. ${(storage.usage / 1e6).toFixed(1)} MB of ${(storage.quota / 1e6).toFixed(0)} MB used.`;
  }, [storage]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="inline-block hover:opacity-80">
            <Wordmark size="sm" />
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">My parks</h1>
          <p className="text-sm text-muted-foreground">Saved in this browser. No account needed.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => startNew(SCENARIOS[0].id)}>New park</Button>
          <label
            data-testid="import-label"
            data-ready={store ? "true" : "false"}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 aria-disabled:opacity-50"
            aria-disabled={!store}
          >
            Import
            <input
              type="file"
              accept=".park"
              data-testid="import-input"
              disabled={!store}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImport(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </header>

      {message && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">{message}</p>
      )}

      {records === null && <p className="text-sm text-muted-foreground">Looking for saved parks…</p>}

      {records !== null && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((scenario) => (
            <Card key={scenario.id} data-testid="scenario-card" data-scenario-id={scenario.id}>
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  {scenario.name}
                  {completed.includes(scenario.id) && <span className="text-xs text-muted-foreground">Completed</span>}
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-normal"
                    style={{ background: "var(--rm-sunken)", color: "var(--rm-text-quiet)" }}
                  >
                    {scenario.difficulty}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{scenario.blurb}</CardContent>
              <CardFooter>
                <Button onClick={() => startNew(scenario.id)}>Start {scenario.name}</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {records?.map((record) => (
          <Card key={record.id} data-testid="park-card" data-park-id={record.id}>
            <div className="aspect-video w-full overflow-hidden rounded-t-xl" style={{ background: "var(--rm-sunken)" }}>
              {thumbnails[record.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnails[record.id]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs" style={{ color: "var(--rm-disabled)" }}>
                  No picture yet
                </div>
              )}
            </div>
            <CardHeader className="pb-2">
              {renaming === record.id ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={draftName}
                    data-testid="rename-input"
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void commitRename(record);
                      if (event.key === "Escape") setRenaming(null);
                    }}
                  />
                  <Button size="sm" onClick={() => void commitRename(record)} data-testid="rename-confirm">
                    Save
                  </Button>
                </div>
              ) : (
                <CardTitle className="truncate text-base" data-testid="park-name">
                  {record.displayName}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-1 pb-3 text-xs text-muted-foreground">
              <p>Last played {formatDate(record.updatedAt)}</p>
              {record.parkMetadata && (
                <p className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{record.parkMetadata.guestCount} guests</Badge>
                  <Badge variant="secondary">Rating {record.parkMetadata.parkRating}</Badge>
                  <Badge variant="secondary">
                    {record.parkMetadata.rideCount} {record.parkMetadata.rideCount === 1 ? "ride" : "rides"}
                  </Badge>
                </p>
              )}
              <p>
                {SCENARIOS.find((item) => item.id === record.scenarioId)?.name ?? record.scenarioId} ·{" "}
                {(record.sizeBytes / 1024).toFixed(0)} KB
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => enterGame({ save: record.id })}>
                Play
              </Button>
              <Button
                size="sm"
                variant="secondary"
                data-testid="rename"
                onClick={() => {
                  setRenaming(record.id);
                  setDraftName(record.displayName);
                }}
              >
                Rename
              </Button>
              <Button size="sm" variant="secondary" data-testid="export" onClick={() => void onExport(record)}>
                Export
              </Button>
              <Button size="sm" variant="ghost" data-testid="delete" onClick={() => void onDelete(record)}>
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {quotaLine && <p className="mt-10 text-xs text-muted-foreground">{quotaLine}</p>}
    </main>
  );
}
