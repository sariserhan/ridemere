# Guest alerts

Written for whoever adds an alert, changes a threshold, or wonders why the park is not
telling the player something it obviously knows.

## The problem this solves

The simulation already knows everything. Guests get hungry, thirsty and desperate for
a restroom, and they say so: the engine gives each guest a small stack of thoughts and
draws one over their head. What it does not do is turn two hundred individual
complaints into one sentence a player can act on.

A player who sees "I'm hungry" over one guest learns almost nothing. There are always a
few hungry guests. A player told that a fifth of the park is hungry and there is
nowhere to eat knows exactly what to build and where. That gap is the whole reason this
layer exists, and it is the difference between a simulation and a game.

The loop V1-3 is built around:

```
guest has a need
→ guest complains
→ alerts aggregate the complaints
→ player reads one sentence and one instruction
→ player builds the stall
→ guests use it
→ the alert clears on its own
```

The last step matters as much as the first. An alert that does not clear when the
problem is fixed teaches a player to ignore the panel.

## Where it lives

`engine/openrct2/src/openrct2/standalone/GuestAlerts.{h,cpp}`, called once per tick
from `GameState.cpp` after guests and rides have both been updated.

It is in the engine rather than in the web shell on purpose. The thresholds depend on
guest state the bridge does not carry and should not start to: putting the decision on
the web side would mean either widening the bridge to stream guest thoughts, or
guessing. The shell decides how an alert *looks*; the engine decides whether there is
anything to say.

| Surface | What it does |
|---|---|
| `SunriseGuestAlertsJson()` | the whole active list as JSON, for the bridge and for tests |
| `GUEST_ALERTS` bridge message | polled by the play route every five seconds |
| `web/src/components/guest-alerts.tsx` | the panel a player reads, bottom right of the game |

## Alert state is derived, never saved

Nothing about alerts goes into the park file.

Alert state is a pure function of guest and ride state plus a little timing history, so
a park loaded from a file re-raises whatever is still true within one scan, about six
seconds of play. Writing it into the save would fork a format we share with upstream in
order to store something the engine can recompute in a few hundred microseconds.

The one visible consequence is that the cooldown and the "how long has this been true"
clock restart on load. That is the right trade: a player who reloads a park is not owed
the memory that they were warned about litter eight minutes ago.

`SunriseLoadPark` calls `ResetGuestAlerts()` so a loaded park never inherits the
previous park's alerts.

## What stops it becoming noise

Three separate mechanisms, because they fail differently.

**Thresholds.** A signal must reach a share of the park *and* an absolute floor. The
share is what makes an alert mean the same thing in a park of fifty and a park of two
thousand; the floor is what stops a five-guest park raising the alarm over one hungry
guest. Both are needed: either alone misbehaves at one end of the range.

**Hysteresis.** An alert clears at a lower share than it raises at, roughly two thirds
throughout. A single threshold makes an alert flicker on and off every scan while the
park hovers on the line, which is worse than not having it.

**Cooldown.** After clearing, the same alert cannot come back for a while. This is what
stops a player who has just fixed something being told about it again before their fix
has had time to work.

## The thresholds

Shares are per mille of the guests in the park. `min` is the absolute floor.

| Alert | Counted from | min | raise | clear | warning | important | cooldown |
|---|---|---:|---:|---:|---:|---:|---:|
| `GUESTS_HUNGRY` | "I'm hungry" | 5 | 80 | 50 | 150 | 280 | 30 s |
| `GUESTS_THIRSTY` | "I'm thirsty" | 5 | 80 | 50 | 150 | 280 | 30 s |
| `GUESTS_NEED_TOILET` | "I need the toilet" | 5 | 70 | 45 | 130 | 250 | 30 s |
| `GUESTS_LOST` | "I'm lost", "I can't find the exit" | 4 | 50 | 30 | 110 | 200 | 30 s |
| `GUESTS_UNHAPPY` | "I want to go home" | 6 | 90 | 60 | 160 | 300 | 45 s |
| `GUESTS_LEAVING` | the leaving-park flag | 8 | 120 | 80 | 200 | 350 | 45 s |
| `LITTER_BUILD_UP` | "the litter is bad", "this path is disgusting" | 4 | 60 | 40 | 120 | 220 | 45 s |
| `RIDE_BROKEN_DOWN` | ride state, not guests | — | 1 ride | 0 rides | — | — | 10 s |

