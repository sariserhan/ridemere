# OpenRCT2 hard-coded g1.dat sprite dependencies

Generated 2026-09-23 01:46:28Z by `tools/asset-audit/sprite_refs.py` from `/home/ssari/projects/theme-park/engine/openrct2` (commit d99eb5dcf7). Do not hand-edit.

g1.dat holds indices 0..29293. Anything below 29294 that the engine addresses by number is a proprietary RCT2 dependency unless replaced.

## Headline numbers

| Metric | Value |
|---|---:|
| SpriteIds.h symbols parsed | 2013 |
| g1-valued symbols defined (excl. *_END/_COUNT markers) | 915 |
| g1-valued symbols referenced outside SpriteIds.h | 437 |
| Distinct g1 indices via referenced symbols | 437 |
| Distinct g1 indices via raw decimal literals (sprite contexts) | 13493 |
| Distinct g1 indices via per-file symbols / BASE+n offsets | 3613 |
| Distinct g1 indices via literals (raw + resolved) | 13655 |
| **Union of distinct g1 indices referenced** | **13964** (47.7% of 29294) |
| Union incl. unreferenced g1 symbols | 14440 |
| Files scanned for symbol references | 1499 |
| Files scanned for literals / with hits | 382 / 230 |

Union of referenced g1 indices as ranges (521 ranges):

```
1574-1578, 1792, 1915, 1934, 1953, 1972, 1991, 2010, 2029, 2048, 2067, 2086, 2105, 2124, 2143, 2162, 2181, 2200, 2219, 2238, 2257, 2276, 2295, 2314, 2333, 2352, 2371, 2390, 2409, 2428, 2447, 2466, 2485, 2504, 2523, 2542, 2561, 2580, 2599, 2618-2619, 2623-2625, 2644, 2663, 2682, 2701, 2720, 2739, 2758, 2777, 2796, 2815, 2834, 2853, 2872, 2891, 2910, 2929, 2948, 2967, 2986, 3005, 3024, 3043, 3062, 3081, 3111, 3123-3124, 3141, 3158, 3175, 3192, 3200, 3209, 3226, 3243, 3262, 3279, 3298, 3317, 3334, 3353, 3370-3404, 3465-3488, 3493-3514, 3536, 3558-3570, 3592, 3614, 3636, 3658, 3675-3704, 3709-3729, 3739, 3761-3773, 3795, 3817, 3839, 5048, 5053, 5058-5111, 5115, 5117, 5137-5198, 5200-5201, 5205, 5221, 5229, 5237, 5245, 5253, 5261, 5269, 5277, 5284-5294, 5298, 5314, 5319, 5326-5327, 5335, 5351, 5367, 5375, 5391, 5407, 5423, 5442, 5458-5499, 5501, 5503-5508, 5510-5511, 5527-5528, 5530, 5537, 5542, 5546, 5551, 5557, 5564, 5568, 5576-5578, 5597, 5599, 5601, 5604, 5607, 5609, 5611, 5613, 5615, 5617, 5619, 5621, 5623, 5625, 5627, 5629, 5631, 5633, 5635-5640, 5769, 6409, 6433, 6457, 6481, 6505, 6529, 6533, 6537, 6561, 6585, 6621, 6625, 6629, 6637, 6645, 6653, 6697, 6757, 6813, 6825, 6845, 6909, 6957, 6989, 7041, 7101, 7121, 7149, 7181, 7245, 7249, 7285, 7309, 7329, 7397, 7401, 7449, 7453, 7477, 7501, 7505, 7553, 7557, 7581, 7605, 7609, 7681, 7685, 7733, 7781, 7785, 7833, 7837, 7861, 7885, 7889, 7961, 7965, 8013, 8061, 8065, 8185, 8189, 8285, 8381, 8385, 8457, 8461, 8509, 8557, 8561, 8633, 8637, 8661, 8709, 8713, 8785, 8789, 8837, 8885, 8957, 8981, 9005, 9077, 9125, 9173, 9245, 9293, 9341, 9413, 9461, 9509, 9581, 9629, 9677, 9749, 9797, 9845, 9917, 9965, 10013, 10085, 10133, 10181, 10253, 10301, 10349, 10421, 10469, 10517, 10589, 10637, 10685, 10709, 10713, 10717, 10721, 10745, 10749, 10781, 10785, 10809, 10813, 10845, 10849, 10921, 10925, 10973, 11021, 11025, 11097, 11101, 11149, 11197, 11221, 11225, 11229, 11261, 11285, 11289, 11301, 11325, 11345, 11377, 11401, 11441, 11465, 11469, 11481, 11513, 11597, 11669, 11801, 11881, 11905, 11909, 11921, 11949, 11973, 11997, 12001, 12013, 12041, 12065, 12129, 12153, 12157, 12169, 12197, 12221, 12325, 12349, 12353, 12365, 12393, 12433, 12545, 12549, 12573, 12617, 12665, 12677, 12681, 12705, 12841, 12881, 12893, 12897, 12921, 12981, 12993, 13105, 13109, 13133, 13197, 13209, 13377, 13381, 13405, 13469, 13481, 13609, 13613, 13637, 13701, 13713, 13765, 13769, 13793, 13845, 13857, 13897, 13921, 13925, 13937, 13969, 14029, 14222-14261, 14264, 14266-14277, 14296, 14302, 14306-14308, 14310-14311, 14322-14333, 14336-14337, 14340-14349, 14352-14362, 14366-14381, 14394-14399, 14402-14556, 14558-14591, 14594-15707, 15709-15710, 15712-15713, 15715-15720, 15722-17999, 18001-18002, 18004-18005, 18007-18012, 18014-19470, 19472-19714, 19717-20547, 20752-21212, 21220, 21228, 21236, 21244, 21252, 21260, 21268-21269, 21277-21278, 21294-21873, 21876-21926, 21930, 21934-21938, 21951, 21964, 21977, 21990-22006, 22038, 22070, 22102, 22134-22141, 22146-22150, 22152, 22154-22375, 22380-22432, 22577, 22589, 22601, 22613, 22625, 22637, 22651, 22872-22878, 22896, 22927, 22955-22956, 22965, 22973, 23037, 23101, 23103, 23105, 23107, 23109, 23111, 23113, 23115, 23117, 23121, 23125, 23129, 23133, 23189-23195, 23197-23199, 23207-23208, 23210-23211, 23214, 23231-23582, 23599-24448, 24465-24624, 24627-25286, 25307-25454, 25456, 25458, 25460, 25465, 25467, 25469, 25474-25520, 25522, 25524-25525, 25527, 25529, 25531-25658, 25660, 25662-25663, 25667, 25669-25671, 25674-25675, 25678-25679, 25681-25683, 25688, 25690-25780, 25782, 25784, 25786, 25789-25791, 25793, 25795, 25800-25802, 25804, 25806, 25808, 25813, 25815, 25817-25819, 25822-25824, 25826, 25828-25833, 25836-25842, 25845-26824, 26837-27626, 27639-28883, 28902, 28921, 28940, 28959, 28965, 28971, 28977, 28983, 28989, 28995, 29001, 29007, 29013-29014, 29046, 29078
```

