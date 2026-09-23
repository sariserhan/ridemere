# OpenGraphics: coverage of RCT2 base graphics and reusable authoring pipeline

Snapshot date: 2026-09-23. Sources: OpenGraphics shallow clone at commit `930b014`
(2026-01-09, `.cache/opengraphics`), the live progress spreadsheet (fetched as CSV),
GitHub API, engine checkout `d99eb5d` (2026-09-22, `engine/openrct2`), the official
objects bundle (`.cache/assets/objects.zip`), and shallow clones of
`OpenRCT2/Blender-RCT-Graphics` (`a300660`, 2026-03-16), its wiki, the OpenGraphics wiki
and `OpenRCT2/libsawyer` (`99dcddc`, 2026-01-24).

## 1. What OpenGraphics is today

OpenGraphics (github.com/OpenRCT2/OpenGraphics, GPL-3.0, created 2016) is the official
OpenRCT2 sub-project to replace every RCT2 graphic with free equivalents. In practice it
is a small, mostly dormant repository of Blender 2.79 source models plus pre-rendered
sprite archives, with one build script that packs them into an OpenRCT2 asset pack.

Repository state (commit `930b014`, the latest on `master`):

| Item | Value |
|---|---|
| Last commit | 2026-01-08 (README link fix); last content commit 2023-12-06 (Spooky theme) |
| Contributors | 9 (oli414 40 commits, zrowny 32, IntelOrca 12, others 1-2) |
| Open issues / PRs | 5 issues (roadmap, workflow, peep model, wiki nit) / 1 PR (`[WIP] Generic peep 3D model`, 2022) |
| Releases | 0. Only CI artifacts ("OpenRCT2 Open Graphics Asset Pack", 46,629 bytes, 2026-01-08, expired) |
| Stars / forks | 86 / 15 |
| Rendered objects committed | 19 (`rct2/scenery/**/output/images.dat`), 82 sprites total |
| Source models committed | 32 `.blend` (several are versioned duplicates, e.g. `SSK1_V001..V008`), 4 unrendered vehicle models (BBOAT, ARRT1, KART1, MONO1, "old project setup") |
| Textures | 9 JPGs, CC0 (cgbookcase) |

The README lists the blockers in the project's own words: no agreed peep model (blocks
every ride vehicle), no track renderer other than X7's private-ish tool, the GFX asset
pack engine feature was never merged, flat rides need per-ride sprite cutting the add-on
cannot do, and vegetation rendering "requires further research".

The README's Google spreadsheet ("ObjData", 10 tabs) is the real progress tracker and
is far ahead of the repository: it marks 209 RCT2 small-scenery objects as Done, but only
17 of those are in git. The Done rows are almost all attributed to "Joshua Jacobs"
(GitHub `leicestersquare`, who committed the Spooky theme). Those renders are therefore
not publicly available and cannot be verified or reused.

## 2. Artefacts and formats

### 2.1 Repository layout

```
manifest.json                  asset-pack manifest (id, authors, version, localised name/description)
build.mjs                      Node script that assembles the asset pack
rct2/<theme>/<OBJ>/            one folder per replaced RCT2 object
    <OBJ>.blend                Blender 2.79 source (required deliverable)
    rct2.<type>.<obj>.json     asset-pack entry: {"id","authors","images":"$LGX:output/images.dat"}
    output/images.dat          gx sprite archive rendered by the Blender add-on + gxc
rct2/<theme>/textures/*.jpg    shared CC0 textures
openrct2/                      (empty) intended for OpenRCT2-official objects
```

`.gitignore` excludes `*.png`, `sprites.json`, `object.json`, `*.parkobj`: the repo keeps
only the model and the compiled `images.dat`, not the intermediate PNGs.

### 2.2 What `build.mjs` produces

1. Finds every `*.*.json` under `rct2/` and `openrct2/`.
2. For each, resolves `images`: `$LGX:file.dat` (whole archive; count read from
   `gxc details`), `$LGX:file.dat[a..b]` (range), or an inline array of PNG entries
   (collected into `temp/images.json` and compiled with `gxc build`).
