# OpenRCT2 object authoring spec (original content)

Engine source of truth: `/home/ssari/projects/theme-park/engine/openrct2` @ `d99eb5dcf7`.
All `file:line` citations below are relative to `engine/openrct2/`.
Reference objects: `.cache/assets/objects.zip`, extracted to `.cache/objfmt/all/`.
Sprite measurements: `.cache/tools/gxc details <images.dat> <idx>`.

This document is written for a team hand-authoring **original** art and metadata. Nothing here
requires RCT2 data files; where a stock object is cited it is only as a layout reference.

---

## 0. Quick reference — image table sizes

| objectType | total images | breakdown |
|---|---|---|
| `terrain_surface` | **58** min (64 if smoothing) | 1 icon + (6 pattern) + N×19 |
| `terrain_edge` | **85** (105 with doors) | 1 icon + 84 (or 104) edge images |
| `footpath_surface` | see §3 | |
| `footpath_railings` | see §3 | |
| `footpath_item` | see §4 | |
| `scenery_small` | see §5 | |
| `scenery_wall` | see §6 | |
| `station` | see §7 | |
| `park_entrance` | see §8 | |
| `water` | see §9 | |
| `scenery_group` | 1 (icon) | see §10 |

Universal anchor convention: a sprite's `x`/`y` offsets are **signed** and are **added** to the
screen position the paint code computes for the tile/element
(`libsawyer/tools/gxc/src/SpriteArchive.cpp:135-145` stores them as `int16`; the engine reads the
same 16-byte record at `src/openrct2/object/ImageTable.cpp:466-479`). Art that should appear
up-and-left of the anchor therefore uses **negative** x and y.

The isometric tile grid is **64 px wide × 31 px tall** for a flat tile; one Z step is **16 px**
vertically (`kCoordsZPerTinyZ`, used throughout `paint/tile_element/Paint.Surface.cpp`).

---

## 11. Common `object.json` header

Every object — whether a loose `.json` beside its assets, or an `object.json` inside a `.parkobj`
ZIP — is parsed by `ObjectFactory::CreateObjectFromJson`
(`src/openrct2/object/ObjectFactory.cpp:529-612`).

```jsonc
{
  "id": "yourprefix.scenery_small.oak_tree",
  "objectType": "scenery_small",
  "version": "1.0",
  "sourceGame": "custom",
  "authors": ["Your Name"],
  "properties": { /* per-type, see below */ },
  "strings": {
    "name": {
      "en-GB": "Oak Tree",
      "de-DE": "Eiche"
    }
  },
  "images": [
    { "path": "images/oak_0.png", "x": -13, "y": -55 }
  ]
}
```

### `objectType` — exact accepted strings

`ObjectFactory.cpp:423-445` (`kObjectTypeMap`). Anything not in this table makes
`CreateObjectFromJson` return `nullptr` and the object is silently skipped.

| string | C++ `ObjectType` |
|---|---|
| `ride` | `ride` |
| `scenery_small` | `smallScenery` |
| `scenery_large` | `largeScenery` |
| `scenery_wall` | `walls` |
| `footpath_banner` | `banners` |
| `footpath_legacy` | `paths` (deprecated combined path object) |
| `footpath_item` | `pathAdditions` |
| `scenery_group` | `sceneryGroup` |
| `park_entrance` | `parkEntrance` |
| `water` | `water` |
| `scenario_meta` | `scenarioMeta` |
| `terrain_surface` | `terrainSurface` |
| `terrain_edge` | `terrainEdge` |
| `station` | `station` |
| `music` | `music` |
| `footpath_surface` | `footpathSurface` |
| `footpath_railings` | `footpathRailings` |
| `audio` | `audio` |
| `peep_names` | `peepNames` |
| `peep_animations` | `peepAnimations` |
| `climate` | `climate` |

> Note: `wall` and `small_scenery` are **not** accepted spellings. Use `scenery_wall` and
> `scenery_small`. Likewise the footpath addition type is spelled `footpath_item`, and its C++
> class lives in `object/PathAdditionObject.cpp`, not `FootpathItemObject.cpp`.

### `id` naming rules

