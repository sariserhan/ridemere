# How the browser worker pool actually behaves

Read from the sources rather than inferred from the flag names: Emscripten 5.0.0's
`src/lib/libpthread.js` and `src/settings.js` in `ghcr.io/openrct2/openrct2-build:26-emscripten`,
and the engine's own `core/JobPool.cpp`, `core/BackgroundWorker.hpp` and
`interface/Viewport.cpp`.

The short version: **`PTHREAD_POOL_SIZE` sets how many workers are created up front,
not how many can exist.** Steady-state worker count is decided by the engine's peak
concurrent thread demand, and once a worker exists it is never destroyed.

## `PTHREAD_POOL_SIZE`

Allocates that many Workers during startup. With `PTHREAD_POOL_DELAY_LOAD` at its
default of 0 — this build does not set it — the runtime waits for the whole pool to
finish loading before `main()` runs, so the pool size is paid directly in boot time.

## Creating a thread when the pool is empty

`pthread_create` reaches `PThread.getNewWorker()`. If `unusedWorkers` is empty:

```js
PThread.allocateUnusedWorker();
PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0]);
```

A new Worker is constructed on the spot and sent the already-compiled
`WebAssembly.Module` and the shared memory. `spawnThread` then posts `{cmd:'run'}` to
it immediately. Both messages sit in that worker's own message queue, and a worker has
its own event loop, so it can load and start running without the main thread returning
to its event loop.

**So the pool grows on demand, without limit, and a pool smaller than demand is a
startup optimisation question rather than a capacity question.**

## `PTHREAD_POOL_SIZE_STRICT`

Its default is **1**, and this build does not set it. The three values:

| Value | Behaviour |
|---|---|
| 0 | grow silently |
| 1 (default) | grow, and print a warning — but only if `ASSERTIONS` is on |
| 2 | do not grow; `pthread_create` returns `EAGAIN` |

The warning at level 1 is inside `#if ASSERTIONS`, and `-O3` turns assertions off. The
shipped binary contains no "thread pool is exhausted" string, which `bench-workers.sh`
checks and records per build. **In the release browser build, exhaustion at the default
setting is completely silent.**

Level 2 is a different proposition. `getNewWorker` returns nothing, `spawnThread`
returns `EAGAIN`, and `pthread_create` fails. `std::thread`'s constructor turns that
into a thrown `std::system_error`, and neither `JobPool`'s constructor nor
`BackgroundWorker`'s catches it.

## Workers are never released

When a pthread exits, `returnWorkerToPool` pushes its Worker back onto
`unusedWorkers`, with the comment: *"worker is intentionally not terminated so the pool
can dynamically grow."* No code path terminates a worker except full runtime teardown.

The consequence is the one that decides this milestone: **the live worker count is the
high-water mark of concurrent pthreads, and it never falls.** A short-lived pool of
twenty threads during object loading leaves twenty workers behind for the rest of the
session, even though nineteen of them are idle forever.

## What the engine asks for

| Creator | Threads | Lifetime |
|---|---|---|
| `JobPool` | `min(maxThreads, hardware_concurrency)`, default `maxThreads` 255 | created in the constructor, joined in the destructor |
| Viewport paint (`Viewport.cpp:912`) | `hardware_concurrency` | created on the first painted frame, lives for the session |
| `PreloaderScene::_jobs` | `hardware_concurrency` | lives as long as the preloader scene |
| `ObjectManager::LoadObjects` | `hardware_concurrency` | local, destroyed after loading |
| `FileIndex` scan | `hardware_concurrency` | local, destroyed after scanning |
| `BackgroundWorker` | `min(hardware_concurrency, 2)` | created with the context, lives for the session |

`hardware_concurrency` in a browser is `navigator.hardwareConcurrency`.

Two things follow. First, **worker demand scales with the machine's core count, not
with the workload**: a thousand guests do not create a thread, and neither does a
zoomed-out view, because `JobPool` queues work onto a fixed set of threads. Second,
**peak demand is a transient during loading**, where a scene pool, an object-loading
pool and the paint pool can overlap, and that transient sets the permanent worker count.

## The theoretical deadlock, and where it is reachable

`JobPool`'s constructor creates its threads, and `Join()` then blocks the calling
thread on a condition variable. On the main browser thread that is `Atomics.wait`,
which blocks completely.

That is safe for threads created **on** the main thread, because the worker loads
independently, as above. It is not obviously safe for `pthread_create` called **from a
worker**: that request is proxied to the main thread, and a main thread sitting in
`Atomics.wait` will not service the proxy queue. A nested pool — a `JobPool` task that
itself constructs a `JobPool` — is the shape that would hang. The engine's job bodies
(`ViewportFillColumn`, object loading, file scanning) do not construct pools, so the
shape does not occur today. It is worth stating plainly because it is one refactor away
from occurring, and because it would not show up as a crash.

## What the measurements showed

Everything above was then tested on a running park, on a 20-core machine, by building
one distribution per pool size and loading Sunrise Test Park in each.

| `PTHREAD_POOL_SIZE` | 2 | 4 | 8 | 16 | 32 | 36 | 40 | 42 | 44 | 48 | 64 | 120 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Park loads | no | no | no | no | no | no | no | no | yes | yes | yes | yes |

The failure is a deadlock, not slowness. The page stops producing animation frames, a
trivial script evaluation never returns, and worker creation freezes at the prewarmed
count for as long as it is watched. The debugger can still pause the page, so the main
thread is spinning in a wait rather than parked in `Atomics.wait`, which matches
`JobPool::Join` on the browser main thread.

The threshold of 43 to 44 is about twice `hardware_concurrency`, which is what the
table of thread creators predicts: a pool sized to the machine is constructed while
another is still alive. Disabling the engine's own multithreading setting does not
help, because the object-loading pool is created regardless.

With `JobPool` capped to four threads in the browser build, demand stops depending on
the machine:

| Capped, `PTHREAD_POOL_SIZE` | 8 | 12 | 16 |
|---|---|---|---|
| Park loads | no | yes | yes |

Peak demand is then 9 to 12 workers. A build with `PTHREAD_POOL_SIZE_STRICT=2` and a
pool of 16 loads the park normally, which is a positive proof that demand fits; the
same build with a pool of 8 aborts immediately and visibly instead of wedging.

## Consequences for configuration

1. Lowering `PTHREAD_POOL_SIZE` below peak demand does not lower the worker count. It
   moves worker creation from startup to the first time each is needed.
2. Raising it above peak demand pins that many workers forever, whether used or not.
3. The value that costs nothing and wastes nothing is therefore *peak concurrent
   thread demand*, which is a function of `navigator.hardwareConcurrency`.
4. `PTHREAD_POOL_SIZE_STRICT=2` converts exhaustion into an uncaught exception, so it
   is only safe with a pool at or above peak demand. That makes it a poor production
   setting but an exact **regression guard**: in a continuous-integration build it
   turns any future growth in thread demand into a test failure rather than a wedged
   page in a player's browser.
5. Because demand scales with the player's core count unless it is capped, no single
   build-time pool size is safe for every machine. Capping `JobPool` is what makes one
   value correct everywhere. See `docs/adr-browser-memory.md`.
