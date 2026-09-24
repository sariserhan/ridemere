# ADR: browser memory configuration

**Status:** accepted for the prototype, 24 September 2026
**Decision:** option B — 512 MB initial heap, 1 MB default pthread stack.
**Supersedes:** the idle-only recommendation in `docs/browser-memory.md`.

## Context

The Emscripten link line the engine inherits reserves a 2 GB `SharedArrayBuffer`,
gives every thread an 8 MB stack and prewarms 120 workers. None of those numbers were
derived from a measurement; they entered the tree in the first Emscripten CI commit as
ceilings generous enough that an off-the-shelf pthread application never fails to
allocate.

An earlier measurement (M2) compared configurations on the title scene only and found
a saving of roughly 480 MB. That comparison changed three flags at once and was taken
at idle, so it could not say which flag mattered, and it could not say anything about
a running park. It ended with an explicit instruction not to change defaults until the
measurement was repeated under load. This is that repeat.

## What was measured

Two builds, identical except for the memory flags, each driven through the same
scenario by `wasm/test/parkbench.js`: boot, load Sunrise Test Park, then raise the
guest population with the engine's own generation and hold it while sampling.

| | A (upstream) | B |
|---|---|---|
| `INITIAL_MEMORY` | 2 GB | 512 MB |
| `DEFAULT_PTHREAD_STACK_SIZE` | inherits `STACK_SIZE`, 8 MB | 1 MB |
| `PTHREAD_POOL_SIZE` | 120 | 120 |

Chromium headless, all Chrome processes summed from `/proc/<pid>/smaps_rollup`.
Browser idle before navigation was 789 MB resident, 82 MB private dirty in both runs.

| Measurement | A | B |
|---|---:|---:|
| Boot to running | 1246 ms | 1213 ms |
| Live workers | 120 | 120 |
| Private dirty, park loaded | 1029 MB | 950 MB |
| Private dirty, 100 guests | 971 MB | 926 MB |
| Private dirty, 500 guests | 981 MB | 926 MB |
| Private dirty, 1000 guests | 973 MB | 911 MB |
| Resident, 1000 guests | 1900 MB | 1836 MB |
| Proportional set, 1000 guests | 1293 MB | 1229 MB |
| Frame rate, all populations | 60 | 60 |
| Engine ticks per second | 40.1 | 40.1 |
| Allocation failures or crashes | none | none |

The WebAssembly heap size could not be read from the page: this build exposes neither
`HEAPU8` nor `wasmMemory` on the module object, so the resident and private-dirty
figures are the memory evidence.

## Decision

Adopt B. It is never worse than A on any measurement taken, and it is cheaper on every
one: about 60 MB less committed memory per tab with a thousand guests simulating, and a
slightly shorter boot. Frame rate and simulation rate are untouched, and nothing failed
to allocate at any population.

## What this decision does not claim

The saving is 60 MB, not the 480 MB the idle comparison suggested. That comparison also
dropped `PTHREAD_POOL_SIZE` from 120 to 4, and holding the pool at 120 here shows where
the money actually was: **the worker pool, not the heap reservation.** Reserving 2 GB of
address space costs almost nothing, because reserved address space is not committed
memory; 120 prewarmed workers cost a great deal.

That makes option C — reduce the pool as well, to roughly `hardware_concurrency` —
the larger prize. It is not chosen here because it has only ever been measured at idle,
and the risk it carries is a correctness risk rather than a performance one: `JobPool`
creates threads and then blocks on them, so a pool that runs out under a heavily loaded
park can fail rather than merely slow down. Adopting a pool size on idle evidence is the
mistake this milestone was written to avoid repeating. B is a prerequisite for C in any
case, since the stack size is what makes a large pool expensive.

Option D, more profiling, was rejected: the question asked — does B hurt a running park —
is now answered, and answering it took one measurement.

## Consequences

* The browser build's link line changes in two flags. Nothing else moves.
* Committed memory with a thousand guests is about 911 MB above an idle browser. That
  is still a large number for a browser tab and is not addressed by this decision.
* The next memory question is the worker pool, and it needs a loaded-park measurement
  with the pool varied and `PTHREAD_POOL_SIZE_STRICT` considered, plus a deliberate
  attempt to exhaust the pool. Until then the pool stays at 120.

## Reproducing

```
wasm/scripts/bench-memory.sh A B
wasm/test/parkbench.js .cache/bench-mem/A A
wasm/test/parkbench.js .cache/bench-mem/B B
```

Raw results: `wasm/test/results-render/bench-A.json`, `bench-B.json`.