`id` is read at `ObjectFactory.cpp:545` and stored verbatim via `result->SetIdentifier(id)`
(`:588`). The engine performs **no syntactic validation** — the only hard constraints are:

* it must be unique across the loaded object repository (the repository keys on it,
  `object/ObjectRepository.cpp:219-222`);
* it is the string written into save games, so changing it breaks existing parks;
* two reserved values exist and are rewritten to a virtual id: the RCT2/RCTC base audio ids
  (`ObjectFactory.cpp:546-552`).

The universal **convention**, followed by every object in `objects.zip`, is three
dot-separated segments:

```
<sourceprefix>.<objectType>.<shortname>
```

e.g. `rct2.terrain_surface.grass`, `rct1beta.terrain_edge.brick`,
`openrct2.station.noentrance`, `rct2dlc.scenery_group.scgpanda`.

For original content pick a stable vendor prefix you own (not `rct1`/`rct2`/`openrct2`/`official`,
which are reserved for the upstream asset packs) and use it consistently; lowercase, ASCII,
`[a-z0-9_]` in each segment. The `<objectType>` segment must match the `objectType` field or the
file becomes very hard to find in tooling (nothing enforces it).

`originalId` (`ObjectFactory.cpp:557-580`) exists **only** to claim a legacy 8-character RCT2 DAT
entry name for save-game compatibility. **Omit it entirely for original content.** If present and
malformed (not exactly `8|8|8` characters) it is ignored; if its embedded object type disagrees
with `objectType` the engine logs an error and falls back (`:568-574`).

### `version`

Parsed by `VersionTuple` (`src/openrct2/object/Object.cpp:408-430`). Format `X.Y.Z`
(`VersionNumFields` = 3). Missing/empty → `0.0.0`. Fewer fields are allowed (`"1.0"` → `1.0.0`);
more than 3 logs a warning and the extras are dropped. Bump it whenever you change art or
properties so the repository can prefer the newer copy.

### `sourceGame`

Parsed by `ExtractSourceGames` (`ObjectFactory.cpp:491-522`) via `ParseSourceGame`
(`:223-237`). Accepts a **string or an array of strings**.

| JSON value | `ObjectSourceGame` (`object/ObjectSourceGame.h:17-25`) |
|---|---|
| `"custom"` | `custom` (0) |
| `"rct1"` | `rct1` (4) |
| `"rct1aa"` | `addedAttractions` (5) |
| `"rct1ll"` | `loopyLandscapes` (6) |
| `"rct2"` | `rct2` (8) |
| `"rct2ww"` | `wackyWorlds` (1) |
| `"rct2tt"` | `timeTwister` (2) |
| `"official"` | `openRCT2Official` (3) |

**Use `"custom"` for brand-new original content.** Any unrecognised string also falls back to
`custom` (`:236`), as does a missing/null/invalid `sourceGame` (`:508`, `:514`, `:519`).

What the repository does with `custom`:

* In the object-selection window it lands in the *Custom* source filter rather than an
  expansion-pack tab (`ObjectRepository.h:64` returns `custom` when no source is recorded).
* `ObjectRepository.cpp:93-98`: legacy `.DAT` generation objects are **only** loaded from user
  content when their source game is `custom`. JSON objects are unaffected.
* `ObjectList.cpp:195`: non-`custom` source games participate in DAT-entry matching when loading
  old parks. `custom` objects are matched purely by identifier — which is what you want.
* `PathAdditionObject.cpp:47` / `BannerObject.cpp:47`: a `custom` first-source-game object gets
  its *legacy* RCT1 scenery-group placement skipped. Harmless for original content.

Reserve `"official"` for objects actually shipped by the OpenRCT2 project.

### `authors`

`ObjectFactory.cpp:598-607`: an **array of strings**. Non-string elements are silently dropped.
Not used for anything functional; shown in the object info UI.

### `strings`

`object/StringTable.cpp:102-126`. Shape is `strings.<stringId>.<locale> = "text"`.

Accepted `stringId` keys — `StringTable::ParseStringId` (`StringTable.cpp:85-100`):
`name`, `description`, `park_name`, `details`, `capacity`, `vehicleName`.
Anything else is ignored.

`strings.name` is **required in practice** for every type in this document — each `Load()` calls
`LanguageAllocateObjectString(GetName())`, and an empty name shows as a blank row in the picker.

