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

---

## M3c, standalone runtime debugging: **PARTIAL** (2026-09-23)

Defect A is resolved, and its real cause was not what the symptom suggested. Defect B
is not resolved. No ride work was started, per the milestone's own gate.

### Defect A: root cause and fix

**It was never an image-indexing problem.** Runtime tracing showed the image chain is
correct end to end:

| Object | Base image | Images | What the engine finds at the base |
|---|---:|---:|---|
| `sunrise.terrain_surface.grass` | 109875 | 58 | 64x32 sprite, present |
| `sunrise.footpath_surface.paved` | 109713 | 52 | 64x32 at (-32, 0), present |
| `sunrise.park_entrance.arch` | 109701 | 12 | 30x46, present |
| `sunrise.peep_animations.guest` | 110066 | 293 | 8x22 at (-4, -21), present |

All sit inside the image list (109610 onwards), well clear of the base archive
(0..29293) and the interface sprites (29357 onwards). Tracing a tile confirmed the
renderer is handed the right number: tile (16,10) resolves to surface style 0,
`sunrise.terrain_surface.grass`, entry base 109876, drawn index 109876, a present
64x32 sprite.

The same trace showed the real fault: **no tile had a path element**, although the
generator reported 35 placed. `GameActions::Execute` called from outside the game
update loop takes the branch at `GameActionRunner.cpp` `ExecuteInternal` that
**queues the action for the next tick and returns the query result**, which is
success. The generator saved the park immediately afterwards, so every placement was
reported as done and none was applied.

Fix: the generator uses `GameActions::ExecuteNested`, which applies immediately.
Paths now exist with correct connectivity (edges 10 along the run, 15 at the
junction) and the entrance occupies its three tiles.

What looked like wrong sprites was therefore an almost-empty park seen with an
off-map camera, over a base archive of opaque markers, with interface widgets
smearing because nothing repaints the void. Setting the base markers transparent for
one diagnostic run made that plain: the magenta vanished and only the smears and the
map's far corner remained.

### Defect B: not resolved

Guests spawn and stay in `enteringPark`. Verified by tile trace: the spawn tile, the
approach path, the three entrance tiles and the interior path all exist with the
expected ownership and connectivity. Two hypotheses were tested and rejected:
entrance orientation (direction 1 versus 3) and the approach path being on owned
land, which the generator can now leave unowned via an `owned` rectangle in the
scenario description.

### Also unresolved

The saved view is not honoured on load: the generator writes a centre computed from
the map, and after loading the game reports `savedViewY = -1001` regardless, leaving
the camera above the map. Cosmetic, but it is why nothing looks right in a
screenshot.

### Diagnostic API added

`SunriseObjectDebugJson(identifier)` returns an object's type, entry index, image
count, base image id, the image-list and interface bounds, and the dimensions of the
first images as the engine sees them. `SunriseTileDebugJson(x, y)` returns a tile's
surface and edge style, ownership, slope, the image the surface object would draw and
whether it is present, plus any path element's surface and railings indices, queue
flag, descriptor image and edge connectivity. Both are development entry points and
are how Defect A was found.

### Next step

Defect B needs the guest-side view that this milestone did not get to: the guest's
destination tile and the entering-park transition's own checks, rather than the map
topology alone. A `SunriseGuestDebugJson` reporting a guest's state, position,
destination and current action would answer it the way the tile trace answered
Defect A.

---

## M3d, guest entry debugging: **PASS** for its own criteria (2026-09-24)

Guests now enter the park and walk it, the handyman patrols, and the camera shows the
park. No ride was attempted, so the project stays at CONDITIONAL GO by the
milestone's own rule.

### The entering-park transition, from source

A guest leaves `PeepState::enteringPark` in `Guest::updateEnteringPark`
(`entity/Guest.cpp:5745`) only when **`var37 == 1`** and its walk action has finished.
`var37` becomes 1 in `PeepInteractWithEntrance` (`entity/Peep.cpp:1541`), which
requires all of:

1. the guest steps onto a tile holding a park-entrance element;
2. that element is the **centre** of the three (`getSequenceIndex()`);
3. the guest's `peepDirection` **equals** the entrance's direction (the reverse means
   leaving, anything else turns it around);
4. the guest is in `enteringPark` state and the park is open;
5. the tile is registered in `park.entrances`;
6. a **non-queue** path sits directly behind the entrance, at
   `entrance + CoordsDirectionDelta[direction]`, with `baseHeight == entrance.z / 8`;
7. the entrance fee is affordable.

All seven held in the generated park, which is why inspection of the map never found
the fault.

### Root cause

The guest never moved at all. Its trace showed position fixed at (528, 48, 112) over
900 ticks, destination equal to its own position, and **`nextLoc` of (0, 0, 0)**.

