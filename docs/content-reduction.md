# Content reduction: can the engine run on a deliberately small, RCT2-free object set?

Engine: `engine/openrct2` at `d99eb5dcf7` (v0.5.5-98). Object data: `.cache/assets/objects.zip` (2505 objects),
`opensfx.zip`, `openmusic.zip`, `title-sequences.zip`. Inventory tool: `tools/asset-audit/object_refs.py`
(outputs in `tools/asset-audit/out/`). File references below are relative to `engine/openrct2/`.

Target: a browser build with no RCT2 files that exposes ~3 coaster types, 3-5 flat rides, basic shops and
facilities, terrain, paths, small scenery, guests and staff, and hides everything else.

## Object inventory (Part A)

| Class | Objects | Meaning |
|---|---|---|
| self-contained | 224 | every sprite is embedded (`$LGX:images.dat` / PNG) |
| no-images | 48 | no sprites at all (water palettes, music, audio, climate, peep_names) |
| needs:rct2dat | 2003 | all sprites via `$RCT2:OBJDATA/NAME.DAT[...]` (RCT2 ObjData) |
| needs:g1 | 29 | all sprites via `$G1[...]` (RCT2 g1.dat) |
| needs:csg / mixed:csg | 107 | RCT1 csg1.dat (rct1 wrappers) |
| mixed:* | 93 | some embedded, some proprietary |

Usable with zero RCT1/RCT2 data: **272** (224 + 48). Need proprietary data: **2233**.

By type (self-contained / total): ride 6/340, scenery_small 25/1142, scenery_wall 5/331, scenery_large 0/249,
footpath_surface 1/39 (+1 image-less), footpath_railings 0/16 (+1 image-less), footpath_item 1/21,
park_entrance 0/16, station 2/14, terrain_surface 2/20, terrain_edge 1/18, peep_animations **0/15**,
scenario_meta 180/180 (text only), music 27 image-less (5 have RCT2 icon refs), audio 5 image-less (but
their *samples* point at RCT2 `CSS*.DAT`, see Audio).

The 6 self-contained rides: `openrct2.ride.alpine_coaster`, `openrct2.ride.hybrid_coaster`,
`openrct2.ride.modern_twister`, `openrct2.ride.single_rail_coaster`, `rct1.ride.toilets`, `rct2dlc.ride.zpanda`.
Of the 25 self-contained scenery_small, 22 are `toontowner.*` roofs and 2 are pandas; the only self-contained
terrain surface/edge are `openrct2.terrain_surface.void`, `rct1beta.terrain_surface.wildflowers`,
`official.terrain_edge.void`; the only self-contained stations are the invisible ones.

50 objects reference `$G1` directly (9737 distinct g1 sprites): 15 peep_animations (7679 sprites), 12 stations
(352), 14 terrain surfaces (1132), 6 terrain edges (316), 3 footpath railings/surfaces.

## Startup requirements

1. **An RCT2 directory is mandatory in the normal (non-headless) path.** `Context::Initialise` calls
   `GetOrPromptRCT2Path()` and returns false (abort) if it is empty (`src/openrct2/Context.cpp:400-409`).
   `GetOrPromptRCT2Path` accepts `gCustomRCT2DataPath` (`--rct2-data-path`) or config `rct2Path`, validated by
   `Platform::OriginalGameDataExists` (`Context.cpp:970-996`), which only checks that `Data/g1.dat` exists in one
   of four layouts (`src/openrct2/platform/Platform.Common.cpp:148-169`, `classifyGamePath`). Nothing else
   in the RCT2 tree is checked at startup. The Emscripten launcher separately requires `Data/ch.dat`
   (`emscripten/static/index.js:136`), an unrelated JS-side gate.
2. **g1.dat is loaded unconditionally** (`LoadBaseGraphics`, `Context.cpp:999-1008` -> `GfxLoadG1`,
   `src/openrct2/drawing/Drawing.Sprite.cpp:491-543`). Failure to open, or fewer than `SPR_G1_END = 29294`
   entries (`src/openrct2/SpriteIds.h:1048`), throws "Not enough elements in g1.dat", shows a message box and
   aborts init. Exactly 29357 entries flips the RCTC-layout flag (`Drawing.Sprite.cpp:508`).