3. Merges every per-object `images.dat` into one `temp/images.dat` with `gxc merge`,
   rewriting each object's `images` to `$LGX:images.dat[start..end]` in a global index space.
4. Writes `temp/manifest.json` (= `manifest.json` + `objects[]`) and zips
   `manifest.json` + `images.dat` into `out/openrct2.graphics.opengraphics.parkap`.

So the artefact is a single **`.parkap` asset pack** (a zip with `manifest.json` and one
gx archive), not a set of `.parkobj` objects and not a `g1.dat` replacement. Its manifest
targets objects by id; it has no concept of g1 sprite indices.

### 2.3 gx archive (`images.dat`, what `gxc` reads and writes)

Same binary layout as `g1.dat`: header `{uint32 numEntries, uint32 dataSize}`, then
`numEntries` x 16-byte elements `{uint32 dataOffset, uint16 width, height, offsetX,
offsetY, flags, zoomOffset}`, then the pixel blob. Flags seen in OpenGraphics output:
`transparent` and `transparent|rle`. `gxc list <dat>` prints these per entry.

### 2.4 `sprites.json` (input to `gxc build` and to the engine's `sprite build`)

Array of entries. Accepted forms (from `libsawyer/tools/gxc/src/SpriteManifest.cpp`):

| Entry | Meaning |
|---|---|
| `""` | one empty sprite |
| `"$[a..b]"` | `b-a+1` empty sprites |
| object | one image, fields below |

Object fields: `path` (PNG, relative to the json), `x`/`x_offset`, `y`/`y_offset`
(draw offsets, ints), `format` (`"rle"`, `"bmp"`/`"raw"` uncompressed, `"palette"`),
`palette: "keep"` (image is already indexed to the OpenRCT2 palette; import indices
verbatim), `colours` (inline palette array), `zoom` (zoomOffset), `srcX`, `srcY`,
`srcWidth`, `srcHeight` (crop a sub-rectangle of a larger PNG). Conversion of non-indexed
PNGs is selected with `gxc -m default|closest|dithering`.

The engine's own importer (`ImageImporter::createImageImportMetaFromJson`) reads the same
keys `x`, `y`, `palette:"keep"`, `format:"raw"`, `noDrawOnZoom`, `srcX/srcY/srcWidth/
srcHeight`, `zoom`, and defaults to RLE. `resources/g2/sprites.json` (170 entries, 7 with
`palette:"keep"`) is the reference example.

### 2.5 `.parkobj` and object image references

A `.parkobj` is a zip containing `object.json` plus any files it references. The engine
(`object/ImageTable.cpp`) resolves each `images[]` entry as:

| Reference | Source |
|---|---|
| `"$G1[a..b]"` | indices of the loaded `g1.dat` |
| `"$CSG[a..b]"` | RCT1 `csg1.dat` (placeholder if not installed) |
| `"$RCT2:OBJDATA/NAME.DAT[a..b]"` | images of an original RCT2 `.DAT` object |
| `"$LGX:file.dat"` / `"$LGX:file.dat[a..b]"` | a gx archive inside the zip |
| `"path/to.png"` | a PNG inside the zip (32-bit, converted to palette) |
| `{ "path", "x", "y", "palette", "format", "srcX".. }` | PNG with import metadata |

Every one of the 2,086 vanilla objects shipped in `objects.zip` is a JSON stub using
`$RCT2:OBJDATA/...` or `$G1[...]`; the 419 `.parkobj` files are OpenRCT2-official additions
with their own images.

## 3. Coverage by category

Method key: **repo** = counted with `gxc details` on committed `images.dat` files;
**sheet** = live spreadsheet rows with Status = Done/WIP (fetched 2026-09-23, unverifiable
renders); **base** = counts computed from `objects.zip` (`rct2.*` JSON stubs; image counts
summed from `$RCT2:OBJDATA/..[a..b]` and `$G1[a..b]` ranges); **g1** = ranges from the
OpenGraphics wiki `G1.DAT` page cross-checked with `src/openrct2/SpriteIds.h`
(`SPR_G1_END = 29294`).

### 3.1 Object graphics (RCT2 base game only; WW/TT expansions excluded)

