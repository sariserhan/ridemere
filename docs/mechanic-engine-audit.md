# Mechanic engine audit

What the engine actually does when a ride breaks, read out of the source before any art
was made. Every line number is `engine/openrct2/src/openrct2`.

The reason this document exists first: in V1-4 the handyman had been miming his work
since M3. `Staff::updateSweeping` removes litter when `animationFrameNum == 8` and
nothing checks that the animation is that long; ours was five frames, so it never
reached eight, and the handyman walked the paths cleaning nothing while every test
passed. The mechanic has four such frames, and three of them are much further out.

## The state machine

A mechanic is a `Staff` with `staffType == StaffType::mechanic` (`isMechanic()`). The
states it passes through for one repair:

```
patrolling                       idle, and the only state it can be called from
  → answering      (PeepState::answering)          walks to the ride
  → fixing         (PeepState::fixing)             the repair itself
  → patrolling
```

Inspections use `headingToInspection` and `inspecting` and otherwise run through the
same `Staff::updateFixing` with substate table index 8.

`updateFixing` (Staff.cpp:2000) walks a bitmask of substates chosen by breakdown
reason, `FixingSubstatesForBreakdown[9]` (Staff.cpp:1925). The array is indexed by
`breakdownReason`, and index 8 is inspection.

## Orders

**The mechanic's order bits are a different namespace from the handyman's.**

```
Staff.h:146   STAFF_ORDERS_SWEEPING      = 1 << 0     handyman
Staff.h:150   STAFF_ORDERS_INSPECT_RIDES = 1 << 0     mechanic
Staff.h:151   STAFF_ORDERS_FIX_RIDES     = 1 << 1     mechanic
```

`FindClosestMechanic` (Ride.cpp:1521) skips any mechanic without `STAFF_ORDERS_FIX_RIDES`
for a repair call, and without `STAFF_ORDERS_INSPECT_RIDES` for an inspection. A
mechanic hired with `staffOrders = 0` is never selected, the ride stays broken forever,
and nothing reports it — the same shape as the handyman bug. A mechanic that repairs and
inspects wants `0b11`.

Two further conditions in the same loop, both easy to miss:

* the mechanic must be in `PeepState::patrolling` (or `headingToInspection` with
  `subState < 4`) to be eligible at all;
* if the ride's access point is inside the park, `isLocationInPatrol` must accept it.

## Repair access point

`RideFindClosestMechanic` (Ride.cpp:1488) does **not** use the ride's centre or its
entrance by preference. It uses:

```
station.exit, or station.entrance if the exit is null
```

and then `RideGetStationExitElement` on that location. If that returns `nullptr` the
function returns `nullptr` and no mechanic is ever found. So a ride with no exit and no
entrance can break down and can never be repaired, silently.

The distance used to pick between mechanics is Manhattan distance from that point.

## Breakdowns the hybrid coaster can have

`HybridCoaster.h:41`:

```
safetyCutOut, restraintsStuckClosed, restraintsStuckOpen, vehicleMalfunction, brakesFailure
```

Five of the engine's eight. Between them they reach every repair animation, so there is
no animation the one coaster cannot exercise.

| Breakdown | Substates that animate | Animation |
|---|---|---|
| safetyCutOut | fixStationEnd, fixStationStart | `staffCheckBoard`, `staffFix` |
| restraintsStuckClosed | fixVehicleClosedRestraints | `staffFix` or `staffFix2` |
| restraintsStuckOpen | fixVehicleOpenRestraints | `staffFix` or `staffFix2` |
| vehicleMalfunction | fixVehicleMalfunction | `staffFix3` |
| brakesFailure | fixStationBrakes | `staffFixGround` |
| *(inspection)* | fixStationEnd, fixStationStart | `staffCheckBoard`, `staffFix` |

`staffFix` and `staffFix2` are chosen by a coin flip at `Staff.cpp:2183`, so a restraints
failure needs both.

## A breakdown is two phases, not one