A thought is counted only while it is fresh. The engine ages thoughts by raising
`freshness` and stops drawing one above 5, so that is the line used here: an alert
should reflect what guests are complaining about now.

The population is scanned every 256 ticks, about six seconds of play. Guest needs move
far slower than that, and scanning every tick would put a walk over every entity in the
park into the hot loop for no extra information.

## Severity

Severity is a band on the same share, not a separate judgement.

```
INFO       worth knowing
WARNING    this is costing you guests
IMPORTANT  fix this now
```

with one adjustment: **a need with nothing in the park to answer it is escalated one
band.** That is the case where a player watching unhappy guests genuinely cannot know
which of a dozen things is wrong, and it is also the case where the advice line is most
useful, because there is exactly one thing to build.

Closed stalls do not count as a facility. A park whose only food stall is shut is, to a
hungry guest, a park with no food.

The panel shows severity as a glyph as well as a colour. Colour alone fails for a
colour-blind player, and `docs/ui-design-system.md` forbids it.

## The wording

Every alert carries two sentences, written in `GuestAlerts.cpp` rather than assembled
from fragments:

* a **title** saying how many guests and what they want — "43 guests are hungry"
* an **advice** line naming one thing to do — "There is nowhere to eat. Build a food
  stall beside a path."

A player who reads only the second line can still fix the park. If a new alert cannot
be given a useful second line, it is not ready to ship.

The advice changes depending on whether a facility exists, because "build one" and
"build another" are different instructions and only one of them is right.

## Adding an alert

1. Add a value to `AlertKind`.
2. Add a row to `kRules`, with the thought it is counted from, the facility that would
   answer it, and its thresholds. A signal that is not a guest thought — `RIDE_BROKEN_DOWN`
   is the worked example — takes `PeepThoughtType::none` and is counted in
   `UpdateGuestAlerts` instead.
3. Add its name to `GetAlertKindName`, and its two sentences to `GetAlertTitle` and
   `GetAlertAdvice`.
4. Add a case to `alertcheck.js` if the loop can be exercised.

Nothing in the web shell needs to change: the panel renders whatever the engine sends,
and `kind` is a string precisely so a new alert does not need a matching release on the
other side of the bridge.

## Testing it

`wasm/test/alertcheck.js` runs the whole loop on the `needs-test` development scene,
which ships every stall closed so the loop can be exercised in the order a player
experiences it. It asserts, separately:

* a park with no unmet needs raises no need alerts — the assertion that stops the panel
  becoming wallpaper
* each need alert raises once the need is real, knows there is no facility, is not
  merely informational, and says what to build
* the list is ordered most severe first
* opening the stalls leads to actual purchases
* each alert then clears, or at least improves and reports that a facility now exists

Guest needs are moved forward with `SunriseSetGuestNeeds`, a development-only export.
Needs move at the pace of a park, not of a test: a guest arrives with hunger at 200 and
loses two roughly every 512 ticks, so waiting for a park to get hungry takes over ten
minutes of play. That pacing is correct and is verified separately by a long run at
vanilla pacing; a test that waited it out on every run would simply never be run.

## What the thresholds assume about the engine

Two pieces of engine behaviour shape every number above, and both surprised us.

**A guest complains at a much lower level than it buys at.** A guest forms the thought
"I'm hungry" below hunger 10, but will buy food any time below 75. So a park is served
long before it complains, and an alert therefore means "the park is failing", not "the
park has customers". Anyone tuning these thresholds should read the tick-128 thought
block in `Guest.cpp` first; setting a need to a value that merely sounds low produces
no thought at all, and then nothing downstream has anything to aggregate.

**Thirst does not fall on its own.** It drops only when a guest sits down or finishes
food. A park with no benches and no food stall never generates demand for drinks, and
`GUESTS_THIRSTY` will never raise there however long it runs. That is not a bug in the
alert; it is the shape of the simulation, and it means the drink stall is not really
playable until benches exist.
