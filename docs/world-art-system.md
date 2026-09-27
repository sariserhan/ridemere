# World art system

Written for whoever makes anything that sits on the ground: terrain, paths, and later
shops, buildings and scenery. It is the counterpart to `docs/ui-design-system.md`, which
covers the interface. Where the two disagree about a colour, this one wins for the
world and that one wins for the chrome.

The machine-readable form is `tools/art-pipeline/world_palette.py`. Every generator
reads its materials from there, so grass in a terrain tile and grass beside a path
cannot drift apart.

## Saturation hierarchy

This is the rule the whole system exists to enforce:

```
rides, guests, shops, interactive objects     most saturated
paths                                          light, low saturation
terrain                                        least saturated
interface chrome                               quiet, warm, recedes
```

Terrain is the largest surface on screen by an enormous margin, so it is the least
saturated thing in the frame. A ride has to win the eye against thousands of tiles of
ground. If a player cannot find a guest on a path at a glance, the path is wrong.

Paths sit **lighter** than the ground they cross, so guests, queues and litter read
against them. A path darker than its terrain looks like mud; the first attempt at V1-2
looked exactly like that and was corrected.

## Materials

| Material | Ramp | Base | Texture amount | Scale | Density | Character |
|---|---|---:|---:|---:|---:|---|
| grass | green | 6 | 1 | 7 | 0.10 | soft variation, slight tuft |
| dirt | tan | 5 | 1 | 3 | 0.26 | warm earth, sparse granular breakup |
| sand | beige | 8 | 1 | 5 | 0.16 | light warm, minimal patterning |
| stone | grey | 4 | 1 | 6 | 0.26 | cool neutral, subtle slab |
| path paved | beige | 9 | 1 | 6 | 0.16 | neutral default paving |
| path stone | grey | 9 | 1 | 5 | 0.22 | decorative slabs |
| path wood | tan | 8 | 1 | 4 | 0.22 | warm timber decking |
| queue | blue grey | 9 | 1 | 6 | 0.16 | cooler, centre stripe |
| cliff | tan | 4 | 1 | 8 | 0.12 | warm soil and rock |
| railing | grey | 8 | 1 | 3 | 0.18 | painted metal |
| support | grey | 5 | 1 | 4 | 0.22 | structure under a path |

**Base** is the single most important number. The shared geometry render supplies
brightness, which lands a pixel somewhere on its ramp; base shifts the whole surface
along that ramp. Without it every material comes out at whatever value the render
happened to have, and stone looks like snow. It did, until this was added.

**Texture amount** is how many ramp steps the breakup may move a pixel, and never more
than two. **Scale** is the size of its features in pixels. **Density** is the fraction
of pixels it touches.

## Texture rules

* Three to five value steps per material. No gradients.
* The breakup is deterministic, computed from pixel position. A texture that changed
  between builds would make every visual regression test meaningless.
* Rows are offset by half a cell so the pattern cannot form vertical runs. At this size
  a regular vertical pattern reads as corduroy, which is how the first grass looked.
* Terrain texture scale is 3 to 6 pixels. Path texture is the same range but at lower
  density, because a path is smaller and a busy one turns to noise when a player paves
  a large area.
* A material must be recognisable at zoom 0 and must not compete with a four-pixel
  guest standing on it.

## Lighting and shadow

One key from the upper left, as in `docs/art-direction.md`. Terrain shading comes from
the geometry render, so slopes are lit consistently without each material deciding for
itself.

Cliff faces turned away from the light sit two ramp steps darker, which is what makes
the two sides of a corner read as different planes. A one-pixel lighter lip runs along
the top of every cut: that lip is what makes an edge read as an edge rather than as a
wall.

No cast shadows. Contact shadow only, and terrain has none.

## Terrain

Each surface is an icon plus three entries of nineteen slope variants: normal, grid and
underground. The nineteen shapes are geometry and are shared by every material; only
the ramp, the base and the breakup differ. Grid and underground are derived from the
normal entry rather than rendered again.

The geometry checks that previously caught the skirt-height bug are unchanged, and
`check_world_objects.py` now also asserts the image count, the entry multiple, the
declared defaults, and that the sprites carry art rather than placeholders.

## Terrain edges

One family, `sunrise.terrain_edge.rock`, used beneath all four surfaces. Four separate
cliff families would quadruple the work for a distinction a player rarely sees, since
an edge appears only where land is cut.