`RidePrepareBreakdown` (Ride.cpp:1245) sets `RideFlag::breakdownPending` and records
`breakdownReasonPending`. The ride is **not yet broken**. `brokenDown` follows in the
ride update, and when it follows depends on the kind of failure:

| Breakdown | `brokenDown` set |
|---|---|
| safetyCutOut, brakesFailure, controlFailure | immediately, in the next ride update |
| restraintsStuck*, doorsStuck*, vehicleMalfunction | when the affected car is next used |

Ride.cpp:1390 is the branch: only the three station failures are promoted straight
away. The vehicle ones live on `brokenTrain`/`brokenCar` and wait for that car.

Anything waiting on a breakdown has to wait for the right flag. Waiting for
`brokenDown` after triggering a restraints failure can take a full circuit; waiting for
`breakdownPending` after a brakes failure returns immediately and the ride is still
running. Both are correct, and they are not the same event.

## Repair does not reopen the ride

The ride never leaves `RideStatus::open`. A breakdown stops it operating without
closing it, and the repair simply lets it operate again — measured across every
breakdown type, `status` is `open` before, during and after. There is nothing for the
player to reopen, so nothing should tell them to.

## The animation contract

`Peep::updateActionAnimation` (Peep.cpp:497) increments `animationFrameNum` and ends the
action when it reaches `frameOffsets.size()`. So **an event on frame N requires a
sequence of at least N + 1 entries**, and a shorter one does not fail loudly: the
animation simply ends, `isActionWalking()` becomes true, and the substate reports
success with the event never having happened.

| Animation | Required engine event | Event frame | Minimum sequence | Source |
|---|---|---:|---:|---|
| `walking` | movement | — | — | |
| `staffAnswerCall` | none; ends on animation end | — | — | Staff.cpp:1375 |
| `staffCheckBoard` | none; ends on animation end | — | — | Staff.cpp:2330 |
| `staffFix` | clears `VehicleFlag::carIsBroken` | 0x25 = 37 | **38** | Staff.cpp:2197 |
| `staffFix2` | clears `VehicleFlag::carIsBroken` | 0x50 = 80 | **81** | Staff.cpp:2197 |
| `staffFix3` | clears `VehicleFlag::carIsBroken` | 0x65 = 101 | **102** | Staff.cpp:2241 |
| `staffFixGround` | `mechanicStatus = hasFixedStationBrakes` | 0x28 = 40 | **41** | Staff.cpp:2488 |
| `staffAnswerCall2` | `RideFixBreakdown`, ends on animation end | — | — | Staff.cpp:2578 |

`staffFixGround` additionally plays `SoundId::mechanicFix` on frames 0x13, 0x19, 0x1F,
0x25 and 0x2B — the last of those is 43, past the event frame, so the animation is meant
to run on after the brakes are fixed.

The repair itself — `RideFixBreakdown` — happens at the *end* of `staffAnswerCall2`, the
last animated substate, not at the fix frame. The fix frames clear the broken vehicle
flag and the brakes; the breakdown state is cleared when the mechanic packs up.

A sequence is a list of indices into the rendered frames, so length is bought by playing
frames out and back rather than by rendering a hundred of them. That is how the handyman
was fixed and it is why a 102-frame animation costs no more art than a 12-frame one.

## Inspections

Fully supported, and switched off in everything we ship until now.

`RideUpdateInspection` (Ride.cpp:1035) marks a ride due when `lastInspection` passes
the interval, sets `mechanicStatus = calling`, and picks the first station with an
exit. A mechanic with `STAFF_ORDERS_INSPECT_RIDES` is then dispatched through the same
`Staff::updateFixing` a repair uses, with substate table index 8.

**An inspection reduces breakdowns, through the simulation rather than by a flag.** It
ends in the same `RideFixBreakdown(ride, steps)` a repair does (Staff.cpp:2578), and
that function finishes with

```cpp
uint8_t unreliability = 100 - ride.reliabilityPercentage;
ride.reliability += reliabilityIncreaseFactor * (unreliability / 2);
```

