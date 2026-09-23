# Standalone feasibility audit

Date: 2026-09-23. Engine baseline: `engine/openrct2` at `d99eb5dcf784b928f994ec178ea977bd7089408a` (unchanged).
Question: can we ship a deliberately smaller but complete browser theme-park game on current OpenRCT2 with
**zero proprietary RCT2 files**?

## Verdict: CONDITIONAL GO

A reduced standalone game is technically possible on current OpenRCT2 with **small, contained engine changes**.
The engine does not assume the RCT2 content universe at the object level, it boots and runs with a
replacement base sprite table, four complete open coasters already exist, and sound/music are mostly open.
What stands between us and a standalone build is **content we must make ourselves**, and one category,
**guest and staff sprites**, is large enough and stylistically central enough that it must be prototyped
end-to-end before the project is committed. OpenGraphics contributes effectively nothing and is not a lever.

Companion documents: `asset-dependencies.md` (inventory), `content-reduction.md` (engine behaviour, file:line),
`open-graphics-coverage.md`, `audio-content-status.md`, `browser-memory.md`, `licensing.md`. Generated data in
`tools/asset-audit/out/`. Experiment in `tools/asset-audit/experiment-blank-g1/`.

## 1. How RCT2 data enters the engine

| Door | What | How used | Behaviour when absent |
|---|---|---|---|
| `Data/g1.dat` (29,294 sprites) | base sprite table | by index from C++ (`SpriteIds.h` + literals in track paint) and from objects (`$G1[..]`) | loader rejects < 29,294 entries; a same-size replacement archive is accepted (verified in browser) |
| `ObjData/*.DAT` | RCT2 objects | 2,003 official objects are JSON wrappers pointing at a DAT (`$RCT2:OBJDATA/…`) | one warning each, object present but blank (verified: 849 warnings, no crash) |
| `Data/css*.dat` | 64 sound samples, 30 music styles, title/circus music | via audio/music objects | silent, no crash |
| `Scenarios/*.SC6`, `Tracks/*.TD6` | scenarios, track designs | index scan | empty lists |
| presence gate | – | `classifyGamePath()` wants `Data/g1.dat`; launcher wants `Data/ch.dat` | "RCT2 install directory must be specified" |

**Experiment** (`experiment-blank-g1/`): a stub directory with a 29,294-entry table of solid red 16×16
sprites and an empty `ObjData/` boots the WASM build to the title sequence. Everything drawn from g1 is red
(terrain, water, paths, supports, title buttons, most trees); the four open coasters and park-embedded custom
objects render normally. Blank-table runs are not evidence (transparent sprites leave stale framebuffer
pixels); the opaque marker run is.

## 2. Current proprietary dependencies (measured)

| Dependency | Count | Source |
|---|---:|---|
| g1 indices addressed by engine code | **13,964** (47.7% of table); 13,129 are coaster-track paint, ≈ 835 everything else | `sprite_refs.py` |
| g1 indices addressed via objects (`$G1`) | 9,737 across 50 objects: peep animations 7,679, terrain surfaces 1,132, edges 316, stations 352, paths 3 objects | `object_refs.py` |
| Objects needing RCT data | **2,233** of 2,505 (2,003 DAT wrappers, 29 `$G1`, 107 RCT1 csg, 93 mixed) | `object_refs.py` |
| Sound effects still on `css1.dat` | **38 of 67** SoundIds (26 replaced by OpenSoundEffects, 3 open extras) | `audio-content-status.md` |
| Music styles still on `css*.dat` | **19 of 30** + circus (10 full + 1 partial replaced by OpenMusic) | same |
| Title sequence | 17 community parks, all need RCT2 objects (782 DAT refs) | same |
| Scenarios | none shipped; OpenScenarios exists (CC-BY-SA) but mandates RCT2 objects | same |

## 3. Open replacement coverage (what exists today)