| Category | RCT2 base objects / images | In OpenGraphics repo (verified) | Sheet Done / WIP (unverified) | Verified coverage |
|---|---|---|---|---|
| Small scenery | 333 / 2,616 | 17 objects, 68 sprites | 209 / 94 (1,712 Done sprites) | 5.1% objects, 2.6% images |
| Large scenery | 48 / 1,906 | 1 (SSK1), 12 sprites | 13 / 9 (380 Done sprites) | 2.1% / 0.6% |
| Walls | 126 / 652 | 1 (WALLRK32), 2 sprites | 25 / 36 | 0.8% / 0.3% |
| Tracked-ride vehicles | 95 / ~167,600* | 0 (4 `.blend`, no renders) | 1 (MONO1) / 6 | 0% |
| Flat rides | 20 / (in ride total) | 0 | not tracked in sheet | 0% |
| Stalls, shops, facilities | 40 / (in ride total) | 0 | not tracked in sheet | 0% |
| Footpath banners | 9 / 72 | 0 | 1 / 1 | 0% |
| Footpath surfaces | 12 / 0 (use g1) | 0 | 0 / 0 (8 listed) | 0% |
| Footpath railings | 6 / 0 (use g1) | 0 | not tracked | 0% |
| Path additions (footpath_item) | 18 / 166 | 0 | not tracked | 0% |
| Park entrances | 3 / 36 | 0 | 0 / 0 | 0% |
| Scenery group icons | 29 / 58 | 0 | 0 / 0 | 0% |
| Peep animations (objects wrapping g1) | 15 / 7,679 | 0 (peep model unresolved, issue #17) | none | 0% |
| Terrain surfaces / edges / water / stations (objects wrapping g1) | 14+4+6+12 / 1,303+ | 0 | none | 0% |
| **Total object-level** | 858 objects | 19 objects, 82 sprites | 249 Done | ~2% of objects |

\* Ride image total 167,600 is the sum of `$RCT2:OBJDATA` ranges over all 155 `rct2.ride.*`
stubs (tracked rides, flat rides and stalls together); the sheet's own figure for the 95
tracked rides is 177,055. Ride sprites dwarf everything else: 155 ride objects hold ~92%
of all RCT2 object images.

Two of the 19 committed objects carry wrong ids: `rct2.scenery_small.ssk1` and
`rct2.scenery_small.wallrk32`. The real objects are `rct2.scenery_large.ssk1` (12 images,
matches the 12 rendered sprites) and `rct2.scenery_wall.wallrk32` (2 images). In an asset
pack these entries would never match anything.

Expansion content is out of scope for the project today: the sheet lists WW (354 small
scenery, 185 walls, 87 large, 56 rides) and TT (430, 2, 114, 56) with 0 Done.

### 3.2 `g1.dat` (29,294 sprites; not replaceable by any current mechanism)

| g1 region | Sprites | OpenGraphics status |
|---|---|---|
| Track pieces and ride-specific structures | ~13,800 | 0 (no track renderer in the add-on) |
| Guest peeps | 4,852 | 0 (blocked on peep model) |
| Staff and entertainer costumes | 2,924 | 0 |
| Terrain surfaces incl. zoom variants | 2,717 | 0 |
| UI icons, height markers, logos, clock hands, misc UI | 1,578 | 0 |
| Fonts | 1,053 | 0 (project unsure they need replacing) |
| Supports and path underlays | 738 | 0 |
| Particles/effects | 492 | 0 |
| Stations, entrances, floors, fences | 445 | 0 |
| Terrain edges | 340 | 0 |
| Palettes, markers, water, smoothing masks | ~340 | 0 |

The engine treats these by hardcoded `SPR_*` index; only the parts that vanilla objects
already wrap via `$G1[...]` (peep animations, terrain surfaces/edges, water, footpath
surfaces/railings, stations, entrances: roughly 9,500 sprites) could ever be overridden
through an object-level asset pack.

### 3.3 Headline

Verified, public, buildable OpenGraphics output replaces **82 of ~180,000 RCT2 object
images (0.05%) and 0 of 29,294 g1 sprites**; by object count 19 of 858 base objects (2.2%).
Even taking the spreadsheet at face value, coverage is 249 objects (29%), almost all
small scenery, and 0 of the categories that dominate sprite count (rides, peeps, track).

## 4. Engine support status

**The current engine cannot consume OpenGraphics' `.parkap` for graphics at all.**

- `src/openrct2/AssetPack.h/.cpp` (checkout `d99eb5d`): an `AssetPack` holds only an
  `AudioSampleTable`; `AssetPack::Load()` reads `manifest.objects[]` and only processes a
  `samples` key. An `images` key is silently ignored. The manager exposes just
  `LoadSamplesForObject`, used by `AudioObject` and `MusicObject`.
- Changelog: asset packs arrived in `#18050` (Oct 2022) as the audio-only reduction of
  IntelOrca's `#17081` "First implementation of asset packs" (Apr 2022, 85 files, closed
  unmerged), which was the graphics version OpenGraphics tested in 2022 and which, per
  its own description, overrode images of small-scenery objects only.