`Park::GenerateGuest` places a guest at the spawn and sets its destination to that
tile's centre. The engine's own `PeepSpawnPlaceAction` stores a spawn **15 units from
the tile centre, at the tile edge**, along the spawn direction. The generator stored
the exact centre instead, so the guest was created standing on its own destination:
it had already arrived, never took a step, and therefore never ran the movement code
that assigns `nextLoc`. With `nextLoc` unset it could not choose a tile to walk to,
and nothing ever changed.

Fix: the generator stores the spawn with the same 15-unit edge offset the engine's own
action uses. Nothing about guests, pathfinding or state was special-cased.

### Result

Traced over 900 ticks: `var37` 0 to 1 at the entrance, state 13 to 5, `outsideOfPark`
false, position advancing tile by tile along the main path and turning at the
junction. Two guests in the park, both walking. A handyman hired through
`StaffHireNewAction` patrols the path network.

### Camera

Root cause: `PrepareMapForSave` calls `ViewportSetSavedView`, which overwrites
`gameState.savedView` from the main window's viewport just before the file is
written, and while the generator runs that viewport still belongs to the title scene.
A generated park therefore cannot carry a useful saved view. `SunriseCentreView`
centres the view after loading; the test calls it and the view reports (0, 384), the
park centre.

### Sprite audit: all 24 classified

| Index | Hits | Symbol | Verdict |
|---|---:|---|---|
| 3123 | 77,410 | `SPR_BLANK_TILE` | drawn under every map tile; correct content is nothing, so it is now authored as transparent |
| 5597..5633 | 58-232 each | `SPR_TOOLBAR_*` | in-game toolbar icons, about 18 of them |
| 5327, 5625 | 723, 232 | `SPR_TAB_FINANCES_RESEARCH_0`, `SPR_TAB_TOOLBAR` | window tab icons |
| 23190 | 723 | `SPR_WEATHER_SUN` | toolbar weather icon |
| 23197, 23198 | 723 each | `SPR_RATING_LOW`, `SPR_RATING_HIGH` | toolbar rating gauge |
| 22872 | 49 | near `SPR_BALLOON` | unidentified, low volume |

Authoring `SPR_BLANK_TILE` cut the audit from 82,844 hits to 5,425 and made the
terrain visible. Everything remaining is interface chrome: real base-game sprites we
have not authored, behaving exactly as the marker system intends. None is a defect.

### Caveats

* The world still shows markers wherever a base sprite is unauthored, which is the
  designed state of the content pack, not a fault.
* The saved view is worked around rather than stored.

## M3e — first complete ride loop (2026-09-24)

A guest enters Sunrise Test Park, walks to the coaster, queues, boards, rides a
complete circuit, unloads and walks on. Nothing in the chain touches RollerCoaster
Tycoon data.

### The ride

`openrct2.ride.hybrid_coaster` (CC-BY-4.0, Edward Calver), chosen because every sprite
it needs is inside its own `.parkobj`. Full audit in `docs/ride-dependencies.md`; there
is no blocker. The junior-coaster train object in the same repository is excluded
because its art is Chris Sawyer's.

The track is built by the scenario generator through ordinary game actions:
`RideCreateAction`, then `TrackPlaceAction` for each piece, then
`RideEntranceExitPlaceAction`, then `RideSetStatusAction` to open it. Nothing writes
park file internals. Piece-to-piece chaining follows the engine's own rule from
`TrackDesign.cpp`: apply the piece's offset rotated by the current direction, adjust z
by `zEnd - zBegin`, rotate the direction, then step one tile.

### Evidence

Observed from engine state by `wasm/test/rideloop.js`, not from the screen. One guest
of many:

```
guest 6  485 enteringPark -> 726 walking -> 1287 queuing -> 1692 queuingFront
      -> 2494 enteringRide -> 2577 onRide -> 3701 leavingRide -> 3861 walking
      -> 5306 queuing -> 6270 enteringRide -> 7555 onRide -> 8759 leavingRide
      -> 8840 walking
```

Over 8,900 ticks: 42 guests entered, 14 completed rides, peak queue 6, peak riders 8,
67 distinct train positions, peak train velocity 170,927. The park saved mid-operation
to 9,967 bytes and reloaded with the ride open, the queue intact and the simulation
resuming. The handyman visited 101 distinct positions across the path network.

### Sprite audit: zero

The audit reports no unfilled base entry being requested during the whole loop. Getting
there needed 38 authored interface sprites: the toolbar, two window tabs, the weather
icon, the rating gauge, and the thirteen `SPR_PEEP_SMALL_FACE_*` mood faces that the
guest counter draws every frame.

