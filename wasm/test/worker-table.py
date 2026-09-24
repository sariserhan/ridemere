"""Render the worker-pool comparison table from workerbench.js results.

    .cache/venv/bin/python wasm/test/worker-table.py [results dir]

One row per configuration per workload stage, plus a correctness summary, so the
comparison in the ADR is generated from the measurements rather than transcribed.
"""

from __future__ import annotations

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ["pool120", "pool32", "pool16", "pool8", "pool4", "pool2"]


def load(directory: str) -> list[dict]:
    found = []
    for name in os.listdir(directory):
        if not name.endswith(".json") or name == "crossbrowser.json":
            continue
        with open(os.path.join(directory, name), "r", encoding="utf-8") as handle:
            found.append(json.load(handle))
    def key(doc: dict) -> tuple:
        label = doc.get("label", "")
        return (ORDER.index(label) if label in ORDER else len(ORDER), label)
    return sorted(found, key=key)


def main() -> None:
    directory = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "results-workers")
    docs = load(directory)
    if not docs:
        raise SystemExit(f"no results in {directory}")

    idle = docs[0].get("idle", {}).get("privDirtyMB")
    print(f"Idle browser baseline: {idle} MB private dirty\n")

    print("## Per configuration\n")
    print("| Config | Pool | Boot ms | Game ready ms | Peak workers | Live workers | Workers created |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    for d in docs:
        w = d.get("finalWorkers") or d.get("afterBoot") or {}
        print(f"| {d.get('label')} | {d.get('config', {}).get('pthreadPoolSize')} | "
              f"{d.get('bootMs', '-')} | {d.get('gameReadyMs', '-')} | {w.get('peak', '-')} | "
              f"{w.get('live', '-')} | {w.get('created', '-')} |")

    print("\n## Per workload stage\n")
    print("| Config | Stage | Guests | FPS | Worst frame gap ms | Ticks/s | Private dirty MB | Resident MB | Peak workers |")
    print("|---|---|---:|---:|---:|---:|---:|---:|---:|")
    for d in docs:
        for s in d.get("stages", []):
            m, w = s.get("memory", {}), s.get("workers", {})
            print(f"| {d.get('label')} | {s.get('stage')} | {s.get('guestEntities')} | {s.get('fps')} | "
                  f"{s.get('worstFrameGapMs')} | {s.get('ticksPerSecond')} | {m.get('privDirtyMB')} | "
                  f"{m.get('rssMB')} | {w.get('peak')} |")

    print("\n## Correctness\n")
    print("| Config | Guests seen | Full ride loops | Peak queue | Peak riders | Train positions | "
          "Ride open | Handyman positions | Audit unique | Save | Reload | Crash | Deadlock |")
    print("|---|---:|---:|---:|---:|---:|---|---:|---:|---|---|---|---|")
    for d in docs:
        c = d.get("correctness", {}) or {}
        a = d.get("audit", {}) or {}
        print(f"| {d.get('label')} | {c.get('guestsSeen', '-')} | {c.get('guestsCompletingFullLoop', '-')} | "
              f"{c.get('peakQueue', '-')} | {c.get('peakRiders', '-')} | {c.get('distinctTrainPositions', '-')} | "
              f"{c.get('rideOpenThroughout', '-')} | {c.get('handymanDistinctPositions', '-')} | "
              f"{a.get('uniqueUnexpected', '-')} | {(d.get('save') or {}).get('ok', '-')} | "
              f"{(d.get('reload') or {}).get('ok', '-')} | {d.get('crashed')} | {d.get('deadlock')} |")

    control = next((d for d in docs if d.get("label") == "pool120"), None)
    if control:
        def at(doc, stage):
            for s in doc.get("stages", []):
                if s.get("stage", "").startswith(stage):
                    return s.get("memory", {}).get("privDirtyMB")
            return None
        base = at(control, "W3")
        if base:
            print("\n## Saving against the 120-worker control, at 1000 guests\n")
            print("| Config | Private dirty MB | Saved MB | Saved % |")
            print("|---|---:|---:|---:|")
            for d in docs:
                v = at(d, "W3")
                if v is None:
                    continue
                print(f"| {d.get('label')} | {v} | {base - v} | {100 * (base - v) / base:.1f}% |")

    for d in docs:
        if d.get("fatal"):
            print(f"\n{d.get('label')} FATAL: {d['fatal']}")
        for line in d.get("console", [])[:4]:
            print(f"{d.get('label')} console: {line}")


if __name__ == "__main__":
    main()