## Symbols per table

| Table | Symbols | Range |
|---|---:|---|
| g1 | 925 | 0..29293 |
| rctc | 1 | 29294..29356 |
| g2 | 150 | 29357..29526 |
| palettes | 206 | 29527..29728 |
| fonts | 119 | 29729..30751 |
| tracks | 598 | 30752..39436 |
| csg | 2 | 39437..109353 |
| scrolling | 2 | 109354..109609 |
| imagelist | 3 | 109610..1109609 |
| temp | 7 | 524282..524287 |

## g1 indices per category

Category comes from the symbol name (NAME_RULES) or, failing that, a vote over the referencing file paths (PATH_RULES); literal-scan files are categorised by path only. Heuristics are listed at the end.

| Category | g1 symbols referenced | g1 indices via symbols | g1 indices via literals | union |
|---|---:|---:|---:|---:|
| track | 59 | 59 | 13072 | 13129 |
| guest/peep | 47 | 47 | 243 | 251 |
| support | 55 | 55 | 171 | 226 |
| UI | 122 | 122 | 0 | 122 |
| terrain | 16 | 16 | 92 | 103 |
| shop/facility | 54 | 54 | 50 | 54 |
| misc | 22 | 22 | 24 | 29 |
| water | 14 | 14 | 0 | 14 |
| ride vehicle | 12 | 12 | 6 | 13 |
| staff | 12 | 12 | 0 | 12 |
| scenery | 9 | 9 | 0 | 9 |
| path | 5 | 5 | 2 | 7 |
| wall/fence | 4 | 4 | 0 | 4 |
| park entrance | 2 | 2 | 1 | 3 |
| palette | 2 | 2 | 0 | 2 |
| path addition | 2 | 2 | 0 | 2 |

## Top 25 files by distinct g1 indices

Counts combine SpriteIds.h g1 symbols referenced by the file and (for scanned directories) literal-derived indices.