A caution worth recording: an earlier run also reported zero, and it was wrong. The
test harness left the mouse pointer at (0, 0), where the engine's edge scrolling drags
the camera off the map, so almost nothing was drawn and almost nothing was requested.
The same cause made every screenshot since M3b look like a corrupted renderer: the
camera scrolls a few pixels every frame, the scroll-and-patch path copies the screen
diagonally, and the result tiles the previous frame across the display. Parking the
cursor in the middle of the canvas produces a correct picture from the unmodified
engine. **A sprite audit is only as good as what was on screen while it ran.**

### Payload

First load is 6.23 MB, down from 9.2 MB, after two reductions: placeholder track-design
previews (3.18 MB to 15 KB) and English-only languages (1.25 MB to 46 KB). Breakdown in
`docs/browser-memory.md`. The coaster object is now 65% of the content download.

### Memory

`docs/adr-browser-memory.md`: adopt a 512 MB initial heap and 1 MB pthread stacks. The
measurement on a running park at 100, 500 and 1000 guests puts the saving at about
60 MB of committed memory, not the 480 MB an idle comparison had suggested. The worker
pool, not the heap reservation, is where browser memory goes, and reducing it needs its
own loaded-park measurement before adoption.

## M3f — browser worker-pool validation (2026-09-24)

The last infrastructure milestone before content production. It asked how small the
browser worker configuration can safely be, and found a deadlock that had been hiding
behind upstream's generous defaults.

### The defect

`PTHREAD_POOL_SIZE` only prewarms workers. When the pool empties, Emscripten builds a
new one, but it cannot start until the page returns to the JavaScript event loop.
`JobPool` creates `hardware_concurrency` threads in its constructor and then blocks in
`Join()` without yielding, and loading a park constructs one such pool while another is
still alive.

On a 20-core machine, every pool below 44 wedges the page while loading the park: no
animation frames, no input, worker creation frozen, no recovery. 44 and above work.
The threshold is about twice the core count, so **the safe value depends on the
player's machine while the setting is fixed at build time**. Upstream's 120 is not a
considered value; it is large enough to hide this up to roughly 58 cores.

### The fix

`JobPool` now caps itself to four threads in the browser build. Demand becomes
machine-independent at 9 to 12 workers, and a pool of 16 covers it with margin. The cap
costs nothing: at 2560×1440 with a thousand guests the uncapped build reaches 34 frames
per second and the capped build 35.

### Result

| | Before | After |
|---|---:|---:|
| Live workers | 120 | 16 |
| Private dirty, 1000 guests | 864 MB | 453 MB |
| Resident, 1000 guests | 1789 MB | 1374 MB |
| Boot | 1039 ms | 645 ms |
| Frames per second | 60 | 60 |
| Ticks per second | 40.1 | 39.9 |

Committed memory falls 411 MB, 47.6%, with no measured cost. Full decision and
evidence in `docs/adr-browser-memory.md`; the flag semantics, read from Emscripten's
own sources, in `docs/browser-worker-semantics.md`.

### Also established

* Cross-origin isolation is a hosting constraint on the whole product, not a build
  flag. `docs/browser-hosting.md` records the headers, the Vercel configuration, and
  what they forbid on the same document: third-party scripts, ads, cross-origin
  frames and popup authentication.
* Chromium 151, Firefox 153 and WebKit 26.5 all boot, isolate, spawn the pool, load
  the park and simulate. WebKit reports eight cores rather than twenty and runs on the
  same pool of sixteen, which is the cap doing its job.
* A measurement lesson worth keeping: the first render-stress stage changed the zoom
  level and reported no change in frame rate. The zoom was being set but the screen was
  not repainting, so the stage measured nothing. Resizing the canvas forces a full
  repaint and does show the workload: 60 frames per second at 1.0 and 2.1 megapixels,
  35 at 3.7. **A performance stage that shows no effect should be suspected of not
  having applied.**

## Correction: `tracks.dat` is the track artwork, not previews (2026-09-24)

M3e reduced the download by replacing `tracks.dat` with a placeholder archive of
transparent pixels, on the stated belief that it held track-design preview thumbnails.
It does not. It holds **the track artwork itself**: OpenRCT2 authored complete open
sprite sets for the coaster types it added and split them out of `g2.dat` into 8,685
PNGs under `resources/tracks`. `SPR_TRACKS_HYBRID_*` and its siblings resolve into that
file, and the coaster paint code addresses them directly.

The effect was that the hybrid coaster drew its train, its stations and its supports,
and no rails at all. First load dropped from 9.39 MB to 6.23 MB because the rails were
missing.

This is reverted. The real archive ships again, the pack builder and provenance record
what it is, `docs/browser-memory.md` is corrected, and the placeholder generator is
deleted. The retained M3e reduction is languages, 1.25 MB to 46 KB, which is sound.

### Why nothing caught it

* The **ride-loop test asserts engine state**, not pixels. The ride still dispatched,
  carried guests and completed circuits with no track art, so every assertion passed.
