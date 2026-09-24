# V1 production plan

Written for whoever sequences and builds V1. Effort is relative, calibrated against
M2 to M3f; there are no calendar estimates.

## Principle

**The game must be playable after every milestone.** No milestone may spend its whole
length producing assets that cannot be exercised. Each one ends with something a person
can open and use, and each one is measured by the tests we already have.

## Dependency analysis

The suggested ordering was product shell, world art, guests, staff, shops, flat rides,
coasters, economy, scenario, interface, more scenarios, web, hardening. Three things in
it are wrong, for dependency reasons:

1. **The interface comes far too late.** Every milestone from flat rides onward is
   tested by a person clicking through the engine's current interface. Leaving the
   reskin to the end means testing the whole of V1 against a UI we intend to throw away,
   and discovering its problems last.

2. **Scenario 1 comes too late.** It is the only thing that turns a pile of content into
   a game, and it is the fastest way to find out whether the content set is actually
   fun. It should arrive as soon as there is one ride, one shop and one staff type, and
   then be revised repeatedly.

3. **Sound is missing entirely.** Thirty-eight original sound effects is the largest
   non-visual job in V1 and has no dependencies at all, so it should run in parallel
   from the start rather than being discovered at hardening.

There is also one hard dependency worth stating: **the mechanic is worthless until ride
breakdowns are visible**, so alerts come before the mechanic, not after.

## Revised order

Each milestone lists what it delivers and what proves it.

### V1-0 — Product shell and saves
Route split with isolation headers, launcher with per-scenario packs, local save slots
with autosave, rename, delete, export, import. Bridge messages including
`PARK_METADATA` and `SCREENSHOT_READY`.
*Playable:* the existing test park, opened and saved from a slot, surviving a reload.
*Effort:* art LOW, engine MEDIUM, testing HIGH.

### V1-1 — Interface reskin, phase 1
Original icons, palette, fonts and toolbar arrangement over the existing window system.
Brought forward because everything after it is tested through it.
*Playable:* the same park, in our own interface.
*Effort:* art MEDIUM, engine MEDIUM, testing MEDIUM.

### V1-2 — World art
Four terrain surfaces, a terrain edge family, three path surfaces, one queue surface,
one railing family. The edge family removes the black void at the map boundary.
*Playable:* a park that looks like a park rather than a test fixture.
*Effort:* art LOW, engine LOW, testing LOW.

### V1-3 — Shops, facilities and alerts
Food, drink, souvenir, toilets, information. Four sprites each plus the stall floor
sprite. Guest thoughts surfaced as park alerts. Alerts land here because they are what
makes need-satisfaction legible, and because the mechanic depends on them.
*Playable:* guests get thirsty, buy a drink, and stop complaining.
*Effort:* art LOW, engine LOW, testing MEDIUM.

### V1-4 — Scenario 1, first pass
The tutorial scenario with contextual objectives and the tips panel, using only what
exists so far. Deliberately early and deliberately revised later.
*Playable:* a complete, if thin, game from start to objective.
*Effort:* art LOW, engine LOW, testing HIGH.

### V1-5 — Guest visual diversity
Two rendered bodies, three hair shapes, three hat states, six skin tones, runtime shirt
and trouser colours.
*Playable:* crowds that do not read as cloned.
*Effort:* art MEDIUM, engine LOW, testing LOW.

### V1-6 — Staff
Mechanic animations and behaviour, handyman revisited for the new art direction.
Depends on alerts from V1-3.
*Playable:* a ride breaks, an alert fires, a mechanic walks over and fixes it.
*Effort:* art LOW, engine LOW, testing MEDIUM.

### V1-7 — Flat rides
Carousel, dodgems, drop tower, swinging ship, and the ferris wheel if it fits. In that
order, cut from the end.
*Playable:* a park with variety and an intensity range.
*Effort:* art MEDIUM to HIGH, engine MEDIUM, testing MEDIUM.

### V1-8 — Coasters
Integrate alpine, single rail and modern twister alongside the hybrid coaster already
shipping. Verify each with the sprite audit before committing to it.
*Playable:* four coasters, one of them beginner-friendly.
*Effort:* art LOW, engine LOW, testing MEDIUM.

### V1-9 — Scenery and vegetation
Fifteen vegetation pieces, twenty scenery pieces, benches and bins first because they
are gameplay.
*Playable:* parks that can be decorated and that look built rather than placed.
*Effort:* art MEDIUM, engine LOW, testing LOW.

### V1-10 — Economy and scenario tuning
Free entry with paid rides as the default, scenario-defined content availability, prices
and objectives tuned against real play.
*Playable:* money decisions that matter.
*Effort:* art LOW, engine LOW, testing HIGH.