| # | File | Distinct g1 indices | Ranges |
|---:|---|---:|---|
| 1 | `src/openrct2/paint/track/coaster/WoodenRollerCoaster.cpp` | 1732 | 5048, 5053, 23453-23484, 23497-23582, 23599-24448, 24465-24624, ... (+1 more) |
| 2 | `src/openrct2/paint/track/coaster/TwisterRollerCoaster.cpp` | 948 | 17146-17999, 18001-18002, 18004-18005, 18007-18012, 18014-18073, 27427-27450 |
| 3 | `src/openrct2/paint/track/coaster/InvertedRollerCoaster.cpp` | 668 | 22398-22399, 27129-27626, 27639-27806 |
| 4 | `src/openrct2/paint/track/coaster/LatticeTriangleTrack.cpp` | 664 | 18074-18737 |
| 5 | `src/openrct2/paint/track/coaster/LoopingRollerCoaster.cpp` | 652 | 15004-15017, 15024-15387, 15420-15693 |
| 6 | `src/openrct2/paint/track/coaster/CorkscrewRollerCoaster.cpp` | 624 | 16224-16819, 26605-26608, 26969-26992 |
| 7 | `src/openrct2/paint/track/coaster/MiniRollerCoaster.cpp` | 600 | 18738-19337 |
| 8 | `src/openrct2/paint/track/coaster/JuniorRollerCoaster.cpp` | 576 | 27807-28382 |
| 9 | `src/openrct2/paint/track/coaster/FlyingRollerCoasterInverted.cpp` | 560 | 17526-17529, 17626-17641, 22398-22399, 27129-27354, 27387-27450, 27491-27626, ... (+1 more) |
| 10 | `src/openrct2/paint/track/coaster/CompactInvertedCoaster.cpp` | 540 | 22422-22423, 26555-26824, 26837-26968, 26993-27128 |
| 11 | `src/openrct2/paint/track/coaster/StandUpRollerCoaster.cpp` | 530 | 25229-25286, 25307-25454, 25456, 25458, 25460, 25465, ... (+36 more) |
| 12 | `src/openrct2/paint/track/coaster/LayDownRollerCoasterInverted.cpp` | 472 | 16594-16609, 16622-16633, 22422-22423, 26555-26588, 26613-26624, 26641-26824, ... (+2 more) |
| 13 | `src/openrct2/paint/track/coaster/MultiDimensionRollerCoaster.cpp` | 454 | 15806-16223, 26365-26388, 26537-26548 |
| 14 | `src/openrct2/paint/track/coaster/MineTrainCoaster.cpp` | 448 | 20052-20499 |
| 15 | `src/openrct2/paint/track/coaster/BobsleighCoaster.cpp` | 412 | 14572-14591, 14594-14985 |
| 16 | `src/openrct2/paint/track/coaster/MultiDimensionRollerCoasterInverted.cpp` | 340 | 16206-16217, 26227-26554 |
| 17 | `src/openrct2/paint/track/coaster/MineRide.cpp` | 324 | 19338-19470, 19472-19661, 22432 |
| 18 | `src/openrct2/paint/track/coaster/SideFrictionRollerCoaster.cpp` | 314 | 21606-21873, 21876-21919, 24033-24034 |
| 19 | `src/openrct2/paint/track/coaster/SuspendedSwingingCoaster.cpp` | 268 | 22400-22401, 25961-26226 |
| 20 | `src/openrct2/peep/PeepSpriteIds.h` | 217 | 6409, 6433, 6457, 6481, 6505, 6529, ... (+211 more) |
| 21 | `src/openrct2/paint/track/water/DinghySlide.cpp` | 184 | 19720-19735, 19740-19811, 19860-19883, 19908-19947, 19988-20019 |
| 22 | `src/openrct2/paint/track/water/SplashBoats.cpp` | 176 | 20820-20995 |
| 23 | `src/openrct2/paint/track/coaster/HeartlineTwisterCoaster.cpp` | 168 | 19732-19735, 21294-21457 |
| 24 | `src/openrct2/ride/TrackPaint.h` | 165 | 3395-3404, 14567-14571, 14989-14993, 16870-16899, 22134-22141, 22362-22375, ... (+4 more) |
| 25 | `src/openrct2/paint/track/gentle/MiniGolf.cpp` | 155 | 3395-3396, 14404-14556 |

## Per ride type (track / vehicle paint)

Ride type derived from the file name under paint/track/<group>/ and paint/vehicle/Vehicle.<Name>.cpp. Only compile-time-resolvable indices are counted (see limitations).