3. **Out-of-range g1 lookups are safe, not crashes.** `GfxGetG1Element` returns `nullptr` if
   `offset >= _g1.elements.size()` (`Drawing.Sprite.cpp:1073-1094`), every drawing routine early-returns on
   nullptr (e.g. `Drawing.Sprite.cpp:814-818`), and `ImageTable::RequiredImage` turns a null getter result into
   an empty placeholder (`src/openrct2/object/ImageTable.cpp:59-79`). There is **no** visible placeholder
   sprite for missing g1 entries: they simply draw nothing.
4. **g2.dat, palettes.dat, fonts.dat, tracks.dat** come from the OpenRCT2 data dir, not RCT2
   (`GfxLoadG2PalettesFontsTracks`, `Drawing.Sprite.cpp:579-652`); a count mismatch only warns.
5. **csg1.dat (RCT1) is optional**: `GfxLoadCsg` returns false quietly when `rct1Path` is empty
   (`Drawing.Sprite.cpp:654-660`) and `$CSG` refs become placeholders with a warning (`ImageTable.cpp:93-120`).
6. **Existing "no RCT2" switch: none.** `UsesFallbackImages` (`src/openrct2/object/Object.h:248`) is set only by
   the `noCsgImages` path, i.e. RCT1-missing fallback (`ImageTable.cpp:531-542`); its consumers
   (`Context.cpp:863-867` warning, `LandTool.cpp:61`, `Paint.Surface.cpp:300`, `EditorObjectSelection.cpp:1355`)
   are all about RCT1. Git history: `f91449190a` "Allow game to run without RCT2 install path" (2018) only
   made the prompt loop survivable; `c1c71003eb` "Add fallback for people without RCT1"; no commits match
   "OpenGraphics" or "standalone" in the relevant sense. Headless mode (`gOpenRCT2Headless`) skips the prompt
   and `gOpenRCT2NoGraphics` skips `LoadBaseGraphics` (`Context.cpp:400,476`), which is the only code path today
   that runs without g1.dat, and it renders nothing.
7. **Direct g1 usage is pervasive in code, not only in objects.** Track-piece sprites for every built-in ride
   type are hard-coded g1 indices in `src/openrct2/paint/track/**` (e.g.
   `paint/track/coaster/WoodenRollerCoaster.cpp:34-44`, `SPR_WOODEN_RC_* = 23497...`; ~12.9k distinct
   numeric sprite literals under `src/openrct2/paint`). UI/tool sprites: ~6000 distinct `SPR_*` constants used
   across `src/openrct2*` of which only 149 are `SPR_G2_*`; surface/path/entrance paint uses 25 non-G2 SPR
   constants (boundary fences, height markers, ownership overlays, edge masks). A blank or partial g1.dat
   therefore blanks track, most UI icons, terrain overlays, etc. regardless of which objects are installed.

## Object repository and required objects

- Repository scan roots are only `DirBase::openrct2/object` and the user object dir
  (`src/openrct2/object/ObjectRepository.cpp:78-84`); **RCT2 `ObjData/` is never scanned**. `.DAT`
  wrapper objects (`rct2.*`, `rct2ww.*`, `rct2tt.*`) are JSON objects whose images point at
  `$RCT2:OBJDATA/NAME.DAT`, resolved by `ImageTable::FindLegacyObject` in `DirBase::rct2/ObjData`
  (`ImageTable.cpp:382-398`) via `ObjectFactory::CreateObjectFromLegacyFile` (`ObjectFactory.cpp:277-320`).
- Index building uses `loadImages=false` (`ObjectRepository.cpp:90`), so the index succeeds with an empty
  ObjData (observed: 2518 items indexed).
- **Hard minimum**: `kMinimumRequiredObjects = { rct2.terrain_surface.grass, rct2.terrain_edge.rock,
  rct2.station.plain }` (`src/openrct2/object/DefaultObjects.cpp:14-19`), loaded by `ObjectListLoad`
  when entering the scenario editor/object selection (`src/openrct2/scenes/editor/EditorController.cpp:82-87`).
  All three are `$G1` objects (grass 444 sprites incl. 2663..3042, rock edge 79, plain station 16).
