# Audio production brief

Written for a sound designer or contractor, and for whoever briefs them. This is a
parallel workstream: nothing in V1-0 depends on it, and V1 cannot ship without it.

## The situation

The engine addresses sound by identifier, 67 of them. Open replacements exist for some
and not the rest.

| | Count |
|---|---:|
| Engine sound identifiers | 67 |
| Covered by OpenSoundEffects (CC-BY-4.0) | 26 |
| Covered by `openrct2.audio.additional` (hybrid lift, hybrid roar, log flume lift) | 3 |
| **Needing original work** | **38** |

Derived directly from the engine's `SoundId` enum and the OpenSoundEffects asset-pack
manifest, not estimated. An uncovered identifier is not a fallback or a quiet sound; it
is **silence**.

Music is solved: eleven open styles exist under CC-BY-SA-4.0 and V1 needs three. No
music production is being commissioned.

## What to make

Grouped by how often a player hears it, because that is what decides how much care each
one deserves. Within a group, order is priority.

### Must hear frequently, gets the most attention

These play constantly. They define what the park sounds like, and a weak one is worse
than silence.

| Identifier | What it is |
|---|---|
| `liftClassic` | a chain lift hauling a train uphill, looping |
| `trackFrictionClassicWood` | wooden coaster running, looping |
| `frictionClassic` | steel coaster running, looping |
| `trackFrictionWood` | wooden track friction, looping |
| `trackFrictionTrain` | train-style running noise, looping |
| `liftWildMouse` | a lighter, rattlier lift |
| `liftFrictionWheels` | friction-wheel launch and lift |
| `liftRMC` | hybrid coaster lift |
| `trackFrictionRMC` | hybrid coaster running |
| `liftFlume` | flume lift |
| `windowOpen` | an interface panel opening, heard hundreds of times an hour |
| `placeItem` | placing a piece of scenery or path |

Looping sounds must loop seamlessly and must survive pitch shifting: the engine changes
playback frequency with vehicle speed, so a sample with strong tonal content will sound
wrong when sped up. Prefer broadband texture over pitched tone.

### Guest voices

Short, human, non-verbal, and never annoying on the hundredth repetition. They are
layered across a crowd, so each must sit quietly in a mix of dozens.

| Identifier | What it is |
|---|---|
| `scream1` to `scream8` (six still needed: 1, 2, 3, 4, 6, 7) | riders on a drop, varied ages and intensities |
| `laugh1`, `laugh2`, `laugh3` | enjoyment |
| `cough1` to `cough4` | unwell guests |
| `applause` | a small cluster clapping, not a stadium |

`scream8` is specified upstream as blood-curdling, for haunted attractions.

Cast a range of voices. A crowd made of one person reads as a crowd made of one person.

### Shops, facilities and alerts

Added in V1-3, when guest needs became a visible loop. A player who has just built a
food stall should hear that it is working; a player being told the park is in trouble
should hear that it is a different kind of message from a purchase.

| Identifier | What it is | Heard |
|---|---|---|
| `purchase` | a small transaction completing at a counter | every shop sale, constantly |
| `register` | the till, a shade brighter than `purchase` | money arriving, on a sale |
| `eating` | a short chew, non-comic, very quiet | a guest consuming food |
| `drinking` | a short sip, very quiet | a guest consuming a drink |
| `facilityDoor` | a light door, used by restroom and information | a guest entering a facility |
| `alertInfo` | a soft two-note rise | an alert raised at INFO |
| `alertWarning` | the same shape, lower and firmer | an alert raised at WARNING |
| `alertImportant` | a single deliberate low note, never a klaxon | an alert raised at IMPORTANT |

These are all short. `purchase` in particular will play hundreds of times an hour in a
busy park, so it has to be quiet, brief and completely uninteresting on repetition:
closer to a click than to a jingle.

The three alert sounds must be recognisable as a family and distinguishable from one
another with the music on. They are the only sounds in the product that are allowed to
interrupt, so IMPORTANT must sound serious without sounding like an emergency: the park
is not on fire, the queue for the restroom is.

`eating`, `drinking` and `facilityDoor` are near-field detail. A park where a thousand
guests are audibly chewing is a park nobody will play with sound on, so these should be
mixed to be heard when the camera is close and to vanish in a crowd.

### Ride-specific

Heard only near a particular attraction, so they can be distinctive.

| Identifier | What it is |
|---|---|
| `goKartEngine` | small engine, looping, pitch-shifted |
| `crash` | a ride crashing, a serious event that must sound serious |
| `waterSplash`, `water1`, `water2` | flume and water rides |
| `layingOutWater` | water being placed during construction |
| `tram` | tram or transport ride |
| `hauntedHouseScare`, `hauntedHouseScream1`, `hauntedHouseScream2` | haunted attraction stings |
| `doorOpen`, `doorClose`, `portcullis` | dark-ride doors |
| `quack` | a duck, used for park fauna |

Of these, V1 needs only what its ride set uses. The flume, haunted house, tram and go
kart sounds are for rides that do not exist yet and can wait; they are listed so the
whole gap is visible in one place.

## Technical requirements

| | |
|---|---|
| Format for delivery | 48 kHz, 24-bit WAV, mono unless the sound is inherently stereo |
| Format shipped | as the asset pack requires; conversion is our side |
| Loops | seamless, no click, no DC offset, at least two seconds |
| Pitch tolerance | looping ride sounds must hold up from roughly 0.5× to 2× speed |
| Headroom | peak at about −6 dBFS, no limiting or loudness maximisation |
| Length | interface and guest sounds under one second wherever possible |
| Naming | the engine identifier, for example `liftClassic.wav` |

## Licensing, which is not negotiable

Every sound must be **original work made for this project**, with rights assigned, or
released under a licence compatible with shipping in a commercial product with
attribution. No sample libraries with restrictive terms, no recordings lifted from
other games, no material of uncertain origin.

Every delivered file is recorded in `assets/manifests/provenance.json` with its creator,
licence and source before it ships. A sound without declared provenance does not go in
the build. This is the same rule the art pipeline already enforces.

## Priority for V1

1. The twelve frequent sounds, especially the coaster lift and friction loops, because
   the park is silent without them.
2. `windowOpen` and `placeItem`, because they are the sound of building, which is what
   the player does most.
3. Guest voices, breadth before polish: several adequate screams beat one excellent one.
4. Ride-specific sounds for the rides V1 actually ships.
5. Everything else, as the ride list grows.

Silence is an acceptable launch state for the last group. It is not acceptable for the
first two.
