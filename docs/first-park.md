# First Park

Written for whoever changes the first scenario, or wonders why one of its numbers is
what it is. The original economy and guest-need numbers came from simulated play-throughs
(`wasm/test/firstpark.js`). Maintenance tuning and its limits are documented below.

## What it is for

A new player has never run a theme park. First Park exists to get them from "I pressed
play" to "I am running a park" without a manual, and to do it with the content that
actually exists: one coaster, three stalls, benches, bins, a handyman and a mechanic.

The measure of success is not that the player finishes it. It is that by the time they
do, nothing in a second scenario will need explaining.

## The map

Thirty-two tiles square, mostly flat, with the park boundary a comfortable way out from
the built area. The entrance is at the north, a straight path runs south from it, and a
small square plaza sits where that path crosses the east-west one. The coaster is to
the west with its queue already laid.

Nothing about the terrain is a puzzle. The scenario teaches management, and a player
levelling ground in their first ten minutes is a player not learning it.

The scenario opens the camera on the plaza (`"view": {"x": 17, "y": 12}`), which puts
the entrance, the main path, the coaster and the place to build all on screen at once.
That is asserted rather than eyeballed: `firstparkcheck.js` projects those four tiles
and checks each lands inside the viewport.

## The start state

| | |
|---|---|
| Coaster | built, **closed**, ticket $1.50, starting reliability 80% |
| Maintenance | breakdowns enabled; inspections every 10 game minutes |
| Paths | entrance corridor, crossing, plaza, coaster queue |
| Benches | 4, on the plaza |
| Bins | 3, on the plaza and the entrance path |
| Scenery | 44 pieces along the paths and around the plaza |
| Walls | 2 pieces of metal railing, at the plaza corner |
| Shops | none |
| Staff | none |
| Cash | $12,000, no loan |
| Park entry | free |

The coaster ships closed on purpose. Option A from the milestone brief — finish and
open something that already exists — beats asking a first-time player to design a
coaster, and opening a ride is a thing they will do for every ride they ever build.

Benches and bins are prebuilt because they are furniture, not a lesson. The lesson is
that four benches and three bins are **not enough**, which is a thing a player can only
learn from a park that has some.

## Decoration

Forty-four pieces, all of them along a path or around the plaza, and nothing anywhere
else. The park is **landscaped, not filled**.

The entrance avenue is the same thing on both sides of the path, four tiles apart —
column trees, then lamps, then broadleafs, then flowers — because an avenue is a
rhythm and a scattering is not, and a second rank further back gives it depth. The
plaza has planters at its corners, beds on its inner tiles and a direction sign at the
crossing. The two arms of the crossing are planted lightly, so they read as going
somewhere. A low hedge runs between the main path and the coaster queue. South of the
plaza the planting stops, which is where the park stops and the empty ground begins.

Everything off the paths is untouched: the whole west side, the south, and the ground
around the coaster. That is most of the map.

It is there to show what a finished park looks like and to leave most of the work
undone, which is the opposite of the failure mode: a scenario so complete that placing
anything makes it worse.

**Decorating is never asked for.** No onboarding step mentions scenery, the objective
does not count it, and a player who never opens the scenery window can finish First
Park exactly as before. That is deliberate: see the gameplay note below.

### What decorating actually does

Nothing to the park rating. `Park::CalculateParkRating` counts guests, rides, litter
and casualties, and has no scenery term at all.

Scenery reaches the simulation through one path only. A walking or sitting guest runs
`GuestAssessSurroundings` every 18 ticks; **forty or more** small or large scenery
elements within five tiles of them, with fewer than eight pieces of rubbish nearby,
produce the "Great scenery!" thought and add 45 to that guest's happiness target.
Happier guests raise the park rating indirectly, through the rating's happy-guest term.

Walls do not count. Path additions do not count unless they are jumping fountains,
which we do not ship — `prop_fountain` is small scenery and is counted as such.

Forty within five tiles is a dense planting, not a landscaped path, and First Park is
nowhere near it.