Locale keys are resolved with `LanguageGetIDFromLocale` (`StringTable.cpp:116`); an unknown locale
is silently dropped. The full accepted set (`localisation/Language.cpp:23-56`):

```
ar-EG ca-ES zh-CN zh-TW cs-CZ da-DK de-DE en-GB en-US eo-ZZ es-ES fr-FR fr-CA gl-ES
it-IT ja-JP ko-KR hu-HU nl-NL nb-NO pl-PL pt-BR ru-RU fi-FI sv-SE tr-TR uk-UA vi-VN
```

Always supply `en-GB` — it is the fallback ordering root
(`StringTable::Sort`, `StringTable.cpp:163-185`).

### `images` — accepted entry forms

All parsing is in `object/ImageTable.cpp`. `root["images"]` must be an **array**; each element is
either a string or an object. The array is flattened in order, and **the resulting flat index is
what every per-type table in this document refers to.**

`ImageTable::ReadJson` (`ImageTable.cpp:477-565`) also honours a sibling `"noCsgImages"` array,
used only as a fallback when RCT1's CSG is absent (`:484-489`) — irrelevant for original content.

#### String forms (`ImageTable::ParseImages`, `ImageTable.cpp:86-192`)

| form | meaning | line |
|---|---|---|
| `"path/to/file.png"` | a single PNG loaded and imported with default meta (offsets 0,0; RLE; OpenRCT2 palette) | `:174-190` |
| `"$LGX:images.dat[a..b]"` | entries `a..b` of a gx archive bundled with the object | `:151-170` |
| `"$LGX:images.dat"` | **all** entries of that archive | `:167-169` |
| `"$G1[n]"` / `"$G1[a..b]"` | indices into the base game `g1.dat` | `:124-139` |
| `"$CSG[a..b]"` | indices into RCT1's CSG | `:92-122` |
| `"$RCT2:OBJDATA/NAME.DAT[a..b]"` | images lifted out of a legacy RCT2 object | `:140-150` |
| `""` (empty string) | one blank placeholder image | `:88-91` |

**For original content use only `$LGX:` and bare PNG paths.** `$G1`, `$CSG` and
`$RCT2:OBJDATA/` all require the player to own RCT1/RCT2 data.

Range syntax (`ImageTable::ParseRange`, `:336-368`): `[n]` for one index, `[a..b]` inclusive.
`a > b` is legal and yields the range **reversed** (`:358-364`) — handy for mirroring, easy to
do by accident.

Out-of-range `$LGX` indices are replaced with blank placeholders and logged
(`ImageTable.cpp:249-260`), so a count mistake degrades to invisible sprites rather than a crash.

#### Object forms

**(a) gx reference with offset override** (`ImageTable.cpp:518-541`):

```json
{ "gx": "$LGX:images.dat[0..3]", "x": -32, "y": -16 }
```

`x`/`y` here **overwrite** the offsets stored in the gx entries, for every image the range yields.
Sentinel is `INT16_MAX`, so omitting a key leaves that axis untouched.

**(b) embedded PNG with import metadata** (`ImageTable.cpp:194-224` →
`Drawing::createImageImportMetaFromJson`, `src/openrct2/drawing/ImageImporter.cpp:441-464`):

```json
{
  "path": "images/tree.png",
  "x": -13, "y": -55,
  "format": "rle",
  "palette": "keep",
  "srcX": 0, "srcY": 0, "srcWidth": 64, "srcHeight": 96,
  "zoom": 0
}
```

| key | type | default | meaning | line |
|---|---|---|---|---|
| `path` | string | — | **required**; PNG relative to the object root | `ImageTable.cpp:198` |
| `x` | int16 | `0` | signed X draw offset | `ImageImporter.cpp:443` |
| `y` | int16 | `0` | signed Y draw offset | `:444` |
| `palette` | string | (convert) | **only** `"keep"` is special: use the PNG's own indices verbatim (`Palette::keepIndices`). Anything else → `Palette::openRCT2` (nearest-colour convert) | `:445-446` |
| `format` | string | (rle) | `"raw"` → uncompressed bitmap. Any other value (incl. omitted) → RLE | `:449-451` |
| `srcX`, `srcY` | int16 | `0` | crop origin inside the PNG | `:456-457` |
| `srcWidth`, `srcHeight` | int16 | `0` | crop size; `0` means "whole image" | `:458-459` |
| `zoom` | int32 | `0` | zoomed-sprite offset | `:460` |

