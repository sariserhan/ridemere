# V1 content matrix

Written for whoever plans and builds V1 content. Every compatibility claim below was
checked against the engine at `engine/openrct2` or against the open object collection
in `.cache/assets/objects.zip` (OpenRCT2 objects v1.7.11). Where something is
**unverified**, it says so; nothing here is assumed from ride names.

## The single most important fact

**There are exactly four open ride objects in existence, and all four are coasters.**

```
openrct2.ride.alpine_coaster        95 KB    707 sprites, 1 car
openrct2.ride.single_rail_coaster  521 KB  4,643 sprites, 2 cars
openrct2.ride.hybrid_coaster       1.3 MB  6,963 sprites, 2 cars   (shipping today)
openrct2.ride.modern_twister       1.9 MB  6,963 sprites, 2 cars
```

There are **no** open flat rides, shops, facilities, scenery pieces, trees, walls or
path additions. Everything else in the collection is `rct1.*`, `rct2.*` or community
work of unstated provenance. So every non-coaster object in V1 is ours to make.

That is the budget. It is also the opportunity: it forces an original visual identity
rather than inviting an asset-pack look.

## Where art actually comes from

| Thing | Drawn from | Consequence |
|---|---|---|
| Coaster track | `tracks.dat`, 8,685 open PNGs in `resources/tracks` | free for the types OpenRCT2 completed |
| Coaster trains | the ride object's own `images.dat` | ours to author, or reuse the four open ones |
| Flat ride structure and riders | `rideEntry->Cars[0].baseImageId + frame` | ours; paint code is compiled in and free |
| Shops and facilities | `firstCarEntry->baseImageId + direction` | **four sprites each** |
| Stall floor | `SPR_FLOOR_PLANKS` in the base archive | one base sprite we must author |
| Terrain, paths, railings, entrance, station | our own objects | already built |
| Guests and staff | our `peep_animations` objects | already built, pipeline proven |
| Scenery, walls, banners, path additions | object types the engine supports | ours to author |

`tracks.dat` was briefly replaced with a placeholder during M3e on the mistaken belief
that it held design thumbnails. It holds the rails. That is reverted; see
`docs/status.md`.

### Which coaster families have complete open track art

Counted from `resources/tracks/track/*`:

| Family | Open PNGs | Reading |
|---|---:|---|
| `raptor` (single rail) | 1,370 | complete, has an open object |
| `rmc` (hybrid) | 1,222 | complete, proven in-game |
| `lattice_triangle` (modern twister) | 792 | complete, has an open object |
| `alpine` | 514 | complete, has an open object |
| `standup` | 880 | large but **unverified** as complete |
| `corkscrew` | 836 | large but **unverified** as complete |
| `go_karts` | 650 | large but **unverified** as complete |
| `bm_invert` / `bm` | 598 / 492 | **unverified** |
| `wooden` | 268 | additions only, not a complete set |
| `junior` | 32 | additions only |
| `looping` | 4 | additions only |

The four verified-complete families are exactly the four with open objects. That is not
a coincidence: OpenRCT2 added those ride types itself, art and all.

**How to verify one of the unverified families cheaply:** build a park with that ride
type through the existing scenario generator, run the sprite audit, and look for
requests into the base archive. Zero unexplained accesses means the family is complete.
The instrument already exists and takes about ten minutes per type.

## The matrix

| Category | V1 count | Candidates | New art | Existing usable content | Risk |
|---|---:|---|---|---|---|
| Coasters | 4 | alpine, hybrid, single rail, modern twister | trains only, if we re-skin for identity; track art free | all four objects open, CC-BY-4.0 | **LOW** |
| Flat rides | 5 | carousel, ferris wheel, dodgems, swinging ship, drop tower | all, ~50–550 sprites each | none; paint code compiled in | **MEDIUM** |
| Shops | 3 | food, drink, souvenir | 4 sprites each plus a stall model | none | **LOW** |
| Facilities | 2 | toilets, information kiosk | 4 sprites each | none | **LOW** |
| Staff | 2 | handyman, mechanic | mechanic animations; handyman done | handyman object shipping | **LOW** |
| Terrain | 4 + edges | grass, dirt, sand, stone | 2 new surfaces, 1 edge family | grass and dirt shipping | **LOW** |
| Water | 1 | one water object | water surface art plus palette | engine type exists, **unverified cost** | **MEDIUM** |
| Paths | 3 + 1 queue + 1 railing | asphalt, stone, wood | 2 new surfaces | paved and queue shipping | **LOW** |
| Trees / vegetation | 15 | 8 trees, 7 bushes and flowers | all | none | **MEDIUM** |
| Scenery | 20 | benches, bins, lamps, signs, fences, planters, decorative | all | none | **MEDIUM** |
| Scenarios | 3 | see `docs/v1-product.md` | scenario descriptions only | generator proven | **LOW** |
| Music | 3 | from OpenMusic | none | 11 open styles, CC-BY-SA-4.0 | **LOW** |
| Sound effects | core set | UI, rides, guests, construction | gaps must be filled | 29 of 67 engine sound IDs open | **HIGH** |

