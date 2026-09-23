# Audio, music, title-sequence, scenario and string status for a standalone build

Scope: how far the open content packs get an OpenRCT2 build that has **no RCT2 files**. Engine commit
`d99eb5dcf7` (`engine/openrct2`). Packs as pinned by the engine's `assets.json`: objects v1.7.11,
OpenMusic v1.6.1, OpenSoundEffects v1.0.6, title-sequences v0.4.26 (all in `.cache/assets/`).
"Standalone" here means: the engine runs and plays without a `game_path`; the separate RCT2-directory
gate and sprite (g1/ObjData) coverage are handled in `asset-dependencies.md`.

Method: read the engine's resolution code, unpacked every pack, parsed each `object.json`/`manifest.json`,
and parsed the `.park` files inside the title sequence (OrcaStream, zstd) to list their object dependencies.

## Summary of verdicts

| Item | Verdict | One-line reason |
|---|---|---|
| Sound effects | **INSUFFICIENT** (29/67 SoundIds open) | OpenSoundEffects overrides 26 of the 64 `rct2.audio.base` slots; 38 IDs still read `css1.dat` and go silent without it |
| Ride music (30 RCT2 styles) | **INSUFFICIENT** (10 full + 1 partial of 30) | 19 RCT2 styles and the circus track have no open replacement; they load but play nothing |
| Added open music (11 styles) | SUFFICIENT | All in `openmusic.zip`, self-contained OGG, CC-BY-SA-4.0 / PD |
| Title music | SUFFICIENT (default) | Default is `openrct2.audio.title` (OpenMusic); the RCT2/random options can pick a silent track |
| Title sequence | **INSUFFICIENT** | All 17 parks in `openrct2.parkseq` depend on 782 RCT2 DAT objects; rct1/rct2 sequences need RCT scenarios |
| Scenarios | **INSUFFICIENT** (content), engine OK | Engine ships no scenarios; `.park` scenarios work without RCT2 code paths, but OpenScenarios parks use RCT2 objects |
| Strings | SUFFICIENT | Object names come from objects, not `en-GB.txt`; ~79 strings mention RCT1/RCT2 for rebranding |
| Engine changes needed | small | None for playback fallbacks (all missing audio degrades to silence); title screen needs an own sequence; optionally hide RCT2 title-music/scenario tabs |

## 1. Sound effects

### How a SoundId is resolved

- `SoundId` enum: `src/openrct2/audio/Audio.h:60-128`. 67 real IDs (`liftClassic` = 0 … `liftFlume` = 66) plus
  `noScream` = 254 and `null` = 255. `kRCT2SoundCount` = 63 (`Audio.h:130`, IDs 0–62 are the original css1 set).
- `Audio.cpp:100-114 LoadAudioObjects()` loads three objects: `rct2.audio.base`, `openrct2.audio.additional`,
  `rct2.audio.circus`.
- `Audio.cpp:186-201 GetAudioObjectAndSampleIndex()`: IDs `>= liftRMC` (64, 65, 66) come from
  `openrct2.audio.additional` (sample index minus 64); everything else, **including `crowdAmbience` = 63**, is
  sample `id` of `rct2.audio.base`.
- `rct2.audio.base` is a virtual id: `ObjectFactory.cpp:547-552` renames `rct2.audio.base.rct2` (or `.rctc` when
  the install is RCT Classic) to it so asset packs can target one name.
- `objects.zip: rct2/audio/rct2.audio.base.rct2.json` has **64 samples**: `$RCT2:DATA/CSS1.DAT[0..62]` (with
  per-sample volume modifiers) + `$RCT2:DATA/CSS2.DAT` (slot 63, crowd ambience).
