# Asset dependency inventory (M2 audit, 2026-09-23)

Engine baseline `d99eb5dcf7`. Regenerate the numbers with:

```bash
python3 tools/asset-audit/sprite_refs.py     # -> tools/asset-audit/out/sprite_refs.json, sprite_summary.md
python3 tools/asset-audit/object_refs.py     # -> tools/asset-audit/out/object_refs.json, object_summary.md
```

Standalone release gate: **0 proprietary RCT/RCT2 runtime dependencies.** Feasibility verdict and the minimal
content pack are in `standalone-feasibility.md`; this file is the inventory.

## How RCT2 data reaches the engine

| Channel | Proprietary source | Consumed by | Failure mode when absent |
|---|---|---|---|
| Base sprite table `Data/g1.dat` (29,294 entries) | RCT2 | C++ paint code by index (13,964 indices), objects via `$G1[a..b]` | loader refuses fewer than 29,294 entries (`Drawing.Sprite.cpp:502`); a replacement archive of the same size is accepted (verified) |
| Objects `ObjData/*.DAT` | RCT2 (+ expansions) | 2,233 wrapper objects in the official pack (`$RCT2:OBJDATA/…`) | one warning each at index time, object skipped (`ObjectFactory.cpp:315`), no crash (verified) |
| Audio `Data/css*.dat` | RCT2 | sound effects, ride music, title music | replaced by asset packs (see `audio-content-status.md`) |
| Scenarios `Scenarios/*.SC6`, tracks `Tracks/*.TD6` | RCT2 | scenario/track lists | empty lists (verified) |
| Presence gate | – | `Platform.Common.cpp:148` looks for `Data/g1.dat`; launcher `index.js` looks for `Data/ch.dat` | "An RCT2 install directory must be specified" and exit |

## Inventory by category

Columns: required at startup; required only when used; can be disabled; open replacement exists; hard-coded
g1 index dependency; object/data dependency. Counts are distinct g1 sprites (from `sprite_refs.py`) or object
images (from the objects pack). "g1 via object" means the object wrapper points at a g1 range.

