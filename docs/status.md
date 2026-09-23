# Status

## M0, upstream browser verification: **PARTIAL** (2026-09-22)

Everything that can be verified without proprietary RCT2 data passes. The gameplay half of M0 (load a park,
simulate, build, input, audio, save) is blocked on one input: a legally owned RCT2 installation, which is not
present on the build machine. Nothing else is blocking.

### Evidence

| Criterion | Result | Evidence |
|---|---|---|
| Current OpenRCT2 commit compiles under Emscripten | PASS | `d99eb5dcf7` (develop, 2026-09-22, v0.5.5+98) built in `ghcr.io/openrct2/openrct2-build:26-emscripten`, Emscripten 5.0.0. Clean build 3 m 07 s wall / 38 m CPU on 20 cores. Incremental rebuild 59 s (23 objects recompiled). |
| Reproducible from documented commands | PASS | `wasm/scripts/build.sh` + `wasm/scripts/build-assets.sh`, both container/URL-pinned, sha256-checked packs. See `docs/wasm.md`. |
| WASM loads in Chrome | PASS | Playwright + Chromium (channel `chromium`, headless): `crossOriginIsolated=true`, module instantiated, `GetVersion()` returns `OpenRCT2, v0.5.5-98 (d99eb5dcf7 on develop)`, 120 pthread workers spawned. |
| Engine enters runtime far enough to show viability | PASS (to the RCT2 gate) | IDBFS mounted at `/persistent`, `/RCT`, `/OpenRCT2`; `assets.zip` (71.7 MB) extracted into `/OpenRCT2` (`g2.dat` 172,683 B, `object/` present); launcher reaches the RCT2-import prompt in 1.8–2.3 s on localhost. `callMain` runs the engine to its RCT2 check. |
| Missing files produce understood behaviour | PASS | Without RCT2 data: `An RCT2 install directory must be specified! Please edit "game_path" in /persistent/config.ini.` then `main` returns. No crash. Without `assets.zip`: `FATAL Failed to open fallback language`, `main` returns. Both logged, both documented. |
| Browser refresh keeps data | PASS | Reload: `assets.zip` not re-requested, `/OpenRCT2/version` intact, prompt in 1.15 s. |
| Browser-specific patches documented | PASS | There are none. Upstream's own 48 `#ifdef __EMSCRIPTEN__` sites in 17 files are listed in `docs/wasm.md`. |
| No proprietary RCT2 files committed | PASS | None on the machine; `.gitignore` blocks `g1.dat`, `css*.dat`, `ch.dat`, `*.SC6/sv4/sv6`. |
| Upstream remains mergeable | PASS | `engine/openrct2` is an unmodified submodule of the fork at the upstream commit (`git status` clean). |
| License notices intact | PASS | `licence.txt`, `contributors.md` untouched and shipped inside `assets.zip`. `docs/licensing.md` written. |
| Gameplay: park loaded, simulation, construction, mouse/keyboard, speed controls, audio, save | **NOT RUN** | Requires RCT2 data. Procedure: zip your RCT2 folder so `Data/ch.dat` is at the zip root, open http://localhost:8080/, select the zip. |

### Measurements

| Metric | Value |
|---|---|
| `openrct2.wasm` | 15.31 MB raw, 3.95 MB gzip |
| `openrct2.js` | 293 KB raw, 64 KB gzip |
| `openrct2.zip` (what the launcher fetches) | 4.04 MB |
| `assets.zip` | 71.7 MB (82.4 MB / 2,785 files uncompressed); largest: fairground music object 19.6 MB, title sequence 8.7 MB, OpenMusic 10.7 MB, `tracks.dat` 6.6 MB |
| First-visit payload | ≈ 75.8 MB (+ JSZip 29 KB from jsdelivr) |
| Repeat-visit payload | 4.04 MB (`openrct2.zip` is re-fetched; assets come from IndexedDB) |
| Time to launcher prompt, localhost, fresh / reload | 1.8–2.3 s / 1.15 s |
| Chrome RSS, all processes: idle → at prompt → engine started (no RCT2 data) | 792 MB → 1,735 MB → 1,731 MB |
| WASM linear memory | 2 GB `SharedArrayBuffer` reserved at start (`INITIAL_MEMORY=2GB`, max 4 GB) |
| Worker threads | 120 (`PTHREAD_POOL_SIZE=120`) |
| FPS / tick time | not measurable until a park loads |