* The **sprite audit covers the base archive only**. `tracks.dat` is a separate sprite
  table with no instrumentation, so the audit read zero while a whole table was blank.
* The **screenshots were captured before the change** and not re-read afterwards.

### What to change because of it

1. Extend the sprite audit beyond the base archive, or at least arm it for
   `tracks.dat`, so a blank table is detectable.
2. Add a visual check to the suite: render a known park and compare against a reference,
   so a missing sprite table fails a test instead of passing one.
3. Treat a payload reduction as a change that requires visual evidence after the fact,
   not only programmatic evidence.

The general lesson, which is the same one M3e learned about the sprite audit and the
off-map camera, and M3f learned about the zoom stage that showed no effect: **a test
that passes tells you only what it looked at.** Three times now the instrument was
sound and its coverage was not.

## V1-0 — product shell and browser saves (2026-09-24)

The prototype is now a product a person can use twice. A Next.js shell hosts the game
on a cross-origin isolated route, parks save themselves to browser storage, and they
are still there after the browser is closed. No account, no file picker, no
original-game files.

Verified end to end in Chromium, Firefox and WebKit: 27 journey checks and 9
persistence checks in each.

### What was built

* `web/`, a Next.js application with TypeScript, Tailwind and shadcn/ui. `/` and
  `/parks` are ordinary pages; `/play` and `/game` carry the isolation headers and
  nothing else does.
* A save store with two backends. Chromium and Firefox use the Origin Private File
  System; WebKit has none in our test image and uses IndexedDB, which is why the
  fallback exists rather than being a hypothetical.
* Atomic writes with one recovery generation. A save writes a pending copy, reads it
  back, then promotes it, so a failed save can never destroy the last good park.
* A narrow typed bridge of eight messages, plus two new engine exports:
  `SunriseParkMetadataJson` and `SunriseCaptureThumbnail`.
* Autosave every 60 seconds, plus one shortly after a park opens, plus on exit.

### Three defects found, all of which had been passing tests

1. **Parks never actually loaded.** `callMain` returns as soon as the engine reaches
   the browser event loop, so loading a park immediately afterwards was silently undone
   by the rest of start-up. Every park was the engine's empty default, with a ticking
   clock and a plausible date. The shell now waits until the tick counter is observed
   to advance, and the test asserts the park's **name and ride count** instead of "a
   park loaded".
2. **A save could revert a rename.** Save and exit navigated as soon as the engine had
   serialised the park, so the record write could land after the player renamed it on
   the next screen. Reproducible in Firefox, invisible in Chromium. Fixed twice: the
   exit waits for the write, and the write re-reads the record so the player's name
   wins.
3. **`Imaging::WriteToFile` writes no file in the browser.** Upstream's Emscripten
   branch encodes the PNG and triggers a download instead, so it fails silently for
   every caller that wanted bytes. Now it writes the file on every platform.

### Two permanent guards added

* `check_track_art.py` inspects the shipped sprite table and fails if the entries are
  placeholders rather than art. Demonstrated to reject the exact M3e mistake.
* A visual smoke test renders a known park through the engine's own off-screen capture
  and asserts terrain, paths, track and structures are present. Demonstrated to fail on
  a deliberately blanked track table, which is the point: a smoke test that cannot fail
  is not protecting anything.

Both are in `run-m3-tests.sh`, which is now seven groups.

## V1-1 — interface reskin, phase 1 (2026-09-24)

The game reads as Ridemere rather than OpenRCT2, with the proven window system kept
intact. Nothing about how the interface behaves changed; what it is made of did.

`Ridemere` is a working product name. It lives in one file, `web/src/lib/product.ts`,
and in the shipped strings. Engine namespaces, object identifiers, standalone content
identifiers and repository history all keep the `sunrise` development prefix on purpose:
renaming the product must never mean renaming the content.

### What changed

| Layer | Before | After |
|---|---|---|
| Font | OpenRCT2's bevelled sprite font | ours, rendered from Liberation Sans into the same boxes, flat with a shadow |
| Window colours | the engine's stock blue | a warm theme covering all 70 window classes |
| Interface sprites | 46 authored | 108 authored, covering every sprite the normal path requests |
| Branding in `g2.dat` | the OpenRCT2 logo and wordmark | our own mark |
| Shipped strings | named the upstream project 41 times | named Ridemere |
| Product shell | stock shadcn slate | the same semantic palette and wordmark as the game |

The design system, including the constraints the engine imposes on any future font
choice, is in `docs/ui-design-system.md`.

### Font

The browser build compiles TrueType out, so every character is a sprite from a table of
1,023 entries in three styles. Glyphs are rendered into **exactly the boxes upstream
reserves**, read from the engine's own manifest, so no window can reflow or overflow.
Upstream draws a three-tone bevel; we draw flat letters with a one-pixel shadow. That
single change is most of why the game stops looking like OpenRCT2.