Also note `ImageTable::GetImageSources` (`ImageTable.cpp:443-465`): a `"palette": "keep"` entry
makes the PNG be read as **8-bit indexed** (`ImageFormat::png`), everything else as RGBA32
(`ImageFormat::png32`). Several entries sharing one `path` load the source image only once, so
crop-from-spritesheet is cheap.

**Pitfall (engine bug):** `ImageImporter.cpp:453` reads `Json::GetBoolean("noDrawOnZoom")` —
a bare string literal, not `input["noDrawOnZoom"]`. The `noDrawOnZoom` import flag can therefore
**never** be set from JSON. Do not rely on it.

**Pitfall:** `Palette::keepIndices` forces source index 0 to transparent
(`ImageImporter.cpp:152-156`). If your indexed PNG uses index 0 for a real colour it will vanish.

### Packaging

A `.parkobj` is a **ZIP** containing `object.json` at the root plus any assets it references
(`ObjectFactory::CreateObjectFromZipFile`, `ObjectFactory.cpp:447-...`, which reads
`archive->GetFileData("object.json")`). Paths in `images` are resolved relative to the ZIP root.

```
myobject.parkobj (zip)
├── object.json
├── images.dat          # built by: gxc build images.dat sprites.json
└── images/…            # or loose PNGs, if you prefer embedded PNG entries
```

---

## 1. `terrain_surface`

Source: `src/openrct2/object/TerrainSurfaceObject.cpp` / `.h`, painted in
`src/openrct2/paint/tile_element/Paint.Surface.cpp`.

### (a) JSON

```json
{
  "id": "yourprefix.terrain_surface.meadow",
  "objectType": "terrain_surface",
  "version": "1.0",
  "sourceGame": "custom",
  "authors": ["Your Name"],
  "properties": {
    "price": 300,
    "mapColours": [73, 73],
    "smoothWithSelf": true,
    "smoothWithOther": true,
    "canGrow": true,
    "rotations": 1,
    "colour": null
  },
  "default": { "normal": 0, "grid": 1, "underground": 2 },
  "strings": { "name": { "en-GB": "Meadow" } },
  "images": ["$LGX:images.dat[0..63]"]
}
```

| field | type | default | meaning | line |
|---|---|---|---|---|
| `properties.colour` | colour name string | none (`kColourNull`) | if set, every surface image is drawn `WithPrimary(colour)` — i.e. the art is authored in the primary-remap ramp 243..254 and tinted | `TerrainSurfaceObject.cpp:85` |
| `properties.rotations` | int8 | `1` | number of distinct rotations the land tool offers | `:86` |
| `properties.price` | money64 | `0` | cost per tile to change land to this surface | `:87` |
| `properties.mapColours` | array of exactly 2 palette indices | `[0,0]` | minimap colours (checkerboarded); wrong length → both become `transparent` | `:95-104` |
| `properties.smoothWithSelf` | bool | false | enables edge smoothing against the same surface | `:88-92` |
| `properties.smoothWithOther` | bool | false | enables edge smoothing against *different* surfaces | `:88-92` |
| `properties.canGrow` | bool | false | grass-length simulation (mowing, growth) applies | `:88-92` |
| `properties.special` | array | `[]` | see below | `:106-124` |
| `default.normal` / `.grid` / `.underground` | uint32 | `0` / `1` / `2` | entry index used when no `special` rule matches | `:127-140` |

> **Either `smoothWithSelf` or `smoothWithOther` being true changes the image table layout.**
> See (b).

### (b) Image table

`TerrainSurfaceObject::Load()` (`TerrainSurfaceObject.cpp:23-36`):

```
IconImageId        = image 0
if (smoothWithSelf || smoothWithOther):
    PatternBaseImageId = 1            // 6 images: 1..6
    EntryBaseImageId   = 7
else:
    EntryBaseImageId   = 1
NumEntries = (imageCount - EntryBaseImageId) / 19      // kNumImagesInEntry = 19
```