### Blockers

1. **RCT2 data for the gameplay test** (M0 items 6–9). Needs the user's files; nothing else.

### Not blockers, but decisions surfaced

- Upstream's browser build is **pthreads-based**, not single-threaded as the revised plan assumed. It works, but
  it forces COOP/COEP hosting and ~1 GB RSS at the prompt. Keep it (upstream parity) or build a single-threaded
  variant: needs the ADR the plan calls for, ideally informed by park benchmarks in M1.
- OpenGraphics is **GPL-3.0**, not CC. Using it for Stage A is fine, but its sprites cannot sit in a proprietary
  asset pack, and provenance must be tracked per asset.
- `assets.zip` is 72 MB with 20 MB in a single fairground-music object and 11 MB of OpenMusic. Splitting music out
  of the core payload is an easy early win (revised M3/M4), not an M0 change.

### Recommended next step (M1, playable characterization)

Run the gameplay checklist with RCT2 data in a headed Chrome against the served build, record FPS/tick time on
small/medium/large parks with the pthread build, verify audio autoplay behaviour on repeat visits, and verify
save (File System Access picker) and load. Then start the M2 audit per `docs/asset-dependencies.md`.

---

## M2, asset/dependency feasibility audit: **DONE, verdict CONDITIONAL GO** (2026-09-23)

Baseline unchanged: `engine/openrct2` at `d99eb5dcf7`. M0 gameplay/performance checks remain pending solely
because no legally owned RCT2 files are available in this environment; when they are, run them against this
baseline rather than restarting M0.

Full report: `docs/standalone-feasibility.md`. Inventory: `docs/asset-dependencies.md`. Companion audits:
`content-reduction.md`, `open-graphics-coverage.md`, `audio-content-status.md`, `browser-memory.md`.
Regenerable data: `tools/asset-audit/{sprite_refs.py,object_refs.py}` → `tools/asset-audit/out/`.
Experiment: `tools/asset-audit/experiment-blank-g1/` (engine boots with a stub base sprite table and no RCT2
objects; opaque red marker table shows what still draws from g1).

Key numbers: 13,964 engine-addressed g1 indices (13,129 coaster track, ≈ 835 other); 9,737 via objects
(7,679 peeps); 2,233 of 2,505 objects need RCT data; 4 complete open coasters; 29/67 sounds and 11/30 music
styles open; OpenGraphics 82 sprites. Minimal V1 needs ≈ 4,000–4,600 new sprites and five small engine
changes. Recommended next: M3 Stage A vertical slice, starting with the guest prototype.

Housekeeping: two unneeded build-container images were removed to recover disk (root was at 99%); the
Emscripten image and the engine build remain. `wasm/scripts/build.sh` now preserves `assets.zip` across rebuilds.

---

## M3, Stage A standalone vertical slice: **PARTIAL** (2026-09-23)

The half of M3 that the milestone existed to de-risk passes: the browser build runs
with **no RollerCoaster Tycoon data present and never asks for any**, and the
original guest and staff art pipeline works end to end and is fully automated. The
half that needs a playable park does not: there is no scenario, no ride and no
in-game proof of guests walking, because the object types that a park requires are
not authored yet and one of them is blocked by the engine.

Engine baseline: fork branch `standalone-m3` off `d99eb5dcf7`, 6 files changed
(48 insertions), plus a new `src/openrct2/standalone/` directory.

### Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Launches with no original-game files available | **PASS** — verified in a clean browser profile, `wasm/test/run-m3-tests.sh` |
| 2 | No import prompt appears | **PASS** — the prompt no longer exists in the standalone launcher and the engine never looks for a game path |
| 3 | Original/open title scene loads | **PARTIAL** — the title scene runs on open data (logo, fonts, window chrome); there is no title park, so the backdrop is empty and marked with diagnostic sprites |
| 4 | Original scenario loads | **FAIL** — not built |
| 5 | Original guest appears and animates | **PARTIAL** — the object is built, validated and indexed by the engine; not yet rendered in a park |
| 6 | Original handyman performs tasks | **PARTIAL** — same |
| 7 | One original flat ride usable | **FAIL** — not built |
| 8 | One clean open coaster usable | **FAIL** — not built |
| 9 | Paths/terrain/scenery render | **PARTIAL** — two terrain surfaces built and validated; no paths or scenery |
| 10 | Guests navigate, queue, ride | **FAIL** |
| 11 | Simulation advances | **NOT RUN** — needs a park |
| 12 | Supported audio works | **NOT RUN** — no audio object built |
| 13/14 | Park saves and reloads | **NOT RUN** — needs a park |
| 15 | Unsupported content hidden | **PASS by construction** — ride lists and research are driven by installed objects, and none are installed |
| 16 | Sprite audit finds nothing unexplained | **PARTIAL** — instrumentation is armed and working; the report could not be read headlessly (see below) |
| 17 | No original-game files in the runtime bundle | **PASS** — asserted by a test |
| 18 | Licensing manifest exists | **PASS** — `assets/manifests/provenance.json`, 13 assets, generator fails on any undeclared file |
| 19 | Memory/thread comparison documented | **PASS** — `docs/browser-memory.md` |
| 20 | Bundle size documented | **PASS** — same file |

### What was built

* **Guest**: 293 sprites, 26 required animations, 33 animation groups, from a
  procedural Blender figure. RCT2's guest is 4,741 sprites, so this is a 16×
  reduction with no loss of engine compatibility.
* **Handyman**: 133 sprites, 8 animations including sweeping, mowing, watering and
  emptying bins.
* **Terrain**: two surfaces, 58 images each, matching the engine's 1 + 19×3 layout
  and reproducing the documented sprite geometry within a pixel.
* **Base sprite archive**: all 29,294 entries, currently one opaque diagnostic
  marker, regenerated in about a second.
* **Standalone content mode** in the engine, plus a sprite audit that records which
  unfilled base entries the running game asks for.
* Full render-to-object automation, an object validator, a provenance manifest
  generator and a four-part test suite.

### Blockers found

1. **Station objects are identifier-whitelisted.** `StationObject::ReadJson` throws
   "Unknown station style" unless the id is in `kAllowedStationIDs`
   (`StationObject.cpp:20-155`), all of which are `rct2.station.*`. An original
   station needs a sixth engine change. This was not in the M2 audit.
2. **The in-game console cannot be driven headlessly.** Synthetic key events from the
   browser automation do not reach SDL, so `sprite_audit write` could not be run and
   the report could not be read back. The instrumentation itself is confirmed working
   by its start-up log line and by the markers visible on screen. Reading the report
   currently needs an interactive session.
3. **Creating a park without the original game needs authoring tools we do not have.**
   A scenario file can only come from the scenario editor or from engine code, and the
   editor needs footpath, entrance and station objects that are not built yet.

### Next step

Author the remaining object types needed for a playable park — footpath surface and
railings, park entrance, water, peep names, climate — decide how to handle the station
whitelist, then generate a scenario and re-run the gameplay half of this milestone.

---

## Checkpoint (2026-09-23)

The M0-M3 work is committed locally and nothing is pushed. Return to this state
with `git checkout <hash>` plus `git submodule update --init`.

| Commit | Contents |
|---|---|
| `7da0cd7` | M0: reproducible WebAssembly build of upstream OpenRCT2 |
| `331b117` | M2: measure what a standalone build would have to replace |
| `c3fa1a1` | M3: original art pipeline and a browser build that needs no original game |