| Category | Startup | On use | Disable-able | Open replacement | g1 index dep. | Object dep. | Size |
|---|---|---|---|---|---|---|---|
| Terrain surfaces (grass, sand, dirt, rock, …) | yes (any map) | – | partially (ship fewer) | `openrct2.terrain_surface.void` only | 103 in engine (`SPR_TERRAIN_*` tables, height markers) + g1 via `rct2.terrain_surface.*` objects | terrain_surface objects | ≈ 19 slope sprites × surface, plus edges |
| Terrain edges | yes | – | partially | `terrain_edge.void` | via objects | terrain_edge objects | tens |
| Water | yes | – | no | none | 14 (engine-drawn) | water object (`rct2.water.*` wrapper) | ≈ 15 animated |
| Paths / queues | yes (new park needs one) | – | partially | `footpath_surface.queue_invisible` | 7 | footpath_surface / railings wrappers (g1 via object) | ≈ 16 per surface + railings |
| Path additions (benches, bins, lamps) | – | yes | yes | none | 2 | footpath_item wrappers | small |
| Walls / fences | – | yes | yes | 5 open walls | 4 | scenery_wall wrappers (104 skipped) | 2–4 per wall |
| Small scenery (trees, shrubs, props) | – | yes | yes | 23 open (support structures, Time-Twister fixes) | 9 | scenery_small wrappers (227 skipped) | 4 rotations each |
| Large scenery | – | yes | yes | – | 0 | wrappers (13 skipped) | – |
| Shops / stalls / facilities | – | yes (need some) | partially | none | 54 (shop icons, item sprites) | ride wrappers (`rct2.ride.*` shops) | ≈ 20–50 per shop object |
| Park entrance | yes (new park) | – | no | none | 3 | park_entrance wrappers (2 skipped) | ≈ 12 |
| Guests | yes (any park) | – | no | none | 4,741 via `rct2.peep_animations.guest` (`$G1`): base outfit 856 + 26 held-item variants (104–320 each) + moods; plus 47 engine symbols (shadows, thought bubbles) | peep_animations object | **856 base + variants for items sold** |
| Staff | yes (handyman, mechanic, security); entertainer optional | – | entertainer yes | none | handyman 181, mechanic 441, security 93, entertainers 133–289 × 11 costumes | peep_animations objects | ≈ 715 + 1 entertainer |
| Flat rides | – | yes | **yes** (no object → not in ride list) | none (all `$RCT2:OBJDATA`) | 0 in engine | ride object per type | 100–600 per ride (paint code: carousel 32 + riders; Ferris wheel 32 + 512; swinging ship ≈ 150) |
| Coaster track (g1-drawn types) | – | yes | **yes** | – | 13,129 across ~50 types (wooden 1,732; twister 948; inverted 668; looping 652; corkscrew 624; mini 600; junior 576 …) | – | per type as listed |
| Coaster track (object-drawn types) | – | yes | yes | **hybrid, single-rail, LSM (modern twister), alpine: complete** (CC-BY-4.0); classic wooden / stand-up: object-drawn but wrappers | 0 | ride object with `$LGX` archive | hybrid = 6,963 images incl. trains |
| Ride vehicles / trains | – | yes | yes | the 4 above | 13 | ride objects (434 `rct2.ride.*` skipped) | – |
| Supports (steel, wooden) | – | yes (any ride) | no | none | 226 | – | ≈ 230 |
| Stations | – | yes | partially | `station.noentrance`, `noplatformnoentrance` | via `TrackPaint` shared (166) | station objects | tens |
| UI graphics (toolbar, tabs, title menu, cursors) | yes | – | no | `g2.dat` 170 open sprites (OpenRCT2's own icons) | 122 | – | ≈ 120 |
| Fonts | yes | – | no | **open** (`fonts.dat`, 1,053 sprites) | 0 | – | 0 |
| Palettes | yes | – | no | **open** (`palettes.dat`) | 2 | – | 0 |
| Track previews | – | yes | no | **open** (`tracks.dat`, 8,685) | 0 | – | 0 |
| Sound effects | yes | – | no | OpenSoundEffects (CC-BY-4.0) | – | audio object | see `audio-content-status.md` |
| Music | – | yes | yes | OpenMusic (CC-BY-SA-4.0) | – | music objects | see `audio-content-status.md` |
| Scenarios | – | yes | – | none bundled; make with the editor | – | scenario_meta objects are RCT previews (droppable) | 3–5 |
| Title sequence | yes (title scene) | – | replaceable | community parks (reference RCT2 objects; embed custom ones) | – | – | 1 park |
| Object definitions (JSON) | yes | – | – | **open**: engine + `OpenRCT2/objects` (CC-BY-4.0) | – | – | 0 |
| Language strings | yes | – | – | **open** (contain RCT2 ride/scenery names; rename for branding) | – | – | 0 |

## Classification of the 13,964 hard-coded g1 indices

| Class | Definition | Indices |
|---|---|---:|
| A abstracted | drawn from ride/scenery objects rather than g1 (flat rides, 6 coaster types, all object-carried images) | (not in g1 count) |
| B supplied open | `g2.dat`, `fonts.dat`, `palettes.dat`, `tracks.dat`, 4 open coasters | 0 of g1 (they live in other tables) |
| C proprietary, needed for minimal V1 | non-track engine indices (guests 251 + peep objects, supports 226, UI 122, terrain 103, shops 54, water 14, misc 29, staff 12, scenery/path/wall/entrance 25) | ≈ 835 + object-referenced ranges (peeps 7,679; terrain/path/entrance via wrappers) |
| D proprietary, disable-able | track tables of coaster types we do not expose | ≈ 13,100 |
| E unknown | runtime `base + n` tails not followed by the scanner (110 files) | resolved by the red-marker test park |

Machine-readable form: `tools/asset-audit/out/sprite_refs.json` (per symbol: value, table, category, files;
per file: literal ranges) and `object_refs.json` (per object: type, image-source class).

## Behaviour without RCT2 data (verified 2026-09-23)

`tools/asset-audit/experiment-blank-g1/`: engine boots, indexes objects, runs the title sequence with a
29,294-entry stub table and an empty `ObjData/`. RCT2 wrapper objects are skipped with a warning each. With a
red marker table, everything still drawn from g1 is red; object-drawn content renders. This is the audit
instrument for E: load any park with the red table and count what is red.