- Loading: `AudioObject.cpp:19-33 Load()` copies the object's table, then
  `AssetPackManager::LoadSamplesForObject()` overlays enabled packs (`AssetPack.cpp:83-90`,
  `AudioSampleTable.cpp:79-109 LoadFrom`). A pack slot whose source has no stream (the `$[a..b]` placeholders
  parse to an empty path via `ResourceTable.cpp:47-107 ParseSource` and `ObjectAsset::GetStream` returns null,
  `Object.cpp:357-372`) is skipped, so the original css1 entry stays.
- Missing css1: `AudioSampleTable.cpp:135-171 LoadSample` gets a null stream and returns a null source; every
  play path checks for null (`Audio.cpp:222-231, 243-249, 465-470`). Result: **silence, no crash, no dialog**.
  (The "audio file truncated" message box at `AudioSampleTable.cpp:154-160` fires only when the file exists but is short.)

### What OpenSoundEffects v1.0.6 provides

`opensfx.zip` = `assetpack/openrct2.sound.parkap` (manifest + 25 WAVs) and
`object/official/audio/openrct2.audio.additional.parkobj` (3 WAVs: hybrid lift, hybrid roar, log-flume lift).
The parkap manifest targets `rct2.audio.base` with 64 slots, of which **26 carry a file** and 38 are `$[..]`
placeholders (`click_in.wav` is used twice, so 25 distinct files).

### Coverage table

| Group | Count | Status |
|---|---|---|
| SoundIds in engine (0–66) | 67 | |
| Covered by OpenSoundEffects pack (slots of `rct2.audio.base`) | 26 | 4 click1, 5 click2, 10 scream5, 13 purchase, 18 trainWhistle, 19 trainDeparting, 22 rideLaunch1, 23 rideLaunch2, 28 rain, 29 thunder1, 30 thunder2, 32 trackFrictionWater, 33 balloonPop, 34 mechanicFix, 36 toiletFlush, 37 click3, 39 newsItem, 48 blockBrakeClose, 49 blockBrakeRelease, 50 error, 51 brakeRelease, 52 liftArrow, 53 liftWood, 56 liftBM, 57 trackFrictionBM, 63 crowdAmbience |
| Covered by `openrct2.audio.additional` (own WAVs) | 3 | 64 liftRMC, 65 trackFrictionRMC, 66 liftFlume |
| **Open total** | **29 / 67 (43 %)** | |
| Still `css1.dat`-dependent (silent standalone) | **38** | 0 liftClassic, 1 trackFrictionClassicWood, 2 frictionClassic, 3 scream1, 6 placeItem, 7 scream2, 8 scream3, 9 scream4, 11 scream6, 12 liftFrictionWheels, 14 crash, 15 layingOutWater, 16 water1, 17 water2, 20 waterSplash, 21 goKartEngine, 24–27 cough1–4, 31 trackFrictionTrain, 35 scream7, 38 quack, 40 windowOpen, 41–43 laugh1–3, 44 applause, 45 hauntedHouseScare, 46–47 hauntedHouseScream1–2, 54 trackFrictionWood, 55 liftWildMouse, 58 scream8, 59 tram, 60 doorOpen, 61 doorClose, 62 portcullis |

The gaps are the ones players hear most: the default lift/friction loops (0, 1, 2, 12, 31, 54, 55), all but one
scream, placing objects (6), crash (14), water (15–17, 20), go-karts (21), peeps (24–27, 38, 41–44) and the
haunted house.

### CSS files the engine references

The engine itself hard-codes no css file. `PlatformEnvironment.cpp:165-176 FindFile()` only rewrites
`css*.dat` → `css*.ogg` for RCT Classic installs. All css references live in object JSON:

| File | Referenced by | Purpose |
|---|---|---|
| `CSS1.DAT[0..62]` | `rct2.audio.base.rct2` | 63 sound effects |
| `CSS2.DAT` | `rct2.audio.base.rct2` slot 63 | crowd ambience |
| `CSS3.DAT`, `CSS18`–`CSS23`, `CSS25`–`CSS46` | `rct2.music.*` (30 objects) | one ride-music track each |
| `CSS4.DAT`–`CSS16.DAT` | `rct2.music.fairground` | 13 fairground-organ tracks |
| `CSS17.DAT` | `rct2.audio.title` (and `rct1.audio.title` = `$RCT1:DATA/CSS17.DAT`) | RCT2 / RCT1 title theme |
| `CSS24.DAT` | `rct2.audio.circus` | circus show music (`RideAudio.cpp:270`) |
| `CUSTOM1.WAV`, `CUSTOM2.WAV` | `rct2.music.custom1/2` | legacy custom music slots |

`rct2.audio.base.rctc.json` is the RCT Classic variant (same slots, different file names). Nothing else in
`src/` reads a css file.

**Verdict: INSUFFICIENT.** 38 of 67 sound IDs are silent without `css1.dat`. No engine change is needed for
graceful degradation; the fix is content (38 more samples in an asset pack targeting `rct2.audio.base`, or a
fork of the pack). The pack format already supports it slot-by-slot.

## 2. Music

### How ride music is resolved

- `DefaultObjects.cpp:47-88` lists 41 music objects preselected in new scenarios: 30 `rct2.music.*` and 11
  `openrct2.music.*`. (`rct2.music.custom1/2` exist in `objects.zip` but are not in the default list.)
- `MusicObject.cpp:30-70 Load()` applies asset-pack overrides exactly like audio objects, then opens each
  track to read its length. `MusicObject.cpp:221-231 GetAsset()` resolves `$RCT2:DATA/…` through
  `FindFile(DirBase::rct2, DirId::data)`. A missing file yields a null stream → track size from
  `Asset.GetSize()` (0) → `RideAudio.cpp:172-180` gets a null source and plays nothing. The style stays in the
  ride's music dropdown, so a standalone user can pick silent styles.

### Where the open music lives

Correction to the task brief: **`objects.zip` contains no `official/music` or `official/audio` directory**;
the 11 `openrct2.music.*` objects and `openrct2.audio.title` are shipped in `openmusic.zip` (`object/official/music/`),
and `openrct2.audio.additional` in `opensfx.zip`. Both zips are needed alongside `objects.zip`.

`openmusic.zip` (42.9 MB):

| File | What | Size |
|---|---|---|
| `assetpack/openrct2.music.alternative.parkap` | 9 OGGs overriding `rct2.music.{dodgems, martian, space, fantasy, techno, ice, jurassic, rock1, modern}` (the same recordings as the `openrct2.music.*` additions below) | 7.8 MB |
| `assetpack/openrct2.music.cover.parkap` | 3 OGGs: overrides `rct2.music.ragtime` (Searchlight Rag cover) and slots 5 and 7 of the 13-track `rct2.music.fairground` (Slavonic Dance, Das Alpenhorn, re-recorded on the original RCT organ by Herman Riddering); slots 0–4, 6, 8–12 are placeholders | 2.6 MB |
| `object/official/music/openrct2.music.{galaxy, acid, dodgems, blizzard, extraterrestrial, prehistoric, mystic, rock4, progressive}.parkobj` | 9 new single-track styles | 0.16–1.4 MB each |
| `object/official/music/openrct2.music.ragtime2.parkobj` | 4 PD rags (Johnson, Joplin ×2, Scott) | 3.6 MB |
| `object/official/music/openrct2.music.fairground2.parkobj` | "Fairground organ style 2", 18 organ tracks (Stolz, Lara, Eilenberg, Sousa, Lincke, Lanner, Strauss II, Teike, Waldteufel, Ricketts …), `rideTypes: [merry_go_round]`, `niceFactor: 1` | **19.6 MB** |
| `object/official/music/openrct2.audio.title.parkobj` | `title.ogg`, OpenRCT2 main theme by Allister Brimble | 0.9 MB |