Eighty-four sprites after the icon, in the layout the engine fixes: four wall variants
at offsets 0, 10, 20 and 30, then twelve tunnel types of four sprites each from offset
36. The silhouettes are the tile side faces under the isometric projection. They are
taken from `openrct2.terrain_edge.void`, an object that contains no art at all: every
sprite in it is one flat palette index. The geometry comes from there, with attribution
in the provenance manifest; every pixel we ship is drawn by our generator.

Material: warm soil under a darker rock band, understated. An edge is the frame around
the park and appears wherever land is cut, so it must not attract the eye.

## Paths

Fifty-two images: a preview, sixteen connection shapes, four slopes and thirty-one
corner variants. The mapping from a tile's connections to an image is a 256-entry table
in the engine; the generator reads and inverts it, so each image is drawn for the
connections it is actually used for. Repeating one tile across all of them, as the
prototype did, paves over corners that should be open ground.

An unconnected side gets a kerb two ramp steps darker. The kerb runs **along** the
walkway, not across it: the engine numbers edges from the screen's lower right, and
getting that wrong draws a rung across every tile, which is how it was found.

Slopes are generated by shearing the flat tile one height step along the slope axis
rather than by rendering new geometry. At this size a ramp is a shear, and generating
it keeps the whole set reproducible from one definition.

## Queue

Distinguished by value and a quiet centre stripe, not by a louder colour. A player
should recognise queue space without it shouting across the park. The material is a
cool blue grey against the warm neutral of an ordinary path, which reads as different
at a glance and as related on inspection.

## Railings and supports

One family, painted metal. Seventy-four images: edging along the open sides of a path,
support columns under an elevated one, and the bridge deck it sits on. The deck is
planked across its short axis so it reads as a structure rather than as a slab of the
path colour.

## What this document governs next

Shops, facilities and scenery in later milestones take their colours from the same
table. A building's base and trim should come from the `cliff`, `support` and `railing`
materials or from new entries added here, never from a colour chosen in one generator.
Adding a material means adding a row above and a row in `world_palette.py`.

## Shops and facilities

Five objects, one tile each: a food stall, a drink stall, a souvenir stall, a restroom
and an information point. The engine's layout is three preview slots followed by one
sprite per direction, rendered from four angles by the shared props generator.

Every stall is the **same silhouette on purpose**. At the size these are drawn a player
does not read a sign, they read a shape and a colour, so a shop is told apart by the
accent on its awning and a facility by the colour of its roof. Making five distinct
buildings would spend the art budget on a distinction that stops working at zoom 0.

The two silhouettes that do differ carry a real meaning:

| Form | Used by | Reads as |
|---|---|---|
| stall — open counter, posts, wide canopy, sign board | food, drink, souvenir | a place you are served at |
| cabin — closed box, roof, doorway recess | restroom, information | a place you go into |

That is the same distinction the simulation makes: the engine sends a guest *inside* a
facility and serves them *at* a shop, and the art should not contradict it.

Colours come from the world colourway like everything else here. Shops and facilities
sit at the top of the saturation hierarchy with rides and guests, because a player
looking for somewhere to put a food stall has to find the existing ones first.

`check_shop_objects.py` asserts the layout, that each direction sprite carries art
rather than a placeholder, that the four directions actually differ from one another,
and that no two stalls ship the same pixels. The third of those is the one that catches
a broken render loop: four copies of one frame count to four and look fine in a
listing.

## Path additions

Two objects: a bench and a litter bin. Both are things that sit on the *edge* of a path
tile, and the engine draws one per open edge, choosing the sprite by arithmetic on a
single base index:

```
bench   image + edge          normal       edge is 1..4, for NE, SE, SW, NW
        image + edge + 4      broken
bin     image + edge          empty
        image + edge + 4      broken
        image + edge + 8      full
```

Index 0 is the menu preview. Every slot has to exist and has to be real: the engine
indexes a broken sprite for an addition that cannot be broken, and it does not check.
So both ship genuine broken art — a bench with its back gone, a bin on its side with the
rubbish out — rather than a recolour, and turning vandalism on later costs no art.

Materials come from the same table as everything else: the bench frame is the painted
metal of the railings, its seat the warm timber of the wooden path, and the bin is that
same metal with an olive rim.