684 glyphs are ours. The 339 non-codepoint symbols upstream draws by hand, such as the
ellipsis, are kept as open art.

### Sprite audit

Zero, across eight windows opened in turn: rides, guests, staff, park, finances, map,
scenery and footpath. Getting there meant identifying and authoring 62 more base
sprites, every one named from the engine's own header rather than guessed: tab plates
and their selected state, fourteen tab symbols, seven window buttons, and the ride and
footpath construction controls.

A new development export, `SunriseOpenWindow`, opens a window through the same call the
toolbar uses. Clicking toolbar pixels from a test is brittle and silent when it misses.

### The language warning, fixed properly

Root cause: the configured language defaults to the host system's locale, which reports
`en-US`, and the pack ships only `en-GB`. The engine failed over and logged an error on
every start.

The content pack now declares the locales it contains, and the engine asks for one of
them. Standalone detection moved above the language open so the manifest is known
before a locale is chosen. The error is now a single informational line explaining the
substitution.

### Two guards added

* `check_visual_ui.py` measures a captured interface for window chrome, text detail and
  colour in the tab strip. Calibrated against a real capture and against a build with
  every interface sprite blanked, and proven by `blankui-check.sh` to fail on the
  second. The discriminating measure is the tab strip: window fills and text are drawn
  by the engine from theme colours and survive even when every sprite is blank.
* The park smoke test and the track-art check from V1-0 are unchanged and still pass.

## V1-2 — core world art (2026-09-24)

The park world reads as a coherent original game rather than a functional prototype.
Four terrain materials, a complete terrain edge family, three path styles, a queue and
one railing family, all generated and all reproducible.

The black boundary is gone. Where land is cut, whether at the map edge or around a
raised plateau, a warm soil and rock face is drawn on every side, including inside and
outside corners.

### What shipped

| | Count | Notes |
|---|---:|---|
| Terrain surfaces | 4 | grass, dirt, sand, stone; 58 images each |
| Terrain edge family | 1 | 85 images, used beneath all four surfaces |
| Path surfaces | 3 | paved, stone, wood; 52 images each |
| Queue surface | 1 | 52 images |
| Railings and supports | 1 | 74 images, edging, columns and bridge deck |

### Three things worth remembering

1. **A material's base value is what makes it read.** The shared geometry render
   supplies brightness, so without a per-material shift along its ramp every surface
   comes out at whatever value the render happened to have. Stone looked like snow
   until that shift existed.
2. **Path edge bits are numbered from the screen's lower right.** Getting that wrong
   draws the kerb across the walkway instead of along it, so every straight path had a
   rung on each tile.
3. **A regular pattern at this size reads as corduroy.** Offsetting alternate rows by
   half a cell is what turned the first grass from fabric into ground.

### The engine's layouts, read rather than guessed

* Terrain surface: icon plus nineteen slope variants per entry.
* Terrain edge: icon plus eighty-four sprites, four wall variants at offsets 0, 10, 20
  and 30, then twelve tunnel types of four from offset 36.
* Footpath surface: preview, sixteen connection shapes, four slopes, thirty-one corner
  variants. The connections-to-image mapping is a 256-entry table in the engine, which
  the generator reads and inverts so each image is drawn for the shape it is used for.

The edge silhouettes come from `openrct2.terrain_edge.void`, an object that contains no
art: every sprite in it is one flat palette index. The geometry is taken from there
with attribution; every pixel is ours.

### Art-test scene

`world-art-test` puts all four terrains, raised plateaus, inside and outside corners,
three path styles, a queue, an elevated walkway and the coaster in one view. It is a
development scene and is not a release scenario.

### Guards added

`check_world_objects.py` asserts the image count, the layout, the slope geometry and
that sprites carry material rather than placeholders, for every terrain, edge, path and
railing object. `blankworld-check.sh` blanks a terrain and a path and requires the check
to reject them; it does.

## V1-3 — shops, facilities and guest alerts (2026-09-24)

Guest needs became a loop a player can see and act on. The simulation already knew
who was hungry; what it could not do was say so in one sentence a player could act on.

### What shipped

| | Count | Notes |
|---|---:|---|
| Shops | 3 | grill stand (food), refreshment stand (drink), gift stand (souvenir) |
| Facilities | 2 | restroom, information point |
| Alert kinds | 8 | six guest needs, litter, and broken rides |
| Severities | 3 | INFO, WARNING, IMPORTANT |
| Development scenes | 2 | `world-art-test`, `needs-test`, neither reachable by a player |

### What a stall takes

With the economy on, on the needs scene, after about three minutes of trading:

| Stall | Price | Customers | Profit |
|---|---:|---:|---:|
| Grill stand | £0.80 | 62 | £15.50 |
| Refreshment stand | £0.60 | 62 | £15.50 |
| Restroom | free | 67 | costs only |
| Gift stand | £1.20 | 0 | −£3.10 |