Is `fairground2` needed? Not for the engine to start. It is in `DefaultObjects.cpp` and every title-sequence
park and OpenScenarios park lists all 11 `openrct2.music.*` ids, so dropping it breaks loading those parks
("missing object"). If we ship our own parks it can be omitted or trimmed (18 tracks → a few) to save ~19 MB.

### Style table (RCT2 styles, `objects.zip: rct2/music/*.json`)

| Style object | RCT2 source | RCT2-dependent? | OpenMusic replacement | License of replacement |
|---|---|---|---|---|
| rct2.music.dodgems | css3 | no | alternative pack: "Bumblebeat" (Jalmaan) | CC-BY-SA-4.0 |
| rct2.music.fairground (13 tracks) | css4–css16 | **partial** (11/13 silent) | cover pack: Slavonic Dance, Das Alpenhorn | PD compositions, CC-BY-SA recordings |
| rct2.music.roman | css18 | **yes** | none | – |
| rct2.music.oriental | css19 | **yes** | none | – |
| rct2.music.martian | css20 | no | alternative: "Style of the Extraterrestrial" | CC-BY-SA-4.0 |
| rct2.music.jungle | css21 | **yes** | none | – |
| rct2.music.egyptian | css22 | **yes** | none | – |
| rct2.music.toyland | css23 | **yes** | none | – |
| rct2.music.space | css25 | no | alternative: "Pandora" | CC-BY-SA-4.0 |
| rct2.music.horror | css26 | **yes** | none | – |
| rct2.music.techno | css27 | no | alternative: "Airtime Junkies" | CC-BY-SA-4.0 |
| rct2.music.gentle | css28 | **yes** | none | – |
| rct2.music.summer | css29 | **yes** | none | – |
| rct2.music.water | css30 | **yes** | none | – |
| rct2.music.wildwest | css31 | **yes** | none | – |
| rct2.music.jurassic | css32 | no | alternative: "The Ancient Lands" | CC-BY-SA-4.0 |
| rct2.music.rock1 | css33 | no | alternative: "Rush" | CC-BY-SA-4.0 |
| rct2.music.ragtime | css34 | no | cover: "Searchlight Rag" | PD composition, CC-BY-SA recording |
| rct2.music.fantasy | css35 | no | alternative: "Mystic Winds" | CC-BY-SA-4.0 |
| rct2.music.rock2 | css36 | **yes** | none | – |
| rct2.music.ice | css37 | no | alternative: "Snowbound" | CC-BY-SA-4.0 |
| rct2.music.snow | css38 | **yes** | none | – |
| rct2.music.medieval | css39 | **yes** | none | – |
| rct2.music.urban | css40 | **yes** | none | – |
| rct2.music.organ | css41 | **yes** | none (Widor Toccata is PD, recording is not) | – |
| rct2.music.mechanical | css42 | **yes** | none | – |
| rct2.music.modern | css43 | no | alternative: "Sonar" | CC-BY-SA-4.0 |
| rct2.music.pirate | css44 | **yes** | none (Drunken Sailor is PD; README lists it as claimed) | – |
| rct2.music.rock3 | css45 | **yes** | none | – |
| rct2.music.candy | css46 | **yes** | none | – |
| rct2.audio.circus (audio obj) | css24 | **yes** | none | – |
| rct2.music.custom1/2 | CUSTOM1/2.WAV | user files | n/a | – |

Totals: 30 RCT2 styles → **10 fully replaced, 1 partially (2/13), 19 silent** standalone, plus the circus
track silent. 11 `openrct2.music.*` styles are fully open. Net standalone: 21 playable styles + partial
fairground, 20 silent entries in the dropdown.

Per-track license classes (OpenMusic `README.md` + `COPYING`): everything CC-BY-SA-4.0 by default;
"All Ragtime styles, all Fairground organ styles, Pirate style" are declared public domain. Note for
`fairground2`: the *recordings* are CC-BY-SA; several *compositions* are not life+70 PD in the EU (Robert Stolz
†1975, Agustín Lara †1970, Nico Dostal †1981). The upstream claim covers the arrangement-for-organ tradition;
treat those three composers' tracks as a licensing review item if we redistribute commercially.