| Ride type | Group | Distinct g1 indices | Min | Max | Files |
|---|---|---:|---:|---:|---|
| WoodenRollerCoaster | coaster | 1732 | 5048 | 25228 | `WoodenRollerCoaster.cpp`, `WoodenRollerCoaster.hpp` |
| TwisterRollerCoaster | coaster | 948 | 17146 | 27450 | `TwisterRollerCoaster.cpp` |
| InvertedRollerCoaster | coaster | 668 | 22398 | 27806 | `InvertedRollerCoaster.cpp` |
| LatticeTriangleTrack | coaster | 664 | 18074 | 18737 | `LatticeTriangleTrack.cpp` |
| LoopingRollerCoaster | coaster | 652 | 15004 | 15693 | `LoopingRollerCoaster.cpp` |
| CorkscrewRollerCoaster | coaster | 624 | 16224 | 26992 | `CorkscrewRollerCoaster.cpp` |
| MiniRollerCoaster | coaster | 600 | 18738 | 19337 | `MiniRollerCoaster.cpp` |
| JuniorRollerCoaster | coaster | 576 | 27807 | 28382 | `JuniorRollerCoaster.cpp` |
| FlyingRollerCoasterInverted | coaster | 560 | 17526 | 27806 | `FlyingRollerCoasterInverted.cpp` |
| CompactInvertedCoaster | coaster | 540 | 22422 | 27128 | `CompactInvertedCoaster.cpp` |
| StandUpRollerCoaster | coaster | 530 | 25229 | 25852 | `StandUpRollerCoaster.cpp` |
| LayDownRollerCoasterInverted | coaster | 472 | 16594 | 27128 | `LayDownRollerCoasterInverted.cpp` |
| MultiDimensionRollerCoaster | coaster | 454 | 15806 | 26548 | `MultiDimensionRollerCoaster.cpp` |
| MineTrainCoaster | coaster | 448 | 20052 | 20499 | `MineTrainCoaster.cpp` |
| BobsleighCoaster | coaster | 412 | 14572 | 14985 | `BobsleighCoaster.cpp` |
| MultiDimensionRollerCoasterInverted | coaster | 340 | 16206 | 26554 | `MultiDimensionRollerCoasterInverted.cpp` |
| MineRide | coaster | 324 | 19338 | 22432 | `MineRide.cpp` |
| SideFrictionRollerCoaster | coaster | 314 | 21606 | 24034 | `SideFrictionRollerCoaster.cpp` |
| SuspendedSwingingCoaster | coaster | 268 | 22400 | 26226 | `SuspendedSwingingCoaster.cpp` |
| DinghySlide | water | 184 | 19720 | 20019 | `DinghySlide.cpp` |
| SplashBoats | water | 176 | 20820 | 20995 | `SplashBoats.cpp` |
| Supports (shared) | shared | 171 | 3124 | 3839 | `MetalSupports.cpp`, `WoodenSupports.cpp` |
| HeartlineTwisterCoaster | coaster | 168 | 19732 | 21457 | `HeartlineTwisterCoaster.cpp` |
| TrackPaint (shared) | shared | 166 | 3395 | 28880 | `TrackPaintGeneric.h`, `TrackPaint.cpp`, `TrackPaint.h` |
| MiniGolf | gentle | 155 | 3395 | 14556 | `MiniGolf.cpp`, `Vehicle.MiniGolf.cpp` |
| LimLaunchedRollerCoaster | coaster | 150 | 15012 | 15805 | `LimLaunchedRollerCoaster.cpp` |
| DinghySlideCovered | water | 148 | 19736 | 20051 | `DinghySlideCovered.cpp` |
| MiniSuspendedCoaster | coaster | 142 | 22402 | 28522 | `MiniSuspendedCoaster.cpp` |
| AirPoweredVerticalCoaster | coaster | 140 | 3395 | 22361 | `AirPoweredVerticalCoaster.cpp` |
| Steeplechase | coaster | 140 | 28633 | 28772 | `Steeplechase.cpp` |
| LogFlume | water | 136 | 20996 | 21131 | `LogFlume.cpp` |
| WildMouse | coaster | 126 | 16900 | 17025 | `WildMouse.cpp` |
| InvertedHairpinCoaster | coaster | 122 | 17026 | 22421 | `InvertedHairpinCoaster.cpp` |
| MiniatureRailway | transport | 118 | 3395 | 23452 | `MiniatureRailway.cpp` |
| Monorail | transport | 110 | 23231 | 23340 | `Monorail.cpp` |
| SuspendedMonorail | transport | 110 | 22418 | 25960 | `SuspendedMonorail.cpp` |
| ReverserRollerCoaster | coaster | 102 | 21504 | 21605 | `ReverserRollerCoaster.cpp` |
| WoodenWildMouse | coaster | 98 | 28535 | 28632 | `WoodenWildMouse.cpp` |
| RiverRapids | water | 91 | 21132 | 21278 | `RiverRapids.cpp`, `Vehicle.RiverRapids.cpp` |
| FlyingRollerCoaster | coaster | 88 | 17150 | 27694 | `FlyingRollerCoaster.cpp` |
| GoKarts | thrill | 68 | 20752 | 20819 | `GoKarts.cpp` |
| ReverseFreefallCoaster | coaster | 68 | 3395 | 22227 | `ReverseFreefallCoaster.cpp` |
| InvertedImpulseCoaster | coaster | 58 | 19662 | 22425 | `InvertedImpulseCoaster.cpp` |
| Chairlift | transport | 54 | 14567 | 20547 | `Chairlift.cpp` |
| MonorailCycles | gentle | 50 | 16820 | 16869 | `MonorailCycles.cpp` |
| CarRide | gentle | 48 | 28773 | 28820 | `CarRide.cpp` |
| GhostTrain | gentle | 46 | 28821 | 28882 | `GhostTrain.cpp` |
| VirginiaReel | coaster | 46 | 21458 | 21503 | `VirginiaReel.cpp`, `Vehicle.VirginiaReel.cpp` |
| SwingingShip | thrill | 20 | 21994 | 22427 | `SwingingShip.cpp` |
| MiniHelicopters | gentle | 16 | 16870 | 28774 | `MiniHelicopters.cpp` |
| BoatHire | water | 12 | 28523 | 28534 | `BoatHire.cpp` |
| Lift | transport | 11 | 14989 | 15003 | `Lift.cpp` |
| MagicCarpet | thrill | 9 | 22002 | 22432 | `MagicCarpet.cpp` |
| MotionSimulator | thrill | 9 | 22154 | 22165 | `MotionSimulator.cpp` |
| Dodgems | gentle | 7 | 21925 | 21937 | `Dodgems.cpp` |
| SwingingInverterShip | thrill | 7 | 21998 | 22432 | `SwingingInverterShip.cpp` |
| FerrisWheel | gentle | 6 | 22138 | 22152 | `FerrisWheel.cpp` |
| RotoDrop | thrill | 6 | 14558 | 14563 | `RotoDrop.cpp`, `Vehicle.RotoDrop.cpp` |
| FlyingSaucers | gentle | 5 | 21920 | 21924 | `FlyingSaucers.cpp` |
| Maze | gentle | 5 | 2485 | 21977 | `Maze.cpp` |
| SpaceRings | gentle | 4 | 22146 | 22149 | `SpaceRings.cpp` |
| LaunchedFreefall | thrill | 3 | 14564 | 14566 | `LaunchedFreefall.cpp`, `Vehicle.LaunchedFreefall.cpp` |
| ObservationTower | gentle | 3 | 14986 | 14988 | `ObservationTower.cpp`, `Vehicle.ObservationTower.cpp` |
| VehiclePaint (generic) | vehicle | 3 | 29014 | 29078 | `VehiclePaint.cpp` |
| AlpineCoaster | coaster | 2 | 22428 | 22429 | `AlpineCoaster.cpp` |
| Facility | shops | 2 | 3395 | 3396 | `Facility.cpp` |
| Shop | shops | 2 | 3395 | 3396 | `Shop.cpp` |
| SubmarineRide | water | 2 | 16870 | 16871 | `SubmarineRide.cpp` |
| Twist | thrill | 2 | 22139 | 22140 | `Twist.cpp` |
| 3dCinema | thrill | 0 | - | - | `3dCinema.cpp` |
| Circus | gentle | 0 | - | - | `Circus.cpp` |
| ClassicMiniSpinning | vehicle | 0 | - | - | `Vehicle.ClassicMiniSpinning.cpp` |
| ClassicStandUpRollerCoaster | coaster | 0 | - | - | `ClassicStandUpRollerCoaster.cpp` |
| ClassicWoodenRollerCoaster | coaster | 0 | - | - | `ClassicWoodenRollerCoaster.cpp` |
| ClassicWoodenTwisterRollerCoaster | coaster | 0 | - | - | `ClassicWoodenTwisterRollerCoaster.cpp` |
| CrookedHouse | gentle | 0 | - | - | `CrookedHouse.cpp` |
| Enterprise | thrill | 0 | - | - | `Enterprise.cpp` |
| HauntedHouse | gentle | 0 | - | - | `HauntedHouse.cpp` |
| HybridCoaster | coaster | 0 | - | - | `HybridCoaster.cpp` |
| LatticeTriangleTrackAlt | coaster | 0 | - | - | `LatticeTriangleTrackAlt.cpp` |
| MerryGoRound | gentle | 0 | - | - | `MerryGoRound.cpp` |
| SingleRailRollerCoaster | coaster | 0 | - | - | `SingleRailRollerCoaster.cpp` |
| SpiralSlide | gentle | 0 | - | - | `SpiralSlide.cpp` |
| Submarine | vehicle | 0 | - | - | `Vehicle.Submarine.cpp` |
| TopSpin | thrill | 0 | - | - | `TopSpin.cpp` |

