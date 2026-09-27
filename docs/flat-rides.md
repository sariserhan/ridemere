# Expanded ride catalog

V1-7 adds five original flat rides. New First Parks expose all five in the native
ride menu; existing saves keep the object selection serialized in their park file.
V1-8 also adds the open alpine and single-rail coaster trains, using the existing
open track archive. The original hybrid coaster remains available.

| Ride | Object image count | Capacity | Construction cost observed |
|---|---:|---:|---:|
| Carousel | 163 | 16 | $460 |
| Dodgems | 67 | 12 two-seat cars | $440 |
| Drop tower | 24 plus shared tower modules | 8 | $200 base; extra sections cost more |
| Swinging ship | 345 plus shared supports | 16 | $387.50 |
| Ferris wheel | 547 plus shared supports | 16 two-seat cabins | $450 |

Costs are the tested flat-ground placements, not promises for every terrain or height.
The artwork includes real rider overlays, restraint states where the painter expects
them, four views, and original shared decks, fences and station signals. Dodgem cars
use the standard vehicle painter; the other rides use the engine's integral painters.
The tower fixture exercises a complete upward journey and return, not only its base.

## Sources and rebuilding

`assets/source/blender/flat_rides.py` authors the models and render manifest. It uses
the project's established Blender rig and runtime colour-remap palette.

```bash
.cache/blender/blender -b -t 4 --python assets/source/blender/flat_rides.py
.cache/venv/bin/python tools/art-pipeline/build_flat_rides.py
.cache/venv/bin/python tools/art-pipeline/build_flat_ride_bases.py
wasm/scripts/build-standalone.sh
wasm/scripts/build-scenarios.sh
npm --prefix web run sync-game
```

The render script also supports `-- --dodgems`, `-- --tower`, `-- --ship`, and
`-- --wheel` for targeted renders after an initial full render. Generated images,
objects and parks are build outputs. Source descriptions and generators are retained.
Open coaster trains are attributed to Edward Calver under CC-BY-4.0 in the provenance
manifest. Height labels use the existing Liberation Sans font source.

## Validation

`check_flat_rides.py` checks indexed images, nonempty body and rider images,
animation variation, image counts and unclipped menu previews. `flatrides.js KIND`
drives a real queue, boarding, completed journey, save/load and four camera angles;
all seven additions must report no unexpected base sprites. `rideconstruction.js KIND`
selects the ride in its category, places it through the native construction tool,
and checks the ride type and cash deduction. Both tests use Chromium at 1280×800.
All three checks are registered in `wasm/test/run-m3-tests.sh`.

The scenario builder accepts a `rides` array as well as the earlier `coaster` field.
Flat rides place their descriptor's complete footprint; towers place a base and
1–12 vertical sections. Invalid objects, refused actions, detached station entrances
or exits, and invalid tower heights refuse the description rather than saving it.
The seven development fixtures are stripped from the web release.

## Remaining coaster limitation

Modern twister is not shipped. Its alternate painter covers selected newer track
pieces but delegates ordinary pieces to the legacy lattice-triangle painter. A real
ride exposed missing indices 18154–18165 and 18382–18385. Open train artwork alone
cannot fix those missing rails. Alpine and single rail passed the same camera audit.
The tested coaster layouts are simple closed loops; this is not exhaustive validation
of every possible inversion, bank, tunnel, terrain interaction or custom design.
