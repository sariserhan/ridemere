# Art direction, V1

Written for artists, including contract artists who have not worked on this project.
It describes the look we are making and the constraints the engine imposes. Where a
number is a hard technical limit it is marked **fixed**; everything else is a
judgement you may argue with.

## The one-line brief

A bright, warm, modern theme park seen from above on a sunny afternoon, drawn clean
enough to read at a glance and stylised enough to have a personality.

## What we are not making

Not photorealism, not a 1999 pixel-art pastiche, not a flat-vector mobile look, and not
a copy of RollerCoaster Tycoon's artwork. We want the *readability and charm* of the
classic park builders, achieved with our own shapes, our own palette and our own
proportions. If a piece could be mistaken for an asset from another park game, it is
wrong, even when it is legally ours.

## Fixed technical constraints

These come from the engine and the pipeline. They are not style choices.

| Constraint | Value |
|---|---|
| Projection | isometric, 30° elevation, two-to-one screen ratio |
| Tile size at zoom 0 | 64 × 32 pixels |
| Blender scale | 1 tile = 4 units; 1 unit = 11.3137 px |
| Palette | 236 colours, fixed, derived from the engine's `sprites.json` |
| Recolourable ramps | primary 243–254, secondary 202–213, tertiary 46–57 |
| Output | 8-bit indexed PNG whose indices **are** palette indices |
| Rotations | 4 for most objects; vehicles need far more |
| Zoom levels | 0 to 3; art is authored at zoom 0 and downscaled by the engine |

Everything is rendered from Blender through the hue-tagging pipeline described in
`docs/art-pipeline.md`. No hand-pixelled sprites.

## Colour

**Saturation:** medium-high on built objects, medium on terrain, low on shadow and
structure. The park should look sunny without looking like a sweet wrapper. Terrain is
the largest surface on screen, so it is the least saturated thing in the frame;
attractions are the most.

**Temperature:** warm overall. Greens lean yellow rather than blue. Greys are warm
greys. Avoid cold blue-grey neutrals, which read as overcast and make the palette feel
cheap.

**Value structure:** every object reads as three to five values along a ramp, never as a
smooth gradient. The palette has twelve-entry ramps; use four to six of them per
material. Flat regions with crisp value steps read better at 64 px than soft shading.

**Recolouring:** anything a player can colour must use the primary and secondary ramps
and nothing else in those regions. Guests are drawn with shirt on primary and trousers
on secondary. Staff use primary only, so a staff uniform must not rely on a second
recolourable channel.

## Light

One key light from the upper left, one fill, and an ambient floor so nothing goes to
black. The ambient floor is 0.20 in the render rig and should stay there: crushed
shadows destroy readability at this size.

Shadows are **contact shadows only**: a soft dark ellipse or footprint under an object,
not cast shadows across the terrain. Cast shadows fight the tile grid and change as the
camera rotates, which we cannot afford across four rotations.

No specular highlights on terrain or paths. A single restrained highlight is allowed on
metal ride structures and glass.

## Outlines

**No black outlines.** Separation comes from value and hue contrast against the terrain.
A dark contact edge where an object meets the ground is acceptable and helps it sit.

The exception is interface iconography, which may use a one-pixel dark edge for
legibility against varied backgrounds.

## Proportions

**Characters** are stylised and compact, not chibi. Roughly five to five-and-a-half
heads tall. Silhouette matters more than detail: at 64 px, a guest is read by their
shape and their shirt colour. Keep heads slightly large, hands and feet simple, and
clothing shapes broad. Faces are two or three pixels of eye and nothing else; do not
render features that will not survive.

**Buildings and stalls** are deliberately small relative to the tile: a food stall
occupies one tile and should read as a cheerful kiosk, not a building. Roof overhangs
and awnings are the primary silhouette tool. Avoid tall vertical structures that occlude
the park behind them.

**Rides** are the exception and are allowed to be big. A drop tower is meant to dominate
its corner of the park. Height is the reward for building something exciting.

**Trees** should vary in height by at least a factor of two across the set, so a planted
area has a skyline.

## Terrain texture density