### V1-11 — Scenarios 2 and 3
Small Footprint and Growing Destination, plus a revision of scenario 1 now that the full
content set exists.
*Playable:* two to five hours of game.
*Effort:* art LOW, engine LOW, testing HIGH.

### V1-12 — Audio integration
Thirty-eight original sound effects and three music tracks wired in. **Production of the
effects runs in parallel from V1-0**; this milestone is integration and mixing.
*Playable:* a park that sounds like one.
*Effort:* art HIGH (parallel), engine MEDIUM, testing MEDIUM.

### V1-13 — Public beta hardening
Performance on the largest scenario, memory at scale, cross-browser, save migration,
error recovery, the isolation assertion, first-load timing.
*Effort:* art LOW, engine MEDIUM, testing HIGH.

### Parallel throughout
Sound effect production, and the naming and brand decision, which must be settled before
V1-1 puts a name in the interface.

## What moved and why

| Item | Suggested | Here | Reason |
|---|---|---|---|
| Interface | V1-9 | **V1-1** | everything after it is tested through it |
| Scenario 1 | V1-8 | **V1-4**, revised at V1-11 | the only thing that proves the content set |
| Shops and facilities | V1-4 | **V1-3** | they make guest needs legible, and alerts unblock the mechanic |
| Staff | V1-3 | **V1-6** | the mechanic depends on alerts |
| Audio | absent | **parallel, integrated V1-12** | largest job with no dependencies |
| Guest diversity | V1-2 | **V1-5** | cosmetic; later is cheaper once art direction settles |

## Verification at each step

The instruments already exist and should be run at every milestone, not at the end:

* `run-m3-tests.sh` for boot, provenance, no original-game data, object
  self-containment.
* `rideloop.js` for the full guest lifecycle and the sprite audit.
* `workerbench.js` and `parkbench.js` for memory and frame rate under load.
* `smoke-browsers.sh` for Chromium, Firefox and WebKit.

**Add one new gate:** every new ride type must be exercised by the sprite audit before
it is accepted, because the audit is what proves a ride needs no original-game data.
That is exactly the check that would have caught the `tracks.dat` mistake earlier if it
covered every sprite table rather than only the base archive.

## Top five risks

1. **Sound effects.** Thirty-eight original effects, a discipline we have not exercised
   at all, and no open source for them. Mitigation: start at V1-0, in parallel, and
   treat silence as an acceptable launch state for the least important effects.

2. **Flat ride frame layouts.** The layouts are read from the paint code, and a mistake
   means an animation that looks wrong in a way tests will not catch. Mitigation: build
   the carousel first, end to end, before committing to the other four.

3. **Visual identity while reusing open coaster trains.** The four open trains are
   OpenRCT2's art and will not match our direction. Mitigation: accept it for V1, be
   honest about it, schedule original trains for V1.1, and lean on player-chosen track
   colour meanwhile.

4. **Scale beyond the test park.** Every performance number is from one small park.
   Scenario 3 is larger by design and nothing has been measured there. Mitigation:
   measure at V1-10 with the real scenario, before its guest target is fixed.

5. **Tests that pass while the game is broken.** The `tracks.dat` regression passed
   every automated check because the checks assert engine state and audit only one
   sprite table. Mitigation: a visual check in the suite, and audit coverage extended
   beyond the base archive.

## Recommended first implementation milestone

**V1-0, product shell and saves.**

It is the only milestone with no content dependencies, it turns the prototype into
something a person can use twice, and it forces the route and bridge decisions that are
expensive to change later. It also produces the first thing worth showing someone:
a link that opens a park, and a park that is still there tomorrow.

## What V1-3 changed about this plan (2026-09-24)

Three findings from building the shops move work around. They are recorded here rather
than only in `docs/status.md` because they change what has to be built when.

**Benches move forward, into V1-4.** Thirst falls only when a guest sits or finishes
food, so a park with no benches generates almost no demand for drinks. One of the three
shops is close to inert until somewhere to sit exists, and the alert that would tell a
player about it cannot fire either. Benches and bins are small, share the props
generator, and unlock content that is already built.

**The economy starts from zero, not from nothing.** Money had never been simulated:
every generated park carried `ParkFlag::noMoney`. It is on now, and the first park we
turned it on in loses money. V1-7 therefore begins with a real number to tune rather
than with an untested system, and ride and stall prices are now worth setting
deliberately in every scenario.

**The information point needs a scenario, not a fixture.** It sells maps, and a guest
buys a map only when lost. In a park with two straight paths nobody is ever lost, so it
sold nothing across fifty thousand ticks. It earns its place in V1-4's scenario, which
is the first park with a layout worth getting lost in.