`kNumImagesInEntry = 19` is `TerrainSurfaceObject.h:38`.

| index range | meaning |
|---|---|
| `0` | **icon** for the land-tool button (43×32 @ (2,2) in `rct1beta.terrain_surface.wildflowers`) |
| `1..6` | **smoothing patterns**, *only if* `smoothWithSelf` or `smoothWithOther`. 6 tint levels, 64×63 @ (0,0). Selected by `GetSurfacePattern(obj, offset)` where `offset` is one of the six tint values in the `Byte97B524/537/54A/55D` tables (`Paint.Surface.cpp:82-104`, used at `:238-250` and `:420-428`). Drawn as the *content* of a masked blit against `SPR_TERRAIN_EDGE_MASK_*`. |
| `EntryBase + 19*n + s` | **entry `n`, slope variant `s`** (`s` = 0..18) |

There is **no** separate "special image set"; `properties.special` merely selects *which entry
index* to use for a given (grass length, rotation, tile-parity) combination
(`TerrainSurfaceObject::GetImageId`, `:144-175`). The grid and underground variants are also
just ordinary entries, selected by `default.grid` / `default.underground` (`:147-158`).

#### The 19 slope variants

The paint code computes `image_offset = Byte97B444[surfaceShape]`
(`Paint.Surface.cpp:1024-1025`, and again for underground at `:1213`), where `surfaceShape` is the
rotation-adjusted slope (`ViewportSurfacePaintSetupGetRelativeSlope`, `:312-319`).

`Byte97B444` (`Paint.Surface.cpp:47-49`) is the slope→offset map. Inverted, with slope bit names
from `world/tile_element/Slope.h:19-24` (`N=1, E=2, S=4, W=8`, `diagonal=16`):

| offset | slope value | corners raised | measured size @ offset (wildflowers, entry 0 = images 7..25) |
|---|---|---|---|
| 0 | 0 | flat | 64×31 @ (−32, 0) |
| 1 | 2 | E | 64×32 @ (−32, −1) |
| 2 | 1 | N | 64×16 @ (−32, 0) |
| 3 | 3 | N+E | 62×16 @ (−32, −1) |
| 4 | 8 | W | 64×32 @ (−32, −1) |
| 5 | 10 | E+W (valley) | 64×32 @ (−32, −1) |
| 6 | 9 | N+W | 62×16 @ (−30, −1) |
| 7 | 11 | N+E+W (S down) | 64×16 @ (−32, −1) |
| 8 | 4 | S | 64×47 @ (−32, −16) |
| 9 | 6 | E+S | 64×47 @ (−32, −16) |
| 10 | 5 | N+S (valley) | 64×32 @ (−32, −16) |
| 11 | 7 | N+E+S (W down) | 63×31 @ (−32, −16) |
| 12 | 12 | S+W | 64×47 @ (−32, −16) |
| 13 | 14 | E+S+W (N down) | 64×47 @ (−32, −16) |
| 14 | 13 | N+S+W (E down) | 63×31 @ (−31, −16) |
| 15 | 15, **and 30** | steep: diagonal+E+S+W | 64×63 @ (−32, −32) |
| 16 | 27 | steep: diagonal+N+E+W | (dummy 1×1 in wildflowers) |
| 17 | 23 | steep: diagonal+N+E+S | 63×32 @ (−32, −17) |
| 18 | 29 | steep: diagonal+N+S+W | 63×32 @ (−31, −17) |

Notes:
* Slope `15` (all four corners up) never occurs in a real map, so **offset 15 is in practice the
  4th steep variant** — `Byte97B444[30] == 15` routes the diagonal+E+S+W case there.
* All other slope values (16..22, 24..26, 28, 31) map to offset 0.
* The sprites are cropped to their visible top face, so heights vary: raising the screen-top
  corner grows the sprite upward (`y = −16`, height 47), raising the screen-bottom corner
  *shortens* it (height 16, `y = 0`).
* Offsets you never expect to see may be 1×1 dummies, but **all 19 must exist** — the engine
  indexes arithmetically and never bounds-checks.

#### Minimum grass surface