The engine submodule is at `ba21f46106` on branch `m3b-playable`, one commit
ahead of upstream `d99eb5dcf7` ("Add standalone content mode and base sprite
auditing"). M3b work continues on root branch `m3b`.

---

## M3b, playable standalone park: **PARTIAL** (2026-09-23)

One purpose: a playable park in the browser with zero original-game data. The
infrastructure for that now exists end to end and a park does load, simulate, spawn
guests and save. It is not yet *playable*, because of two defects described below.

Engine: fork branch `m3b-playable`, 3 commits ahead of upstream `d99eb5dcf7`.

### What works

| Criterion | Result |
|---|---|
| 1-4 Clean profile, no original-game data, no prompt, standalone title loads | **PASS**, asserted by `wasm/test/run-m3-tests.sh` |
| 5 Sunrise Test Park loads | **PASS**, loaded by name with its cash and open state |
| 17 Simulation stable | **PASS**, ~2,450 ticks with no crash |
| 10 Guests spawn | **PASS**, guest entities appear from the peep spawn |
| 18-19 Save and reload | **PASS**, the engine's writer produces a 2.7 KB park that reads back |
| 20 Sprite audit readable | **PASS**, 12 unexpected base indices during gameplay, read through an export |
| 21 No original-game data in the distribution | **PASS**, asserted by a test |
| 22 Licensing and provenance | **PASS**, 21 declared assets, generator fails on any undeclared file |
| 24 Payload recorded | **PASS**, below |

### What does not work

**Guests do not enter the park.** They spawn and stay in the `enteringPark` state
indefinitely; none reach `walking`, so criteria 11-16 (navigate, queue, board, ride,
unload, staff tasks) cannot be reached. The park has an entrance and 35 path tiles,
both placed successfully by game actions, so the likely cause is the entrance
orientation or the path's connection to it rather than anything missing.

**Object-supplied images render as unrelated sprites.** With the content pack
active, terrain draws the base archive's diagnostic marker and footpath tiles draw
interface graphics such as the Options button; the toolbar itself is also affected.
The art is correct on disk (verified: the grass tile is 64x32 and uses palette
indices 77-81, the engine's green ramp), and the objects validate, so this is an
image-index problem at load time, not an art problem. The tell is that the wrong
sprites follow the exact diagonals of the two path runs, and that the substituted
sprites come from the `g2` interface range, which suggests object image allocation
is landing near the interface table instead of the image list. Ruled out during
investigation: palette compaction by the PNG writer, wrong colour ramps (a real bug,
found and fixed), and empty `images` arrays on the text-only objects.

**No ride.** Not attempted once guests could not walk; a ride would not have been
exercisable.

**Memory was not re-measured under gameplay.** The M3 figures stand.

### Engine changes since M3

| File | Purpose |
|---|---|
| `object/StationObject.cpp` | Accept station styles a content pack declares, alongside the upstream list |
| `standalone/StandaloneContent.{h,cpp}` | Parse and expose declared station styles |
| `standalone/SpriteAudit.{h,cpp}` | JSON report, ignorable ranges, clearable counters |
| `standalone/StandaloneParkBuilder.{h,cpp}` | Build a park from a JSON description with ordinary game actions and the engine's writer; development entry points for building, loading, saving, stats and the audit |
| `wasm/scripts/build.sh` | Relink with those entry points exported |

### The station whitelist

Upstream added `kAllowedStationIDs` in `95fbd1f6c8`, "Add station style whitelist to
prepare for split", with the changelog entry "Limit creation of new station styles to
prepare for more flexibility with ride stations and entrances". It is a
forward-compatibility freeze, not a technical or security constraint: the list is an
inventory of styles that already existed, including third-party ones, and the station
object currently bundles platform, entrance, exit and shelter art that upstream plans
to separate. Freezing the set lets them migrate every style deterministically.

The fix keeps that intact. Upstream's list is still enforced; a standalone content
pack may additionally declare its own styles in its manifest, because it ships and
migrates its own content. Anything neither known upstream nor declared is rejected.

### Payload

First load 24.9 MB: engine 4.05 MB, content 5.12 MB, JSZip 98 KB, launcher 9 KB,
with `openrct2.wasm` 15.3 MB delivered inside `openrct2.zip`. Content breakdown:
track previews 3.18 MB, languages 1.25 MB, our objects 0.49 MB, base sprite archive
0.05 MB, other engine data 0.11 MB.

### Next step

Fix the object image indexing, then the entrance connection. Both are needed before
any ride work is meaningful.