| Area | Open today | Notes |
|---|---|---|
| Engine data | `g2.dat` 170 UI sprites, `fonts.dat` 1,053, `palettes.dat`, `tracks.dat` 8,685 | shipped in `assets.zip` |
| Coasters | **4 complete** ride objects with embedded track + trains: hybrid (6,963 images), single-rail, modern twister (LSM), alpine | CC-BY-4.0, `OpenRCT2/objects`; draw with **0** g1 indices |
| Other objects | 272 usable without RCT data, but useful ones are few: 22 roofs, 2 pandas, invisible stations/queue, `void` terrain | |
| Sound | 29/67 | OpenSoundEffects CC-BY-4.0 |
| Music | 11/30 styles + open title track | OpenMusic CC-BY-SA-4.0; the 19.6 MB `fairground2` object is 18 organ tracks |
| OpenGraphics | 19 objects / 82 sprites (2.2% of base objects, 0.05% of images); no peeps, track, terrain, UI; the engine ignores its graphics asset pack (PR #25246 still an open draft) | GPL-3.0; **not a schedule lever** |
| Language strings | open; 79 strings mention RCT names (rebrand surface) | |

## 4. Hard-coded sprite dependencies, classified

| Class | Meaning | Indices |
|---|---|---:|
| A abstracted | drawn from objects: all flat rides, 6 coaster types (4 open + classic wooden/stand-up), scenery, walls, paths, entrances, terrain surfaces, peeps | not in g1 count |
| B supplied open | g2/fonts/palettes/tracks tables; 4 open coasters | 0 of g1 |
| C proprietary, needed for minimal V1 | non-track engine indices ≈ 835 (supports 226, UI 122, terrain overlays 103, shops 54, water 14, peep extras 47, staff 12, misc 29, small groups) + object-referenced ranges we must supply (peeps 856–5,400, terrain/edge/station/path/entrance ≈ 500) | ≈ 2,200–6,700 |
| D proprietary, disable-able | track tables of coaster types we do not expose | ≈ 13,100 |
| E unknown | runtime `base + n` arithmetic in 110 files (counted once each); resolved by loading test parks with the red marker table | small |

Machine-readable: `tools/asset-audit/out/sprite_refs.json`, `object_refs.json`.

## 5. Can unsupported content be disabled? YES

- Ride lists, research, scenery windows and the editor are driven by **installed objects**; a ride type with
  no object is inert (`NewRide.cpp:663-707`, `Research.cpp:458-494`). Only a cheat dropdown enumerates the enum.
- Hard runtime requirements: ≥ 1 guest `peep_animations` object (null-deref otherwise, `Guest.cpp:7156`),
  and `kMinimumRequiredObjects` = grass surface, rock edge, plain station (`DefaultObjects.cpp:14`) for the
  editor. Editor save gate: one of each of ride, station, surface, edge, queue + non-queue path, railings,
  entrance, water, peep_names, and one peep object per peep type.
- Missing sprite source → blank, park plays. Missing object id → park refused with a list (acceptable: we
  do not promise to load RCT2 parks).
- Track paint code for hidden types stays compiled and blank; optional compile-time allowlist if size matters.

## 6. Minimal standalone content pack (proposal)

| Category | Open coverage | New work (sprites, approx.) | Engine changes | Risk |
|---|---|---:|---|---|
| Terrain 5 surfaces + edges | `void` only | ≈ 100 surface + 80 edge | none (objects) | Low |
| Water | – | ≈ 15 | none (g1 range, ship in our table) | Low |
| Paths 3 surfaces + 2 railings + queue | invisible queue | ≈ 100 | none | Low |
| Supports (steel + wooden) | – | ≈ 230 | none (g1 range) | Low–Med |
| Small scenery 35, walls 8 | 22 roofs, 5 walls | ≈ 170 | none | Low |
| Shops/facilities 5 + entrance | – | ≈ 120 | none | Low |
| Guests | – | **856 base outfit + ≈ 730 held-item variants for 5 sold items** (RCT2 ships 4,741) | none (`peep_animations` object with `$LGX`) | **High** |
| Staff 3 + 1 entertainer | – | ≈ 715 + 150 | none | Med |
| Flat rides 4 | – | ≈ 300 each (carousel 32 + riders; Ferris wheel 544; ship ≈ 150) | none | Med |
| Coasters 3 | **hybrid, single-rail, LSM, alpine** | 0 (Stage A); own later | none | Low |
| UI icons, cursors, title buttons | g2 (OpenRCT2's own) | ≈ 120 | none | Low |
| Fonts, palettes, track previews | open | 0 | none | – |
| Sound effects | 29/67 | 38 samples | audio object id or manifest (small) | Low |
| Music | 11 styles | 0 (ship only covered styles) | none | Low |
| Scenarios | none | 3–5 from the editor | scan a bundled scenario dir (small) | Low |
| Title | – | 1 park from our set | none | Low |
| **Total new sprites** | | **≈ 4,000–4,600** from ≈ 60 Blender sources | | |

Sizing note: RCT2's table is 29,294; the minimal pack is ≈ 15% of that, and coaster track (the largest
category, 13k) is avoided entirely by exposing object-drawn coasters.

## 7. Engine changes required (all small)

| # | Change | Where | Size |
|---|---|---|---|
| 1 | Accept an OpenRCT2-provided base sprite archive and skip the RCT2 directory search (or the trivial variant: ship our archive under `Data/g1.dat` and drop the `ch.dat` launcher check) | `Context.cpp:400-409,999`, `Drawing.Sprite.cpp:491`, `Platform.Common.cpp:148`, `emscripten/static/index.js:136` | small |
| 2 | Point `kMinimumRequiredObjects`, default lists and `Scenario.cpp:128` at our object ids | `DefaultObjects.cpp:14-160` | small |
| 3 | Audio base object with 64 open samples (or extend the OpenSoundEffects manifest); drop `rct2.audio.circus` | `Audio.h:140`, packs | small |
| 4 | Scan a bundled scenario directory | `ScenarioRepository.cpp:125` | small |
| 5 | Optional: compile-time ride-type allowlist to shrink the WASM | CMake | small |

None touch simulation, save format or rendering. All are upstream-shaped (an "open base graphics" mode).

## 8. Largest five blockers

1. **Guest and staff sprites**: ≈ 2,450 frames minimum, one modular rigged character, all engine animation
   groups; no open source exists (OpenGraphics lists the peep model as its own blocker).
2. **Base world set as a full 29,294-slot archive**: terrain, water, paths, supports, UI, shop items ≈ 800 sprites
   placed at the exact indices the code expects, empty elsewhere. Straightforward but must be index-exact;
   the red-marker table is the QA tool.
3. **Flat rides**: 4 objects × ≈ 300 sprites, each ride type cut up the way its paint code expects (the
   OpenGraphics Blender add-on has no flat-ride mode).
4. **Audio gaps**: 38 sound effects and 19 music styles, or ship fewer styles.
5. **Content**: our own scenarios and a title park; every existing park/scenario depends on RCT2 objects.

## 9. Audio, scenario, licensing, threading, payload summaries

- **Audio**: SoundIds resolve through objects; OpenSoundEffects overrides 26 of 64 base samples; the rest are
  silent without css1. Title music is open. Music: OpenMusic covers 11 styles; ship only those. Details and
  file:line in `audio-content-status.md`.
- **Scenarios**: engine ships none; `.park` files from the editor load as "Other parks" with no RCT2 code path.
- **Licensing** (`licensing.md`): engine GPL-3.0; 4 coasters + sounds CC-BY-4.0; music CC-BY-SA-4.0 (one
  fairground pack has compositions that are not clearly public domain, check before shipping); OpenGraphics and
  its Blender add-on are GPL-3.0 (settings reusable, art not); X7's TrackRender has no licence (do not reuse);
  `rct2dlc.ride.zpanda` is original-game art in a CC-BY repo (do not ship). Everything else in Stage A is ours.
- **Threading/memory** (`browser-memory.md`): 120 workers × 8 MB stacks + 2 GB heap are build flags from the
  first CI commit, not requirements; the renderer commits ≈ 790 MB before drawing; 3–5× reduction expected from
  pool sizing; keep pthreads until a loaded-park benchmark says otherwise.
- **Payload**: 71.7 MB `assets.zip` = music objects 32.2 + asset packs 14.6 + title parks 8.8 + rides 5.3 +
  track previews 3.2 + RCT scenario previews 3.2 + languages 1.2 + rest < 3; plus 4.0 MB WASM+JS. Core without
  music, RCT previews, community title parks and 40 languages ≈ 20 MB.

## 10. Estimated technical risk by category

| Category | Risk | Why |
|---|---|---|
| Engine changes | Low | small, localized, upstream-shaped; boot without RCT2 already demonstrated |
| Terrain / water / paths / walls / scenery | Low | object-driven, few sprites, static geometry |
| Supports / UI / shop icons | Low–Med | index-exact placement in the base archive; tooling problem |
| Coasters | Low (Stage A) | 4 open types exist; own track art is a Stage B choice, and the hard part (track renderer) would be new tooling |
| Flat rides | Medium | per-ride sprite cutting rules; 4 rides |
| Guests / staff | **High** | volume, rig quality, style defines the game; no open fallback |
| Audio | Low | 38 samples, drop uncovered music styles |
| Scenarios / title | Low | content |
| Browser memory | Low | flag changes, benchmark first |

## 11. Recommended first asset prototype

**The guest.** One modular rigged character in Blender, rendered with the OpenGraphics camera/lighting
settings into a `peep_animations` object (base outfit, all animation groups, 856 frames), plus a handyman
(181). Load it in the browser with the red-marker base table and a hybrid coaster park. This de-risks the
highest-risk category, exercises the full pipeline (Blender → sprites.json → gxc → parkobj → engine), and
produces the style anchor the human artist needs to react to. Second prototype: the base world archive
(terrain, paths, supports, UI) built index-exact and validated by "no red left" on a test park.

## 12. Recommended next milestone

**M3: Stage A vertical slice, no RCT2 files.** Deliverables: engine gate change (#1, #2), guest + handyman
objects, base world archive (terrain, water, paths, supports, UI, shop icons), one flat ride, hybrid coaster,
one scenario from the editor, own title park, audio limited to covered styles; boot in the browser from a
clean profile with no RCT2 zip and play to 100 guests. Persistence/JS bridge work stays deferred, except the
launcher change that removes the RCT2 prompt. Threading ADR after M1-style benchmarks on the slice.