1 icon + 3 entries × 19 = **58 images** (normal, grid, underground), or **64** if you enable
smoothing (adds the 6 patterns). Both counts are confirmed across every stock object:

| object | images | smoothing | entries |
|---|---|---|---|
| `openrct2.terrain_surface.void` | 58 | no | 3 |
| `rct1beta.terrain_surface.wildflowers` | 64 | yes | 3 |
| `rct2.terrain_surface.dirt` / `.rock` / `.sand*` / `.ice` / `.martian` / `.grass_clumps` | 64 | yes | 3 |
| `rct2.terrain_surface.grid_*` | 58 | no | 3 |
| `rct2.terrain_surface.chequerboard`, `rct1ll.*.rust`, `rct1ll.*.wood` | 115 | no | 6 |
| `rct2.terrain_surface.grass` | 444 | yes | 23 |

A *minimal* grass surface must supply: icon; 6 patterns (if you want landscape smoothing);
entry 0 = normal grass (19 slopes); entry 1 = the same art with gridlines overlaid (19); entry 2 =
the underground/"x-ray" variant (19). Set `default` to `{normal:0, grid:1, underground:2}` (this
is also the implicit default, `TerrainSurfaceObject.cpp:136-140`).

#### Anatomy of `rct2.terrain_surface.grass`'s 444 `$G1` images

From `.cache/objfmt/all/rct2/terrain_surface/rct2.terrain_surface.grass.json`:

```json
"images": ["$G1[5579]", "$G1[28959..28964]", "$G1[1915..1971]", "$G1[2663..3042]"]
```

| object index | source | count | purpose |
|---|---|---|---|
| 0 | `$G1[5579]` | 1 | icon |
| 1..6 | `$G1[28959..28964]` | 6 | smoothing patterns (6 tint levels) |
| 7..63 | `$G1[1915..1971]` | 57 | entries **0..2** × 19: `0` = mown grass normal, `1` = mown grass + grid, `2` = mown grass underground |
| 64..443 | `$G1[2663..3042]` | 380 | entries **3..22** × 19 — the grass-length and tile-parity variants |

Total 1 + 6 + 57 + 380 = **444**, i.e. `(444 − 7) / 19 = 23` entries.

Entries 3..22 are addressed purely through `properties.special` (32 rules in that file). Decoded:

| entries | selected when | meaning |
|---|---|---|
| 0 | fallback (`default.normal`) | fully mown grass |
| 1 | fallback (`default.grid`) | mown grass, gridlines |
| 2 | fallback (`default.underground`) | mown grass, underground view |
| 3, 4 | `length 0`, `rotation 1` or `3` (4 = grid) | mown grass, alternate rotation |
| 5, 6 | `length 0`, `rotation 0` or `2` (6 = grid) | mown grass, alternate rotation |
| 7..14 | `length 4` or `5`, `variation 0..3` (odd = grid) | medium grass, 4 tile-parity variants |
| 15..22 | `length 6`, `variation 0..3` (odd = grid) | long grass, 4 tile-parity variants |

`length` is `tileElement.getGrassLength() & 7`, passed in at `Paint.Surface.cpp:1036-1042`; it is
`0xFF` (match-any) at zoom > 0 or when the base is hidden (`:1032-1039`). `variation` is
`(tileX & 1) | ((tileY << 1) & 2)` (`TerrainSurfaceObject.cpp:159-160`) — a 2×2 de-tiling pattern.
`rotation` is the viewport rotation.

### (c) Sprite size and anchor

* Flat tile: **64 × 31**, offset **(−32, 0)**. The anchor is the tile's screen origin; `−32`
  centres the 64-wide diamond horizontally.
* Slope variants: width stays 62–64, height 15–63, `y` ranges 0 to −32 (see the table above).
* Icon: **43 × 32 @ (2, 2)** (grass/wildflowers); the edge icon is 42×32 @ (2,2).
* Smoothing patterns: **64 × 63 @ (0, 0)** — they are mask *content*, not positioned sprites.
* Drawn with bounding box `{32, 32, -1}` at `{0,0,height}` (`Paint.Surface.cpp:1055`).

### (d) Flags