## Files with dynamic (runtime-computed) sprite indices

`WithIndex()/ImageId()` arguments the scanner could not evaluate (e.g. `kFoo[direction]`, `base + frame`). Top 20 of 110 files:

| Dynamic args | File | Bases with runtime offsets |
|---:|---|---|
| 69 | `src/openrct2/paint/track/thrill/GoKarts.cpp` |  |
| 60 | `src/openrct2/ride/TrackPaint.cpp` | SPR_HEIGHT_MARKER_BASE |
| 53 | `src/openrct2/paint/track/coaster/ClassicStandUpRollerCoaster.cpp` |  |
| 46 | `src/openrct2/paint/track/transport/MiniatureRailway.cpp` | SPR_MINIATURE_RAILWAY_FLAT_SW_NE, SPR_TRACKS_MINIATURE_RAILWAY_GRAVEL_SW_NE, SPR_TRACKS_MINIATURE_RAILWAY_GROOVED_SW_NE |
| 41 | `src/openrct2/paint/track/coaster/JuniorRollerCoaster.cpp` |  |
| 40 | `src/openrct2/paint/track/water/RiverRapids.cpp` | SPR_RIVER_RAPIDS_RAPIDS_NW_SE_FRAME_0, SPR_RIVER_RAPIDS_RAPIDS_SW_NE_FRAME_0, SPR_RIVER_RAPIDS_RAPIDS_WHIRLPOOL_FRAME_0, SPR_RIVER_RAPIDS_WATERFALL_BASE_NE_FRAME_0, SPR_RIVER_RAPIDS_WATERFALL_BASE_NW_FRAME_0, SPR_RIVER_RAPIDS_WATERFALL_SIDE_SE_FRAME_0 ... |
| 30 | `src/openrct2/paint/track/water/LogFlume.cpp` |  |
| 27 | `src/openrct2/paint/track/coaster/MineTrainCoaster.cpp` |  |
| 26 | `src/openrct2/paint/track/water/SplashBoats.cpp` |  |
| 23 | `src/openrct2/paint/track/gentle/MiniGolf.cpp` |  |
| 21 | `src/openrct2/paint/track/coaster/WildMouse.cpp` |  |
| 21 | `src/openrct2/paint/tile_element/Paint.Surface.cpp` | PEEP_SPAWN_ARROW_0, SPR_TERRAIN_SELECTION_CORNER, SPR_TERRAIN_SELECTION_DOTTED, SPR_TERRAIN_SELECTION_EDGE, SPR_TERRAIN_SELECTION_PATROL_AREA, SPR_TERRAIN_SELECTION_QUARTER ... |
| 20 | `src/openrct2/paint/track/water/DinghySlide.cpp` |  |
| 19 | `src/openrct2/paint/track/coaster/WoodenWildMouse.cpp` |  |
| 19 | `src/openrct2/paint/track/coaster/AirPoweredVerticalCoaster.cpp` |  |
| 18 | `src/openrct2/paint/track/water/DinghySlideCovered.cpp` |  |
| 16 | `src/openrct2/paint/track/gentle/SpiralSlide.cpp` |  |
| 13 | `src/openrct2/paint/track/gentle/CarRide.cpp` |  |
| 13 | `src/openrct2/paint/tile_element/Paint.PathAddition.cpp` |  |
| 11 | `src/openrct2/paint/track/thrill/SwingingShip.cpp` |  |