- Editor object-selection validation (`EditorController.cpp:96-158`, `CheckObjectSelection`): at least one
  ride, station, terrain surface, terrain edge, non-queue and queue footpath surface, footpath railings, park
  entrance, water, peep_names, and one peep_animations object for each of guest/handyman/mechanic/security/
  entertainer. These are *editor* checks (scenario save gate), not runtime asserts.
- Default selections when the editor starts empty: `kCommonScenarioAndTrackDesignerObjects` (82 ids: scenery
  groups, pkent1, wtrcyan, 11 stations, 40 music, 10 path surfaces, 6 railings, peep_names, 4 peep_animations,
  climate) and `kDefaultScenarioObjects` (37: 16 rides such as twist1/ptct1/zldb/lfb1/..., 3 scenery groups,
  13 surfaces, 3 edges) (`DefaultObjects.cpp:21-160`, applied in `EditorController.cpp:628-657`). Missing
  entries are skipped silently by `ObjectSelectionSelectObject`; they are defaults, not requirements.
- Other hard-coded ids: `Scenario.cpp:128` prefers `rct2.station.plain` for `lastEntranceStyle` and falls back
  to index 0; `SmallSceneryObject.cpp:163,172` map legacy scenery to `rct2.scenery_group.scgwalls/scgpirat`
  (harmless if absent); `RCT12.h:483-497`/`RCT12.cpp:725-760` map SV4/SV6 station and music styles
  (legacy import only); `Audio.h:140-146` audio object ids (see Audio).

## Ride-type exposure

- The New Ride window walks `RideTypeViewOrder` (the ride-type enum) but for each type only lists **loaded ride
  entries** from `ObjectManager::GetAllRideEntries(rideType)` (`src/openrct2-ui/windows/NewRide.cpp:663-707`);
  a ride type with no installed object produces no button. Research gating is per entry
  (`RideEntryIsInvented`, `NewRide.cpp:699`).
- `kRideTypeDescriptors` / `RIDE_TYPE_COUNT` is fixed at compile time and is not tied to objects. The only UI
  that enumerates the whole enum regardless of objects is the ride-type dropdown in the ride window, which is
  shown only when the `allowArbitraryRideTypeChanges` cheat is on (`src/openrct2-ui/windows/Ride.cpp:1463,
  1951-1960`). Track-design lists, cheats, and the research window are entry-driven.
- Legacy SV6 import throws `UnsupportedRideTypeException` only for ride type ids >= `RIDE_TYPE_COUNT`
  (`src/openrct2/rct2/S6Importer.cpp:720-724`); irrelevant to object presence.

## Research

- The invention list is built from **loaded objects**: `ResearchPopulateListRandom` iterates
  `GetRideEntryByIndex(i)` over `kMaxRideObjects` and scenery groups (`src/openrct2/management/Research.cpp:
  458-494`); `ResearchAddAllMissingItems`/`ResearchFix` do the same to repair loaded parks (`Research.cpp:
  829-911`). Editor "remove unselected objects" strips research entries (`EditorController.cpp:603-621`).
- With only a few rides the list is just short; when `researchItemsUninvented` is empty, `ResearchNextDesign`
  marks research complete (`Research.cpp:146-153`), which is a supported state. Nothing assumes a particular
  ride type exists.

## New park / scenario editor minimums

To create a park from scratch the engine needs (object types): one terrain surface, one terrain edge, one
station, at least one ride (editor gate), non-queue and queue footpath surface, footpath railings, park
entrance, water, peep_names, climate (auto-selected), and peep_animations for 5 peep types
(`EditorController.cpp:96-158`, `DefaultObjects.cpp`). Mapgen "out of the box" additionally wants the 13
surfaces/3 edges/3 scenery groups listed in `kDefaultScenarioObjects` but degrades to whatever is loaded.

Concrete minimal set from the current asset pool, with image source:

| Slot | Candidate | Sprites |
|---|---|---|
| terrain_surface | `rct2.terrain_surface.grass` | `$G1` (444) |
| terrain_edge | `rct2.terrain_edge.rock` | `$G1` (79) |
| station | `rct2.station.plain` | `$G1` (16) |
| footpath_surface x2 | `rct2.footpath_surface.tarmac` / `queue_*` | mixed LGX + `$RCT2:OBJDATA` |
| footpath_railings | `rct2.footpath_railings.wood` | LGX + `$RCT2:OBJDATA/TARMAC.DAT` |
| park_entrance | `rct2.park_entrance.pkent1` | `$RCT2:OBJDATA` |
| water | `rct2.water.wtrcyan` | none (palette only) |
| peep_names, climate | `rct2.peep_names.original`, `rct2.climate.warm` | none |
| peep_animations x5 | `rct2.peep_animations.*` | `$G1` (see below) |
| rides | `openrct2.ride.hybrid_coaster`, `single_rail_coaster`, `alpine_coaster`, `modern_twister` | self-contained vehicles; **track sprites from g1** |

Every slot except water/peep_names/climate/vehicles currently resolves to proprietary sprites.

## Peep and staff sprites (objects vs g1)

Peeps are objects (`ObjectType::peepAnimations`, `src/openrct2/object/PeepAnimationsObject.cpp`), but **all 15
official peep_animations objects are pure `$G1` references** (`rct2/peep_animations/*.json`, class `needs:g1`):

| Object | Distinct g1 sprites | Ranges |
|---|---|---|
| `rct2.peep_animations.guest` | 4741 | icon 5490; body 6409..11228 |
| `rct2.peep_animations.handyman` | 181 | 5111; 11261..11440 |
| `rct2.peep_animations.mechanic` | 441 | 5116; 11441..11880 |
| `rct2.peep_animations.security` | 93 | 5096; 11881..11972 |
| entertainer_panda / tiger / elephant / roman / gorilla / snowman / knight / astronaut / bandit / sheriff / pirate | 157 / 197 / 221 / 289 / 133 / 217 / 213 / 133 / 273 / 157 / 233 | icons 5118..5128; bodies 11973..14184 |

Total 7679 distinct g1 sprites; the guest set alone is 4741 (all guest costume/held-item variants).

Engine dependencies on these objects: `Guest::generate` dereferences the guest animation object without a null
check (`src/openrct2/entity/Guest.cpp:7156-7172`), so at least one guest peep_animations object **must be
loaded** or spawning crashes; staff hire uses `findPeepAnimationsIndexForType` (`actions/peep/StaffHireNewAction.
cpp:148-155`). Loading a park saved before the peep-object version appends the whole legacy list of 15
(`park/ParkFile.cpp:422-426`, `park/Legacy.cpp:2275-2298`), and SV6 import always does (`S6Importer.cpp:1968`).

Key finding: peep/staff sprites are the largest single g1 dependency and no open replacement exists in the
object pool (OpenGraphics lists the peep model as a blocker). A standalone build must ship new
peep_animations objects with embedded `$LGX` images; the object format already supports that (same ImageTable
path as rides).

## Audio objects

- `Audio::LoadAudioObjects` loads `rct2.audio.base` (alias for `.rct2`/`.rctc`), `openrct2.audio.additional`
  and `rct2.audio.circus` (`src/openrct2/audio/Audio.cpp:100-114`, ids in `Audio.h:136-146`). Sound ids below
  `SoundId::liftRMC` come from the base object, the rest from `additional` (`Audio.cpp:186-200`).
- `rct2.audio.base.rct2` samples are `$RCT2:DATA/CSS1.DAT[n]` (64 samples); `rct2.audio.title` =
  `CSS17.DAT`; `rct2.audio.circus` = `CSS24.DAT`; `rct1.audio.title` = RCT1. Resolution is
  `ResourceTable::ParseSource` -> `env.FindFile(DirBase::rct2, DirId::data, ...)` (`object/ResourceTable.cpp:96-99`).
- The OpenSoundEffects pack (`assetpack/openrct2.sound.parkap`) overrides samples of `rct2.audio.base` via
  `AssetPackManager::LoadSamplesForObject` (`object/AudioObject.cpp:20-36`, `AssetPack.cpp:93-100`). Its
  manifest replaces **26 of 64** samples; the `$[a..b]` entries keep 38 base samples, which still resolve to
  CSS1.DAT. Missing files yield a null `IAudioSource`; playback checks for null and stays silent
  (`Audio.cpp:222-251`, `AudioSampleTable.cpp:135-145`), so no crash, but 38 SFX are silent without css1.dat.