This was measured rather than assumed. `wasm/test/scenerygameplay.js` runs First Park
against `first-park-bare` — the same scenario with the decoration removed and nothing
else changed — for three minutes each:

| | decorated | undecorated |
|---|---|---|
| scenery pieces | 44 | 0 |
| park rating | 703 | 703 |
| average guest happiness | 185 | 189 |

**Decorating First Park changes nothing the player can measure**, and that is what the
game tells them: no step asks for it and no number rewards it.

One honest gap. The positive case was not reproduced either: in a three-minute run of
the density scene, with three hundred and sixty scenery elements within five tiles of
every guest on the path, no guest was ever observed holding the "Great scenery!"
thought. So the test reports the count rather than asserting it. Whether that is the
assessment's once-a-minute cadence, something about how guests are generated in a test,
or a real defect is a question for the milestone that decides to make decoration pay.
It does not change the conclusion here, which is that decoration currently does
nothing — if anything it makes it firmer.

## Available content

Hybrid coaster, food stall, drink stall, restroom, souvenir stall, bench, bin, four
terrain surfaces, three path surfaces, the queue surface and railings.

**The souvenir stall is available and is not taught.** It sells to a guest who has been
on three rides, which a single coaster does produce, so it is not dead content here —
but it is not what a new player should be spending their first thousand pounds on, and
an onboarding step for it would be a step about an optional shop.

**The information point is not in First Park at all.** It sells maps, and only to a
guest who is lost. A park with one straight path and one crossing does not lose anyone:
across fifty thousand ticks of play in V1-3 it sold nothing. Shipping it here would
teach a new player that a building they were told to build does nothing. It belongs in
a scenario with a layout worth getting lost in.

## The economy

Free park entry, paid rides, which is the default V1 model.

| | |
|---|---|
| Starting cash | $12,000 |
| Coaster ticket | $1.50 |
| Food stall | $300 to build, sells at $0.80 |
| Drink stall | $250 to build, sells at $0.60 |
| Restroom | $225 to build, free to use |
| Opening build total | **$775** |

Starting cash was not picked to feel generous. It is the opening build ($775), plus
room for the mistakes a first-time player makes — a stall in the wrong place, demolished
and rebuilt, several times over — plus a buffer that keeps running costs from becoming
a crisis before the player understands what they are. $12,000 is about fifteen times the
required build, which sounds like a lot and is roughly two mistakes an hour for the
length of the scenario.

The park is not free money. Over a twenty-six minute play-through the coaster took
$524, the food stall $93 and the drink stall $86, against running costs that ate most of
it: the park finished the run with less cash than it started. A player who builds
nothing new does not go broke and does not get rich, which is the right shape for a
first scenario.

## The objective

Reach **180 guests** with the park rating at **700 or above**
(`guestsAndRating`, an objective the engine already implements). There is no deadline.

The rating bar is 700 because the engine hard-codes it
(`ScenarioObjective.cpp`, `CheckGuestsAndRating`); a scenario chooses whether to use
that objective, not what its bar is. The same check fails the scenario if the rating
stays below 700 for twenty-nine days after the first month, with four weeks of warnings
first. That is a real way to lose First Park, and it is the lesson: a park that is left
dirty dies.

180 comes from the play-through. A park with one coaster and three stalls holds about
150 to 160 guests while it is being looked after, so 180 is reached by making the park
better — more stalls, more benches, a clean path network — rather than by waiting.

## Timing

| | |
|---|---|
| Coaster open to first rider | under a minute of play |
| First food sale | about eight minutes |
| Litter alert raises | about twelve minutes |
| Park collapses if ignored | about twenty-four minutes |

Guests arrive with hunger 60 and thirst 90 rather than the engine's default 200. That is
scenario tuning, not alert tuning: at the default, a guest does not get hungry enough to
complain for over twenty minutes, so a tutorial that waits for the simulation would have
nothing to teach for the length of the session. The thresholds in `docs/guest-alerts.md`
are untouched.