## Unreferenced g1 symbols

478 g1-valued SpriteIds.h symbols are not referenced by any other file under src/ (documentation-only or arithmetic bases). They are excluded from the referenced union.


## Limitations

- Runtime base+offset arithmetic (e.g. `SPR_TERRAIN_GRASS + slope`, `imageIds[direction]`, `baseImage + frame * 4`) is only followed when the offset is a compile-time constant; a referenced base symbol therefore stands for a whole block of sprites whose extent the scanner does not know. Counts are lower bounds on the number of g1 images actually drawn.
- Symbols are only counted as `referenced` when the identifier appears in a file under src/ other than SpriteIds.h (comments and string literals stripped). Symbols that exist only as arithmetic bases inside SpriteIds.h itself are reported separately as unreferenced.
- The raw-literal scan is limited to LITERAL_SCAN_DIRS (src/openrct2/paint, src/openrct2/ride, src/openrct2/entity, src/openrct2/peep), to values >= 1000, and to recognised sprite contexts: unscoped enum blocks where at least half of the explicit values are plausible sprite indices (flag enums using << and STR_ entries are skipped), integer constexpr scalars (uint32_t/uint16_t/ImageIndex anywhere; int32_t/auto only under paint/), const/constexpr brace-initialised arrays whose element type is not a known non-sprite type, ImageIndex/uint32_t local initialisers under paint/, and the first argument of WithIndex()/ImageId(). Files matching /rtd/|RideRatings|StringIds|/RideData\.cpp$|/ted/|TrackData|VehicleGeometry|Subposition are treated as non-sprite data. In-range decimal literals found outside these contexts are listed per file as `uncontexted_in_range_literals` but not counted.
- Images supplied by loaded objects (ride vehicles, scenery, walls, paths, park entrances, peep animations, terrain surfaces/edges in the JSON object system) are addressed through object image tables at runtime and are invisible to this scan; those objects may in turn point at g1 ranges via `$G1[...]` sources, which object_refs.py covers.
- Category assignment is heuristic (symbol-name regex first, then referencing-path vote); the rules are in NAME_RULES/PATH_RULES in the script and each record carries `category_source`.
- RCTC-only indices 29294..29356 are classified as `rctc`; `SPR_G1_END`-relative markers (*_END, *_COUNT, *_LENGTH) are excluded from index counts.
- Values are only as accurate as the enum evaluation: external constants were resolved as: kMaxLegacyEntries = 32 (from src/openrct2/drawing/ScrollingText.h); kMaxEntries = 256 (from src/openrct2/drawing/ScrollingText.h); kNumLLCsgEntries = 69917 (from src/openrct2/rct1/Limits.h); kTempSpriteCount = 5 (from src/openrct2/SpriteIds.h).