**Verdict: INSUFFICIENT for the RCT2 styles (19 silent + circus), SUFFICIENT for the 11 added styles.** No
engine change needed for graceful silence. Minimal content fix: an asset pack with 19 tracks targeting the
remaining `rct2.music.*` ids (any OGG per style), or hide unreplaced styles from the dropdown (engine UI tweak).

## 3. Title sequence and title music

### Title music

- `Config.cpp:448-449`: default `title_theme` = `TitleMusicKind::OpenRCT2`.
- `Audio.cpp:262-292`: OpenRCT2 → `openrct2.audio.title` (OpenMusic, `title.ogg`); RCT2 → `rct2.audio.title`
  (`CSS17.DAT`, silent standalone); RCT1 only offered when an RCT1 path is set; `random` picks uniformly among
  the available kinds, so standalone "random" is silent half the time.
- **Verdict: SUFFICIENT** with the default. Recommended small change: drop the RCT2 entry from the options
  dropdown when no RCT2 path exists (UI only).

### Default title sequence (`openrct2.parkseq`, 8.7 MB, selected by `current_title_sequence = "*OPENRCT2"`, `Config.cpp:402`)

- `TitleSequenceManager.cpp:36-42`: five predefined sequences, `*RCT1`, `*RCT1AA`, `*RCT1AALL`, `*RCT2`,
  `*OPENRCT2`; loaded from `DirBase::openrct2/sequence` (line 256) and the user dir (line 262).
- `openrct2.parkseq` = `script.txt` + `Credits.txt` + **17 community `.park` files** (v59 OrcaStream, zstd).
  Script: `LOAD <park>`, `ZOOM`, `ROTATE`, `LOCATION`, `WAIT` per park, looping.