- `#25246` "Graphics support in asset packs" (Gymnasiast, opened 2025-09-23, **still an
  open draft**, last updated 2026-01-11, 34 files, +780/-641, zero review comments)
  rebases that work: adds `drawing/Gx.cpp`, reworks `ImageTable`, and lets an enabled pack
  replace an object's image table by object id. The author explicitly removed the
  `ImageObject` type that would have replaced `g1.dat`, so even when merged the mechanism
  is **object-image override only, no g1 index override**. Known gaps listed in the PR:
  x/y overrides for gx references don't apply, possible image-table duplication.
- There is no `gfx`-specific code path anywhere in `src/` (`grep -ri parkap|GfxAssetPack`
  returns only the audio manager).

What works today, unchanged: `.parkobj` objects with embedded PNGs or `$LGX` archives are
fully supported through `ImageTable`, including per-image `x/y/palette/format/src*` metadata
and automatic zoom-level generation on load. But the object repository rejects a second
object with an id already registered ("object conflicts found", first found wins, see
`ObjectRepository.cpp` ~L404), so replacement art has to be shipped either as new object
ids or by physically replacing the official object files in the data directory.

Conclusion: OpenGraphics content can only reach the screen today as **objects**, not as a
g1 replacement; and for RCT2's own objects only by editing the shipped stubs.

## 5. Authoring toolchain

### 5.1 Components and versions