Counts are the recommendation, not the hypothesis handed in. Deviations from the
suggested starting hypothesis, and why, are in `docs/v1-product.md`.

## Production-effort matrix

Relative, calibrated against what M2 to M3f actually cost: the guest is 293 sprites
across 26 animations and took one pipeline pass; a terrain surface is 58 sprites.

| Group | Art | Engine integration | Testing |
|---|---|---|---|
| Coasters, reusing open objects | LOW | LOW | MEDIUM |
| Coasters, original trains | MEDIUM | LOW | MEDIUM |
| Carousel, dodgems, drop tower | MEDIUM | MEDIUM | MEDIUM |
| Ferris wheel (544 sprites, 4 directions × 128 rider frames) | HIGH | MEDIUM | MEDIUM |
| Swinging ship | MEDIUM | MEDIUM | MEDIUM |
| Shops and facilities | LOW | LOW | LOW |
| Mechanic | LOW | LOW | MEDIUM |
| Terrain surfaces and edges | LOW | LOW | LOW |
| Water | MEDIUM | HIGH | MEDIUM |
| Paths | LOW | LOW | LOW |
| Trees and vegetation | MEDIUM | LOW | LOW |
| Scenery set | MEDIUM | LOW | LOW |
| Scenarios | LOW | LOW | HIGH |
| Sound effects | HIGH | MEDIUM | MEDIUM |
| Music | LOW | LOW | LOW |
| UI reskin | MEDIUM | MEDIUM | MEDIUM |
| Local save slots | LOW | MEDIUM | HIGH |

Engine integration is LOW almost everywhere because the paint code for every ride type
listed is already compiled in. The work is art plus an object definition with the right
frame layout, which is the pipeline we proved.

## Frame layouts that set the art budget

Read from the paint sources, because these numbers decide what a flat ride costs:

| Ride | Structure frames | Rider frames | Total |
|---|---:|---:|---:|
| Merry-go-round | 32 | 128 | ~160 |
| Ferris wheel | 4 directions × 8 | 4 directions × 128 | ~544 |
| Twist | 24 | from +24 | ~48 |
| Swinging ship | rotation × 18 per direction | interleaved | ~150 |

The ferris wheel is four times the cost of the carousel for similar gameplay. That is
the single biggest content-cost surprise in this plan, and it is why the recommended
flat-ride set puts it last.

## Guest systems the engine already provides

Fields on `Guest`: `happiness`, `happinessTarget`, `nausea`, `nauseaTarget`,
`nauseaTolerance`, `hunger`, `thirst`, `toilet`, `energy`, plus the thought system
(`I'm thirsty`, `I need to go to the toilet`, and so on) and per-guest ride preferences
and queue tolerance.

None of this needs designing. What it needs is **content that exercises it**: without a
drink stall, thirst is a number that only produces complaints. The V1 facility set is
chosen to give every exposed need an answer.

## Staff the engine already provides

`handyman`, `mechanic`, `security`, `entertainer`. Handyman is proven in-game.
Mechanic needs its own animation object and a reason to exist, which means ride
breakdowns being visible to the player.

## Audio reality

From `docs/audio-content-status.md`, which audited the open packs against the engine:

* 29 of 67 engine sound IDs have open replacements. The other 38 are silent without
  RollerCoaster Tycoon data.
* 10 of 30 ride music styles are open, plus 11 added open styles.
* Title music is open and works.

So V1 needs roughly **38 original sound effects**, which is the largest single piece of
non-visual content work and the reason audio is marked HIGH risk. Music is solved.

## Download budget

Current first load, with track art restored: **9.39 MB**.

| Part | Size |
|---|---:|
| `openrct2.zip` (engine) | 4.06 MB |
| `assets.zip` (all content) | 5.23 MB |
| launcher and JSZip | 0.11 MB |

Of the content, `tracks.dat` is 3.18 MB and the hybrid coaster object is 1.32 MB. Three
more coaster objects would add about 2.5 MB. A V1 with the content above should land
around 14 to 18 MB, inside the stated ceiling of 25 MB and near the preferred 15 MB.

The lever if it gets tight is coaster train objects, not scenery: the four open coaster
objects total 3.8 MB, and original trains rendered at our own sprite counts would be
smaller.