Only three, all booleans inside `properties`, parsed at `TerrainSurfaceObject.cpp:88-92`:
`smoothWithSelf`, `smoothWithOther`, `canGrow`. `smoothWith*` is what makes the 6 pattern images
required and shifts `EntryBaseImageId` from 1 to 7.

### (e) Pitfalls

* Turning smoothing on/off **shifts every entry index by 6**. Change the flag and the image list
  together.
* `NumEntries` is integer division; a total image count that is not `base + 19n` silently
  truncates and the trailing images are dead.
* `mapColours` must have exactly 2 elements or both silently become `PaletteIndex::transparent`
  (`:97-104`) — an invisible minimap.
* If you set `properties.colour`, the art must be drawn in the primary-remap ramp (palette
  243..254), because `GetImageId` applies `WithPrimary` unconditionally (`:170-174`).
* Landscape smoothing only runs at zoom 0 and only when `Config::general.landscapeSmoothing` is on
  (`Paint.Surface.cpp:1200-1207`), so test with it enabled.
* Smoothing requires **both** tiles to opt in when the surfaces differ (`:413-417`); when the
  surfaces are identical it needs `smoothWithSelf` (`:408`).

---

## 2. `terrain_edge`

Source: `src/openrct2/object/TerrainEdgeObject.cpp` / `.h`; painted by
`ViewportSurfaceDrawTileSideBottom` (`paint/tile_element/Paint.Surface.cpp:471-640`) and
`ViewportSurfaceDrawTileSideTop` (`:642-777`).

### (a) JSON

```json
{
  "id": "yourprefix.terrain_edge.sandstone",
  "objectType": "terrain_edge",
  "version": "1.0",
  "sourceGame": "custom",
  "authors": ["Your Name"],
  "properties": { "hasDoors": false, "doorSound": 0 },
  "strings": { "name": { "en-GB": "Sandstone" } },
  "images": ["$LGX:images.dat[0..84]"]
}
```

| field | type | default | meaning | line |
|---|---|---|---|---|
| `properties.hasDoors` | bool | false | object supplies the 20 extra door-tunnel images | `TerrainEdgeObject.cpp:57` |
| `properties.doorSound` | uint32 0..2 | `0` | `0` none, `1` door, `2` portcullis (`audio/Audio.h:154-160`) | `:58-62` |

`properties` may be an empty object; both fields are optional.

### (b) Image table

`Load()` (`TerrainEdgeObject.cpp:22-30`): `IconImageId = 0`, `BaseImageId = 1`.
Everything below is an offset from `BaseImageId`, i.e. **object index = offset + 1**.

`GetEdgeImage(obj, type)` (`Paint.Surface.cpp:278-293`) maps four "sets" onto base offsets
`{0, 20, 10, 30}` (`:280-285`):

| set offset | selected by | purpose |
|---|---|---|
| **0..9** | `GetEdgeImage(_, 0)` (`:527`) | normal land edge |
| **10..19** | `GetEdgeImage(_, 2)` (`:714`) | water edge |
| **20..29** | `GetEdgeImage(_, 1)` (`:530`, `:717`, `:734`) | underground / x-ray edge |
| **30..35** | `GetEdgeImage(_, 3)` (`:729`) | top-edge incline overlays |
| **36..83** | `GetTunnelImage` (`:295-310`) | 12 regular tunnel types × 4 |
| **84..103** | same, only if `hasDoors` | 5 door tunnel types × 4 |

Within each 10-image set, `+5` selects the mirrored direction
(`baseImageId.WithIndexOffset(5)` for `EDGE_BOTTOMRIGHT`, `:533-536`; and for `EDGE_TOPLEFT`
at `:722` / `:734`):

| sub-offset | role | line | measured (`rct1beta.terrain_edge.brick`) |
|---|---|---|---|
| `+0` | full 16-px wall segment | `:574`, `:627` | 32×31 @ (−2, −15) |
| `+1` | top filler, leading corner higher | `:631-637` | 31×31 @ (−2, −15) |
| `+2` | top filler, trailing corner higher | `:631-637` | 32×16 @ (−2, 0) |
| `+3` | bottom filler, corner A lower | `:539-553` | 31×31 @ (−1, −15) |
| `+4` | bottom filler, corner B lower | `:539-553` | 30×15 @ (−2, −15) |
| `+5..+9` | the same five, mirrored | — | same sizes, x ≈ −30 |

