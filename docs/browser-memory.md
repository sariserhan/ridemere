# Browser threading, memory and payload

Two questions: what upstream's Emscripten build costs at runtime, and what it would
cost configured differently. Upstream's configuration is unchanged in the fork; the
variants below are build-flag experiments only.

## Upstream's configuration (`scripts/build-emscripten`, commit d99eb5dcf7)

| Setting | Value | Origin |
|---|---|---|
| `-pthread` | on | first Emscripten CI commit `4f1e92dbf8` (2025-01-18) |
| `PTHREAD_POOL_SIZE` | 120 | same commit; no rationale recorded in any commit or PR |
| `PTHREAD_POOL_DELAY_LOAD` | default (false) — the pool is created eagerly | Emscripten default |
| `INITIAL_MEMORY` | 2 GB `SharedArrayBuffer` | first CI commit |
| `MAXIMUM_MEMORY` / growth | 4 GB / on | first CI commit |
| `STACK_SIZE` | 8 MB; pthread stacks inherit it | `f8865469cb` (#24840) raised 64 KB → 8 MB |

So 120 workers and 2 GB are **build-time choices, not measured requirements**: generous
ceilings so an off-the-shelf pthread application never hits `EAGAIN` or an early heap
growth.

## What the engine actually asks for

Thread creators, with network and HTTP compiled out of the browser build:

| Site | Threads | When |
|---|---|---|
| `core/JobPool` (`min(255, hardware_concurrency)`) | up to `hardware_concurrency` per pool | viewport paint (`Viewport.cpp:912`), object loading, file indexing, preloader |
| `core/BackgroundWorker` | one pool | park and scenario preview loading |
| `core/FileWatcher` | 1 | plugin directory watching |

In the browser `hardware_concurrency` is `navigator.hardwareConcurrency`, 20 on the
test machine.

## Measured (Chromium headless, standalone build, title scene)

Per-process `/proc/<pid>/smaps_rollup` across all Chrome processes, via
`wasm/test/bench.js`. Idle was 790 MB RSS / 83 MB private dirty in every run.

| Build | Boot to title | Live workers | Running RSS | Running PSS | **Private dirty** | Title FPS |
|---|---:|---:|---:|---:|---:|---:|
| Upstream: pool 120, 2 GB heap, 8 MB stacks | 1226 ms | 120 | 1850 MB | 1255 MB | **941 MB** | 60 |
| pool 4, 512 MB heap, 1 MB stacks | 749 ms | 23 | 1371 MB | 775 MB | **461 MB** | 60 |
| pool 8, 512 MB heap, 1 MB stacks | 756 ms | 23 | 1369 MB | 776 MB | **462 MB** | 60 |
| pool 16, 512 MB heap, 1 MB stacks | 813 ms | 23 | 1372 MB | 775 MB | **461 MB** | 60 |

Reproduce with `wasm/scripts/bench-threads.sh 4 8 16` then `wasm/test/bench.js <dir>`.

### What this shows

1. **Committed memory roughly halves**, 941 MB → 461 MB, and boot time drops 39%.
2. **Pool size is not the lever.** 4, 8 and 16 are indistinguishable, and all three
   end up with 23 live workers: the pool only *prewarms*, and the engine creates the
   threads it needs on demand regardless. The savings come from the 2 GB → 512 MB
   initial heap and the 8 MB → 1 MB pthread stacks (120 × 8 MB of stack address space
   is what the large figure was mostly made of).
3. **No frame-rate cost** at the title scene: 60 FPS in every configuration.

### Honest limits of this benchmark

* Three flags changed together in the variants, so the table isolates pool size
  (rows 2–4 differ only in that) but not heap size versus stack size.
* The title scene is a light workload. Paint parallelism matters with a full park,
  and no park exists yet in the standalone build, so the FPS column proves only that
  nothing regressed at idle.
* A small pool with `PTHREAD_POOL_SIZE_STRICT` at its default is a correctness risk:
  `JobPool` creates threads and then blocks on them, which can fail rather than
  deadlock if the pool is exhausted and the main thread cannot return to the event
  loop. Nothing failed here, but this must be exercised under a loaded park.

### Recommendation for the ADR

Keep pthreads. Move `INITIAL_MEMORY` to 512 MB and `DEFAULT_PTHREAD_STACK_SIZE` to
1 MB, and set `PTHREAD_POOL_SIZE` to roughly `hardware_concurrency`, which costs
nothing and prewarms the threads actually used. Expected saving about 480 MB of
committed memory per tab and about 400 ms of startup. **Do not change the defaults
until the same measurement has been repeated on a park with rides and guests**, since
that is the only workload where paint parallelism and pool exhaustion can show up.

## Payload

Standalone distribution (`engine/openrct2/build/www-standalone`), measured after a
build:

| File | Raw | Gzip |
|---|---:|---:|
| `openrct2.zip` (engine, what the launcher fetches) | 4.04 MB | 3.95 MB |
| `assets.zip` (all game content) | 5.07 MB | 5.00 MB |
| `jszip.min.js` (vendored, no CDN dependency) | 98 KB | 28 KB |
| `index.html` + `index.js` | 9 KB | 3 KB |
| **First load total** | **9.2 MB** | |
| Repeat visit | 4.04 MB | content is served from IndexedDB |

`openrct2.wasm` alone is 15.3 MB raw, 3.96 MB gzipped, and is delivered inside
`openrct2.zip`.

Content breakdown inside `assets.zip` (compressed):

| Group | Compressed | Raw |
|---|---:|---:|
| `tracks.dat` (track design previews) | 3.18 MB | 6.65 MB |
| `language` (40+ translations) | 1.25 MB | 4.65 MB |
| `object` (our 4 objects) | 0.44 MB | 0.57 MB |
| `standalone` (base sprite archive) | 0.05 MB | 2.34 MB |
| `g2.dat`, `fonts.dat`, `palettes.dat`, shaders, patches | 0.10 MB | 0.35 MB |

### Against the upstream browser build

| | Upstream | Standalone |
|---|---:|---:|
| Content archive | 71.7 MB | 5.07 MB |
| First load | ~75.8 MB | 9.2 MB |
| Needs the player's own original game data | yes | **no** |

The reduction comes from dropping what the standalone build does not ship: music
objects (32.2 MB), the sound and music asset packs (14.6 MB), the community title
sequence (8.8 MB), original-game ride objects (5.3 MB) and scenario previews
(3.2 MB). The base sprite archive compresses to almost nothing because it is
currently 29,294 copies of one marker tile; it will grow as real art fills it.

Two easy further reductions, not taken: ship one or two languages instead of all
(−1.2 MB) and drop `tracks.dat` until track designs exist (−3.2 MB). That would put
first load near 5 MB.