- `rct2.parkseq` / `rct1*.parkseq` are scripts only, using `LOADSC <scenario name>` (RCT2: Six Flags Magic
  Mountain; RCT1: Diamond Heights, Katie's Dreamland, …), which `TitleSequencePlayer.cpp:150-165` resolves via
  `ScenarioRepository::GetByInternalName`, i.e. they need the RCT1/RCT2 scenario files.
- Object dependencies of the 17 parks (parsed from the `objects` chunk): 247–878 objects per park; **832
  distinct legacy DAT entries, all resolvable in `objects.zip`: 782 → `rct2/*` objects, 36 → `official/*`,
  14 → `rct1/*`**, plus JSON ids (`rct2.*` 22–34 per park, `openrct2.music.*` 11, `rct1beta.*`,
  `toontowner.*`, `official.*`). The `rct2.*` objects draw their sprites from `$RCT2:OBJDATA/*.DAT`, so every
  park needs the RCT2 install (and the RCT1 ones need RCT1 or fail).
- Failure mode without RCT2: `TitleSequencePlayer.cpp:172-183` logs `LOAD (command n) failed…`, skips to the next
  load command; after all 17 fail it reports "Infinite loop detected" and `Update()` returns false
  (`:190-194`), leaving an empty title backdrop. No crash.

**Verdict: INSUFFICIENT.** Nothing in the shipped sequences is usable without RCT data. A standalone build needs
its own `.parkseq` (script + parks built solely from image-carrying open objects), which is gated on the
open sprite set; until then, a script with no `LOAD` (static backdrop) is the fallback.

## 4. Scenarios

### What the engine needs

- `ScenarioRepository.cpp:125-134`: scans `*.sc4;*.sc6;*.sea;*.park` in the RCT1 and RCT2 `Scenarios` dirs and
  the user scenarios dir. **The engine ships no scenarios and does not scan its own data dir.**
- `.park` scenarios: `ParkFile.cpp:213-241 ReadScenarioChunk()` reads category, name, details and objective from
  the file and sets `SourceGame = ScenarioSource::other` (`:238`). `ScenarioSelect.cpp:107-111, 793` groups by
  `SourceGame`, so every `.park` scenario lands in the "Other parks" tab, sub-grouped by its category.
- `ScenarioSources.cpp:122-345`: 180 title rows (RCT1 22, AA 30, LL 30, RCT2 15, WW 17, TT 14, UCES 18, Real
  parks 8, Extras 26) matched by name (`TryGetByName`, `:361-392`); unknown names fall through to
  `source = other, category = other, textObjectId = {}`. This table is only consulted for SC4/SC6 imports.
- `scenario_meta` objects (`objects.zip`, 180 `.parkobj`: rct1 22 + rct1aa 30 + rct1ll 33, rct2 27, rct2ww 17,
  rct2tt 14, official/{rct1dlc 17, rct1tw 1, rct2dlc 1, uces 18}) carry localised scenario name, park name and
  description for the original scenarios. `S6Importer.cpp:293` attaches the matching one on import and
  `Scenario.cpp:95-100` copies its strings into the game state. They are text only, useless without the
  matching RCT scenario file, and harmless to keep or drop.
- Scenario editor: `.park` saved by the editor already contains the scenario chunk; placed in the user
  scenarios dir it appears under "Other parks". No RCT2 code path is involved — only the objects it references
  matter.

### What exists in the open

- **OpenRCT2/OpenScenarios** (CC-BY-SA-4.0, active, pushed 2026-09-15): the official "asset replacement"
  campaign. `campaign/` has 8 finalist `.park` files (slots 01, 02, 03, 06, 08, 09, 20), `submissions/` 79 more.
  Not yet bundled by the engine (not in `assets.json`; no release with assets, last tag `old-repo`).
- Their style guide requires RCT2/WW/TT/official objects only. Parsed two campaign parks: `dawn-meadows` 510
  objects (437 DAT → `rct2/*`, 19 → `official/*`, 34 `rct2.*` JSON, 11 `openrct2.music.*`, 3 `rct1beta.*`,
  1 `rct1.*`), `suburbia` 511 objects (449 → `rct2/*`). So they too need RCT2 sprites.
- Other GitHub hits (`Fred104theCenturion/OpenRCT2-Custom-Scenarios`, 450+ scenarios, no license) are not
  usable without licensing clarification and are SC6/RCT2-object based anyway.

**Verdict: INSUFFICIENT as content, SUFFICIENT as engine.** The engine can list, load and play `.park`
scenarios with zero RCT2 code involvement; what is missing is a scenario set whose objects carry their own
images. OpenScenarios is the right template (CC-BY-SA, `.park`, campaign structure) but inherits the sprite
problem. Needed: (a) our own scenarios built in the editor from the open object set, (b) a bundled scenario
dir scanned by the repository (small engine change: add `DirBase::openrct2` scenarios path at
`ScenarioRepository.cpp:130-135`) or ship them into the user dir at install time.

## 5. Strings / localisation

`data/language/en-GB.txt`: 3,842 strings. Breakdown by id block: 0xxx 371, 1xxx 956, 2xxx 706, 3xxx 298,
5xxx 703, 6xxx 744, 7xxx 64.

- `STR_0002`–`STR_0099`: ~93 **ride-type** names ("Spiral Roller Coaster", "Miniature Railway", …). These are
  engine ride types (track types), not object names, and are generic English.
- **Object names are not in the language file.** Vehicle/scenery names ("Corkscrew Trains", "Pipeline Bogie":
  0 hits) come from each object's own `strings` table in its `object.json` (`Object::GetStringTable`,
  `MusicObject.cpp:32 LanguageAllocateObjectString`). Scenario names: 0 hits for RCT1/RCT2 park names; they
  come from `scenario_meta` objects or the `.park` file.
