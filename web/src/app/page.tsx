"use client";

/**
 * Product shell. Not isolated, so this page may carry analytics and third-party
 * content later; the game route may not.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { enterGame } from "@/lib/game/navigation";
import { GameSaveStore } from "@/lib/saves/store";
import { PRODUCT } from "@/lib/product";

export default function HomePage() {
  const router = useRouter();
  const [saveCount, setSaveCount] = useState<number | null>(null);
  const [latestId, setLatestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const store = await GameSaveStore.open();
        const records = await store.list();
        if (cancelled) return;
        setSaveCount(records.length);
        setLatestId(records[0]?.id ?? null);
      } catch {
        if (!cancelled) setSaveCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasParks = saveCount !== null && saveCount > 0 && latestId !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-10 px-6 text-center">
      <div className="space-y-4">
        <Wordmark size="lg" />
        <p className="text-lg" style={{ color: "var(--rm-text-quiet)" }}>
          {PRODUCT.tagline}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {hasParks ? (
          <>
            <Button size="lg" data-testid="continue" onClick={() => enterGame({ save: latestId! })}>
              Continue
            </Button>
            <Button size="lg" variant="secondary" onClick={() => enterGame({ scenario: "first-park" })}>
              New park
            </Button>
            <Button size="lg" variant="ghost" onClick={() => router.push("/parks")}>
              My parks
            </Button>
          </>
        ) : (
          <Button size="lg" data-testid="play" onClick={() => enterGame({ scenario: "first-park" })}>
            Play
          </Button>
        )}
      </div>

      <Link href="/parks" className="text-sm underline">Choose a scenario</Link>
      <Link href="/credits" className="text-xs text-muted-foreground underline">Credits and licenses</Link>

      <p className="max-w-md text-sm" style={{ color: "var(--rm-text-quiet)" }}>
        No account, no download, no original game files. Parks are saved in this browser and can be exported at any
        time.
      </p>
    </main>
  );
}