| Tool | Version / licence | Role |
|---|---|---|
| Blender | **2.79 only** ("Blender Render" scanline engine, removed in 2.8; add-on `bl_info.blender = (2,79,0)`; issue #57 asks for an update, no work visible) | modelling, rendering, compositor masks |
| RCT Graphics Helper add-on | v0.6.1 in source (release v0.6.0, 2025-10-04, "added color correction"); GPL-3.0; 27 open issues; branch `track-rendering` (2023-12-18, "preview, do not use") | drives camera rig, angles, palette, packaging |
| ImageMagick | 7.0.8-6+, Q16 **non-HDRI** | quantisation, dithering, masking, trimming, offsets |
| gxc (libsawyer) | v1.4.0 (2026-01-24), MIT, prebuilt linux/musl/win binaries | `build` sprites.json -> gx, `merge`, `list`, `details`, `export(all)` |
| Node.js 16+ | | `build.mjs` asset-pack assembly |
| OpenRCT2 CLI | | `openrct2 sprite build` is an alternative sprites.json compiler (same schema) |

### 5.2 Scene and camera (from `builders/scene_builder.py`, `operators/render_operator.py`, `init_operator.py`)

- World scale: 1 tile = 4 x 4 Blender units; 1 height unit (8 px step) = 1.63299 BU.
  Object floor centre at world origin; wall front face at Y=0, back at +Y (0.1 BU thick).
- Rig: empty `Rig` (yaw -45 deg base, rotation mode YXZ) -> `VerticalJoint` -> camera and
  lights. View angle sets the joint yaw (`view_angle - 45`); vehicle pitch/bank/mid-roll
  set the `Rig` Euler (bank, pitch, mid).
- Camera: orthographic, pitched 60 deg from vertical (30 deg elevation, the RCT 2:1
  dimetric), located (0, -241.947, 139.739), clip 220-340, `shift_y = 0.25`,
  `ortho_scale = 169.72 / (1920 / resolution_x)` (= 8.486 BU across a 96 px frame;
  1 BU = 11.31 px, so a tile diagonal spans 64 px), tiny `shift_x` correction.
- Render frame: **96 x 96 px**, RGBA, transparent background, 8-bit PNG, no compression.
  Anti-aliasing: box filter, 5 samples, filter size 1.4 (matches Simon Foster's recollection
  of the 3DS Max settings used for RCT2). Optional "anti-alias with background" reproduces
  the RCT1 dark outline; "maintain aliased silhouette" masks with a non-AA render.
- Lights: Sun "MainLight" energy 1.3, Euler (67.5, 0, 90) deg, ray shadows, soft size 0.5,
  4 adaptive QMC samples; Sun "FillerLight" 0.5, (0, -72.5, 115); Hemi "LightDome" 0.1 no
  specular; environment light 0.15 raytrace. Shadows can be toggled per object. The
  OpenGraphics wiki derived the original light angle as ~30 deg (RCT2) vs ~25.4 deg (RCT1).
- Materials: Blender Internal, diffuse 1.0, Phong specular; textures FELINE filter 0.4,
  no mipmaps; **material pass index 1/2/3 marks recolourable regions** (0 = fixed colour).
  A "WorldPosition" override material and object/material index passes feed the compositor.
- Render layers: `Editor` (main) plus `Riders 1..8` (each peep pair on its own layer,
  z-masked by the vehicle).
- Compositor: outputs the colour image plus a 16-bit EXR "meta" image whose channels
  encode material index (recolour id), tile index (for multi-tile objects) and object
  index (occlusion layers); a curve + hue/sat node applies the v0.6 colour correction.

### 5.3 Rotations, angles and frame counts (from operators and `angle_sections/track.py`)

- **Tiles** (scenery, flat rides): `viewing_angles` N (default 4) at 360/N increments;
  `object_width` x `object_length` for large scenery (one sprite per tile; column-split
  sprites, which RCT2 uses for most large scenery, are **not supported**);
  `number_of_animation_frames` iterates the timeline. Start index conventions: small
  scenery 0, vehicles 3 (3 hand-made preview images first), large scenery 4 (4 previews).
- **Walls**: 2 angles (0 and 90 deg) with fixed pixel offsets (-14,-8) and (15,-7);
  `double_sided` adds 180/270 deg; `sloped` uses timeline frames 1 and 2 for the two lifted
  variants (blank frames inserted so double-sided walls share the sloped layout);
  `doorway` renders 6 animation frames x 4 angles with 2 occlusion layers.
- **Vehicles**: sprite groups chosen by track-ability flags mirror the engine's
  `VEHICLE_SPRITE_FLAG_*`. Each section is `[diagonal, angle_count, pitch, bank, mid]`,
  e.g. flat: 32 yaw steps; gentle slopes: 4 at +/-11.1026, 32 at +/-22.2052; steep: 8 at
  +/-40.36, 32 at +/-58.5148; vertical: 4 at 75, 32 at 90, 4 each at 105..180; diagonal
  slopes: 4 at +/-8.0503/16.1005/49.1035 (rig yaw +45); banked: 8 at +/-22.5, 32 at +/-45;
  inline twist: 4 each at 67.5..157.5 bank; corkscrews: 20 combined pitch/bank/mid poses x 4;
  restraint animation: 3 extra timeline frames x 4 angles; curved lift hill: 32 at 9.8287.
  `inverted_set` repeats everything with +180 deg roll. Riders: up to 8 sets, each rendered
  with the same angle list on its own layer with the rider palette (black, salmon,
  transparent) and 2 recolourables (shirt/trousers).
- **Track**: the `master` operator is an empty stub. The `track-rendering` branch adds a JSON
  "track pieces" format (`res/tracks/rct2_track_pieces.json`, one type
  `wild_mouse_coaster.json`), spline-based piece geometry, per-orientation outputs and
  tile-index masking, and bundles `magick.exe`/`gxc.exe` for Windows; it is unfinished
  (released as v0.5.0 "Track rendering preview, do not use"). Issue #51 says track rendering
  works in a Locomotion fork and "needs backporting for OpenRCT2's plethora of pieces".
- **Zoom levels**: none are rendered. Sprites are produced at zoom 0 only; the engine
  downsamples RLE sprites on the fly (`Drawing.Sprite.cpp`, `hasZoomSprite` optional). Only
  g1 terrain has hand-made zoom variants.
- **Flat rides**: no mode; each flat ride needs bespoke sprite cutting (README blocker).

### 5.4 Palette and dithering (`palette_manager.py`, `models/palette.py`, `magick_command.py`, `post_processor.py`)

- The palette is assembled per render as an ImageMagick montage of colour-group PNGs in
  `res/palettes/groups/` (20 hue ramps: black/greys, lavender, violet, blue, teal,
  yellow-green, sea green, light/dark olive, lime, yellow, bright yellow, orange, salmon,
  sandy brown, tan brown, bordeaux, bright red, magenta, plus transparent; optional
  animated water, water sparkle, chain-lift, and the two "recolour 1" ramps). Presets:
  `FULL`, `VEHICLE` (greys only), `CUSTOM` (checkbox per group). Ramps used by recolourables
  are excluded from the base palette to avoid bleeding.
- Quantisation: `magick ... -dither FloydSteinberg -define dither:diffusion-amount=5%
  -remap <palette.png> -colorspace sRGB`, output `PNG8`. Recolourable regions are cut out
  via the material-index mask, quantised separately to a single ramp (recolour 1 is
  rendered as clover green then colour-replaced to OpenRCT2's orange ramp `#6F332F..#FFCF4B`;
  recolour 2 magenta; recolour 3 yellow) and composited back.
- Trim: `-border 1 -trim` with `%[fx:page.x-page.width/2] %[fx:page.y-page.height/2]`
  gives the sprite offset; the add-on then adds +15 px, subtracts the lens-shift
  (`0.25 * 96 = 24 px`), adds the user `y_offset` and any per-angle offset. Multi-tile
  sub-sprites get `dx = -(x*32 - y*32)`, `dy = -(y*16 + x*16)` per tile.

### 5.5 Output, packaging and validation

1. `output/sprites/sprite_<n>.png` (indexed PNG8) for every frame.
2. `output/sprites.json`: `[{ "path": "sprites/sprite_0.png", "x": -8, "y": -13 }, ...]`,
   ordered by output index (existing entries are overwritten from `out_start_index`).
3. Optional `gxc build images.dat sprites.json` -> `output/images.dat` (what OpenGraphics commits).
4. Optional `.parkobj`: the add-on injects `"images": "$LGX:images.dat"` (or the inline PNG
   list) into a hand-written `output/object.json` (must contain `id`), zips
   `object.json` + `images.dat` (or the PNGs) as `<id>.parkobj`, and can copy it to
   `OpenRCT2/object/`.
5. Optional OpenGraphics asset pack: runs `node build.mjs` in the OpenGraphics checkout and
   can copy the `.parkap` to `OpenRCT2/assetpack/`.
6. Validation available: `gxc list|details` (dimensions, offsets, flags, RLE length
   check), the engine's object loader warnings (`badImageTable`), and visual comparison
   in-game. There is no automated check that sprite counts or offsets match the
   original object's image table.

### 5.6 X7's track renderer

`X123M3-256/TrackRender` ("A program to render track sprites for RCT2") is public on GitHub:
C, CMake, files `src/track.c`, `track_sections.c`, `sprites.c`, `png.c`, `rmc_tie.c`,
`scenery.c`, `subposition.c`; last push 2023-04-30; 7 stars; **no README and no licence
file** (all rights reserved by default). It is a standalone software renderer with its own
track-section geometry, not a Blender tool. OpenGraphics calls its accessibility "limited"
and prefers adding track support to the Blender add-on.

## 6. What we can reuse directly

- **The render specification** (section 5.2-5.4): camera pitch/scale, 96 px frame,
  light rig, box AA 1.4, the palette-group ramps, Floyd-Steinberg at 5%, the offset
  conventions and the vehicle angle tables. These are numbers, not copyrighted assets, and
  can be re-implemented in Blender 4.x (Workbench/Eevee) or any offline renderer.
- **The vehicle sprite-group tables** in `angle_sections/track.py`: the definitive list of
  pitch/bank/roll poses and counts per `VEHICLE_SPRITE_FLAG_*`, in the order the engine
  expects.
- **The wall and multi-tile offset conventions** and the preview-image start-index rules.
- **`gxc`** (MIT) and the `sprites.json` schema as our packaging backend; `gxc merge` gives
  a cheap way to assemble one archive from many renders. The engine's own
  `openrct2 sprite build` accepts the same schema.
- **The `.parkobj` recipe**: `object.json` + `$LGX:images.dat` is the smallest, fastest
  loading form; embedded PNGs with `{path,x,y}` also work without any extra tool.
- **The OpenGraphics wiki research**: shadow-angle and anti-aliasing analysis of the
  originals, the `G1.DAT` index map, the JSON object and sprite-file descriptions.
- **CC0 texture sourcing policy** and the "no premade models, no real products" rule.
- The 19 committed objects/82 sprites and the 4 vehicle `.blend` files, if we accept the
  GPL-3.0 terms (section 8). The 19 `.blend` scenery sources are more useful as scale and
  lighting references than as content.

## 7. Gaps and limitations

- Coverage is negligible (section 3); the project has had no content commit since
  December 2023 and no releases.
- Nothing can replace `g1.dat` sprites; the only engine path being worked on (`#25246`,
  draft since 2025-09) covers object images only.
- Blender 2.79 (2017) is a hard dependency of the add-on; there is no port to Blender
  2.8+/4.x, and the add-on relies on Blender Internal features (material index passes,
  20-slot layers, `use_zmask`) that map imperfectly to Eevee/Workbench.
- No track rendering on `master`; the branch is a preview for one coaster type.
- No flat-ride mode, no column-split large scenery, no vegetation guidance, no zoom-level
  rendering, no peep model.
- Post-processing is ImageMagick shelling with string-built commands, single-threaded;
  the README says two-thirds of the time is spent there.
- Windows-centric assumptions (`magick` on PATH, bundled `.exe`s on the branch); Linux
  hang reported (#53).
- Repo hygiene: mislabelled object ids (SSK1, WALLRK32), versioned `.blend` copies, no
  tests, CI artifacts expire.
- The spreadsheet, not git, holds the real progress and the majority of "Done" renders
  are not published.

## 8. License notes

- **OpenGraphics**: GPL-3.0 (`license.txt`). Models, textures and rendered `images.dat`
  in the repo are all under GPL-3.0. Anything we derive from them (including re-renders of
  their `.blend` files) must be redistributed under GPL-3.0; that is compatible with
  OpenRCT2 itself (GPL-3.0) but constrains any plan to license our own art differently
  (e.g. CC-BY or proprietary). Keep OpenGraphics-derived assets in a clearly separated,
  attributed directory if used at all.
- **Blender-RCT-Graphics add-on**: GPL-3.0 (`licence.txt`, header "RCT Graphics Helper is
  licensed under the GNU General Public License version 3"). Sprites rendered with it are
  the artist's own work (the GPL covers the tool, not its output); reusing its code (angle
  tables, compositor setup) in our own add-on makes that code GPL-3.0.
- **libsawyer / gxc**: MIT. Free to vendor and modify.
- **OpenRCT2 engine and `resources/g2`**: GPL-3.0.
- **X7 TrackRender**: no licence file; treat as not reusable (code or output) without
  the author's permission.
- **Textures policy** (OpenGraphics README and wiki "Standards and Requirements"): CC0 /
  public-domain only, no attribution-required sources, JPG at <= 1k, textures shipped
  alongside the `.blend`; all meshes custom-made, no downloaded/premade models, no
  real-life products or ride brands (parody in the Planet Coaster style is acceptable);
  replacements must keep the RCT2 object's footprint, height and features.
- The spreadsheet, wiki text and GitHub discussions carry no explicit licence; quote
  rather than copy.
