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

## What this means for the object

The mechanic needs, beyond the common walking set: `staffAnswerCall`, `staffAnswerCall2`,
`staffCheckBoard`, `staffFix`, `staffFix2`, `staffFix3`, `staffFixGround`. Their
`PeepAnimationType` indices are 18–24 (`Peep.h:181`).