`reliability` is what the breakdown roll is made against (Ride.cpp:1142), so inspecting
a ride makes it break down less often. Nothing about that is special-cased for
inspections; a repair raises reliability the same way.

The interval is `RideInspection`: every 10, 20, 30 or 45 minutes, hourly, every two
hours, or never. **The standalone builder passed `never` for every ride it has ever
created**, which is why the first breakdown probe reported `inspectionInterval: 6`. It
is now a scenario field, still defaulting to `never`.

## What this means for the object

The mechanic needs, beyond the common walking set: `staffAnswerCall`, `staffAnswerCall2`,
`staffCheckBoard`, `staffFix`, `staffFix2`, `staffFix3`, `staffFixGround`. Their
`PeepAnimationType` indices are 18–24 (`Peep.h:181`).

## What a scenario can and cannot set about wear

Three fields look settable and only one is. Each of the other two was written, shipped,
and found to do nothing.

`reliability` **can** be set, but only on a ride the engine considers to have been opened.
`FinancePayRideUpkeep` (`management/Finance.cpp`) runs on a fortnight tick and calls
`ride.renew()` on every ride without `RideFlag::everBeenOpened`, and `renew()` resets
reliability to `kRideInitialReliability`. The flag is set by `Ride::open`
(`ride/Ride.cpp`), so `StandaloneParkBuilder` opens the ride once and closes it again when
a scenario ships a worn ride closed. A closed ride does not age either —
`RideBreakdownUpdate` returns early for `RideStatus::closed` — so the ride waits at the
requested wear until the player opens it, and the breakdown clock starts on the player's
action rather than on the park loading.

`unreliabilityFactor` **cannot** be set by a scenario at all. `SetUnreliabilityFactor`
(`ride/RideRatings.cpp`) recomputes it from the ride type's base `Unreliability` and the
ride's design every time the ratings are recalculated, which happens while the ride is
open. A value written by the builder survives the save, reads back correctly at load, and
is replaced the moment the player presses open. For the hybrid coaster the figure is
`16 + (liftHillSpeed - 5) * 2`, bounded at 28 by `LiftData = { sound, 5, 11 }`. The builder
refuses the field rather than accepting it.

`inspectionInterval` can be set, and does nothing without an employed mechanic:
`lastInspection` is only cleared in mechanic code (`entity/Staff.cpp`). It reduces
breakdowns after the player hires someone; it is not a lever on the first one.

## Engine-semantic characterization test

`wasm/test/breakdownmonotonic.js` is not a regression test on our code and is not in
`run-m3-tests.sh`. It characterises the engine's breakdown process, costs about ninety
minutes, and exists because an exploratory sweep produced a perfectly inverted ordering
that turned out to be luck.

    cd wasm/test && node breakdownmonotonic.js 20 4

**Invariant.** Two parks differing only in `ride.reliability` consume identical randomness
until one of them accepts a breakdown, because reliability is not an input to anything
else in the simulation. The roll

    ScenarioRand() & 0x2FFFFF <= 1 + kRideInitialReliability - ride.reliability

is therefore made at the same tick against the same value, and the worn ride's threshold
is strictly wider. So its first acceptance must fall in the same 256-tick window or an
earlier one — always, not usually. A violation cannot be explained by an unlucky seed.

The comparison is on acceptance (`breakdownPending`), not on `brokenDown`: restraints,
doors and vehicle malfunctions stay pending until the affected car is next used, so
comparing visible state manufactures false violations. One window of sampling slack is
allowed and stated, because an acceptance seen at poll time can be one window late but
never early; raw ticks are printed so a violation can be read without the tolerance.

**Rerun after any upstream engine change touching ride breakdowns, RNG, reliability,
vehicles or ride ratings.** If it fails, stop tuning wear and trace RNG consumption and
breakdown eligibility first.

**Last passing engine revision:** `627beb8d7656fb1534ad9928a812987954b0d35f` (2026-09-25),
3 of 4 seeds comparable, no violations. On that run every comparison was the weak form —
the worn ride accepted and the fresh one never did — so the decisive direction was tested
but a both-accepted ordering was not observed.