The gift stand sells nothing there, and correctly: a guest buys a souvenir only after
three rides, and that scene has no rides. A shop with no customers still pays its
running costs, which is the first real economic pressure this project has produced.

### The stalls work at the game's own pace

A fifty-three-thousand-tick run on `sunrise-test` with no test scaffolding at all,
guests generated once and left alone:

| Stall | First sale | Total at t=53,442 |
|---|---:|---:|
| Gift stand | t≈11,200 | 51 |
| Grill stand | t≈32,300 | 22 |
| Restroom | t≈34,100 | 17 |
| Refreshment stand | t≈45,600 | 5 |
| Information point | — | 0 |

Those numbers are the engine's pacing, not a defect, and they are worth knowing
before designing a scenario around them:

* A guest arrives with hunger at 200 and loses two roughly every 512 ticks, so a park
  does not want food for the first ten minutes of play.
* **Thirst never falls on its own.** It drops only when a guest sits down or finishes
  food, so a park with no benches and no food stall generates no demand for drinks at
  all. Benches are V1-4 content; until then the drink stall depends on the food stall.
* The information point sells maps, and a guest buys a map only when lost. In a park
  with two straight paths nobody gets lost, so it never sold one. It earns its place
  in a scenario with a real layout, not in a test fixture.

### Four things that were wrong and are now right

1. **The stalls were unreachable.** A stall connects to a path only when the stall's
   own direction points at it: `Loc6A6C85` requires `(direction - element.direction) & 3
   == 0`, and `flatTrack1x1A` carries only `entranceConnectionNE`. Every stall was
   facing away from the path. Direction deltas are 0 = −x, 1 = +y, 2 = +x, 3 = −y.
2. **The player could not see their park.** In the web shell the camera opened off the
   map, so the game route showed a working toolbar over an empty screen. It had been
   that way since V1-0 and nothing noticed, because every assertion checked state and
   none looked at the screen. `SunriseLoadPark` now repairs a camera that is not
   pointing at the map, and only then, so a park saved by a player opens where they
   left it.
3. **The engine drew into a surface of the wrong size.** The shell started the engine
   before telling it how big its window was, so SDL used the 300×150 default and the
   browser stretched the result: a band of five-times-scale toolbar icons across the
   top of the park. The shell now sizes the canvas from its laid-out size before the
   engine opens a window.
4. **Money had never been simulated.** `Park::Initialise` starts every park with
   `ParkFlag::noMoney`, and the park builder never cleared it, so every scenario this
   project has produced ran with the economy switched off. Guests walked into shops,
   were served, and nothing moved. Prices, stock costs, running costs and guest
   spending were all inert. The builder now turns money on, and a scenario can ask for
   the sandbox back with `"money": false`.

Half of every stall was also missing on screen, for a reason worth writing down: the
render camera orbits the world origin, and the stalls were modelled at the tile centre,
so each of the four rotations swung the model to a different place and the packed
sprite offsets disagreed with one another. They are modelled on the origin now, and all
four offsets agree.

### The alert model

Counted from guest thoughts every 256 ticks, with a share threshold and an absolute
floor, hysteresis at roughly two thirds of the raise share, and a cooldown after
clearing. Severity is a band on the same share, and a need with nothing open to answer
it is escalated one band, because that is the case where the player cannot work out the
fix by looking. Closed stalls do not count as a facility.

Alert state is **derived, never serialized**. It is a function of guest and ride state,
so a loaded park re-raises whatever is still true within one scan. Writing it into the
save would fork a format we share with upstream to store something recomputable in
microseconds. Full details in `docs/guest-alerts.md`.

The player-facing surface is a panel in the shell, bottom right, fed by a new
`GUEST_ALERTS` bridge message polled every five seconds. The engine decides whether
there is anything to say; the web side decides only how it looks.

### Development scenes cannot reach a player

By structure rather than by filtering. A scenario declares `visibility` in its own
description; development ones are packed into `standalone/DevScenarios`, and the
engine's scenario repository scans exactly `<base>/Scenarios` and never a sibling of
it. A rename cannot make a scene visible. The player build strips the directory
entirely, so the content is not even shipped.

### Guards added, each proven to fail

| Guard | Catches |
|---|---|
| `check_shop_objects.py` | a stall rendered from one angle four times, blank direction sprites, two stalls sharing artwork |
| `check_scenario_visibility.py` | a development scene shipped where the selector finds it, or offered by the shell |
| `demo_check_failures.py` | runs the two above against deliberately broken copies and requires rejection |
| `shellvisual-check.sh` | requires the visual check to reject two real captures of the shipped defects |
| texture floor in `check_visual_smoke.py` | a park that is on screen in the right colours but smeared or undrawn |
| `alertcheck.js` | the whole need loop, including that a healthy park raises nothing |
| `webalerts.js` | that the model reaches the screen, and that the panel clears |