The **top set (30..35)** is indexed `GetEdgeImage(_,3).WithIndexOffset((edge==TOPLEFT?3:0)+incline)`
where `incline = (cornerHeight2 − cornerHeight1) + 1 ∈ {0,1,2}` (`Paint.Surface.cpp:727-731`):

| offset | edge | incline | measured |
|---|---|---|---|
| 30, 31, 32 | TOPRIGHT | 0, 1, 2 | 31×31 @ (0,0), 32×16 @ (0,0), 32×1 @ (0,−1) |
| 33, 34, 35 | TOPLEFT | 0, 1, 2 | 31×31 @ (−31,0), 32×16 @ (−32,0), 32×1 @ (−32,−1) |

**Tunnels.** `kTunnels[]` (`Paint.Surface.cpp:114-141`, `static_assert(std::size(kTunnels) == kTunnelTypeCount)`
at `:142`) gives each tunnel type an `imageOffset`. Each type occupies **4** consecutive images:

```
GetTunnelImage(obj, type, edge)
  = BaseImageId + kTunnels[type].imageOffset + (edge == EDGE_BOTTOMRIGHT ? 2 : 0)   // :306-307
…lower half drawn at :603, upper half as .WithIndexOffset(1) at :616
```

so: `+0` bottom-left lower, `+1` bottom-left upper, `+2` bottom-right lower, `+3` bottom-right upper.

| offset | tunnel type |
|---|---|
| 36 | standardFlat (also `standardFlatTo25Deg`) |
| 40 | standardSlopeStart |
| 44 | standardSlopeEnd |
| 48 | invertedFlat (also `invertedFlatTo25Deg`) |
| 52 | invertedSlopeStart |
| 56 | invertedSlopeEnd |
| 60 | squareFlat (also `squareFlatTo25Deg`) |
| 64 | squareSlopeStart |
| 68 | squareSlopeEnd |
| 72 | invertedSquare (also `invertedSquareFlatTo25Deg`) |
| 76 | pathAndMiniGolf |
| 80 | path11 |
| 84 | doorClosed |
| 88 | doorOpeningOutward |
| 92 | doorOpenOutward |
| 96 | doorOpeningInward |
| 100 | doorOpenInward |

`kRegularTunnelTypeCount = 16`, `kTunnelTypeCount = 26`
(`paint/tile_element/Paint.Tunnel.h:50-51`). The 26 types collapse onto 17 distinct
`imageOffset`s because the `…FlatTo25Deg` variants reuse their flat counterpart's art.

### Totals

| | edge images | object images (incl. icon) |
|---|---|---|
| `hasDoors: false` | 84 (offsets 0..83) | **85** |
| `hasDoors: true` | 104 (offsets 0..103) | **105** |

Verified against every stock object: all 7 non-door edges are exactly 85 images; all 9 RCT1
door edges (`rct1aa.*`, `rct1ll.*`) are exactly 105.

### (c) Sprite size and anchor

* Wall segments: **~30–32 × 15–31**, `x` ≈ −2 (bottom-left side) or ≈ −30 (bottom-right side),
  `y` = −15 or 0. One segment covers one 16-px Z step.
* Top incline overlays: 31×31 / 32×16 / 32×1, `x` 0 (top-right) or −31/−32 (top-left).
* Tunnels: taller, e.g. first tunnel image 28×42 @ (−2, −31); 19×41 @ (11, −25) for the upper half.
* Icon (index 0): **42 × 32 @ (2, 2)**.

### (d) / (e) Flags and pitfalls

* `hasDoors: true` **obliges** you to supply offsets 84..103. If you set it and don't,
  `GetTunnelImage` will index past your table. If you leave it false, the engine clamps any
  door tunnel type back to `standardFlat` (`Paint.Surface.cpp:303-304`) — safe.
* `UsesFallbackImages()` also disables doors (`:300`).
* The water set (10..19) is mandatory even for a "land only" edge; it is what you see at the
  waterline.
* All four sets share the same 5-shapes-×-2-directions layout; authoring only one direction and
  mirroring in your pipeline is the normal workflow.