- 79 strings mention "RollerCoaster Tycoon", RCT1/RCT2 or expansion names (scenario-tab labels, title-sequence
  names, options text such as "Select rides by track type (like in RCT1)", "Title sequences from RCT1/2 require
  imported scenarios to function"). These are the rebranding surface.

**Verdict: SUFFICIENT.** No object or scenario content depends on the language file; rebranding is a
~79-string edit per language.

## 6. Licenses

| Pack | Version | License | Notes |
|---|---|---|---|
| OpenRCT2/objects | 1.7.11 | CC-BY-4.0 | JSON/parkobj definitions; `rct2/*` objects reference RCT2 sprites by file |
| OpenRCT2/OpenSoundEffects | 1.0.6 | code MIT; samples CC-BY-4.0 (`LICENSE.ASSETS`) | `Credits.txt`: most recorded by Karst van Galen Last, crowd by Ted John (CC-BY-4.0); `cash1` CC-BY-4.0 (Dan_AudioFile), `brake_fix` from CC0 samples, `dinghy_slide` CC-BY-4.0 (tosha73) |
| OpenRCT2/OpenMusic | 1.6.1 | CC-BY-SA-4.0 (`COPYING`) | README: Ragtime, Fairground organ and Pirate styles public domain (compositions); recordings still CC-BY-SA. Share-alike applies to derivatives of the tracks |
| OpenRCT2/title-sequences | 0.4.26 | CC-BY-4.0 | 17 community parks, credited in `Credits.txt`; the parks embed RCT2 object references, not RCT2 data |
| OpenRCT2/OpenScenarios | git (no release) | CC-BY-SA-4.0 | `.park` files; share-alike would apply to modified copies |

Per track class: engine-composed replacements (Jalmaan, Skyshard, Flyxxpy, Blackened Blue, Approaching
Nirvana, Silver Aura/Greyfade, Brimble title) = CC-BY-SA-4.0; ragtime2/ragtime cover/fairground covers =
PD compositions, CC-BY-SA recordings; fairground2 = CC-BY-SA recordings, composition status mixed (see §2).

## 7. Verdicts with required actions

| Item | Verdict | Reason | Action |
|---|---|---|---|
| Sound effects | INSUFFICIENT | 38/67 SoundIds still resolve to `CSS1.DAT` (`Audio.cpp:186-201`, `rct2.audio.base.rct2.json`), silent standalone | Content: 38 samples in an asset pack targeting `rct2.audio.base`; no engine change |
| Ride music | INSUFFICIENT | 19 of 30 `rct2.music.*` + circus read `$RCT2:DATA/css*.dat` (`MusicObject.cpp:221-231`) with no override; silent but selectable | Content: 20 tracks; optional UI change to hide unplayable styles |
| Added music + title music | SUFFICIENT | `openmusic.zip` objects are self-contained; default title theme is `openrct2.audio.title` (`Config.cpp:448`) | Ship `openmusic.zip` objects (decide on the 19.6 MB `fairground2`); hide RCT2 title-theme option (UI) |
| Title sequence | INSUFFICIENT | 17/17 parks need `rct2/*` objects (782 DAT refs); rct1/rct2 sequences need RCT scenarios; player degrades to empty screen (`TitleSequencePlayer.cpp:172-194`) | Content: own `.parkseq` once open sprites exist; interim static script |
| Scenarios | INSUFFICIENT (content) / SUFFICIENT (engine) | Engine ships none and scans only RCT/user dirs (`ScenarioRepository.cpp:125-134`); `.park` scenarios need no RCT2 code (`ParkFile.cpp:213-241`); OpenScenarios parks need RCT2 objects | Content: own `.park` campaign; NEEDS ENGINE CHANGE (small): scan a bundled scenario dir |
| Strings | SUFFICIENT | Object/scenario names are object data; 79 RCT-referencing UI strings | Rebranding edit only |
