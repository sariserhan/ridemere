# First Park

Written for whoever changes the first scenario, or wonders why one of its numbers is
what it is. Every number here came out of a simulated play-through
(`wasm/test/firstpark.js`), not out of intuition.

## What it is for

A new player has never run a theme park. First Park exists to get them from "I pressed
play" to "I am running a park" without a manual, and to do it with the content that
actually exists: one coaster, three stalls, a bench, a bin and a handyman.

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
| Coaster | built, **closed**, ticket $1.50 |
| Paths | entrance corridor, crossing, plaza, coaster queue |
| Benches | 4, on the plaza |
| Bins | 3, on the plaza and the entrance path |
| Scenery | 9 pieces: 4 trees, a flower bed, warm flowers, 2 lamps, a direction sign |
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

Eleven pieces, and that is the whole of it. The park is **decorated, not filled**: two
broadleaf trees behind the plaza, two ornamental trees at the corners, a flower bed and
a patch of warm flowers beside the path, two lamps on the crossing, a direction sign at
the junction and a short run of railing at the plaza edge. Everything else is empty
ground the player can plant.

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

Forty pieces within five tiles is a dense planting, not a decorated path. First Park
ships nine, so **its decoration is cosmetic and nothing in the game pretends
otherwise.** `wasm/test/scenerygameplay.js` measures both ends of this, and asserts
that no guest in First Park gets the thought and that guests in the density scene do.
No number was rebalanced to make decoration pay; that is a later decision, and it
should be made deliberately rather than by quietly adding a term.

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

## Breakdowns are off

`"breakdowns": false`. A ride that breaks down needs a mechanic, and V1 has none until
V1-6. The first play-through of this scenario lost the park to exactly that: the coaster
broke, the queue emptied, the rating fell to zero and a hundred and fifty guests left,
with nothing the player could have done.

This is temporary and belongs to the mechanic milestone, not here.

## The onboarding

Ten steps, in `web/src/lib/game/onboarding.ts`. Each one says when it is *ready* and
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

The objective was not retuned when the park was decorated. It could not have needed to
be: nothing in the rating or the guest generator reads scenery, and the measured play
through is unchanged. Making the park prettier is not a reason to move a target.