The texture floor exists because colour counting alone passed both shipped defects.
Every material in the game is textured, so a flat run across the park means something
is wrong: a correct render measures 0.40–0.43, a smeared one 0.19, an undrawn one 0.009.

### Sprite audit

Clean: 0 unexpected indices, 0 requests. `SPR_RIDE` was authored, and so were the five
weather icons we had not shipped. Only sun and cloud existed, so the toolbar drew a
magenta marker the first time it rained — a hole the audit found only intermittently,
which is the worst kind to have.

## V1-4 — First Park, benches and bins (2026-09-24)

The first scenario a player is meant to start, with onboarding that reads the park
rather than the menus, and the two objects that close the guest-need loop.

### What shipped

| | | |
|---|---|---|
| Release scenario | 1 | First Park, 32 tiles, guests-and-rating objective |
| Path additions | 2 | bench (9 images), litter bin (13 images) |
| Onboarding steps | 10 | all derived from park state, none stored |
| Development scenes | 3 | `sunrise-test` joined them; no release scenario but First Park |

`docs/first-park.md` has the scenario and every number in it, with where the number
came from.

### Four things that had never worked

1. **The handyman had never cleaned anything.** Two separate reasons, both silent.
   He was hired with a staff-orders mask of zero, and every duty is checked against
   that mask before the task is even looked for. And once that was fixed, his sweep
   animation was five frames long while `Staff::updateSweeping` removes litter at frame
   **8**, and `updateEmptyingBin` empties a bin at frame **11**. Neither checks that
   the animation is long enough; a short one simply plays forever. The sequences now
   ping-pong the rendered frames to the lengths the engine reads. He sweeps 27 pieces
   and empties 7 bins in four minutes.
2. **Nested game actions never charge money.** `GameActionRunner` returns a nested
   result before it reaches `FinancePayment`, so nothing the park builder places has
   ever cost anything. That is right for a scenario's starting park and wrong for
   `SunrisePlaceShop`, whose whole purpose is to find out what a player would pay.
3. **A scenario's saved camera was always discarded.** `SetMainView` sets the window's
   `savedViewPos`, which the window copies to its viewport on its next update — and
   there is no next update inside the builder. `PrepareMapForSave` then read the stale
   viewport. The builder now moves the viewport directly, and `GameLoadInit` repairs a
   camera that is off the map on every load path, not just the shell's.
4. **A scenario could break a ride the player cannot fix.** The first play-through of
   First Park died to it: the coaster broke down, the queue emptied, the rating fell to
   zero and 150 guests left, with no mechanic in the game. A scenario now says whether
   it is ready for breakdowns; First Park says no until V1-6.

### The play-through the numbers come from

Twenty-six minutes of simulation, playing the scenario the way the onboarding asks:

| Moment | |
|---|---|
| Coaster opened, first rider | 136 seconds of play |
| Opening build (food, drink, restroom) | $775 of $12,000 |
| First food sale | about 8 minutes |
| Litter alert raises, unprompted | about 12 minutes, INFO → WARNING → IMPORTANT |
| Park ignored: rating 756 → 0, guests 158 → 4 | about 24 minutes |
| Handyman hired: litter 14 → 3, 27 swept | 4 minutes |

Takings over the run: coaster $524, food stall $93, drink stall $86, restroom −$22.
A park that builds nothing new neither goes broke nor gets rich, which is the right
shape for a first scenario.

### Scenario-aware tuning, not alert tuning

At the engine's defaults a guest arrives with hunger 200 and does not complain until it
falls below 10, which takes over twenty minutes. A tutorial that waited for that would
have nothing to teach. First Park sends its guests in with hunger 60 and thirst 90,
which is the engine's own `guestInitialHunger`. **No alert threshold changed.**

### Decisions

**Souvenir stall: available, not taught.** A guest buys a souvenir after three rides,
and one coaster ridden three times satisfies that, so it is not dead content here. It is
not what a new player should spend their first thousand pounds on.

**Information point: not in First Park at all.** It sells maps only to lost guests, and
nobody gets lost on one straight path; it sold nothing across fifty thousand ticks in
V1-3. Shipping it here would teach a player that a building they were told to build does
nothing.

**`sunrise-test` is development-only now.** It stayed visible because the regression
tests used it; the tests now name it in `DevScenarios` like any other development scene.

### Guards added

| Guard | Catches |
|---|---|
| `check_addition_objects.py` | wrong image count, blank slots, four identical edges, a full bin that looks like an empty one |
| `check_visual_additions.py` | benches and bins that exist as objects but never reach the screen |
| `firstparkcheck.js` | the opening camera by projection, the canvas size by number, the five-minute rule, all three needs loops, the litter loop, maintenance, save and resume |
| `webonboarding.js` | instructions that advance on a click, and onboarding that restarts after a reload |

