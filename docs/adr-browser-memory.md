# ADR: browser memory and worker configuration

**Status:** accepted, 24 September 2026. This is the production recommendation.

```
PTHREAD_POOL_SIZE        = 16
PTHREAD_POOL_SIZE_STRICT = 1   (the default; 2 in a continuous-integration build)
INITIAL_MEMORY           = 512 MB
DEFAULT_PTHREAD_STACK_SIZE = 1 MB
JobPool threads          = capped at 4 in the browser build
```

Applied in `wasm/scripts/build.sh` and `engine/openrct2/src/openrct2/core/JobPool.cpp`.

## Context

The engine inherits an Emscripten link line that reserves a 2 GB heap, gives every
thread an 8 MB stack and prewarms 120 Web Workers. None of those numbers came from a
measurement. An earlier comparison on the title scene suggested the heap was worth
480 MB; a later comparison on a running park (M3e) showed it was worth 60 MB, and that
the workers were where the memory actually went. This decision settles the worker
question on the same running-park evidence, and replaces both earlier recommendations.

## What `PTHREAD_POOL_SIZE` does, and the defect it hides

Read from Emscripten 5.0.0's `libpthread.js`, recorded in
`docs/browser-worker-semantics.md`:

* The setting only **prewarms**. When the pool is empty, `pthread_create` builds a new
  Worker on the spot.
* A worker whose thread exits is pushed back on the free list and **never terminated**,
  so the live worker count is the high-water mark of concurrent threads and never falls.
* A grown worker only begins running once the page returns to the JavaScript event
  loop. Emscripten documents the consequence: code that creates threads and then blocks
  without yielding deadlocks.

`JobPool` is exactly that code. Its constructor creates `hardware_concurrency` threads
and `Join()` then blocks the caller until they finish. Loading a park constructs one
such pool while another is still alive.

**Measured, this is not theoretical.** On a 20-core machine, with everything else
identical, loading Sunrise Test Park:

| `PTHREAD_POOL_SIZE` | 2 | 4 | 8 | 16 | 32 | 36 | 40 | 42 | 44 | 48 | 64 | 120 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Park loads | no | no | no | no | no | no | no | no | **yes** | yes | yes | yes |

Below 44 the page wedges: the main thread spins inside `Join()`, no animation frame
fires, a trivial script evaluation never returns, worker creation is frozen, and there
is no recovery. It is not slow, it is stopped. The threshold, 43 to 44 on a 20-core
machine, is about **twice `hardware_concurrency`**, because two machine-sized pools
overlap during loading.

That is the finding that matters for a product: **`PTHREAD_POOL_SIZE` is a build-time
constant and the demand it must satisfy depends on the player's machine.** Upstream's
120 is not a considered value, it is a number large enough to hide this up to roughly
58 cores. On a larger machine upstream's own browser build would wedge on park load.

## The fix: bound the demand instead of guessing the supply

`JobPool` now clamps its thread count to 4 in the browser build. Demand becomes
machine-independent, and measurement confirms it:

| Capped, `PTHREAD_POOL_SIZE` | 8 | 12 | 16 |
|---|---|---|---|
| Park loads | no | yes | yes |

Peak demand is 9 to 12 workers whatever the machine. 16 is chosen over 12 to leave
margin above a measured ceiling, for 14 MB.

The cap costs no performance. At the heaviest rendering workload measured, a
2560×1440 canvas with a thousand guests, the uncapped build reaches 34 frames per
second and the capped build 35. Paint parallelism is not the bottleneck at any canvas
size tested.

## Measurements

Chromium headless, Sunrise Test Park, all Chrome processes summed from
`/proc/<pid>/smaps_rollup`. Idle browser baseline 82 MB private dirty.

