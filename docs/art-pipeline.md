# Art pipeline

How original Project Sunrise artwork is produced. Everything is generated from code
and source files in `assets/source/`; nothing is hand-painted frame by frame, and no
RollerCoaster Tycoon data, geometry or reference art is read or traced.

```
assets/source/blender/*.py          procedural models, rigs and animations
        |  blender -b --python ...
        v
assets/generated/<kind>/*.png       tagged renders + frames.json
        |  tools/art-pipeline/spritepack.py
        v
8-bit indexed PNGs + draw offsets   palette indices ARE engine palette indices
        |  tools/art-pipeline/build_*.py
        v
assets/generated/objects/*.parkobj  zipped object.json + images/
```

## Why renders are "tagged"

Each sprite is rendered once with every part painted a flat, well-separated hue
(`sunrise_rig.PART_TAGS`: skin red, shirt green, trousers blue, hair yellow, shoes
magenta, …). Light bounces are disabled and each material carries a small emission of
its own hue, so **every pixel's hue identifies the part it came from and its
brightness gives the shading**, with no black pixels in crevices to confuse the
classifier.

`spritepack.quantise` then maps part → palette ramp and brightness → shade. The
consequence is the property that makes guest variation affordable:

> Changing a colourway is a lookup-table edit, not a re-render.

A second skin tone, a different uniform or a new hair colour costs one line in
`spritepack.GUEST_COLOURWAY` and about a second of processing, with no Blender run.

## Runtime recolouring

The engine already recolours peeps: `Paint.Guest.cpp:33` draws a guest as
`ImageId(base, tShirtColour, trousersColour)` and `Paint.Staff.cpp:37` draws staff
with a primary colour only. Sprites whose shirt pixels land in the **primary remap
ramp** (palette 243–254) and trousers in the **secondary** (202–213) are therefore
recoloured per peep by the engine at no sprite cost. One rendered guest covers every
shirt/trouser combination the game can generate.

Staff must not use the secondary ramp: with no secondary colour supplied those
indices pass through unremapped and would render pink. `STAFF_COLOURWAY` uses an
ordinary ramp for trousers for that reason.

## Projection

OpenRCT2 draws a 1×1 map tile as a 64×32 pixel diamond, which fixes the camera:

| Quantity | Value |
|---|---|
| Camera | orthographic, 30° elevation (60° pitch from vertical), yaw 45°+90°·direction |
| Tile | 4.0 Blender units |
| Scale | 1 unit = 64 / (4·√2) = 11.3137 px horizontally |
| `ortho_scale` | render width in px ÷ 11.3137 |
| Vertical | a world-vertical unit projects to cos(30°)·11.3137 = 9.80 px |
| One land height step | 16 px = 1.633 units |
| Anti-aliasing | off (`filter_size = 0.01`); these are hard-edged pixel sprites |

Sprite draw offsets are computed, not guessed: the camera is centred on a known
point, so the world origin lands on a known pixel and `spritepack.anchor_pixel`
converts a crop rectangle into the signed `x`/`y` the engine expects.

That the projection is right is checked against the engine's own numbers. Terrain
tiles must crop to 64×31 at (−32, 0) when flat, 64×16 at (−32, 0) with the near
corner raised, and 64×47 at (−32, −16) with the far corner raised
(`docs/object-formats.md` §1). The generator reproduces those within a pixel, and
the slope that the reference art ships as a 1×1 dummy comes out as a 1×1 dummy here
too, because at that gradient the tile's top face is edge-on to the camera.

## Peep animation layout

`Paint.Peep.cpp:36` computes the image to draw:

```
image = baseImage + direction + frame * 4     ordinary animations
image = baseImage + frame                     the "hanging" (picked up) pose
```

so an ordinary animation with F frames needs F×4 images with the four rotations
interleaved per frame, and "hanging" needs F images. `build_peeps.py` emits exactly
that order and writes each animation's `offset` (its first index in the object's
image table) and `sequence` (the per-tick frame order).

**The sequences are ours.** The engine does not require the original game's frame
counts; it plays whatever sequence the object declares. That is what reduces a guest
from 4,741 sprites to 293: six walk frames, one to four frames for each of the other
25 required animations, and no separate art for held items.

### Animation groups

`PeepAnimationsObject::GetPeepAnimation` indexes `_animationGroups[group]` with no
bounds check, and `Guest.cpp` can select groups up to 32 (nausea, needing the toilet,
crossed arms, watching a ride, every food item). A guest object must therefore expose
33 groups or the game can read past the end of the vector.

Groups 1–32 are declared with an empty `animations` map. `ReadAnimations`
(`PeepAnimationsObject.cpp:113-131`) then copies every animation from group 0, so all
33 groups share one set of sprites at zero extra cost. A guest carrying a burger
looks like a guest. This is the content reduction M3 set out to test, and it works.

## What each generator produces

| Source | Output | Images | Render time |
|---|---|---|---|
| `guest.py` | `sunrise.peep_animations.guest` | 293 | ~1 s |
| `handyman.py` | `sunrise.peep_animations.handyman` | 133 | ~1 s |
| `terrain.py` | `sunrise.terrain_surface.{grass,dirt}` | 58 each | ~1 s |

Frame counts per guest animation: walking 6; jump, throwUp, drowning, joy, hanging 4;
checkTime, eatFood, shakeHead, emptyPockets, wow, readMap, wave, wave2, clap,
drawPicture, withdrawMoney, sittingEatFood 3; holdMat, takePhoto, disgust,
beingWatched, sittingLookAroundLeft/Right 2; watchRide, sittingIdle 1.

## Adding a variant later

* **A different-looking guest**: add a colourway to `spritepack.py` and a second
  entry in `build_peeps.py`. No Blender run. The engine picks randomly among all
  loaded guest `peep_animations` objects, so several can ship side by side.
* **A new hat, hair or held item**: add the mesh to `build_figure` behind a flag and
  render a variant; the part is already tagged, so the palette step needs no change.
* **Mechanic, security, entertainer**: each needs its own required-animation list
  (`PeepAnimations.cpp`), which is a new tuple list in the style of
  `HANDYMAN_ANIMATIONS`; the figure, rig and packing are unchanged. The mechanic
  needs five repair poses, security four, the entertainer six.

## Base sprite archive

`build_base_archive.py` writes a full-size (29,294 entry) `g1.dat` because the engine
refuses to start with fewer (`Drawing.Sprite.cpp:502`) and addresses those entries by
number. Entries we have not supplied art for carry an **opaque magenta checker**.

Opaque is deliberate. A transparent placeholder draws nothing, and in a software
renderer that leaves whatever was in the framebuffer before, which makes a missing
sprite look like working art. That mistake is recorded in
`tools/asset-audit/experiment-blank-g1/README.md`.

The populated ranges are written into the content manifest, which arms the in-game
sprite audit (`src/openrct2/standalone/SpriteAudit.h`): during play it records every
request for an entry that has no art, so a session shows exactly which sprites the
exposed content still depends on. Read it with the `sprite_audit` console command.