Terrain must read as texture, not as noise, and must tile invisibly across a map of
thousands of tiles.

* Grass: fine stipple, two or three values close together, no individual blades.
* Dirt: slightly coarser, warmer, occasional small stones.
* Sand: finest of all, lowest contrast, almost flat.
* Stone: largest features of the four, still low contrast.

The rule is that a player must be able to see a guest and a path edge against any
terrain instantly. If a texture competes with a 4-pixel guest, it is too busy. Our
current grass is at the upper limit of acceptable density and should not get busier.

## Paths

Paths are the most-looked-at surface after terrain and the main way a player reads their
own layout. Keep them light in value so guests and queues stand out on them, and keep
the three surfaces clearly distinct at a glance: asphalt dark-neutral, stone mid-warm,
wood warm and lined. Queue paths must be distinguishable from ordinary paths **without
colour alone**, because they are often seen under a crowd.

## Ride materials

| Material | Treatment |
|---|---|
| Coaster rails | bright saturated colour on the primary ramp, so player colour choice reads |
| Coaster supports | neutral warm grey, lower saturation, so structure recedes behind the rails |
| Painted steel | flat with one highlight band |
| Canvas and awning | strong colour, stripes allowed, the main source of festive colour |
| Plastic and fibreglass | high saturation, very simple shading |
| Wood | warm, visible planking at one-pixel scale only |
| Glass | one highlight, never transparent |

Ride structures should be identifiable by silhouette alone. A player scanning a park
should know which ride is which without a label.

## Interface icons

Flat, geometric, drawn from shapes rather than illustrated. One accent colour per icon
against a neutral body. 24 × 24 working size. A one-pixel dark edge is permitted.

Icons must be legible at a glance in a row of twenty. Prefer an unambiguous shape over a
pretty one: a bench icon should be a bench from the side, not a three-quarter view.

The existing procedural icon set in `tools/art-pipeline/build_ui_sprites.py` establishes
the language and should be extended, not replaced, until phase 2 of the interface work.

## Guests and crowds

The pipeline proves a new character appearance is cheap, because the hue-tagged render
is converted to palette ramps in software, so a new colourway costs no re-render.

**Recommended V1 structure:**

| Dimension | Method | Count |
|---|---|---|
| Body and animation | rendered geometry | **2 variants** (adult A, adult B) |
| Shirt colour | runtime remap, primary ramp | ~26 |
| Trouser colour | runtime remap, secondary ramp | ~26 |
| Skin tone | palette table at conversion time | 6 |
| Hair colour and shape | palette table plus 3 geometry variants | 3 × 5 |
| Hat | geometry variant on a subset | 3 |

Two rendered bodies × three hair shapes × three hat states is **18 rendered sprite
sets**, and everything else is table or runtime work. Combined with runtime shirt and
trouser colours and six skin tones, that is tens of thousands of distinct-looking
guests. A crowd will not read as cloned.

**Do not** render thousands of independent guest sprite sets. The budget above is the
plan; anything beyond it needs a specific reason.

## Staff identity

Staff must be identifiable at a glance in a crowd, from silhouette and colour together,
because staff use the primary ramp only.

| Role | Colour | Silhouette cue |
|---|---|---|
| Handyman | green workwear | broom or bin bag in hand |
| Mechanic | blue workwear | toolbox, cap |
| Security (later) | dark navy | peaked cap, straight posture |
| Entertainer (later) | costume | non-human silhouette |

The silhouette cue matters more than the colour, because the colour is also available to
guest shirts.

## What "done" looks like for a piece

1. Renders through the pipeline with no unmapped pixels.
2. Reads correctly at zoom 0 against grass, asphalt and queue path.
3. Reads correctly at zoom 2 without turning to mush.
4. Silhouette identifiable with colour removed.
5. All four rotations consistent in height and anchor.
6. Recolourable regions use only the intended ramps.
7. Provenance declared: source file, generator, licence.

## Coherence

One theme at launch: a bright contemporary park. No themed lands, no medieval or space
or western sets. Every piece should look like it came from the same park on the same
day. A second theme is a content pack, and content packs are exactly how we intend to
extend the game later.