| | Control: pool 120, uncapped | **Selected: pool 16, capped** |
|---|---:|---:|
| Boot to running | 1039 ms | **645 ms** |
| Game ready | 5339 ms | **4916 ms** |
| Live workers | 120 | **16** |
| Private dirty, park loaded | 880 MB | **460 MB** |
| Private dirty, 100 guests | 883 MB | **459 MB** |
| Private dirty, 500 guests | 884 MB | **461 MB** |
| Private dirty, 1000 guests | 864 MB | **453 MB** |
| Resident, 1000 guests | 1789 MB | **1374 MB** |
| Frames per second, 1000 guests | 60 | 60 |
| Engine ticks per second | 40.1 | 39.9 |
| Worst frame gap | 21 ms | 21 ms |
| Full ride lifecycles observed | 6 | 6 |
| Sprite audit | 0 | 0 |
| Save and reload | pass | pass |
| Deadlock or crash | none | none |

Render stress, a thousand guests, three canvas sizes:

| Canvas | Control FPS | Selected FPS | Control private dirty | Selected private dirty |
|---|---:|---:|---:|---:|
| 1280×800 (1.0 Mpx) | 60 | 60 | 889 MB | 468 MB |
| 1920×1080 (2.1 Mpx) | 60 | 60 | 915 MB | 489 MB |
| 2560×1440 (3.7 Mpx) | 34 | 35 | 932 MB | 513 MB |

**Improvement at a thousand guests: 411 MB less committed memory, 47.6%.** Against the
M3e baseline of 911 MB it is 448 MB, 49.2%. Resident memory falls from 1.79 GB to
1.37 GB, 23%.

## Strict mode

`PTHREAD_POOL_SIZE_STRICT` defaults to 1, which warns on exhaustion only when
assertions are on. At `-O3` they are off, so the shipped binary cannot report
exhaustion at all: today's failure is completely silent. Level 2 makes
`pthread_create` return `EAGAIN`, which `std::thread` turns into an uncaught
`std::system_error`.

Both were built and run:

| Build | Result |
|---|---|
| pool 16, strict 2 | park loads normally, proving demand fits inside 16 |
| pool 8, strict 2 | immediate visible abort, page still responsive and reporting |
| pool 8, strict 1 (default) | silent wedge, no frames, no recovery |

Production keeps the default of 1: it leaves the growth path available for any
thread creation that does happen to yield, and with margin it should never be reached.
**A continuous-integration build should set 2**, where it is a precise assertion that
thread demand has not grown past the pool. That turns a future regression into a test
failure instead of a wedged page in a player's browser.

## Consequences

* Committed memory per tab at a thousand guests falls from about 864 MB to about
  453 MB, and startup is 380 ms shorter.
* The browser build diverges from upstream in one function, `JobPool`'s constructor,
  guarded by `__EMSCRIPTEN__`. Desktop behaviour is unchanged.
* The pool no longer has to be guessed against the player's core count. A machine
  reporting 8 cores was exercised directly: WebKit in the cross-browser smoke test
  reports `hardwareConcurrency` of 8 and runs correctly on the same pool of 16, where
  the uncapped build would have needed 19.
* Four job threads is a measured-adequate number, not a tuned one. If a future
  workload does saturate paint, raise the cap **and** the pool together, keeping the
  pool at least `2 × cap + 4`.

## What was not chosen

* **Keep upstream.** Rejected: it costs 411 MB per tab for no measured benefit, and it
  does not actually fix the deadlock, it only hides it on machines with few enough
  cores.
* **A small pool without the cap.** Rejected: every size below 44 deadlocks on park
  load on this machine, and the safe value varies with the player's hardware.
* **Pool 12 with the cap.** Rejected for margin. It saves a further 14 MB and sits on
  the measured demand ceiling, with pool 8 deadlocking one step below.
* **More profiling.** Rejected: the question was answered, and the remaining memory is
  no longer dominated by workers. At 453 MB private dirty with 16 workers, most of what
  is left is the wasm heap and the browser itself, which is a different investigation.

## Reproducing

```
wasm/scripts/bench-workers.sh 120 32 16 12 8 4 2
wasm/scripts/bench-workers.sh --strict 2 -- 16 8
wasm/test/workerbench.js .cache/bench-workers/pool16
wasm/test/hangprobe.js .cache/bench-workers/pool8
wasm/test/renderstress.js .cache/bench-workers/pool16
.cache/venv/bin/python wasm/test/worker-table.py
```

Raw results in `wasm/test/results-workers/`. Hosting requirements for the pthread
build are in `docs/browser-hosting.md`.