- Music: the 27 `rct2.music.*` objects are image-less and their tracks come from asset packs; OpenMusic
  (`openrct2.music.cover.parkap`, `.alternative.parkap`) only covers `rct2.music.ragtime`, `.fairground` and
  the OpenRCT2-authored styles; the other RCT2 styles reference `CSS*.DAT` and would be silent. 5 rct2 music
  objects also reference an RCT2 DAT for their icon. Title music: `openrct2.audio.title` (open, ogg) exists.

## Title sequence

`openrct2.parkseq` (title-sequences pack) contains 17 community `.park` files (v59, zstd) and a script that
`LOAD`s each in turn. Scanning the parks' object lists: every one of them requires `rct2.peep_animations.guest/
handyman/mechanic/security/entertainer_elephant`, `rct2.peep_names.original`, `rct2.footpath_surface.dirt/
tarmac_brown`, `rct2.footpath_railings.bamboo_black`, plus per-park rct2/openrct2 path, music, climate and
wall objects (62 distinct JSON ids in total) and, stored as binary DAT descriptors not captured by the string
scan, the rct2 ride and scenery objects they were built with. The title player loads with
`objectManager.LoadObjects(result.RequiredObjects, true)` (`src/openrct2-ui/title/TitleSequencePlayer.cpp:
318-322`); missing objects throw and the player skips to the next `LOAD` (`TitleSequencePlayer.cpp:172-186`),
so with no matching parks the title screen shows an empty map. `rct1*.parkseq`/`rct2.parkseq` are RCT scenario
scripts. A standalone build needs its own title park (or a static title).

## Missing-object behaviour

- **Object missing from the repository** (park references an id that is not indexed):
  `ObjectManager::GetRequiredObjects` collects them and throws `ObjectLoadException` (`object/ObjectManager.cpp:
  541-580`); `scenarioMeta` is the only type silently skipped. `Context::LoadParkFromFile` catches it and opens
  the `objectLoadError` window listing the missing entries (`Context.cpp:873-891`), which offers to download
  legacy objects from `https://api.openrct2.io/objects/legacy/` (`openrct2-ui/windows/ObjectLoadError.cpp:47`).
  The park is **refused**, not loaded with placeholders. Same for SV6/SC6 (`S6Importer.cpp:219,1843-1975`).
- **Object present but its sprite source missing** (wrapper object whose `.DAT`/g1/csg is absent): the object
  loads with empty placeholder images and a warning; the park loads and plays but those things are invisible.
  Paths: `$RCT2:OBJDATA` -> `ImageTable::LoadObjectImages` logs "Unable to open 'X.DAT'" and pushes one blank
  `RequiredImage` per index (`ImageTable.cpp:288-345`) after `CreateObjectFromLegacyFile` logs the error at
  `ObjectFactory.cpp:315`; `$G1` out-of-range -> nullptr -> blank (`ImageTable.cpp:59-79`, `Drawing.Sprite.
  cpp:1088-1094`); `$CSG` not loaded -> blank with warning (`ImageTable.cpp:93-120`).
- **Observed (WASM, stub RCT2 zip: 29,294-entry g1.dat, empty `ObjData/`)**: object index built (2518 items),
  scenario/track indexes empty, engine reached the title scene and stayed responsive; the title parks loaded
  because all their objects are *indexed*, and the 849 `Unable to open X.DAT` warnings (434 rct2.ride, 227
  scenery_small, 104 scenery_wall, ...) came from loading those parks' wrapper objects with images
  (`ImageTable.cpp:337`), each producing blank sprites. Caveat on the screenshots: `boot-45s.png` and
  `red-45s.png` show intact RCT2 terrain/track/tree sprites, which cannot come from a blank g1.dat or an empty
  ObjData; `red2-30s.png` (marker g1) shows the expected red tiles for terrain and most track, with a few real
  sprites remaining. The launcher mounts `/OpenRCT2` as persistent IDBFS (`emscripten/static/index.js:88-89`),
  so a real g1.dat from an earlier session is the likely explanation for the first two runs; only the `red2`
  run should be treated as evidence, and it confirms "blank, not crash".
