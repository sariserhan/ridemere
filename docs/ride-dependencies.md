# Ride dependency audit: `openrct2.ride.hybrid_coaster`

Written before the M3e scenario work, to establish what putting one coaster into the
standalone park actually pulls in. The question is not "does it draw" but "does
anything it needs come from the original game".

## The object

| | |
|---|---|
| Identifier | `openrct2.ride.hybrid_coaster` |
| Version | 4.0, from the OpenRCT2 official object collection v1.7.11 |
| Author | Edward Calver |
| Licence | CC-BY-4.0; attribution required, recorded in `assets/manifests/provenance.json` |
| Ride type | `hybrid_rc` |
| File | 1.32 MB `.parkobj`, containing `object.json` and a 2.35 MB embedded `images.dat` |
| Images | one reference, `$LGX:images.dat[0..6962]` — 6,963 sprites, all inside the object |

`$LGX` names a legacy GX archive **inside the object's own zip**. It is not `$G1`,
`$CSG` or `$RCT2`, which are the references that would require the player's own game
files. `tools/art-pipeline/validate_objects.py` now distinguishes the two and checks
that the named archive is present in the `.parkobj`.

## What it needs from elsewhere

| Dependency | Where it comes from | Original-game data? |
|---|---|---|
| Train sprites, every car, rotation, slope and bank | the object's own `images.dat` | no |
| Track piece geometry and paint | the engine's `hybrid_rc` track paint code, compiled in | no |
| Track piece art | the engine's own `tracks.dat` sprite table is for design *previews* only; running track is drawn by the paint code from the object's images | no |
| Supports | engine support paint, drawn from `g1` indices in our base archive | our own art; blank today, and the audit shows nothing requests them at this layout |
| Station platform and shelter | `sunrise.station.plain`, our object | no |
| Station platform edging and fencing | base `g1` 22370, 22371, 22412–22417 | our archive, deliberately transparent (the station declares `noPlatforms`) |
| Ride entrance and exit | the station object | no |
| Queue path | `sunrise.footpath_surface.queue`, our object | no |
| Ride name, description, capacity text | strings in the object | no |
| Sound | `frictionSoundId` 57 and 65; no audio object is bundled, so nothing plays | no |
| Music | none referenced | no |

## Verdict

No blocker. Nothing in the chain reaches for original-game data, and the one
suspicious-looking reference (`$LGX`) resolves inside the object. The coaster is used
for M3e as specified; **HYBRID BLOCKER** does not apply.

The one real cost is size: at 1.32 MB compressed the object is now 65% of the whole
content download. That is the price of a complete open coaster with every train sprite
and it is not a defect, but it sets the scale for how many ride objects a browser build
can carry.

## Deliberately not used

`rct2dlc.ride.zpanda`, the junior coaster train object, is present in the same CC-BY
repository but was authored by Chris Sawyer and Simon Foster for the RollerCoaster
Tycoon 2 expansion. Its provenance is original-game art regardless of the repository
licence, and it is excluded by name. See `docs/licensing.md`.