**Ramps are sliced, not used whole.** The quantiser spreads a render's brightness across
whatever ramp it is given, so a full twelve-step ramp puts every lit surface at the top
of it and the object arrives nearly white — which is what the first bench did. Handing
it five or six steps out of the middle is what keeps painted metal looking like painted
metal, and it is the same three-to-five value steps per material this document asks for
everywhere else.

**Models sit on the world origin.** The render camera orbits the origin, so a model
built anywhere else swings to a different place in each of the four rotations and the
packed sprite offsets disagree with one another. The stalls were built on the tile
centre and the engine drew half of each of them.

## Scenery and vegetation

Thirty-nine objects: thirty-two small scenery, three walls and four build-menu groups.
They are one theme, not a themed land — a bright contemporary park, the kind a town
builds and an amusement park keeps tidy — so that anything a player places next to
anything else still looks like the same park. Themed sets come later and will be
separate groups, not a replacement for this one.

### The vegetation hierarchy

Planting only reads as planting if it has more than one size in it. A row of identical
trees reads as a fence.

| Tier | Objects | Job |
|---|---|---|
| canopy | `tree_broadleaf`, `tree_shade`, `tree_column`, `tree_evergreen`, `tree_ornamental`, `tree_flowering` | the skyline; breaks up long paths and hides the map edge |
| mid | `tree_young`, `tree_dense`, `shrub_tall`, `shrub_topiary`, `shrub_hedge` | mass between the trees and the ground |
| ground | `shrub_round`, `flowers_warm`, `flowers_cool`, `ornamental_grass`, `ground_planting` | colour at the foot of things, and the only cheap decoration |

The built pieces follow the same idea: two lamp heights, two fence styles and a low
wall, two signs, two planters, two flower beds, six props and two architectural
accents. Sixteen vegetation objects and sixteen park objects.

### Colours

Vegetation and scenery materials live in `world_palette.py` beside the terrain
materials, in a `VEGETATION` table, and are taken as **ramp slices** for the same
reason everything else here is: the quantiser spreads a render's brightness across
whatever ramp it is handed, so a whole ramp bleaches an object. Four foliage entries
carry the greens — deep, mid, light and an olive accent — four flower entries carry the
colour, and `bark`, `stone_wall`, `metal`, `timber` and `paint_warm` carry the built
pieces. `bark` sits low in the brown ramp: at the slice the other materials use, every
trunk came out orange.

### Object formats

```
scenery_small   image + direction               4 images; image 0 is the menu preview
scenery_wall    image + offset                  0,1 flat; 2,3 one slope; 4,5 the other
                                                (+6 again for a double-sided wall)
scenery_group   image      the tab              2 images
                image + 1  the tab, pressed — and the object-selection preview
```

A wall's sloped pairs are **rendered tilted, not sheared**. Shearing the flat sprite's
columns cancels the isometric run and collapses the variant to a band eleven rows high;
the objects ship six real renders each, at zero and at ±14.04°, which is the angle of
the engine's own eight-in-thirty-two slope.

**A group tab is a fixed box, 31 by 28, and it draws the sprite at its own top-left
corner plus that sprite's offsets.** Those offsets are world offsets. A tree is anchored
at the foot of its trunk with its canopy forty-eight pixels above, so the Nature tab
drew its tree off the top of the screen and read as a tab with no icon at all. Group
icons are therefore shrunk to fit and centred on the plate the rest of the interface
uses, rather than carrying their world anchor into a widget.

### Reuse, not hand-authoring

`assets/source/blender/scenery.py` builds every object out of the same handful of
components — a trunk, four canopy shapes, a flower head, a post row, a rail — so a new
object is a composition rather than a new model, and a change to the canopy shape
reaches every tree that uses it. No sprite is drawn by hand, and no generated PNG is
source: the renders are rebuilt from the Blender scripts.

### Guards

| Guard | Catches |
|---|---|
| `check_rotation_origin.py` | a model built away from the world origin, measured as its content's horizontal centre moving between rotations |
| `check_scenery_objects.py` | wrong image count, blank or single-colour sprites, four identical "directions", two objects shipping the same artwork |
| `check_visual_scenery.py` | scenery that exists as objects but never reaches the screen, counted by exact palette index |
| `sceneryaudit.js` | a sprite the engine asks for and cannot find, including the tab icons the map never draws — and a build menu that opened and closed itself before it could ask |
| `scenerysave.js` | a park file that keeps the objects and loses their orientation |