- **Ride type present but entry missing**: `GetRideEntryByIndex` returns nullptr and callers skip
  (`Research.cpp`, `NewRide.cpp`); no assertion.
- **No peep_animations loaded**: guest generation dereferences null (`Guest.cpp:7170-7172`): crash. This is the
  one hard runtime requirement beyond the editor gate.

## Verdict: can a reduced content pack operate cleanly?

**PARTIAL - YES for the object model, NO for the sprite supply.**

The engine does *not* assume the whole RCT2 universe at the object level: ride lists, research, scenery
windows and the editor are all driven by what is installed, and unused ride types are inert. A reduced set
(3 coasters, a few flat rides, shops, one surface/edge/station, two path surfaces, one railing, one entrance,
water, peep_names, climate, 5 peep_animations) satisfies every engine check. The blocking dependency is that
the sprites behind those objects, plus the track pieces and UI, live in g1.dat/ObjData.

Engine changes needed for a standalone build:

| # | Change | Where | Size |
|---|---|---|---|
| 1 | Ship an open `g1.dat` replacement (or rename) with >= 29294 entries; engine then needs no code change to boot. Alternative: make the RCT2 path optional and let `GfxLoadG1` load an OpenRCT2-provided base gx (`Context.cpp:400-409,999-1008`, `Drawing.Sprite.cpp:491-543`, `Platform.Common.cpp:148-169`). | Context / Drawing.Sprite / Platform.Common | small |
| 2 | Provide replacement sprites for every g1 index the code touches: track pieces (`paint/track/**`, ~12.9k literals), UI/tool/overlay sprites (~5.8k `SPR_*` non-G2), terrain/edge/station/peep objects (9737 via objects). Reduced scope can be enforced by shipping only the rides/objects you expose, but the *code* indices for hidden ride types just stay blank. | content (OpenGraphics-style), no code | large (content) |
| 3 | New `peep_animations` objects (guest + 4 staff types incl. one entertainer) with embedded `$LGX` images; ~5.4k sprites for the minimal guest+staff set at RCT2 fidelity. No engine change (`PeepAnimationsObject` already reads `images` like any object). | content | large (content), trivial (engine) |
| 4 | New terrain_surface, terrain_edge, station, path surface/railings and park_entrance objects with embedded images to replace the `$G1`/`$RCT2:OBJDATA` wrappers; update `kMinimumRequiredObjects` and the default lists to your ids (`DefaultObjects.cpp:14-160`, `Scenario.cpp:128`). | DefaultObjects.cpp, content | small (engine), medium (content) |
| 5 | Audio: either a full base audio object with 64 open samples (replace `rct2.audio.base` id in `Audio.h:140`) or extend the OpenSFX manifest to cover the 38 kept samples; provide `openrct2.audio.title` (exists) and drop `rct2.audio.circus`. Music: restrict shipped music objects to the OpenMusic-covered styles. | Audio.h/Audio.cpp + packs | small |
| 6 | Title: author a `.parkseq` whose park uses only shipped objects (or a static title). | content | small |
| 7 | Hide content: no engine filter exists; hiding = not installing the objects (ride lists/research follow), plus a UI pass to drop RCT-named strings. Optionally add a compile-time allowlist of ride types to skip unshipped `paint/track` code if binary size matters. | content / optional cmake | trivial-small |
| 8 | Launcher: remove the `Data/ch.dat` requirement and the RCT2 zip prompt (`emscripten/static/index.js:23,136`), pass `--rct2-data-path` to the bundled base directory. | index.js | trivial |

Caveats: (a) OpenGraphics (`.cache/opengraphics`) currently ships only scenery and vehicle sources, no
peep/track/UI sprites, so items 2-3 are net-new art; (b) legacy `.sv6/.sc6` and community `.park` files will
refuse to load (missing objects) which is acceptable for a standalone game but rules out "load any park";
(c) the WASM screenshots other than `red2` appear to have used a cached real g1.dat and should be re-run after
clearing IDBFS before quoting them.
