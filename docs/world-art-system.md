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
| grass | green | 7 | 1 | 4 | 0.22 | soft variation, slight tuft |
| dirt | tan | 5 | 1 | 3 | 0.26 | warm earth, sparse granular breakup |
| sand | beige | 8 | 1 | 5 | 0.16 | light warm, minimal patterning |
| stone | grey | 4 | 1 | 6 | 0.26 | cool neutral, subtle slab |
| path paved | beige | 9 | 1 | 6 | 0.16 | neutral default paving |
| path stone | grey | 9 | 1 | 5 | 0.22 | decorative slabs |
| path wood | tan | 8 | 1 | 4 | 0.22 | warm timber decking |
| queue | blue grey | 9 | 1 | 6 | 0.16 | cooler, centre stripe |
| cliff | tan | 4 | 2 | 5 | 0.40 | warm soil and rock |
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