The visual check is measured by **palette index, not colour family**. The first attempt
classified pixels by hue and could not tell a canopy from the grass under it: a scene
with every object in it measured 5.19% "foliage" and the same scene with the scenery
deleted measured 4.97%. Counting exact palette entries that only these materials use
takes every bare scene to approximately zero, which is what makes the floors mean
something.

## Staff

Two staff types now, built from the same figure as the guest: a handyman with a peaked
cap, and a mechanic with a hard hat and a tool belt. The engine already separates them
by shirt colour — `Park.cpp` defaults a handyman to bright red and a mechanic to light
blue, and staff are drawn `ImageId(base, tShirtColour)` — so the art carries only the
silhouette, which is what survives being four pixels wide. A logo or a face would not.

### An animation is as long as the engine needs it to be

This is the most important rule in the staff pipeline and it is not about art at all.

`Peep::updateActionAnimation` ends an action when `animationFrameNum` reaches the
sequence length, and the staff code reads specific frame numbers out of specific
animations and does the work there:

| Animation | What the engine does | On frame |
|---|---|---:|
| `staffSweep` | removes the litter | 8 |
| `staffEmptyBin` | empties the bin | 11 |
| `staffFix` | clears the broken car | 37 |
| `staffFix2` | clears the broken car | 80 |
| `staffFixGround` | fixes the station brakes | 40 |
| `staffFix3` | clears the broken car | 101 |

Nothing checks that the animation is long enough. A short one plays to its end, the
substate reports success, and the work never happens — the handyman mimed sweeping
from M3 to V1-4 because his sweep was five frames.

So a sequence must be **longer** than the highest frame the engine reads from it, and
`check_staff_animations.py` reads those frame numbers out of `entity/Staff.cpp` rather
than keeping a copy, so the rule cannot go stale when upstream moves one.

Length is bought by sequencing, not by rendering. A sequence is a list of indices into
the rendered frames, so the poses are played out and back until it is long enough: the
mechanic's 102-frame `staffFix3` is six renders. The whole mechanic is 205 images
against the handyman's 133, for four more animations and three times the frames.


### Guest diversity and ground litter (V1 completion pass)

Render six silhouette variants before running the existing packer:

```bash
for variant in 0 1 2 3 4 5; do
  .cache/blender/blender -b --python assets/source/blender/guest.py -- \
    --variant "$variant" --out "assets/generated/peeps/guest_shape_$variant"
done
.cache/venv/bin/python tools/art-pipeline/build_peeps.py
```

The packer makes six skin palettes per silhouette, preserving runtime shirt and trouser
recolouring. The native guest generator chooses among loaded guest animation objects;
older saves retain their existing appearance indices and need no migration.

`build_litter_sprites.py` supplies original indexed packaging and ground marks for
all 32 native litter orientations (23101–23132), anchored at ground level. The base
archive includes them through `offsets.json`. Inline guest-count arrows 5130/5131
are authored in `build_ui_sprites.py`; they are referenced by embedded little-endian
sprite IDs in language strings, not named constants in `SpriteIds.h`.


### Visual repair pass: zoom and noisy shading (2026-09-26)

A repeated wheel zoom exposed a real render defect: transparent standalone blank
sprites left earlier map projections in the framebuffer. The standalone viewport now
clears each dirty paint column before drawing, preserving transparent screenshot
behavior. `wasm/test/zoomredraw.js` exercises wheel zoom, toolbar zoom and rotation;
it checks exposed background pixels and verifies that toolbar icons remain drawn.

The source renderer previously used one sample and clipped bright lighting. Terrain,
shops, path additions and scenery were regenerated with 32 samples and -1.2 exposure.
The starter carousel was also regenerated at its explicit 16-sample setting with the
corrected exposure. Terrain uses alpha-weighted lighting smoothing and calibrates its
base shade against the actual flat render, retaining slope shading without pixel noise.
Shop highlights use narrower material ranges; cabin vents and stronger fence shading
keep the quieter objects readable. Geometry/orientation checks remain enforced.

The shell's circular font variable was replaced with a local sans-serif stack. The
Ridemere theme is selected explicitly for fresh/default profiles, and the previous
bundled extended toolbar colours were replaced with verified legacy palette colours.
Other selected themes are retained. This is a repair and first visual cleanup, not
final art acceptance: other rides/guest sprites and extended colour remapping still
need broader visual review.