## Category heuristics

Symbol-name rules (regex on upper-cased name, first match wins):

| Category | Regex |
|---|---|
| temp/misc | `^SPR_TEMP_` |
| palette | `PALETTE` |
| font | `^SPR_CHAR_\|^SPR_FONTS_\|_FONT_\|^SPR_TEXT_\|GLYPH` |
| cursor | `CURSOR` |
| staff | `STAFF\|HANDYMAN\|MECHANIC\|SECURITY\|ENTERTAINER` |
| guest/peep | `^PEEP_\|_PEEP_\|^SPR_PEEP\|GUEST\|KPEEPSPRITE\|PEEPSPRITE` |
| path addition | `PATH_ADDITION\|PATH_BIT\|BENCH\|LAMP\|LITTER_BIN\|QUEUE_BANNER\|JUMPING_FOUNTAIN\|_BIN_` |
| path | `PATH\|FOOTPATH\|QUEUE\|RAILINGS` |
| park entrance | `PARK_ENTRANCE\|ENTRANCE\|EXIT_` |
| shop/facility | `SHOP\|STALL\|FACILITY\|TOILET\|KIOSK\|FIRST_AID\|CASH_MACHINE` |
| water | `WATER\|SPLASH\|WAVE` |
| terrain | `TERRAIN\|^SPR_EDGE_\|SURFACE\|LAND_\|GRASS\|SAND\|DIRT\|ROCK\|MARTIAN\|CHECKERBOARD\|GRID\|^SPR_HEIGHT` |
| wall/fence | `WALL\|FENCE\|DOOR\|HEDGE` |
| scenery | `SCENERY\|TREE\|FLOWER\|BANNER` |
| support | `SUPPORT` |
| ride vehicle | `VEHICLE\|_CAR_\|CARS_\|TRAIN\|BOAT\|GOLF_BALL\|GOKART\|SWING\|PENDULUM\|GONDOLA\|FREEFALL_CAR\|OBSERVATION_TOWER_CAR` |
| track | `^SPR_TRACKS_\|^SPR_TRACK_\|_RC_\|COASTER\|MONORAIL\|RAILWAY\|CHAIRLIFT\|LIFT_\|STATION\|TOWER\|FLOOR\|FLUME\|RAPIDS\|SLIDE\|_LOOP\|BRAKE\|BOOSTER\|HELIX\|DIAG\|TURN\|_UP_\|_DOWN_\|FLAT_\|SLOPE\|MAZE\|CIRCUS\|CINEMA\|DODGEMS\|SAUCERS\|CARPET\|ENTERPRISE\|TOP_SPIN\|TWIST\|MERRY\|FERRIS\|HAUNTED\|CROOKED\|SPACE_RINGS\|SPIRAL\|MOTION_SIM\|GHOST\|CARRIDE\|SUBMARINE\|RIVER\|LOG_` |
| UI | `^SPR_G2_\|^SPR_RIDE_DESIGN_PREVIEW\|^SPR_TAB_\|TAB_\|BUTTON\|WINDOW\|ICON\|MENU\|TOOLBAR\|RESIZE\|CHECKBOX\|ARROW\|SCROLL\|^SPR_SPEED\|LAND_TOOL\|WATER_TOOL\|LOGO\|TITLE\|^SPR_NEXT\|^SPR_PREVIOUS\|CLOSEBOX\|BLANK_TAB\|^SPR_MAP\|^SPR_RATING\|AWARD\|CHART\|^SPR_NEWS\|^SPR_HEARING\|^SPR_SPEED\|^SPR_DOWN\|^SPR_UP_\|^SPR_TOP\|^SPR_BOTTOM\|^SPR_SHOWFLAGS\|^SPR_SIGN\|^SPR_THUMBS\|^SPR_ZOOM\|^SPR_ROTATE\|^SPR_VIEW\|^SPR_CONSTRUCTION\|^SPR_SCENARIO\|^SPR_PARK_\|^SPR_OBJECTIVE\|^SPR_FINANCE\|^SPR_RESEARCH\|^SPR_HEIGHT\|^SPR_PICKUP\|^SPR_TERRAIN_SELECTION\|^SPR_DEMOLISH\|^SPR_RENAME\|^SPR_LOCATE\|^SPR_OPEN\|^SPR_CLOSED\|^SPR_TESTING\|^SPR_MUSIC\|^SPR_SOUND\|^SPR_PAINT\|^SPR_BUY\|^SPR_ROOM\|^SPR_RIDE_\|^SPR_GUESTS\|^SPR_PEEP_LARGE\|^SPR_G1_` |
| misc | `LITTER\|BALLOON\|DUCK\|MONEY\|EXPLOSION\|STEAM\|CRASH\|FOUNTAIN\|EFFECT\|PARTICLE\|SMOKE\|SNOW\|RAIN\|CLOUD` |