The camera and canvas regressions are numbers, not pictures: `firstparkcheck.js`
projects the entrance, the main path, the plaza and the coaster station and asserts each
lands inside the viewport, and compares the engine's drawing surface with the canvas.
Both of those failed silently for three milestones.

## V1-5 — Scenery and vegetation (2026-09-24)

Thirty-nine objects: sixteen vegetation, sixteen park pieces, three walls, four
build-menu groups. All of it is composed in `assets/source/blender/scenery.py` out of
shared components — a trunk, four canopy shapes, a flower head, a post row, a rail —
so an object is a composition rather than a model, and no sprite is drawn by hand.
The art rules are in the scenery section of `docs/world-art-system.md`.

### Three things that looked like they were working

**The build menu had no tabs, and the audit said it was fine.** A scenario with no
research leaves every scenery group uninvented: `ResearchResetCurrentItem` marks every
scenery *item* invented and then every scenery *group* not, on the assumption that
research will turn the groups on later. Marking the groups invented in the park builder
did not survive a save either — the invented bits are not in the park file. What a park
file carries is the two research *lists*, and the load path rebuilds the bits from them.
The builder now records one completed research item per loaded group and ride entry.

**The scenery window opened and closed itself before it could draw.** It is a tool
window: `onUpdate` closes it unless the scenery tool is active, and `ContextOpenWindow`
does not activate the tool — the toolbar sends an intent that does both. So the window
existed for one frame, drew nothing, and the sprite audit of the build menus passed
perfectly. Three of that window's own buttons had never been authored and could not have
been found. The audit now asks a new export where the window actually is, after giving
it time to change its mind.

**A group tab carried world offsets into a widget.** A tab is 31 by 28 and draws the
sprite at its own corner plus the sprite's offsets; a tree is anchored at the foot of
its trunk with its canopy forty-eight pixels above, so the Nature tab drew its tree off
the top of the screen. Six objects had the mirror-image fault: they claimed less
clearance than their art occupied, so they drew outside their own bounding box.

### What decoration does to the simulation

Nothing measurable, and the scenario says so. Measured by running First Park against
`first-park-bare` — the same scenario with the decoration removed and nothing else
changed — for three minutes each:

| | decorated | undecorated |
|---|---|---|
| scenery pieces | 44 | 0 |
| park rating | 703 | 703 |
| average guest happiness | 185 | 189 |

The engine has no scenery term in the park rating at all. The one place scenery reaches
the simulation is `GuestAssessSurroundings`: forty or more elements within five tiles,
with fewer than eight pieces of rubbish nearby, give a guest the "Great scenery!"
thought and 45 on its happiness target. First Park is nowhere near that, and the
objective was not retuned, because there was nothing to retune for.

The positive case was not reproduced either: in the density scene, with three hundred
and sixty scenery elements within five tiles of every guest on the path, no guest was
ever observed holding that thought in a three-minute run. `scenerygameplay.js` reports
that count rather than asserting it.

### Payload

First load 9.83 MB, from 9.66 MB. The whole scenery set is 150 KiB compressed:

| category | objects | compressed |
|---|---|---|
| trees | 8 | 35.1 KiB |
| decorative props and accents | 8 | 29.8 KiB |
| fences and walls | 3 | 16.9 KiB |
| planters and beds | 4 | 16.3 KiB |
| shrubs | 4 | 15.0 KiB |
| flowers and ground planting | 4 | 14.2 KiB |
| build-menu groups | 4 | 8.5 KiB |
| signs | 2 | 7.2 KiB |
| lamps | 2 | 7.0 KiB |

The tile-selection highlights and the three scenery-window buttons are in `g1.dat`, which
grew 3.5 KiB compressed. Development scenes are 40.6 KiB and are stripped from the player
build.

### Guards added

| Guard | Catches |
|---|---|
| `check_rotation_origin.py` | a model built away from the world origin, as its content's horizontal centre moving between rotations |
| `check_scenery_objects.py` | wrong image count, blank or flat sprites, four identical "directions", two objects sharing artwork, art taller than its own bounding box |
| `check_visual_scenery.py` | scenery that exists as objects and never reaches the screen, counted by exact palette index |
| `sceneryaudit.js` | a sprite the engine asks for and cannot find, and a build menu that closed itself before it could ask |
| `scenerysave.js` | a park file that keeps the objects and loses their orientation |
| `scenerygameplay.js` | a claim about what decoration does, measured against the same park undecorated |

`demo_check_failures.py` now proves five of these reject content broken on purpose,
including a scenery object rendered from one angle four times and a model slid twelve
pixels off the rotation origin.