## Maintenance

Breakdowns are enabled. The coaster starts at 80% reliability and remains closed until
the player opens it. Closed rides do not age: reading the opening instructions does
not spend the maintenance window. The builder opens and immediately closes the ride
while generating the park so engine upkeep does not silently renew it to 100%.
No guests, revenue or simulated time are added by that initialization.

Breakdowns are random engine events, not scheduled tutorial events. Starting wear
makes the mechanic more likely to be useful during a session without forcing a failure
at a particular moment. A player may finish without seeing a breakdown.

An active breakdown takes priority over the other tips. Before hiring, the tip explains
how to hire a mechanic and keep the ride exit accessible. After hiring, it explains
that repair is automatic and points to the staff status. It stays visible until the
ride is repaired; closing the ride is not counted as fixing it. The same state is
reconstructed when a broken park is saved and resumed.

The coaster requests an inspection every ten **game-clock** minutes (the engine's
interval setting, not ten minutes of wall time). Inspections require a mechanic and
raise reliability through the engine's normal repair logic. Hiring one early does not
skip the other tutorial lessons.

### Pacing measurement (2026-09-26)

Four paired seeds ran for 25 normal-speed-equivalent minutes each using the actual
8× toolbar control (`FAST=1 MAX_SEEDS=4 node wasm/test/breakdownseeds.js 25 4`).
The probe opens the coaster, builds working food/drink/restroom stalls, hires a
handyman, and deliberately leaves breakdowns unrepaired.

| Starting reliability | Runs with a visible breakdown | First breakdown | Runs without a breakdown |
|---|---:|---|---:|
| 80% | 1/4 | 2.5 minutes (accepted at 1.9) | 3/4 |
| 100% | 0/4 | none observed | 4/4 |

This is a small characterization sample, not a reliable estimate of the population.
It does **not** establish the original aspiration of a first failure between 12 and
20 minutes. Keep 80% as a moderate starting-wear setting, make the lesson interruptible
when failure is early, and do not gate progression on a random failure. More extensive
pacing and difficulty balancing belongs to V1-10. The neglected broken park ended at
37 guests and rating 699; prompt maintenance matters even in this forgiving scenario.

Existing saves retain their saved breakdown setting. These changes apply to newly
started First Park scenarios; loading an old park does not rewrite its rules.

## The onboarding

Eleven steps, in `web/src/lib/game/onboarding.ts`. Each one says when it is *ready* and
when it is *complete*, and both are pure functions of the scenario summary the engine
sends. Nothing is stored: closing the tab and coming back recomputes the same step, and
so does importing somebody else's park.

The needs steps wait for the alert layer to raise the matching alert, so a player is
taught about food when the park is hungry and not before. The instruction adds the
*how*; the alert is still the one saying *what*. They are deliberately not two copies of
the same sentence.

The only thing kept on the save record is whether the player has hidden the tips, which
is a preference and cannot be derived from anything.

## Changing it

The description in `assets/scenarios/first-park/scenario.json` is the source. The
`.park` file is output: it is rebuilt from the description by the engine's own game
actions (`wasm/scripts/build-scenarios.sh`), so a change to the map, the economy or the
start state is a change to that file and a rebuild, never an edit to a binary.

After changing any number here, run `wasm/test/firstpark.js` and read the timeline. It
is the only thing that will tell you whether the scenario still works.

The objective was not retuned when the park was decorated, and the measurement above is
why: the park rating is identical with the decoration and without it. Making the park
prettier is not a reason to move a target.

## Expanded ride selection (2026-09-26)

New First Parks offer five original flat rides (carousel, dodgems, drop tower,
swinging ship and ferris wheel) and three coasters (hybrid, alpine and single rail).
Only the original starter hybrid is prebuilt; the additions are choices in the ride
construction menu. Starting cash, paths, maintenance rules and the 180-guest objective
remain as described above. Existing saves keep their original available objects.
See [ride content and validation](flat-rides.md) for the art pipeline and the
modern-twister artwork limitation.