Path rules (regex on referencing file path, first match wins; used when no name rule matched, by majority vote):

| Category | Regex |
|---|---|
| guest/peep | `paint/entity/Paint\.Guest\|paint/entity/Paint\.Peep\|/peep/\|entity/Guest\|entity/Peep\|windows/Guest` |
| staff | `paint/entity/Paint\.Staff\|entity/Staff\|windows/Staff` |
| ride vehicle | `paint/vehicle/\|paint/entity/Paint\.Vehicle\|ride/Vehicle\|ride/CarEntry\|VehiclePaint` |
| support | `paint/support/` |
| track | `paint/track/\|paint/track_pieces/\|ride/TrackPaint\|ride/Track` |
| terrain | `tile_element/Paint\.Surface\|tile_element/Paint\.Tunnel\|world/Surface\|world/Map` |
| water | `world/Water\|object/WaterObject` |
| path addition | `tile_element/Paint\.PathAddition\|object/FootpathAdditionObject\|world/FootpathAddition` |
| path | `tile_element/Paint\.Path\|world/Footpath\|object/Footpath\|windows/Footpath` |
| wall/fence | `tile_element/Paint\.Wall\|world/Wall\|object/WallObject` |
| scenery | `tile_element/Paint\.SmallScenery\|tile_element/Paint\.LargeScenery\|tile_element/Paint\.Banner\|world/Scenery\|object/.*SceneryObject\|windows/Scenery\|world/Banner\|object/BannerObject` |
| shop/facility | `paint/track/shops/\|ride/ShopItem\|windows/ShopItem` |
| park entrance | `tile_element/Paint\.Entrance\|world/Entrance\|object/EntranceObject\|windows/ParkEntrance` |
| font | `drawing/Font\|drawing/TTF\|drawing/Text\|localisation/` |
| cursor | `Cursors\|interface/Cursor` |
| UI | `openrct2-ui/\|interface/\|scripting/IconNames\|windows/\|title/\|drawing/Drawing\.(?:Rect\|Line)` |
| misc | `paint/entity/\|entity/\|drawing/` |
