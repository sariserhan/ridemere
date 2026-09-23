# OpenRCT2 object inventory: image-source audit

Source: `.cache/assets/objects.zip`, 2505 objects (419 .parkobj, 2086 bare .json). Errors: 0.

Classes: `self-contained` = every sprite is embedded (PNG / `$LGX:images.dat`); `no-images` = object has no sprites (water palettes, music, audio, peep_names, scenario text); `needs:*` = every sprite comes from proprietary data; `mixed:*` = some embedded, some proprietary. `g1` = RCT2 g1.dat, `csg` = RCT1 csg1.dat, `rct2dat` = RCT2 ObjData/*.DAT.

## Totals

| class | objects |
|---|---|
| self-contained | 224 |
| no-images | 48 |
| needs:g1 | 29 |
| needs:csg | 11 |
| needs:rct2dat | 2003 |
| needs:g1+rct2dat | 1 |
| needs:csg+rct2dat | 1 |
| mixed:g1 | 18 |
| mixed:csg | 96 |
| mixed:rct2dat | 72 |
| mixed:g1+rct2dat | 1 |
| mixed:csg+g1+rct2dat | 1 |

Usable without any RCT1/RCT2 file: **272** (224 self-contained + 48 image-less). Need proprietary data: **2233**.

## By source tree

| tree | self-contained | no-images | needs:g1 | needs:csg | needs:rct2dat | needs:g1+rct2dat | needs:csg+rct2dat | mixed:g1 | mixed:csg | mixed:rct2dat | mixed:g1+rct2dat | mixed:csg+g1+rct2dat | total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| official | 80 | 4 | 0 | 0 | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 87 |
| rct1 | 86 | 2 | 0 | 11 | 1 | 0 | 1 | 0 | 96 | 1 | 1 | 1 | 200 |
| rct2 | 27 | 42 | 29 | 0 | 697 | 1 | 0 | 16 | 0 | 46 | 0 | 0 | 858 |
| rct2tt | 14 | 0 | 0 | 0 | 615 | 0 | 0 | 0 | 0 | 18 | 0 | 0 | 647 |
| rct2ww | 17 | 0 | 0 | 0 | 689 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 713 |

## By objectType x image source

| objectType | self-contained | no-images | needs:g1 | needs:csg | needs:rct2dat | needs:g1+rct2dat | needs:csg+rct2dat | mixed:g1 | mixed:csg | mixed:rct2dat | mixed:g1+rct2dat | mixed:csg+g1+rct2dat | total | usable w/o RCT2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| audio | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 5 |
| climate | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 4 |
| footpath_banner | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 0 |
| footpath_item | 1 | 0 | 0 | 0 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 21 | 1 |
| footpath_railings | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | 1 | 1 | 16 | 1 |
| footpath_surface | 1 | 1 | 0 | 0 | 6 | 0 | 1 | 0 | 13 | 17 | 0 | 0 | 39 | 2 |
| music | 0 | 27 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 32 | 27 |
| park_entrance | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 16 | 0 |
| peep_animations | 0 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 0 |
| peep_names | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| ride | 6 | 0 | 0 | 0 | 260 | 1 | 0 | 0 | 67 | 6 | 0 | 0 | 340 | 6 |
| scenario_meta | 180 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 180 | 180 |
| scenery_group | 1 | 0 | 0 | 0 | 43 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 44 | 1 |
| scenery_large | 0 | 0 | 0 | 0 | 242 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 249 | 0 |
| scenery_small | 25 | 0 | 0 | 0 | 1117 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1142 | 25 |
| scenery_wall | 5 | 0 | 0 | 11 | 285 | 0 | 0 | 0 | 1 | 29 | 0 | 0 | 331 | 5 |
| station | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 12 | 0 | 0 | 0 | 0 | 14 | 2 |
| terrain_edge | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 11 | 0 | 0 | 0 | 18 | 1 |
| terrain_surface | 2 | 0 | 14 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 20 | 2 |
| water | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 9 |

## By objectType x image source, `official/` tree only

| objectType | self-contained | no-images | needs:g1 | needs:csg | needs:rct2dat | needs:g1+rct2dat | needs:csg+rct2dat | mixed:g1 | mixed:csg | mixed:rct2dat | mixed:g1+rct2dat | mixed:csg+g1+rct2dat | total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| footpath_item | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| footpath_railings | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| footpath_surface | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| ride | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| scenario_meta | 37 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 37 |
| scenery_group | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| scenery_small | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 25 |
| scenery_wall | 5 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| station | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| terrain_edge | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 3 |
| terrain_surface | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| water | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |

## Fully self-contained objects (embedded images only)

### footpath_item (1)

`rct2dlc.footpath_item.litterpa`

### footpath_surface (1)

`openrct2.footpath_surface.queue_invisible`

### ride (6)

`openrct2.ride.alpine_coaster`, `openrct2.ride.hybrid_coaster`, `openrct2.ride.modern_twister`, `openrct2.ride.single_rail_coaster`, `rct1.ride.toilets`, `rct2dlc.ride.zpanda`

### scenario_meta (180)

`rct1.scenario_meta.bumbly_beach`, `rct1.scenario_meta.crumbly_woods`, `rct1.scenario_meta.diamond_heights`, `rct1.scenario_meta.dynamite_dunes`, `rct1.scenario_meta.evergreen_gardens`, `rct1.scenario_meta.forest_frontiers`, `rct1.scenario_meta.ivory_towers`, `rct1.scenario_meta.karts_coasters`, `rct1.scenario_meta.katies_dreamland`, `rct1.scenario_meta.leafy_lake`, `rct1.scenario_meta.lightning_peaks`, `rct1.scenario_meta.mega_park`, `rct1.scenario_meta.mels_world`, `rct1.scenario_meta.millennium_mines`, `rct1.scenario_meta.mystic_mountain`, `rct1.scenario_meta.pacific_pyramids`, `rct1.scenario_meta.paradise_pier`, `rct1.scenario_meta.pokey_park`, `rct1.scenario_meta.rainbow_valley`, `rct1.scenario_meta.thunder_rock`, `rct1.scenario_meta.trinity_islands`, `rct1.scenario_meta.white_water_park`, `rct1aa.scenario_meta.adrenaline_heights`, `rct1aa.scenario_meta.barony_bridge`, `rct1aa.scenario_meta.butterfly_dam`, `rct1aa.scenario_meta.canary_mines`, `rct1aa.scenario_meta.coaster_canyon`, `rct1aa.scenario_meta.coaster_crazy`, `rct1aa.scenario_meta.fiasco_forest`, `rct1aa.scenario_meta.fruit_farm`, `rct1aa.scenario_meta.fun_fortress`, `rct1aa.scenario_meta.funtopia`, `rct1aa.scenario_meta.future_world`, `rct1aa.scenario_meta.gentle_glen`, `rct1aa.scenario_meta.geoffrey_gardens`, `rct1aa.scenario_meta.giggle_downs`, `rct1aa.scenario_meta.harmonic_hills`, `rct1aa.scenario_meta.haunted_harbour`, `rct1aa.scenario_meta.hydro_hills`, `rct1aa.scenario_meta.jolly_jungle`, `rct1aa.scenario_meta.magic_quarters`, `rct1aa.scenario_meta.mineral_park`, `rct1aa.scenario_meta.pickle_park`, `rct1aa.scenario_meta.roman_village`, `rct1aa.scenario_meta.rotting_heights`, `rct1aa.scenario_meta.sprightly_park`, `rct1aa.scenario_meta.swamp_cove`, `rct1aa.scenario_meta.three_monkeys_park`, `rct1aa.scenario_meta.thunderstorm_park`, `rct1aa.scenario_meta.urban_park`, `rct1aa.scenario_meta.utopia_park`, `rct1aa.scenario_meta.whispering_cliffs`, `rct1dlc.scenario_meta.bobsled_roller_coaster_competition`, `rct1dlc.scenario_meta.competition_land_1`, `rct1dlc.scenario_meta.competition_land_2`, `rct1dlc.scenario_meta.fort_anachronism`, `rct1dlc.scenario_meta.gameplay`, `rct1dlc.scenario_meta.go_karts_competition`, `rct1dlc.scenario_meta.inverted_roller_coaster_competition`, `rct1dlc.scenario_meta.mine_train_roller_coaster_competition`, `rct1dlc.scenario_meta.pc_gaming_world`, `rct1dlc.scenario_meta.pc_player`, `rct1dlc.scenario_meta.stand_up_steel_roller_coaster_competition`, `rct1dlc.scenario_meta.steel_corkscrew_roller_coaster_competition`, `rct1dlc.scenario_meta.steel_mini_roller_coaster_competition`, `rct1dlc.scenario_meta.steel_roller_coaster_competition`, `rct1dlc.scenario_meta.steel_twister_roller_coaster_competition`, `rct1dlc.scenario_meta.suspended_roller_coaster_competition`, `rct1dlc.scenario_meta.wooden_roller_coaster_competition`, `rct1ll.scenario_meta.alton_towers`, `rct1ll.scenario_meta.arid_heights`, `rct1ll.scenario_meta.blackpool_pleasure_beach`, `rct1ll.scenario_meta.crater_lake`, `rct1ll.scenario_meta.crazy_craters`, `rct1ll.scenario_meta.dragons_cove`, `rct1ll.scenario_meta.dusty_desert`, `rct1ll.scenario_meta.frightmare_hills`, `rct1ll.scenario_meta.good_knight_park`, `rct1ll.scenario_meta.grand_glacier`, `rct1ll.scenario_meta.heidepark`, `rct1ll.scenario_meta.icarus_park`, `rct1ll.scenario_meta.iceberg_islands`, `rct1ll.scenario_meta.icicle_worlds`, `rct1ll.scenario_meta.megaworld_park`, `rct1ll.scenario_meta.micro_park`, `rct1ll.scenario_meta.nevermore_park`, `rct1ll.scenario_meta.octagon_park`, `rct1ll.scenario_meta.pacifica`, `rct1ll.scenario_meta.paradise_pier_2`, `rct1ll.scenario_meta.pleasure_island`, `rct1ll.scenario_meta.razor_rocks`, `rct1ll.scenario_meta.southern_sands`, `rct1ll.scenario_meta.sunny_swamps`, `rct1ll.scenario_meta.terror_town`, `rct1ll.scenario_meta.thunder_rocks`, `rct1ll.scenario_meta.tiny_towers`, `rct1ll.scenario_meta.urban_jungle`, `rct1ll.scenario_meta.venus_ponds`, `rct1ll.scenario_meta.vertigo_views`, `rct1ll.scenario_meta.volcania`, `rct1ll.scenario_meta.wacky_warren`, `rct1ll.scenario_meta.woodworm_park`, `rct1tw.scenario_meta.taiwan_park`, `rct2.scenario_meta.alpine_adventures`, `rct2.scenario_meta.amity_airfield`, `rct2.scenario_meta.botany_breakers`, `rct2.scenario_meta.build_your_own_six_flags_belgium`, `rct2.scenario_meta.build_your_own_six_flags_great_adventure`, `rct2.scenario_meta.build_your_own_six_flags_holland`, `rct2.scenario_meta.build_your_own_six_flags_magic_mountain`, `rct2.scenario_meta.build_your_own_six_flags_over_texas`, `rct2.scenario_meta.build_your_own_six_flags_park`, `rct2.scenario_meta.bumbly_bazaar`, `rct2.scenario_meta.crazy_castle`, `rct2.scenario_meta.dusty_greens`, `rct2.scenario_meta.electric_fields`, `rct2.scenario_meta.extreme_heights`, `rct2.scenario_meta.factory_capers`, `rct2.scenario_meta.fungus_woods`, `rct2.scenario_meta.ghost_town`, `rct2.scenario_meta.gravity_gardens`, `rct2.scenario_meta.infernal_views`, `rct2.scenario_meta.lucky_lake`, `rct2.scenario_meta.rainbow_summit`, `rct2.scenario_meta.six_flags_belgium`, `rct2.scenario_meta.six_flags_great_adventure`, `rct2.scenario_meta.six_flags_holland`, `rct2.scenario_meta.six_flags_magic_mountain`, `rct2.scenario_meta.six_flags_over_texas`, `rct2.scenario_meta.tycoon_park`, `rct2dlc.scenario_meta.panda_world`, `rct2tt.scenario_meta.alcatraz`, `rct2tt.scenario_meta.animatronic_antics`, `rct2tt.scenario_meta.cliffside_castle`, `rct2tt.scenario_meta.coastersaurus`, `rct2tt.scenario_meta.crater_carnage`, `rct2tt.scenario_meta.extraterrestrial_extravaganza`, `rct2tt.scenario_meta.gemini_city`, `rct2tt.scenario_meta.metropolis`, `rct2tt.scenario_meta.mythological_madness`, `rct2tt.scenario_meta.rock_n_roll_revival`, `rct2tt.scenario_meta.rocky_rambles`, `rct2tt.scenario_meta.schneider_shores`, `rct2tt.scenario_meta.sherwood_forest`, `rct2tt.scenario_meta.woodstock`, `rct2ww.scenario_meta.ayers_adventure`, `rct2ww.scenario_meta.beach_barbecue_blast`, `rct2ww.scenario_meta.canyon_calamities`, `rct2ww.scenario_meta.european_extravaganza`, `rct2ww.scenario_meta.from_the_ashes`, `rct2ww.scenario_meta.great_wall_of_china`, `rct2ww.scenario_meta.icy_adventures`, `rct2ww.scenario_meta.lost_city_founder`, `rct2ww.scenario_meta.mines_of_africa`, `rct2ww.scenario_meta.mirage_madness`, `rct2ww.scenario_meta.okinawa_coast`, `rct2ww.scenario_meta.over_the_edge`, `rct2ww.scenario_meta.park_maharaja`, `rct2ww.scenario_meta.rainforest_romp`, `rct2ww.scenario_meta.rollercoaster_heaven`, `rct2ww.scenario_meta.sugarloaf_shores`, `rct2ww.scenario_meta.wacky_waikiki`, `uces.scenario_meta.beneath_the_christmas_tree`, `uces.scenario_meta.bigrock_blast`, `uces.scenario_meta.camp_mockingbird`, `uces.scenario_meta.cemetery_ridge`, `uces.scenario_meta.choochoo_town`, `uces.scenario_meta.dragon_islands`, `uces.scenario_meta.kiddie_karnival_ii`, `uces.scenario_meta.luna_park_cleveland`, `uces.scenario_meta.mount_vesuvius`, `uces.scenario_meta.niagara_falls_gorge`, `uces.scenario_meta.rocky_mountain_miners`, `uces.scenario_meta.sand_dune`, `uces.scenario_meta.the_lighthouse_of_alexandria`, `uces.scenario_meta.the_sandbox`, `uces.scenario_meta.the_time_machine`, `uces.scenario_meta.tower_of_babel`, `uces.scenario_meta.transformation`, `uces.scenario_meta.urbis_incognitus`

### scenery_group (1)

`rct2dlc.scenery_group.scgpanda`

### scenery_small (25)

`official.scenery_small.support_structure_half`, `rct2dlc.scenery_small.bigpanda`, `rct2dlc.scenery_small.pandagr`, `toontowner.scenery_small.ttpirf02`, `toontowner.scenery_small.ttpirf03`, `toontowner.scenery_small.ttpirf04`, `toontowner.scenery_small.ttpirf07`, `toontowner.scenery_small.ttpirf08`, `toontowner.scenery_small.ttrfgl01`, `toontowner.scenery_small.ttrfgl02`, `toontowner.scenery_small.ttrfgl03`, `toontowner.scenery_small.ttrftl02`, `toontowner.scenery_small.ttrftl03`, `toontowner.scenery_small.ttrftl04`, `toontowner.scenery_small.ttrftl07`, `toontowner.scenery_small.ttrftl08`, `toontowner.scenery_small.ttrfwd01`, `toontowner.scenery_small.ttrfwd02`, `toontowner.scenery_small.ttrfwd03`, `toontowner.scenery_small.ttrfwd04`, `toontowner.scenery_small.ttrfwd06`, `toontowner.scenery_small.ttrfwd07`, `toontowner.scenery_small.ttrfwd08`, `toontowner.scenery_small.xxbbbr01`, `toontowner.scenery_small.xxbbbr01_fix`

### scenery_wall (5)

`couger.scenery_wall.acww33`, `couger.scenery_wall.acwwf32`, `mamabear.scenery_wall.mg-prar`, `official.scenery_wall.support_structure_full`, `official.scenery_wall.support_structure_half`

### station (2)

`openrct2.station.noentrance`, `openrct2.station.noplatformnoentrance`

### terrain_edge (1)

`official.terrain_edge.void`

### terrain_surface (2)

`openrct2.terrain_surface.void`, `rct1beta.terrain_surface.wildflowers`


## Image-less objects (no sprites; usable without RCT2 unless they reference audio files)

### audio (5)

`rct1.audio.title`, `rct2.audio.base.rct2`, `rct2.audio.base.rctc`, `rct2.audio.circus`, `rct2.audio.title`

### climate (4)

`rct2.climate.cold`, `rct2.climate.cool_and_wet`, `rct2.climate.hot_and_dry`, `rct2.climate.warm`

### footpath_railings (1)

`openrct2.footpath_railings.invisible`

### footpath_surface (1)

`openrct2.footpath_surface.invisible`

### music (27)

`rct2.music.candy`, `rct2.music.custom1`, `rct2.music.custom2`, `rct2.music.egyptian`, `rct2.music.fantasy`, `rct2.music.gentle`, `rct2.music.ice`, `rct2.music.jungle`, `rct2.music.jurassic`, `rct2.music.martian`, `rct2.music.mechanical`, `rct2.music.modern`, `rct2.music.organ`, `rct2.music.oriental`, `rct2.music.pirate`, `rct2.music.ragtime`, `rct2.music.rock1`, `rct2.music.rock2`, `rct2.music.rock3`, `rct2.music.roman`, `rct2.music.snow`, `rct2.music.space`, `rct2.music.summer`, `rct2.music.techno`, `rct2.music.urban`, `rct2.music.water`, `rct2.music.wildwest`

### peep_names (1)

`rct2.peep_names.original`

### water (9)

`rct1.water.natural_water`, `rct2.water.wtrcyan`, `rct2.water.wtrgreen`, `rct2.water.wtrgreen_fix`, `rct2.water.wtrgrn`, `rct2.water.wtrorng`, `rct2.water.wtrorng_fix`, `rct2dlc.water.wtrpink`, `rct2dlc.water.wtrpink_fix`


## Objects that need RCT1/RCT2 data

Grouped by objectType; each entry shows the class. `$G1` users list their g1.dat ranges (these are the ones that would need OpenGraphics replacements even if the .DAT objects are dropped).

### footpath_banner (9)

- `rct2.footpath_banner.bn1` [needs:rct2dat] dat=BN1.DAT
- `rct2.footpath_banner.bn2` [needs:rct2dat] dat=BN2.DAT
- `rct2.footpath_banner.bn3` [needs:rct2dat] dat=BN3.DAT
- `rct2.footpath_banner.bn4` [needs:rct2dat] dat=BN4.DAT
- `rct2.footpath_banner.bn5` [needs:rct2dat] dat=BN5.DAT
- `rct2.footpath_banner.bn6` [needs:rct2dat] dat=BN6.DAT
- `rct2.footpath_banner.bn7` [needs:rct2dat] dat=BN7.DAT
- `rct2.footpath_banner.bn8` [needs:rct2dat] dat=BN8.DAT
- `rct2.footpath_banner.bn9` [needs:rct2dat] dat=BN9.DAT

### footpath_item (20)

- `rct2.footpath_item.bench1` [needs:rct2dat] dat=BENCH1.DAT
- `rct2.footpath_item.benchlog` [needs:rct2dat] dat=BENCHLOG.DAT
- `rct2.footpath_item.benchpl` [needs:rct2dat] dat=BENCHPL.DAT
- `rct2.footpath_item.benchspc` [needs:rct2dat] dat=BENCHSPC.DAT
- `rct2.footpath_item.benchstn` [needs:rct2dat] dat=BENCHSTN.DAT
- `rct2.footpath_item.jumpfnt1` [needs:rct2dat] dat=JUMPFNT1.DAT
- `rct2.footpath_item.jumpsnw1` [needs:rct2dat] dat=JUMPSNW1.DAT
- `rct2.footpath_item.lamp1` [needs:rct2dat] dat=LAMP1.DAT
- `rct2.footpath_item.lamp2` [needs:rct2dat] dat=LAMP2.DAT
- `rct2.footpath_item.lamp3` [needs:rct2dat] dat=LAMP3.DAT
- `rct2.footpath_item.lamp4` [needs:rct2dat] dat=LAMP4.DAT
- `rct2.footpath_item.lampdsy` [needs:rct2dat] dat=LAMPDSY.DAT
- `rct2.footpath_item.lamppir` [needs:rct2dat] dat=LAMPPIR.DAT
- `rct2.footpath_item.litter1` [needs:rct2dat] dat=LITTER1.DAT
- `rct2.footpath_item.littermn` [needs:rct2dat] dat=LITTERMN.DAT
- `rct2.footpath_item.littersp` [needs:rct2dat] dat=LITTERSP.DAT
- `rct2.footpath_item.litterww` [needs:rct2dat] dat=LITTERWW.DAT
- `rct2.footpath_item.qtv1` [needs:rct2dat] dat=QTV1.DAT
- `rct2tt.footpath_item.firhydrt` [needs:rct2dat] dat=FIRHYDRT.DAT
- `rct2tt.footpath_item.medbench` [needs:rct2dat] dat=MEDBENCH.DAT

### footpath_railings (15)

- `rct1ll.footpath_railings.bamboo` [mixed:csg+g1+rct2dat] g1=[3658..3674] dat=PATHDIRT.DAT
- `rct1ll.footpath_railings.space` [mixed:g1+rct2dat] g1=[3425..3444],[3124..3140] dat=PATHSPCE.DAT
- `rct2.footpath_railings.bamboo_black` [mixed:rct2dat] dat=PATHASH.DAT
- `rct2.footpath_railings.bamboo_brown` [mixed:rct2dat] dat=PATHDIRT.DAT
- `rct2.footpath_railings.concrete` [mixed:rct2dat] dat=TARMACB.DAT
- `rct2.footpath_railings.concrete_green` [mixed:rct2dat] dat=TARMACG.DAT
- `rct2.footpath_railings.space` [mixed:rct2dat] dat=PATHSPCE.DAT
- `rct2.footpath_railings.wood` [mixed:rct2dat] dat=TARMAC.DAT
- `rct2tt.footpath_railings.balustrade` [mixed:rct2dat] dat=MYTHPATH.DAT
- `rct2tt.footpath_railings.circuitboard` [mixed:rct2dat] dat=FUTRPATH.DAT
- `rct2tt.footpath_railings.circuitboard_invisible` [mixed:rct2dat] dat=FUTRPATH.DAT
- `rct2tt.footpath_railings.medieval` [mixed:rct2dat] dat=MEDIPATH.DAT
- `rct2tt.footpath_railings.pavement` [mixed:rct2dat] dat=1920PATH.DAT
- `rct2tt.footpath_railings.rainbow` [mixed:rct2dat] dat=RANBPATH.DAT
- `rct2tt.footpath_railings.rocky` [mixed:rct2dat] dat=JURRPATH.DAT

### footpath_surface (37)

- `rct1.footpath_surface.crazy_paving` [mixed:csg]
- `rct1.footpath_surface.dirt` [mixed:csg]
- `rct1.footpath_surface.queue_blue` [needs:csg+rct2dat] dat=TARMAC.DAT
- `rct1.footpath_surface.road` [needs:rct2dat] dat=ROAD.DAT
- `rct1.footpath_surface.tarmac` [mixed:rct2dat] dat=ROAD.DAT,TARMAC.DAT
- `rct1.footpath_surface.tiles_brown` [mixed:csg]
- `rct1aa.footpath_surface.ash` [mixed:csg]
- `rct1aa.footpath_surface.queue_green` [mixed:csg]
- `rct1aa.footpath_surface.queue_red` [mixed:csg]
- `rct1aa.footpath_surface.queue_yellow` [mixed:csg]
- `rct1aa.footpath_surface.tarmac_brown` [mixed:csg]
- `rct1aa.footpath_surface.tarmac_green` [mixed:csg]
- `rct1aa.footpath_surface.tarmac_red` [mixed:csg]
- `rct1aa.footpath_surface.tiles_grey` [mixed:csg]
- `rct1ll.footpath_surface.tiles_green` [mixed:csg]
- `rct1ll.footpath_surface.tiles_red` [mixed:csg]
- `rct2.footpath_surface.ash` [mixed:rct2dat] dat=PATHASH.DAT
- `rct2.footpath_surface.crazy_paving` [mixed:rct2dat] dat=PATHCRZY.DAT
- `rct2.footpath_surface.dirt` [mixed:rct2dat] dat=PATHDIRT.DAT
- `rct2.footpath_surface.queue_blue` [needs:rct2dat] dat=TARMAC.DAT
- `rct2.footpath_surface.queue_green` [mixed:rct2dat] dat=TARMACG.DAT
- `rct2.footpath_surface.queue_red` [mixed:rct2dat] dat=PATHSPCE.DAT
- `rct2.footpath_surface.queue_yellow` [mixed:rct2dat] dat=PATHASH.DAT
- `rct2.footpath_surface.road` [needs:rct2dat] dat=ROAD.DAT
- `rct2.footpath_surface.tarmac` [mixed:rct2dat] dat=TARMAC.DAT
- `rct2.footpath_surface.tarmac_brown` [mixed:rct2dat] dat=TARMACB.DAT
- `rct2.footpath_surface.tarmac_green` [mixed:rct2dat] dat=TARMACG.DAT
- `rct2.footpath_surface.tarmac_red` [mixed:rct2dat] dat=PATHSPCE.DAT
- `rct2tt.footpath_surface.circuitboard` [mixed:rct2dat] dat=FUTRPATH.DAT
- `rct2tt.footpath_surface.medieval` [mixed:rct2dat] dat=MEDIPATH.DAT
- `rct2tt.footpath_surface.mosaic` [mixed:rct2dat] dat=MYTHPATH.DAT
- `rct2tt.footpath_surface.pavement` [mixed:rct2dat] dat=1920PATH.DAT
- `rct2tt.footpath_surface.queue_circuitboard` [needs:rct2dat] dat=FUTRPATH.DAT
- `rct2tt.footpath_surface.queue_pavement` [needs:rct2dat] dat=1920PATH.DAT
- `rct2tt.footpath_surface.queue_rainbow` [needs:rct2dat] dat=RANBPATH.DAT
- `rct2tt.footpath_surface.rainbow` [mixed:rct2dat] dat=RANBPATH.DAT
- `rct2tt.footpath_surface.rocky` [mixed:rct2dat] dat=JURRPATH.DAT

### music (5)

- `rct2.music.dodgems` [needs:rct2dat] dat=DODG1.DAT
- `rct2.music.fairground` [needs:rct2dat] dat=MGR1.DAT
- `rct2.music.horror` [needs:rct2dat] dat=HHBUILD.DAT
- `rct2.music.medieval` [needs:rct2dat] dat=BATTRRAM.DAT
- `rct2.music.toyland` [needs:rct2dat] dat=CTCAR.DAT

### park_entrance (16)

- `rct2.park_entrance.pkemm` [needs:rct2dat] dat=PKEMM.DAT
- `rct2.park_entrance.pkent1` [needs:rct2dat] dat=PKENT1.DAT
- `rct2.park_entrance.pkesfh` [needs:rct2dat] dat=PKESFH.DAT
- `rct2tt.park_entrance.1920sent` [needs:rct2dat] dat=1920SENT.DAT
- `rct2tt.park_entrance.futurent` [needs:rct2dat] dat=FUTURENT.DAT
- `rct2tt.park_entrance.gldyrent` [needs:rct2dat] dat=GLDYRENT.DAT
- `rct2tt.park_entrance.jurasent` [needs:rct2dat] dat=JURASENT.DAT
- `rct2tt.park_entrance.medientr` [needs:rct2dat] dat=MEDIENTR.DAT
- `rct2tt.park_entrance.mythentr` [needs:rct2dat] dat=MYTHENTR.DAT
- `rct2ww.park_entrance.africent` [needs:rct2dat] dat=AFRICENT.DAT
- `rct2ww.park_entrance.euroent` [needs:rct2dat] dat=EUROENT.DAT
- `rct2ww.park_entrance.iceent` [needs:rct2dat] dat=ICEENT.DAT
- `rct2ww.park_entrance.japent` [needs:rct2dat] dat=JAPENT.DAT
- `rct2ww.park_entrance.naent` [needs:rct2dat] dat=NAENT.DAT
- `rct2ww.park_entrance.ozentran` [needs:rct2dat] dat=OZENTRAN.DAT
- `rct2ww.park_entrance.samerent` [needs:rct2dat] dat=SAMERENT.DAT

### peep_animations (15)

- `rct2.peep_animations.entertainer_astronaut` [needs:g1] g1=[5125..5125],[13765..13768],[13769..13792],[13793..13844],[13845..13856],[13857..13896]
- `rct2.peep_animations.entertainer_bandit` [needs:g1] g1=[5126..5126],[13105..13108],[13109..13132],[13133..13196],[13197..13208],[13209..13376]
- `rct2.peep_animations.entertainer_elephant` [needs:g1] g1=[5120..5120],[12325..12348],[12349..12352],[12353..12364],[12365..12392],[12393..12432],[12433..12544]
- `rct2.peep_animations.entertainer_gorilla` [needs:g1] g1=[5122..5122],[12545..12548],[12549..12572],[12573..12616],[12617..12664],[12665..12676]
- `rct2.peep_animations.entertainer_knight` [needs:g1] g1=[5124..5124],[12893..12896],[12897..12920],[12921..12980],[12981..12992],[12993..13104]
- `rct2.peep_animations.entertainer_panda` [needs:g1] g1=[5118..5118],[11973..11996],[11997..12000],[12001..12012],[12013..12040],[12041..12064],[12065..12128]
- `rct2.peep_animations.entertainer_pirate` [needs:g1] g1=[5128..5128],[13377..13380],[13381..13404],[13405..13468],[13469..13480],[13481..13608]
- `rct2.peep_animations.entertainer_roman` [needs:g1] g1=[5121..5121],[13897..13920],[13921..13924],[13925..13936],[13937..13968],[13969..14028],[14029..14184]
- `rct2.peep_animations.entertainer_sheriff` [needs:g1] g1=[5127..5127],[13609..13612],[13613..13636],[13637..13700],[13701..13712],[13713..13764]
- `rct2.peep_animations.entertainer_snowman` [needs:g1] g1=[5123..5123],[12677..12680],[12681..12704],[12705..12840],[12841..12880],[12881..12892]
- `rct2.peep_animations.entertainer_tiger` [needs:g1] g1=[5119..5119],[12129..12152],[12153..12156],[12157..12168],[12169..12196],[12197..12220],[12221..12324]
- `rct2.peep_animations.guest` [needs:g1] g1=[5490..5490],[6409..6432],[6433..6456],[6457..6480],[6481..6504],[6505..6528],[6529..6532],[6533..6536],[6537..6560],[6561..6584],[6585..6620],[6621..6624],...(+123)
- `rct2.peep_animations.handyman` [needs:g1] g1=[5111..5111],[11261..11284],[11285..11288],[11289..11300],[11301..11324],[11325..11344],[11345..11376],[11377..11400],[11401..11440]
- `rct2.peep_animations.mechanic` [needs:g1] g1=[5116..5116],[11441..11464],[11465..11468],[11469..11480],[11481..11512],[11513..11596],[11597..11668],[11669..11800],[11801..11880]
- `rct2.peep_animations.security` [needs:g1] g1=[5096..5096],[11881..11904],[11905..11908],[11909..11920],[11921..11948],[11949..11972]

### ride (334)

- `rct1.ride.bobsleigh_trains` [mixed:csg]
- `rct1.ride.bumper_boats` [mixed:csg]
- `rct1.ride.cat_cars` [mixed:csg]
- `rct1.ride.chairlift_cars` [mixed:csg]
- `rct1.ride.corkscrew_trains` [mixed:csg]
- `rct1.ride.dinghies` [mixed:csg]
- `rct1.ride.dodgems` [mixed:csg]
- `rct1.ride.fruity_ices_stall` [mixed:csg]
- `rct1.ride.go_karts` [mixed:csg]
- `rct1.ride.horses` [mixed:csg]
- `rct1.ride.inverted_trains` [mixed:csg]
- `rct1.ride.ladybird_trains` [mixed:csg]
- `rct1.ride.log_trains` [mixed:csg]
- `rct1.ride.logs` [mixed:csg]
- `rct1.ride.mine_cars` [mixed:csg]
- `rct1.ride.mine_trains` [mixed:csg]
- `rct1.ride.motorbikes` [mixed:csg]
- `rct1.ride.mouse_cars` [mixed:csg]
- `rct1.ride.pickup_trucks` [mixed:csg]
- `rct1.ride.racing_cars` [mixed:csg]
- `rct1.ride.reverse_freefall_car` [mixed:csg]
- `rct1.ride.river_rapids_boats` [mixed:csg]
- `rct1.ride.rocket_cars` [mixed:csg]
- `rct1.ride.single_person_swinging_cars` [mixed:csg]
- `rct1.ride.small_monorail_cars` [mixed:csg]
- `rct1.ride.spinning_cars` [mixed:csg]
- `rct1.ride.sports_cars` [mixed:csg]
- `rct1.ride.stand_up_trains` [mixed:csg]
- `rct1.ride.steam_trains` [mixed:csg]
- `rct1.ride.steel_rc_trains` [mixed:csg]
- `rct1.ride.steel_rc_trains_reversed` [mixed:csg]
- `rct1.ride.streamlined_monorail_trains` [mixed:csg]
- `rct1.ride.suspended_swinging_aeroplane_cars` [mixed:csg]
- `rct1.ride.suspended_swinging_cars` [mixed:csg]
- `rct1.ride.swinging_lay_down_cars` [mixed:csg]
- `rct1.ride.vertical_drop_trains` [mixed:csg]
- `rct1.ride.wooden_rc_trains` [mixed:csg]
- `rct1.ride.wooden_rc_trains_reversed` [mixed:csg]
- `rct1aa.ride.bicycles` [mixed:csg]
- `rct1aa.ride.floorless_twister_trains` [mixed:csg]
- `rct1aa.ride.flying_saucers` [mixed:csg]
- `rct1aa.ride.ghost_train_cars` [mixed:csg]
- `rct1aa.ride.heartline_twister_cars` [mixed:csg]
- `rct1aa.ride.hyper_twister_trains` [mixed:csg]
- `rct1aa.ride.lay_down_trains` [mixed:csg]
- `rct1aa.ride.mini_helicopters` [mixed:csg]
- `rct1aa.ride.reverser_cars` [mixed:csg]
- `rct1aa.ride.side_friction_cars` [mixed:csg]
- `rct1aa.ride.ski_lift_cars` [mixed:csg]
- `rct1aa.ride.splash_boats` [mixed:csg]
- `rct1aa.ride.stand_up_twister_trains` [mixed:csg]
- `rct1aa.ride.steam_trains_covered` [mixed:csg]
- `rct1aa.ride.steel_wild_mouse_cars` [mixed:csg]
- `rct1aa.ride.suspended_monorail_trains` [mixed:csg]
- `rct1aa.ride.twister_trains` [mixed:csg]
- `rct1aa.ride.vintage_cars` [mixed:csg]
- `rct1aa.ride.virginia_reel_tubs` [mixed:csg]
- `rct1aa.ride.wooden_articulated_trains` [mixed:csg]
- `rct1ll.ride.4_across_inverted_trains` [mixed:csg]
- `rct1ll.ride.air_powered_trains` [mixed:csg]
- `rct1ll.ride.coaster_boats` [mixed:csg]
- `rct1ll.ride.face_off_cars` [mixed:csg]
- `rct1ll.ride.hypercoaster_trains` [mixed:csg]
- `rct1ll.ride.inverted_hairpin_cars` [mixed:csg]
- `rct1ll.ride.jet_skis` [mixed:csg]
- `rct1ll.ride.rafts` [mixed:csg]
- `rct1ll.ride.steam_trains_american` [mixed:csg]
- `rct2.ride.4x4` [needs:rct2dat] dat=4X4.DAT
- `rct2.ride.aml1` [needs:rct2dat] dat=AML1.DAT
- `rct2.ride.amt1` [needs:rct2dat] dat=AMT1.DAT
- `rct2.ride.arrsw1` [needs:rct2dat] dat=ARRSW1.DAT
- `rct2.ride.arrsw2` [needs:rct2dat] dat=ARRSW2.DAT
- `rct2.ride.arrt1` [needs:rct2dat] dat=ARRT1.DAT
- `rct2.ride.arrt2` [needs:rct2dat] dat=ARRT2.DAT
- `rct2.ride.arrx` [needs:rct2dat] dat=ARRX.DAT
- `rct2.ride.atm1` [needs:rct2dat] dat=ATM1.DAT
- `rct2.ride.balln` [needs:rct2dat] dat=BALLN.DAT
- `rct2.ride.batfl` [needs:rct2dat] dat=BATFL.DAT
- `rct2.ride.bboat` [needs:rct2dat] dat=BBOAT.DAT
- `rct2.ride.bmair` [needs:rct2dat] dat=BMAIR.DAT
- `rct2.ride.bmfl` [needs:rct2dat] dat=BMFL.DAT
- `rct2.ride.bmrb` [needs:rct2dat] dat=BMRB.DAT
- `rct2.ride.bmsd` [needs:rct2dat] dat=BMSD.DAT
- `rct2.ride.bmsu` [needs:rct2dat] dat=BMSU.DAT
- `rct2.ride.bmvd` [needs:rct2dat] dat=BMVD.DAT
- `rct2.ride.bnoodles` [needs:rct2dat] dat=BNOODLES.DAT
- `rct2.ride.bob1` [needs:rct2dat] dat=BOB1.DAT
- `rct2.ride.burgb` [needs:rct2dat] dat=BURGB.DAT
- `rct2.ride.c3d` [needs:rct2dat] dat=C3D.DAT
- `rct2.ride.cboat` [needs:rct2dat] dat=CBOAT.DAT
- `rct2.ride.chbuild` [needs:rct2dat] dat=CHBUILD.DAT
- `rct2.ride.chcks` [needs:rct2dat] dat=CHCKS.DAT
- `rct2.ride.chknug` [needs:rct2dat] dat=CHKNUG.DAT
- `rct2.ride.chpsh` [needs:rct2dat] dat=CHPSH.DAT
- `rct2.ride.chpsh2` [needs:rct2dat] dat=CHPSH2.DAT
- `rct2.ride.cindr` [needs:rct2dat] dat=CINDR.DAT
- `rct2.ride.circus1` [needs:rct2dat] dat=CIRCUS1.DAT
- `rct2.ride.clift1` [needs:rct2dat] dat=CLIFT1.DAT
- `rct2.ride.clift2` [needs:rct2dat] dat=CLIFT2.DAT
- `rct2.ride.cndyf` [needs:rct2dat] dat=CNDYF.DAT
- `rct2.ride.coffs` [needs:rct2dat] dat=COFFS.DAT
- `rct2.ride.cookst` [needs:rct2dat] dat=COOKST.DAT
- `rct2.ride.cstboat` [needs:rct2dat] dat=CSTBOAT.DAT
- `rct2.ride.ctcar` [needs:rct2dat] dat=CTCAR.DAT
- `rct2.ride.ding1` [needs:rct2dat] dat=DING1.DAT
- `rct2.ride.dodg1` [needs:rct2dat] dat=DODG1.DAT
- `rct2.ride.dough` [needs:rct2dat] dat=DOUGH.DAT
- `rct2.ride.drnks` [needs:rct2dat] dat=DRNKS.DAT
- `rct2.ride.enterp` [needs:rct2dat] dat=ENTERP.DAT
- `rct2.ride.faid1` [needs:rct2dat] dat=FAID1.DAT
- `rct2.ride.frnood` [needs:rct2dat] dat=FRNOOD.DAT
- `rct2.ride.fsauc` [needs:rct2dat] dat=FSAUC.DAT
- `rct2.ride.funcake` [needs:rct2dat] dat=FUNCAKE.DAT
- `rct2.ride.fwh1` [needs:rct2dat] dat=FWH1.DAT
- `rct2.ride.gdrop1` [needs:rct2dat] dat=GDROP1.DAT
- `rct2.ride.golf1` [needs:rct2dat] dat=GOLF1.DAT
- `rct2.ride.goltr` [needs:rct2dat] dat=GOLTR.DAT
- `rct2.ride.gtc` [needs:rct2dat] dat=GTC.DAT
- `rct2.ride.hatst` [needs:rct2dat] dat=HATST.DAT
- `rct2.ride.hchoc` [needs:rct2dat] dat=HCHOC.DAT
- `rct2.ride.helicar` [needs:rct2dat] dat=HELICAR.DAT
- `rct2.ride.hhbuild` [needs:rct2dat] dat=HHBUILD.DAT
- `rct2.ride.hmaze` [needs:rct2dat] dat=HMAZE.DAT
- `rct2.ride.hmcar` [needs:rct2dat] dat=HMCAR.DAT
- `rct2.ride.hotds` [needs:rct2dat] dat=HOTDS.DAT
- `rct2.ride.hskelt` [needs:g1+rct2dat] g1=[20548..20751] dat=HSKELT.DAT
- `rct2.ride.icecr1` [mixed:rct2dat] dat=ICECR1.DAT
- `rct2.ride.icecr2` [needs:rct2dat] dat=ICECR2.DAT
- `rct2.ride.icetst` [needs:rct2dat] dat=ICETST.DAT
- `rct2.ride.infok` [needs:rct2dat] dat=INFOK.DAT
- `rct2.ride.intbob` [needs:rct2dat] dat=INTBOB.DAT
- `rct2.ride.intinv` [needs:rct2dat] dat=INTINV.DAT
- `rct2.ride.intst` [needs:rct2dat] dat=INTST.DAT
- `rct2.ride.ivmc1` [needs:rct2dat] dat=IVMC1.DAT
- `rct2.ride.jski` [needs:rct2dat] dat=JSKI.DAT
- `rct2.ride.jstar1` [needs:rct2dat] dat=JSTAR1.DAT
- `rct2.ride.kart1` [needs:rct2dat] dat=KART1.DAT
- `rct2.ride.lemst` [needs:rct2dat] dat=LEMST.DAT
- `rct2.ride.lfb1` [needs:rct2dat] dat=LFB1.DAT
- `rct2.ride.lift1` [needs:rct2dat] dat=LIFT1.DAT
- `rct2.ride.mbsoup` [needs:rct2dat] dat=MBSOUP.DAT
- `rct2.ride.mcarpet1` [needs:rct2dat] dat=MCARPET1.DAT
- `rct2.ride.mft` [needs:rct2dat] dat=MFT.DAT
- `rct2.ride.mgr1` [needs:rct2dat] dat=MGR1.DAT
- `rct2.ride.monbk` [needs:rct2dat] dat=MONBK.DAT
- `rct2.ride.mono1` [needs:rct2dat] dat=MONO1.DAT
- `rct2.ride.mono2` [needs:rct2dat] dat=MONO2.DAT
- `rct2.ride.mono3` [needs:rct2dat] dat=MONO3.DAT
- `rct2.ride.nemt` [needs:rct2dat] dat=NEMT.DAT
- `rct2.ride.nrl` [needs:rct2dat] dat=NRL.DAT
- `rct2.ride.nrl2` [needs:rct2dat] dat=NRL2.DAT
- `rct2.ride.obs1` [needs:rct2dat] dat=OBS1.DAT
- `rct2.ride.obs2` [needs:rct2dat] dat=OBS2.DAT
- `rct2.ride.pizzs` [needs:rct2dat] dat=PIZZS.DAT
- `rct2.ride.pmt1` [needs:rct2dat] dat=PMT1.DAT
- `rct2.ride.popcs` [needs:rct2dat] dat=POPCS.DAT
- `rct2.ride.premt1` [needs:rct2dat] dat=PREMT1.DAT
- `rct2.ride.pretst` [needs:rct2dat] dat=PRETST.DAT
- `rct2.ride.ptct1` [needs:rct2dat] dat=PTCT1.DAT
- `rct2.ride.ptct2` [needs:rct2dat] dat=PTCT2.DAT
- `rct2.ride.ptct2r` [needs:rct2dat] dat=PTCT2R.DAT
- `rct2.ride.rapboat` [needs:rct2dat] dat=RAPBOAT.DAT
- `rct2.ride.rboat` [needs:rct2dat] dat=RBOAT.DAT
- `rct2.ride.rckc` [needs:rct2dat] dat=RCKC.DAT
- `rct2.ride.rcr` [needs:rct2dat] dat=RCR.DAT
- `rct2.ride.revcar` [needs:rct2dat] dat=REVCAR.DAT
- `rct2.ride.revf1` [needs:rct2dat] dat=REVF1.DAT
- `rct2.ride.rftboat` [needs:rct2dat] dat=RFTBOAT.DAT
- `rct2.ride.rsaus` [needs:rct2dat] dat=RSAUS.DAT
- `rct2.ride.sbox` [needs:rct2dat] dat=SBOX.DAT
- `rct2.ride.scht1` [needs:rct2dat] dat=SCHT1.DAT
- `rct2.ride.sfric1` [needs:rct2dat] dat=SFRIC1.DAT
- `rct2.ride.simpod` [needs:rct2dat] dat=SIMPOD.DAT
- `rct2.ride.skytr` [needs:rct2dat] dat=SKYTR.DAT
- `rct2.ride.slcfo` [needs:rct2dat] dat=SLCFO.DAT
- `rct2.ride.slct` [needs:rct2dat] dat=SLCT.DAT
- `rct2.ride.smc1` [needs:rct2dat] dat=SMC1.DAT
- `rct2.ride.smc2` [needs:rct2dat] dat=SMC2.DAT
- `rct2.ride.smono` [needs:rct2dat] dat=SMONO.DAT
- `rct2.ride.souvs` [needs:rct2dat] dat=SOUVS.DAT
- `rct2.ride.soybean` [needs:rct2dat] dat=SOYBEAN.DAT
- `rct2.ride.spboat` [needs:rct2dat] dat=SPBOAT.DAT
- `rct2.ride.spcar` [needs:rct2dat] dat=SPCAR.DAT
- `rct2.ride.spdrcr` [needs:rct2dat] dat=SPDRCR.DAT
- `rct2.ride.sqdst` [needs:rct2dat] dat=SQDST.DAT
- `rct2.ride.srings` [needs:rct2dat] dat=SRINGS.DAT
- `rct2.ride.ssc1` [needs:rct2dat] dat=SSC1.DAT
- `rct2.ride.starfrdr` [needs:rct2dat] dat=STARFRDR.DAT
- `rct2.ride.steep1` [needs:rct2dat] dat=STEEP1.DAT
- `rct2.ride.steep2` [needs:rct2dat] dat=STEEP2.DAT
- `rct2.ride.submar` [needs:rct2dat] dat=SUBMAR.DAT
- `rct2.ride.substl` [needs:rct2dat] dat=SUBSTL.DAT
- `rct2.ride.sungst` [needs:rct2dat] dat=SUNGST.DAT
- `rct2.ride.swans` [needs:rct2dat] dat=SWANS.DAT
- `rct2.ride.swsh1` [needs:rct2dat] dat=SWSH1.DAT
- `rct2.ride.swsh2` [needs:rct2dat] dat=SWSH2.DAT
- `rct2.ride.thcar` [needs:rct2dat] dat=THCAR.DAT
- `rct2.ride.tlt1` [needs:rct2dat] dat=TLT1.DAT
- `rct2.ride.tlt2` [needs:rct2dat] dat=TLT2.DAT
- `rct2.ride.toffs` [needs:rct2dat] dat=TOFFS.DAT
- `rct2.ride.togst` [needs:rct2dat] dat=TOGST.DAT
- `rct2.ride.topsp1` [needs:rct2dat] dat=TOPSP1.DAT
- `rct2.ride.tram1` [needs:rct2dat] dat=TRAM1.DAT
- `rct2.ride.trike` [needs:rct2dat] dat=TRIKE.DAT
- `rct2.ride.truck1` [needs:rct2dat] dat=TRUCK1.DAT
- `rct2.ride.tshrt` [needs:rct2dat] dat=TSHRT.DAT
- `rct2.ride.twist1` [needs:rct2dat] dat=TWIST1.DAT
- `rct2.ride.twist2` [needs:rct2dat] dat=TWIST2.DAT
- `rct2.ride.utcar` [needs:rct2dat] dat=UTCAR.DAT
- `rct2.ride.utcarr` [needs:rct2dat] dat=UTCARR.DAT
- `rct2.ride.vcr` [needs:rct2dat] dat=VCR.DAT
- `rct2.ride.vekdv` [needs:rct2dat] dat=VEKDV.DAT
- `rct2.ride.vekst` [needs:rct2dat] dat=VEKST.DAT
- `rct2.ride.vekvamp` [needs:rct2dat] dat=VEKVAMP.DAT
- `rct2.ride.vreel` [needs:rct2dat] dat=VREEL.DAT
- `rct2.ride.wcatc` [needs:rct2dat] dat=WCATC.DAT
- `rct2.ride.wmmine` [needs:rct2dat] dat=WMMINE.DAT
- `rct2.ride.wmouse` [needs:rct2dat] dat=WMOUSE.DAT
- `rct2.ride.wmspin` [needs:rct2dat] dat=WMSPIN.DAT
- `rct2.ride.wonton` [needs:rct2dat] dat=WONTON.DAT
- `rct2.ride.zldb` [needs:rct2dat] dat=ZLDB.DAT
- `rct2.ride.zlog` [needs:rct2dat] dat=ZLOG.DAT
- `rct2tt.ride.1920racr` [needs:rct2dat] dat=1920RACR.DAT
- `rct2tt.ride.1920sand` [needs:rct2dat] dat=1920SAND.DAT
- `rct2tt.ride.1960tsrt` [needs:rct2dat] dat=1960TSRT.DAT
- `rct2tt.ride.barnstrm` [needs:rct2dat] dat=BARNSTRM.DAT
- `rct2tt.ride.battrram` [needs:rct2dat] dat=BATTRRAM.DAT
- `rct2tt.ride.blckdeth` [needs:rct2dat] dat=BLCKDETH.DAT
- `rct2tt.ride.bmvoctps` [needs:rct2dat] dat=BMVOCTPS.DAT
- `rct2tt.ride.cavmncar` [needs:rct2dat] dat=CAVMNCAR.DAT
- `rct2tt.ride.cerberus` [needs:rct2dat] dat=CERBERUS.DAT
- `rct2tt.ride.cyclopsx` [needs:rct2dat] dat=CYCLOPSX.DAT
- `rct2tt.ride.dinoeggs` [needs:rct2dat] dat=DINOEGGS.DAT
- `rct2tt.ride.dragnfly` [needs:rct2dat] dat=DRAGNFLY.DAT
- `rct2tt.ride.figtknit` [needs:rct2dat] dat=FIGTKNIT.DAT
- `rct2tt.ride.flalmace` [needs:rct2dat] dat=FLALMACE.DAT
- `rct2tt.ride.flwrpowr` [needs:rct2dat] dat=FLWRPOWR.DAT
- `rct2tt.ride.flygboat` [needs:rct2dat] dat=FLYGBOAT.DAT
- `rct2tt.ride.funhouse` [needs:rct2dat] dat=FUNHOUSE.DAT
- `rct2tt.ride.ganstrcr` [needs:rct2dat] dat=GANSTRCR.DAT
- `rct2tt.ride.gintspdr` [needs:rct2dat] dat=GINTSPDR.DAT
- `rct2tt.ride.halofmrs` [needs:rct2dat] dat=HALOFMRS.DAT
- `rct2tt.ride.harpiesx` [mixed:rct2dat] dat=HARPIESX.DAT
- `rct2tt.ride.hotrodxx` [needs:rct2dat] dat=HOTRODXX.DAT
- `rct2tt.ride.hoverbke` [needs:rct2dat] dat=HOVERBKE.DAT
- `rct2tt.ride.hovercar` [mixed:rct2dat] dat=HOVERCAR.DAT
- `rct2tt.ride.hovrbord` [needs:rct2dat] dat=HOVRBORD.DAT
- `rct2tt.ride.jetpackx` [needs:rct2dat] dat=JETPACKX.DAT
- `rct2tt.ride.jetplane` [needs:rct2dat] dat=JETPLANE.DAT
- `rct2tt.ride.jousting` [needs:rct2dat] dat=JOUSTING.DAT
- `rct2tt.ride.medisoup` [needs:rct2dat] dat=MEDISOUP.DAT
- `rct2tt.ride.mgr2` [needs:rct2dat] dat=MGR2.DAT
- `rct2tt.ride.microbus` [needs:rct2dat] dat=MICROBUS.DAT
- `rct2tt.ride.mktstal1` [needs:rct2dat] dat=MKTSTAL1.DAT
- `rct2tt.ride.mktstal2` [needs:rct2dat] dat=MKTSTAL2.DAT
- `rct2tt.ride.moonjuce` [needs:rct2dat] dat=MOONJUCE.DAT
- `rct2tt.ride.mythosea` [needs:rct2dat] dat=MYTHOSEA.DAT
- `rct2tt.ride.neptunex` [mixed:rct2dat] dat=NEPTUNEX.DAT
- `rct2tt.ride.oakbarel` [needs:rct2dat] dat=OAKBAREL.DAT
- `rct2tt.ride.pegasusx` [needs:rct2dat] dat=PEGASUSX.DAT
- `rct2tt.ride.polchase` [needs:rct2dat] dat=POLCHASE.DAT
- `rct2tt.ride.policecr` [needs:rct2dat] dat=POLICECR.DAT
- `rct2tt.ride.pterodac` [needs:rct2dat] dat=PTERODAC.DAT
- `rct2tt.ride.raptorxx` [needs:rct2dat] dat=RAPTORXX.DAT
- `rct2tt.ride.rivrstyx` [mixed:rct2dat] dat=RIVRSTYX.DAT
- `rct2tt.ride.schoolbs` [needs:rct2dat] dat=SCHOOLBS.DAT
- `rct2tt.ride.seaplane` [needs:rct2dat] dat=SEAPLANE.DAT
- `rct2tt.ride.softoyst` [needs:rct2dat] dat=SOFTOYST.DAT
- `rct2tt.ride.spokprsn` [needs:rct2dat] dat=SPOKPRSN.DAT
- `rct2tt.ride.stamphrd` [needs:rct2dat] dat=STAMPHRD.DAT
- `rct2tt.ride.telepter` [needs:rct2dat] dat=TELEPTER.DAT
- `rct2tt.ride.timemach` [needs:rct2dat] dat=TIMEMACH.DAT
- `rct2tt.ride.tommygun` [needs:rct2dat] dat=TOMMYGUN.DAT
- `rct2tt.ride.trebucht` [needs:rct2dat] dat=TREBUCHT.DAT
- `rct2tt.ride.tricatop` [needs:rct2dat] dat=TRICATOP.DAT
- `rct2tt.ride.trilobte` [needs:rct2dat] dat=TRILOBTE.DAT
- `rct2tt.ride.valkyrie` [needs:rct2dat] dat=VALKYRIE.DAT
- `rct2tt.ride.zeplelin` [needs:rct2dat] dat=ZEPLELIN.DAT
- `rct2ww.ride.anaconda` [needs:rct2dat] dat=ANACONDA.DAT
- `rct2ww.ride.blackcab` [needs:rct2dat] dat=BLACKCAB.DAT
- `rct2ww.ride.bomerang` [needs:rct2dat] dat=BOMERANG.DAT
- `rct2ww.ride.bullet` [needs:rct2dat] dat=BULLET.DAT
- `rct2ww.ride.caddilac` [needs:rct2dat] dat=CADDILAC.DAT
- `rct2ww.ride.coffeecu` [needs:rct2dat] dat=COFFEECU.DAT
- `rct2ww.ride.condorrd` [needs:rct2dat] dat=CONDORRD.DAT
- `rct2ww.ride.congaeel` [needs:rct2dat] dat=CONGAEEL.DAT
- `rct2ww.ride.crnvbfly` [needs:rct2dat] dat=CRNVBFLY.DAT
- `rct2ww.ride.crnvfrog` [needs:rct2dat] dat=CRNVFROG.DAT
- `rct2ww.ride.crnvlzrd` [needs:rct2dat] dat=CRNVLZRD.DAT
- `rct2ww.ride.crocflum` [needs:rct2dat] dat=CROCFLUM.DAT
- `rct2ww.ride.dhowwatr` [needs:rct2dat] dat=DHOWWATR.DAT
- `rct2ww.ride.diamondr` [needs:rct2dat] dat=DIAMONDR.DAT
- `rct2ww.ride.dolphinr` [needs:rct2dat] dat=DOLPHINR.DAT
- `rct2ww.ride.dragdodg` [needs:rct2dat] dat=DRAGDODG.DAT
- `rct2ww.ride.dragon` [needs:rct2dat] dat=DRAGON.DAT
- `rct2ww.ride.faberge` [needs:rct2dat] dat=FABERGE.DAT
- `rct2ww.ride.fightkit` [needs:rct2dat] dat=FIGHTKIT.DAT
- `rct2ww.ride.firecrak` [needs:rct2dat] dat=FIRECRAK.DAT
- `rct2ww.ride.football` [needs:rct2dat] dat=FOOTBALL.DAT
- `rct2ww.ride.gorilla` [needs:rct2dat] dat=GORILLA.DAT
- `rct2ww.ride.gratwhte` [needs:rct2dat] dat=GRATWHTE.DAT
- `rct2ww.ride.hipporid` [needs:rct2dat] dat=HIPPORID.DAT
- `rct2ww.ride.huskie` [needs:rct2dat] dat=HUSKIE.DAT
- `rct2ww.ride.italypor` [needs:rct2dat] dat=ITALYPOR.DAT
- `rct2ww.ride.jaguarrd` [needs:rct2dat] dat=JAGUARRD.DAT
- `rct2ww.ride.junkswng` [needs:rct2dat] dat=JUNKSWNG.DAT
- `rct2ww.ride.killwhal` [needs:rct2dat] dat=KILLWHAL.DAT
- `rct2ww.ride.kolaride` [needs:rct2dat] dat=KOLARIDE.DAT
- `rct2ww.ride.lionride` [needs:rct2dat] dat=LIONRIDE.DAT
- `rct2ww.ride.londonbs` [needs:rct2dat] dat=LONDONBS.DAT
- `rct2ww.ride.mandarin` [needs:rct2dat] dat=MANDARIN.DAT
- `rct2ww.ride.mantaray` [needs:rct2dat] dat=MANTARAY.DAT
- `rct2ww.ride.minecart` [needs:rct2dat] dat=MINECART.DAT
- `rct2ww.ride.minelift` [needs:rct2dat] dat=MINELIFT.DAT
- `rct2ww.ride.ostrich` [needs:rct2dat] dat=OSTRICH.DAT
- `rct2ww.ride.outriggr` [needs:rct2dat] dat=OUTRIGGR.DAT
- `rct2ww.ride.penguinb` [needs:rct2dat] dat=PENGUINB.DAT
- `rct2ww.ride.polarber` [needs:rct2dat] dat=POLARBER.DAT
- `rct2ww.ride.rhinorid` [needs:rct2dat] dat=RHINORID.DAT
- `rct2ww.ride.rocket` [needs:rct2dat] dat=ROCKET.DAT
- `rct2ww.ride.rssncrrd` [needs:rct2dat] dat=RSSNCRRD.DAT
- `rct2ww.ride.sanftram` [needs:rct2dat] dat=SANFTRAM.DAT
- `rct2ww.ride.seals` [needs:rct2dat] dat=SEALS.DAT
- `rct2ww.ride.skidoo` [needs:rct2dat] dat=SKIDOO.DAT
- `rct2ww.ride.sloth` [needs:rct2dat] dat=SLOTH.DAT
- `rct2ww.ride.sputnikr` [needs:rct2dat] dat=SPUTNIKR.DAT
- `rct2ww.ride.steamtrn` [needs:rct2dat] dat=STEAMTRN.DAT
- `rct2ww.ride.stgccstr` [needs:rct2dat] dat=STGCCSTR.DAT
- `rct2ww.ride.surfbrdc` [needs:rct2dat] dat=SURFBRDC.DAT
- `rct2ww.ride.taxicstr` [needs:rct2dat] dat=TAXICSTR.DAT
- `rct2ww.ride.tgvtrain` [needs:rct2dat] dat=TGVTRAIN.DAT
- `rct2ww.ride.tigrtwst` [mixed:rct2dat] dat=TIGRTWST.DAT
- `rct2ww.ride.tutlboat` [needs:rct2dat] dat=TUTLBOAT.DAT
- `rct2ww.ride.whicgrub` [needs:rct2dat] dat=WHICGRUB.DAT

### scenery_group (43)

- `rct2.scenery_group.scgabstr` [needs:rct2dat] dat=SCGABSTR.DAT
- `rct2.scenery_group.scgcandy` [needs:rct2dat] dat=SCGCANDY.DAT
- `rct2.scenery_group.scgclass` [needs:rct2dat] dat=SCGCLASS.DAT
- `rct2.scenery_group.scgegypt` [needs:rct2dat] dat=SCGEGYPT.DAT
- `rct2.scenery_group.scgfence` [needs:rct2dat] dat=SCGFENCE.DAT
- `rct2.scenery_group.scggardn` [needs:rct2dat] dat=SCGGARDN.DAT
- `rct2.scenery_group.scggiant` [needs:rct2dat] dat=SCGGIANT.DAT
- `rct2.scenery_group.scghallo` [needs:rct2dat] dat=SCGHALLO.DAT
- `rct2.scenery_group.scgindus` [needs:rct2dat] dat=SCGINDUS.DAT
- `rct2.scenery_group.scgjungl` [needs:rct2dat] dat=SCGJUNGL.DAT
- `rct2.scenery_group.scgjuras` [needs:rct2dat] dat=SCGJURAS.DAT
- `rct2.scenery_group.scgmart` [needs:rct2dat] dat=SCGMART.DAT
- `rct2.scenery_group.scgmedie` [needs:rct2dat] dat=SCGMEDIE.DAT
- `rct2.scenery_group.scgmine` [needs:rct2dat] dat=SCGMINE.DAT
- `rct2.scenery_group.scgorien` [needs:rct2dat] dat=SCGORIEN.DAT
- `rct2.scenery_group.scgpathx` [needs:rct2dat] dat=SCGPATHX.DAT
- `rct2.scenery_group.scgpirat` [needs:rct2dat] dat=SCGPIRAT.DAT
- `rct2.scenery_group.scgshrub` [needs:rct2dat] dat=SCGSHRUB.DAT
- `rct2.scenery_group.scgsixfl` [needs:rct2dat] dat=SCGSIXFL.DAT
- `rct2.scenery_group.scgsnow` [needs:rct2dat] dat=SCGSNOW.DAT
- `rct2.scenery_group.scgspace` [needs:rct2dat] dat=SCGSPACE.DAT
- `rct2.scenery_group.scgspook` [needs:rct2dat] dat=SCGSPOOK.DAT
- `rct2.scenery_group.scgsport` [needs:rct2dat] dat=SCGSPORT.DAT
- `rct2.scenery_group.scgtrees` [needs:rct2dat] dat=SCGTREES.DAT
- `rct2.scenery_group.scgurban` [needs:rct2dat] dat=SCGURBAN.DAT
- `rct2.scenery_group.scgwalls` [needs:rct2dat] dat=SCGWALLS.DAT
- `rct2.scenery_group.scgwater` [needs:rct2dat] dat=SCGWATER.DAT
- `rct2.scenery_group.scgwond` [needs:rct2dat] dat=SCGWOND.DAT
- `rct2.scenery_group.scgwwest` [needs:rct2dat] dat=SCGWWEST.DAT
- `rct2tt.scenery_group.scg1920s` [needs:rct2dat] dat=SCG1920S.DAT
- `rct2tt.scenery_group.scg1920w` [needs:rct2dat] dat=SCG1920W.DAT
- `rct2tt.scenery_group.scg1960s` [needs:rct2dat] dat=SCG1960S.DAT
- `rct2tt.scenery_group.scgfutur` [needs:rct2dat] dat=SCGFUTUR.DAT
- `rct2tt.scenery_group.scgjurra` [needs:rct2dat] dat=SCGJURRA.DAT
- `rct2tt.scenery_group.scgmediv` [needs:rct2dat] dat=SCGMEDIV.DAT
- `rct2tt.scenery_group.scgmytho` [needs:rct2dat] dat=SCGMYTHO.DAT
- `rct2ww.scenery_group.scgafric` [needs:rct2dat] dat=SCGAFRIC.DAT
- `rct2ww.scenery_group.scgartic` [needs:rct2dat] dat=SCGARTIC.DAT
- `rct2ww.scenery_group.scgasia` [needs:rct2dat] dat=SCGASIA.DAT
- `rct2ww.scenery_group.scgaustr` [needs:rct2dat] dat=SCGAUSTR.DAT
- `rct2ww.scenery_group.scgeurop` [needs:rct2dat] dat=SCGEUROP.DAT
- `rct2ww.scenery_group.scgnamrc` [needs:rct2dat] dat=SCGNAMRC.DAT
- `rct2ww.scenery_group.scgsamer` [needs:rct2dat] dat=SCGSAMRC.DAT

### scenery_large (249)

- `rct2.scenery_large.badrack` [needs:rct2dat] dat=BADRACK.DAT
- `rct2.scenery_large.genstore` [needs:rct2dat] dat=GENSTORE.DAT
- `rct2.scenery_large.glthent` [needs:rct2dat] dat=GLTHENT.DAT
- `rct2.scenery_large.mdsaent` [needs:rct2dat] dat=MDSAENT.DAT
- `rct2.scenery_large.nitroent` [needs:rct2dat] dat=NITROENT.DAT
- `rct2.scenery_large.prship` [needs:rct2dat] dat=PRSHIP.DAT
- `rct2.scenery_large.sah` [needs:rct2dat] dat=SAH.DAT
- `rct2.scenery_large.sah2` [needs:rct2dat] dat=SAH2.DAT
- `rct2.scenery_large.sah3` [needs:rct2dat] dat=SAH3.DAT
- `rct2.scenery_large.saloon` [needs:rct2dat] dat=SALOON.DAT
- `rct2.scenery_large.scln` [needs:rct2dat] dat=SCLN.DAT
- `rct2.scenery_large.scol` [needs:rct2dat] dat=SCOL.DAT
- `rct2.scenery_large.sct` [needs:rct2dat] dat=SCT.DAT
- `rct2.scenery_large.sdn1` [needs:rct2dat] dat=SDN1.DAT
- `rct2.scenery_large.sdn2` [needs:rct2dat] dat=SDN2.DAT
- `rct2.scenery_large.sdn3` [needs:rct2dat] dat=SDN3.DAT
- `rct2.scenery_large.sgp` [needs:rct2dat] dat=SGP.DAT
- `rct2.scenery_large.shs1` [needs:rct2dat] dat=SHS1.DAT
- `rct2.scenery_large.shs2` [needs:rct2dat] dat=SHS2.DAT
- `rct2.scenery_large.sip` [needs:rct2dat] dat=SIP.DAT
- `rct2.scenery_large.smb` [needs:rct2dat] dat=SMB.DAT
- `rct2.scenery_large.smh1` [needs:rct2dat] dat=SMH1.DAT
- `rct2.scenery_large.smh2` [needs:rct2dat] dat=SMH2.DAT
- `rct2.scenery_large.smn1` [needs:rct2dat] dat=SMN1.DAT
- `rct2.scenery_large.sob` [needs:rct2dat] dat=SOB.DAT
- `rct2.scenery_large.soh1` [needs:rct2dat] dat=SOH1.DAT
- `rct2.scenery_large.soh2` [needs:rct2dat] dat=SOH2.DAT
- `rct2.scenery_large.soh3` [needs:rct2dat] dat=SOH3.DAT
- `rct2.scenery_large.spg` [needs:rct2dat] dat=SPG.DAT
- `rct2.scenery_large.sps` [needs:rct2dat] dat=SPS.DAT
- `rct2.scenery_large.spyr` [needs:rct2dat] dat=SPYR.DAT
- `rct2.scenery_large.ssh` [needs:rct2dat] dat=SSH.DAT
- `rct2.scenery_large.ssig1` [needs:rct2dat] dat=SSIG1.DAT
- `rct2.scenery_large.ssig2` [needs:rct2dat] dat=SSIG2.DAT
- `rct2.scenery_large.ssig3` [needs:rct2dat] dat=SSIG3.DAT
- `rct2.scenery_large.ssig4` [needs:rct2dat] dat=SSIG4.DAT
- `rct2.scenery_large.ssk1` [needs:rct2dat] dat=SSK1.DAT
- `rct2.scenery_large.sspx` [needs:rct2dat] dat=SSPX.DAT
- `rct2.scenery_large.ssr` [needs:rct2dat] dat=SSR.DAT
- `rct2.scenery_large.sst` [needs:rct2dat] dat=SST.DAT
- `rct2.scenery_large.stb1` [needs:rct2dat] dat=STB1.DAT
- `rct2.scenery_large.stb2` [needs:rct2dat] dat=STB2.DAT
- `rct2.scenery_large.stg1` [needs:rct2dat] dat=STG1.DAT
- `rct2.scenery_large.stg2` [needs:rct2dat] dat=STG2.DAT
- `rct2.scenery_large.sth` [needs:rct2dat] dat=STH.DAT
- `rct2.scenery_large.svlc` [needs:rct2dat] dat=SVLC.DAT
- `rct2.scenery_large.tavern` [needs:rct2dat] dat=TAVERN.DAT
- `rct2.scenery_large.wwbank` [needs:rct2dat] dat=WWBANK.DAT
- `rct2tt.scenery_large.1950scar` [needs:rct2dat] dat=1950SCAR.DAT
- `rct2tt.scenery_large.4x4diner` [needs:rct2dat] dat=4X4DINER.DAT
- `rct2tt.scenery_large.4x4gmant` [needs:rct2dat] dat=4X4GMANT.DAT
- `rct2tt.scenery_large.4x4stnhn` [needs:rct2dat] dat=4X4STNHN.DAT
- `rct2tt.scenery_large.4x4trpit` [needs:rct2dat] dat=4X4TRPIT.DAT
- `rct2tt.scenery_large.4x4volca` [needs:rct2dat] dat=4X4VOLCA.DAT
- `rct2tt.scenery_large.alencrsh` [needs:rct2dat] dat=ALENCRSH.DAT
- `rct2tt.scenery_large.alnstr08` [needs:rct2dat] dat=ALNSTR08.DAT
- `rct2tt.scenery_large.alnstr09` [needs:rct2dat] dat=ALNSTR09.DAT
- `rct2tt.scenery_large.alnstr10` [needs:rct2dat] dat=ALNSTR10.DAT
- `rct2tt.scenery_large.alnstr11` [needs:rct2dat] dat=ALNSTR11.DAT
- `rct2tt.scenery_large.artdec25` [needs:rct2dat] dat=ARTDEC25.DAT
- `rct2tt.scenery_large.artdec26` [needs:rct2dat] dat=ARTDEC26.DAT
- `rct2tt.scenery_large.artdec27` [needs:rct2dat] dat=ARTDEC27.DAT
- `rct2tt.scenery_large.ashnymph` [needs:rct2dat] dat=ASHNYMPH.DAT
- `rct2tt.scenery_large.bandbusx` [needs:rct2dat] dat=BANDBUSX.DAT
- `rct2tt.scenery_large.bigdrums` [needs:rct2dat] dat=BIGDRUMS.DAT
- `rct2tt.scenery_large.caventra` [needs:rct2dat] dat=CAVENTRA.DAT
- `rct2tt.scenery_large.corns2x2` [needs:rct2dat] dat=CORNS2X2.DAT
- `rct2tt.scenery_large.corvs2x2` [needs:rct2dat] dat=CORVS2X2.DAT
- `rct2tt.scenery_large.cratr2x2` [needs:rct2dat] dat=CRATR2X2.DAT
- `rct2tt.scenery_large.cratr4x4` [needs:rct2dat] dat=CRATR4X4.DAT
- `rct2tt.scenery_large.crsss2x2` [needs:rct2dat] dat=CRSSS2X2.DAT
- `rct2tt.scenery_large.crsvs2x2` [needs:rct2dat] dat=CRSVS2X2.DAT
- `rct2tt.scenery_large.cyclopss` [needs:rct2dat] dat=CYCLOPSS.DAT
- `rct2tt.scenery_large.feastabl` [needs:rct2dat] dat=FEASTABL.DAT
- `rct2tt.scenery_large.footprnt` [needs:rct2dat] dat=FOOTPRNT.DAT
- `rct2tt.scenery_large.forbidft` [needs:rct2dat] dat=FORBIDFT.DAT
- `rct2tt.scenery_large.futsky20` [needs:rct2dat] dat=FUTSKY20.DAT
- `rct2tt.scenery_large.futsky22` [needs:rct2dat] dat=FUTSKY22.DAT
- `rct2tt.scenery_large.futsky24` [needs:rct2dat] dat=FUTSKY24.DAT
- `rct2tt.scenery_large.futsky25` [needs:rct2dat] dat=FUTSKY25.DAT
- `rct2tt.scenery_large.futsky26` [needs:rct2dat] dat=FUTSKY26.DAT
- `rct2tt.scenery_large.futsky28` [needs:rct2dat] dat=FUTSKY28.DAT
- `rct2tt.scenery_large.futsky30` [needs:rct2dat] dat=FUTSKY30.DAT
- `rct2tt.scenery_large.futsky31` [needs:rct2dat] dat=FUTSKY31.DAT
- `rct2tt.scenery_large.futsky32` [needs:rct2dat] dat=FUTSKY32.DAT
- `rct2tt.scenery_large.gbeetlex` [needs:rct2dat] dat=GBEETLEX.DAT
- `rct2tt.scenery_large.ghotrod1` [needs:rct2dat] dat=GHOTROD1.DAT
- `rct2tt.scenery_large.ghotrod2` [needs:rct2dat] dat=GHOTROD2.DAT
- `rct2tt.scenery_large.gschlbus` [needs:rct2dat] dat=GSCHLBUS.DAT
- `rct2tt.scenery_large.hadesxxx` [needs:rct2dat] dat=HADESXXX.DAT
- `rct2tt.scenery_large.histfix1` [needs:rct2dat] dat=HISTFIX1.DAT
- `rct2tt.scenery_large.histfix2` [needs:rct2dat] dat=HISTFIX2.DAT
- `rct2tt.scenery_large.hodshut1` [needs:rct2dat] dat=HODSHUT1.DAT
- `rct2tt.scenery_large.hodshut2` [needs:rct2dat] dat=HODSHUT2.DAT
- `rct2tt.scenery_large.hrbwal07` [needs:rct2dat] dat=HRBWAL07.DAT
- `rct2tt.scenery_large.hrbwal08` [needs:rct2dat] dat=HRBWAL08.DAT
- `rct2tt.scenery_large.hrbwal09` [needs:rct2dat] dat=HRBWAL09.DAT
- `rct2tt.scenery_large.hrbwal11` [needs:rct2dat] dat=HRBWAL11.DAT
- `rct2tt.scenery_large.jailxx17` [needs:rct2dat] dat=JAILXX17.DAT
- `rct2tt.scenery_large.jailxx18` [needs:rct2dat] dat=JAILXX18.DAT
- `rct2tt.scenery_large.jetplan1` [needs:rct2dat] dat=JETPLAN1.DAT
- `rct2tt.scenery_large.jetplan2` [mixed:rct2dat] dat=JETPLAN2.DAT
- `rct2tt.scenery_large.jetplan3` [needs:rct2dat] dat=JETPLAN3.DAT
- `rct2tt.scenery_large.majoroak` [needs:rct2dat] dat=MAJOROAK.DAT
- `rct2tt.scenery_large.mcastl01` [needs:rct2dat] dat=MCASTL01.DAT
- `rct2tt.scenery_large.mcastl11` [needs:rct2dat] dat=MCASTL11.DAT
- `rct2tt.scenery_large.mcastl12` [needs:rct2dat] dat=MCASTL12.DAT
- `rct2tt.scenery_large.mcastl13` [needs:rct2dat] dat=MCASTL13.DAT
- `rct2tt.scenery_large.mcastl14` [needs:rct2dat] dat=MCASTL14.DAT
- `rct2tt.scenery_large.mcastl15` [needs:rct2dat] dat=MCASTL15.DAT
- `rct2tt.scenery_large.mcastl16` [needs:rct2dat] dat=MCASTL16.DAT
- `rct2tt.scenery_large.mcastl17` [needs:rct2dat] dat=MCASTL17.DAT
- `rct2tt.scenery_large.mcastl18` [needs:rct2dat] dat=MCASTL18.DAT
- `rct2tt.scenery_large.melmtree` [needs:rct2dat] dat=MELMTREE.DAT
- `rct2tt.scenery_large.metoan01` [needs:rct2dat] dat=METOAN01.DAT
- `rct2tt.scenery_large.metoan02` [needs:rct2dat] dat=METOAN02.DAT
- `rct2tt.scenery_large.oldnyk20` [needs:rct2dat] dat=OLDNYK20.DAT
- `rct2tt.scenery_large.oldnyk21` [needs:rct2dat] dat=OLDNYK21.DAT
- `rct2tt.scenery_large.oldnyk22` [needs:rct2dat] dat=OLDNYK22.DAT
- `rct2tt.scenery_large.oldnyk23` [needs:rct2dat] dat=OLDNYK23.DAT
- `rct2tt.scenery_large.oldnyk24` [needs:rct2dat] dat=OLDNYK24.DAT
- `rct2tt.scenery_large.oldnyk25` [needs:rct2dat] dat=OLDNYK25.DAT
- `rct2tt.scenery_large.oldnyk26` [needs:rct2dat] dat=OLDNYK26.DAT
- `rct2tt.scenery_large.oldnyk27` [needs:rct2dat] dat=OLDNYK27.DAT
- `rct2tt.scenery_large.oldnyk28` [needs:rct2dat] dat=OLDNYK28.DAT
- `rct2tt.scenery_large.oldnyk29` [needs:rct2dat] dat=OLDNYK29.DAT
- `rct2tt.scenery_large.oldnyk30` [needs:rct2dat] dat=OLDNYK30.DAT
- `rct2tt.scenery_large.oldnyk32` [needs:rct2dat] dat=OLDNYK32.DAT
- `rct2tt.scenery_large.peasthut` [needs:rct2dat] dat=PEASTHUT.DAT
- `rct2tt.scenery_large.peramob1` [needs:rct2dat] dat=PERAMOB1.DAT
- `rct2tt.scenery_large.peramob2` [needs:rct2dat] dat=PERAMOB2.DAT
- `rct2tt.scenery_large.perdtk01` [needs:rct2dat] dat=PERDTK01.DAT
- `rct2tt.scenery_large.perdtk02` [needs:rct2dat] dat=PERDTK02.DAT
- `rct2tt.scenery_large.ploughxx` [needs:rct2dat] dat=PLOUGHXX.DAT
- `rct2tt.scenery_large.prdyacht` [needs:rct2dat] dat=PRDYACHT.DAT
- `rct2tt.scenery_large.psntwl26` [needs:rct2dat] dat=PSNTWL26.DAT
- `rct2tt.scenery_large.psntwl27` [needs:rct2dat] dat=PSNTWL27.DAT
- `rct2tt.scenery_large.psntwl28` [needs:rct2dat] dat=PSNTWL28.DAT
- `rct2tt.scenery_large.rdmet2x2` [needs:rct2dat] dat=RDMET2X2.DAT
- `rct2tt.scenery_large.rdmet4x4` [needs:rct2dat] dat=RDMET4X4.DAT
- `rct2tt.scenery_large.rdmeto01` [needs:rct2dat] dat=RDMETO01.DAT
- `rct2tt.scenery_large.rdmeto02` [needs:rct2dat] dat=RDMETO02.DAT
- `rct2tt.scenery_large.robncamp` [needs:rct2dat] dat=ROBNCAMP.DAT
- `rct2tt.scenery_large.romnc2x2` [needs:rct2dat] dat=ROMNC2X2.DAT
- `rct2tt.scenery_large.romne2x1` [needs:rct2dat] dat=ROMNE2X1.DAT
- `rct2tt.scenery_large.romnm2x2` [needs:rct2dat] dat=ROMNM2X2.DAT
- `rct2tt.scenery_large.romns2x2` [needs:rct2dat] dat=ROMNS2X2.DAT
- `rct2tt.scenery_large.romvc2x2` [needs:rct2dat] dat=ROMVC2X2.DAT
- `rct2tt.scenery_large.romve2x1` [needs:rct2dat] dat=ROMVE2X1.DAT
- `rct2tt.scenery_large.romvm2x2` [needs:rct2dat] dat=ROMVM2X2.DAT
- `rct2tt.scenery_large.romvs2x2` [needs:rct2dat] dat=ROMVS2X2.DAT
- `rct2tt.scenery_large.schnpit2` [needs:rct2dat] dat=SCHNPIT2.DAT
- `rct2tt.scenery_large.schnpits` [needs:rct2dat] dat=SCHNPITS.DAT
- `rct2tt.scenery_large.schntent` [needs:rct2dat] dat=SCHNTENT.DAT
- `rct2tt.scenery_large.shipb4x4` [needs:rct2dat] dat=SHIPB4X4.DAT
- `rct2tt.scenery_large.shipm4x4` [needs:rct2dat] dat=SHIPM4X4.DAT
- `rct2tt.scenery_large.ships4x4` [needs:rct2dat] dat=SHIPS4X4.DAT
- `rct2tt.scenery_large.strgs2x2` [needs:rct2dat] dat=STRGS2X2.DAT
- `rct2tt.scenery_large.strvs2x2` [needs:rct2dat] dat=STRVS2X2.DAT
- `rct2tt.scenery_large.tavernxx` [needs:rct2dat] dat=TAVERNXX.DAT
- `rct2tt.scenery_large.travlr01` [needs:rct2dat] dat=TRAVLR01.DAT
- `rct2tt.scenery_large.travlr02` [needs:rct2dat] dat=TRAVLR02.DAT
- `rct2ww.scenery_large.1x2abr01` [needs:rct2dat] dat=1X2ABR01.DAT
- `rct2ww.scenery_large.1x2abr02` [needs:rct2dat] dat=1X2ABR02.DAT
- `rct2ww.scenery_large.1x2abr03` [needs:rct2dat] dat=1X2ABR03.DAT
- `rct2ww.scenery_large.1x2azt01` [needs:rct2dat] dat=1X2AZT01.DAT
- `rct2ww.scenery_large.1x2azt02` [needs:rct2dat] dat=1X2AZT02.DAT
- `rct2ww.scenery_large.1x2glama` [needs:rct2dat] dat=1X2GLAMA.DAT
- `rct2ww.scenery_large.1x2lgchm` [needs:rct2dat] dat=1X2LGCHM.DAT
- `rct2ww.scenery_large.1x4brg01` [needs:rct2dat] dat=1X4BRG01.DAT
- `rct2ww.scenery_large.1x4brg02` [needs:rct2dat] dat=1X4BRG02.DAT
- `rct2ww.scenery_large.1x4brg03` [needs:rct2dat] dat=1X4BRG03.DAT
- `rct2ww.scenery_large.1x4brg04` [needs:rct2dat] dat=1X4BRG04.DAT
- `rct2ww.scenery_large.1x4brg05` [needs:rct2dat] dat=1X4BRG05.DAT
- `rct2ww.scenery_large.3x3altre` [needs:rct2dat] dat=3X3ALTRE.DAT
- `rct2ww.scenery_large.3x3atre1` [needs:rct2dat] dat=3X3ATRE1.DAT
- `rct2ww.scenery_large.3x3atre2` [needs:rct2dat] dat=3X3ATRE2.DAT
- `rct2ww.scenery_large.3x3atre3` [needs:rct2dat] dat=3X3ATRE3.DAT
- `rct2ww.scenery_large.3x3eucal` [needs:rct2dat] dat=3X3EUCAL.DAT
- `rct2ww.scenery_large.3x3hmsen` [needs:rct2dat] dat=3X3HMSEN.DAT
- `rct2ww.scenery_large.3x3mantr` [needs:rct2dat] dat=3X3MANTR.DAT
- `rct2ww.scenery_large.50rocket` [needs:rct2dat] dat=50ROCKET.DAT
- `rct2ww.scenery_large.adultele` [needs:rct2dat] dat=ADULTELE.DAT
- `rct2ww.scenery_large.afrclion` [mixed:rct2dat] dat=1X2LION.DAT
- `rct2ww.scenery_large.afrrhino` [mixed:rct2dat] dat=1X2RHINO.DAT
- `rct2ww.scenery_large.afrzebra` [mixed:rct2dat] dat=1X2ZEBRA.DAT
- `rct2ww.scenery_large.atomium` [needs:rct2dat] dat=ATOMIUM.DAT
- `rct2ww.scenery_large.atractor` [mixed:rct2dat] dat=1X2TRCTR.DAT
- `rct2ww.scenery_large.bamborf1` [needs:rct2dat] dat=BAMBORF1.DAT
- `rct2ww.scenery_large.bamborf2` [needs:rct2dat] dat=BAMBORF2.DAT
- `rct2ww.scenery_large.bamborf3` [needs:rct2dat] dat=BAMBORF3.DAT
- `rct2ww.scenery_large.bigben` [needs:rct2dat] dat=BIGBEN.DAT
- `rct2ww.scenery_large.bigdish` [needs:rct2dat] dat=BIGDISH.DAT
- `rct2ww.scenery_large.biggeosp` [needs:rct2dat] dat=BIGGEOSP.DAT
- `rct2ww.scenery_large.cdragon` [needs:rct2dat] dat=CDRAGON.DAT
- `rct2ww.scenery_large.circus` [needs:rct2dat] dat=CIRCUS.DAT
- `rct2ww.scenery_large.cowboy01` [needs:rct2dat] dat=COWBOY01.DAT
- `rct2ww.scenery_large.cowboy02` [needs:rct2dat] dat=COWBOY02.DAT
- `rct2ww.scenery_large.damtower` [needs:rct2dat] dat=DAMTOWER.DAT
- `rct2ww.scenery_large.damtower_fix` [needs:rct2dat] dat=DAMTOWER.DAT
- `rct2ww.scenery_large.easerlnd` [needs:rct2dat] dat=EASERLND.DAT
- `rct2ww.scenery_large.eiffel` [needs:rct2dat] dat=EIFFEL.DAT
- `rct2ww.scenery_large.evilsam` [needs:rct2dat] dat=EVILSAM.DAT
- `rct2ww.scenery_large.fatbudda` [needs:rct2dat] dat=FATBUDDA.DAT
- `rct2ww.scenery_large.gdstaue1` [needs:rct2dat] dat=GDSTAUE1.DAT
- `rct2ww.scenery_large.gdstaue2` [needs:rct2dat] dat=GDSTAUE2.DAT
- `rct2ww.scenery_large.geisha` [needs:rct2dat] dat=GEISHA.DAT
- `rct2ww.scenery_large.giraffe1` [needs:rct2dat] dat=GIRAFFE1.DAT
- `rct2ww.scenery_large.giraffe2` [needs:rct2dat] dat=GIRAFFE2.DAT
- `rct2ww.scenery_large.goldbuda` [needs:rct2dat] dat=GOLDBUDA.DAT
- `rct2ww.scenery_large.goodsam` [needs:rct2dat] dat=GOODSAM.DAT
- `rct2ww.scenery_large.gwoctur1` [needs:rct2dat] dat=GWOCTUR1.DAT
- `rct2ww.scenery_large.gwoctur2` [needs:rct2dat] dat=GWOCTUR2.DAT
- `rct2ww.scenery_large.helipad` [needs:rct2dat] dat=HELIPAD.DAT
- `rct2ww.scenery_large.hippo01` [mixed:rct2dat] dat=HIPPO01.DAT
- `rct2ww.scenery_large.hippo02` [mixed:rct2dat] dat=HIPPO02.DAT
- `rct2ww.scenery_large.icefor01` [needs:rct2dat] dat=ICEFOR01.DAT
- `rct2ww.scenery_large.icefor02` [needs:rct2dat] dat=ICEFOR02.DAT
- `rct2ww.scenery_large.indianst` [needs:rct2dat] dat=INDIANST.DAT
- `rct2ww.scenery_large.largeju1` [needs:rct2dat] dat=LARGEJU1.DAT
- `rct2ww.scenery_large.lincolns` [needs:rct2dat] dat=LINCOLNS.DAT
- `rct2ww.scenery_large.mbskyr01` [needs:rct2dat] dat=MBSKYR01.DAT
- `rct2ww.scenery_large.mbskyr02` [needs:rct2dat] dat=MBSKYR02.DAT
- `rct2ww.scenery_large.ovrgrwnt` [needs:rct2dat] dat=OVRGRWNT.DAT
- `rct2ww.scenery_large.pagodam` [needs:rct2dat] dat=PAGODAM.DAT
- `rct2ww.scenery_large.pagodas` [needs:rct2dat] dat=PAGODAS.DAT
- `rct2ww.scenery_large.pagodatw` [needs:rct2dat] dat=PAGODATW.DAT
- `rct2ww.scenery_large.pogodal` [needs:rct2dat] dat=PAGODAL.DAT
- `rct2ww.scenery_large.radar` [needs:rct2dat] dat=RADAR.DAT
- `rct2ww.scenery_large.rdrab01` [needs:rct2dat] dat=RDRAB01.DAT
- `rct2ww.scenery_large.rdrab02` [needs:rct2dat] dat=RDRAB02.DAT
- `rct2ww.scenery_large.rdrab03` [needs:rct2dat] dat=RDRAB03.DAT
- `rct2ww.scenery_large.rdrab04` [needs:rct2dat] dat=RDRAB04.DAT
- `rct2ww.scenery_large.redwood` [needs:rct2dat] dat=REDWOOD.DAT
- `rct2ww.scenery_large.rkreml08` [needs:rct2dat] dat=RKREML08.DAT
- `rct2ww.scenery_large.rkreml09` [needs:rct2dat] dat=RKREML09.DAT
- `rct2ww.scenery_large.rkreml10` [needs:rct2dat] dat=RKREML10.DAT
- `rct2ww.scenery_large.rtudor05` [needs:rct2dat] dat=RTUDOR05.DAT
- `rct2ww.scenery_large.rtudor06` [needs:rct2dat] dat=RTUDOR06.DAT
- `rct2ww.scenery_large.shiva` [needs:rct2dat] dat=SHIVA.DAT
- `rct2ww.scenery_large.soflibrt` [needs:rct2dat] dat=SOFLIBRT.DAT
- `rct2ww.scenery_large.spaceorb` [needs:rct2dat] dat=SPACEORB.DAT
- `rct2ww.scenery_large.sputnik` [needs:rct2dat] dat=SPUTNIK.DAT
- `rct2ww.scenery_large.sunken` [needs:rct2dat] dat=SUNKEN.DAT
- `rct2ww.scenery_large.tajmcbse` [needs:rct2dat] dat=TAJMCBSE.DAT
- `rct2ww.scenery_large.tajmcolm` [needs:rct2dat] dat=TAJMCOLM.DAT
- `rct2ww.scenery_large.tajmctop` [needs:rct2dat] dat=TAJMCTOP.DAT
- `rct2ww.scenery_large.tajmdome` [needs:rct2dat] dat=TAJMDOME.DAT
- `rct2ww.scenery_large.windmill` [needs:rct2dat] dat=WINDMILL.DAT

### scenery_small (1117)

- `rct2.scenery_small.allsort1` [needs:rct2dat] dat=ALLSORT1.DAT
- `rct2.scenery_small.allsort2` [needs:rct2dat] dat=ALLSORT2.DAT
- `rct2.scenery_small.badshut` [needs:rct2dat] dat=BADSHUT.DAT
- `rct2.scenery_small.badshut2` [needs:rct2dat] dat=BADSHUT2.DAT
- `rct2.scenery_small.ball1` [needs:rct2dat] dat=BALL1.DAT
- `rct2.scenery_small.ball2` [needs:rct2dat] dat=BALL2.DAT
- `rct2.scenery_small.ball3` [needs:rct2dat] dat=BALL3.DAT
- `rct2.scenery_small.ball4` [needs:rct2dat] dat=BALL4.DAT
- `rct2.scenery_small.beanst1` [needs:rct2dat] dat=BEANST1.DAT
- `rct2.scenery_small.beanst2` [needs:rct2dat] dat=BEANST2.DAT
- `rct2.scenery_small.brbase` [needs:rct2dat] dat=BRBASE.DAT
- `rct2.scenery_small.brbase2` [needs:rct2dat] dat=BRBASE2.DAT
- `rct2.scenery_small.brbase3` [needs:rct2dat] dat=BRBASE3.DAT
- `rct2.scenery_small.brcrrf1` [needs:rct2dat] dat=BRCRRF1.DAT
- `rct2.scenery_small.brcrrf2` [needs:rct2dat] dat=BRCRRF2.DAT
- `rct2.scenery_small.buttfly` [needs:rct2dat] dat=BUTTFLY.DAT
- `rct2.scenery_small.carrot` [needs:rct2dat] dat=CARROT.DAT
- `rct2.scenery_small.chbbase` [needs:rct2dat] dat=CHBBASE.DAT
- `rct2.scenery_small.chest1` [needs:rct2dat] dat=CHEST1.DAT
- `rct2.scenery_small.chest2` [needs:rct2dat] dat=CHEST2.DAT
- `rct2.scenery_small.chocroof` [needs:rct2dat] dat=CHOCROOF.DAT
- `rct2.scenery_small.cnballs` [needs:rct2dat] dat=CNBALLS.DAT
- `rct2.scenery_small.cndyrk1` [needs:rct2dat] dat=CNDYRK1.DAT
- `rct2.scenery_small.cog1` [needs:rct2dat] dat=COG1.DAT
- `rct2.scenery_small.cog1r` [needs:rct2dat] dat=COG1R.DAT
- `rct2.scenery_small.cog1u` [needs:rct2dat] dat=COG1U.DAT
- `rct2.scenery_small.cog1ur` [needs:rct2dat] dat=COG1UR.DAT
- `rct2.scenery_small.cog2` [needs:rct2dat] dat=COG2.DAT
- `rct2.scenery_small.cog2r` [needs:rct2dat] dat=COG2R.DAT
- `rct2.scenery_small.cog2u` [needs:rct2dat] dat=COG2U.DAT
- `rct2.scenery_small.cog2ur` [needs:rct2dat] dat=COG2UR.DAT
- `rct2.scenery_small.colagum` [needs:rct2dat] dat=COLAGUM.DAT
- `rct2.scenery_small.corroof` [needs:rct2dat] dat=CORROOF.DAT
- `rct2.scenery_small.corroof2` [needs:rct2dat] dat=CORROOF2.DAT
- `rct2.scenery_small.cwbcrv32` [needs:rct2dat] dat=CWBCRV32.DAT
- `rct2.scenery_small.cwbcrv33` [needs:rct2dat] dat=CWBCRV33.DAT
- `rct2.scenery_small.cwfcrv32` [needs:rct2dat] dat=CWFCRV32.DAT
- `rct2.scenery_small.cwfcrv33` [needs:rct2dat] dat=CWFCRV33.DAT
- `rct2.scenery_small.fern1` [needs:rct2dat] dat=FERN1.DAT
- `rct2.scenery_small.fire1` [needs:rct2dat] dat=FIRE1.DAT
- `rct2.scenery_small.georoof1` [needs:rct2dat] dat=GEOROOF1.DAT
- `rct2.scenery_small.georoof2` [needs:rct2dat] dat=GEOROOF2.DAT
- `rct2.scenery_small.ggrs1` [needs:rct2dat] dat=GGRS1.DAT
- `rct2.scenery_small.hang1` [needs:rct2dat] dat=HANG1.DAT
- `rct2.scenery_small.helmet1` [needs:rct2dat] dat=HELMET1.DAT
- `rct2.scenery_small.icecube` [needs:rct2dat] dat=ICECUBE.DAT
- `rct2.scenery_small.igroof` [needs:rct2dat] dat=IGROOF.DAT
- `rct2.scenery_small.jbean1` [needs:rct2dat] dat=JBEAN1.DAT
- `rct2.scenery_small.jelbab1` [needs:rct2dat] dat=JELBAB1.DAT
- `rct2.scenery_small.jeldrop1` [needs:rct2dat] dat=JELDROP1.DAT
- `rct2.scenery_small.jeldrop2` [needs:rct2dat] dat=JELDROP2.DAT
- `rct2.scenery_small.jngroof1` [needs:rct2dat] dat=JNGROOF1.DAT
- `rct2.scenery_small.lolly1` [needs:rct2dat] dat=LOLLY1.DAT
- `rct2.scenery_small.mallow1` [needs:rct2dat] dat=MALLOW1.DAT
- `rct2.scenery_small.mallow2` [needs:rct2dat] dat=MALLOW2.DAT
- `rct2.scenery_small.minroof1` [needs:rct2dat] dat=MINROOF1.DAT
- `rct2.scenery_small.mint1` [needs:rct2dat] dat=MINT1.DAT
- `rct2.scenery_small.mment1` [needs:rct2dat] dat=MMENT1.DAT
- `rct2.scenery_small.mment2` [needs:rct2dat] dat=MMENT2.DAT
- `rct2.scenery_small.mment3` [needs:rct2dat] dat=MMENT3.DAT
- `rct2.scenery_small.pagroof1` [needs:rct2dat] dat=PAGROOF1.DAT
- `rct2.scenery_small.pipe32` [needs:rct2dat] dat=PIPE32.DAT
- `rct2.scenery_small.pipe32j` [needs:rct2dat] dat=PIPE32J.DAT
- `rct2.scenery_small.pipe8` [needs:rct2dat] dat=PIPE8.DAT
- `rct2.scenery_small.pirflag` [needs:rct2dat] dat=PIRFLAG.DAT
- `rct2.scenery_small.pirroof1` [needs:rct2dat] dat=PIRROOF1.DAT
- `rct2.scenery_small.pirroof2` [needs:rct2dat] dat=PIRROOF2.DAT
- `rct2.scenery_small.prcan` [needs:rct2dat] dat=PRCAN.DAT
- `rct2.scenery_small.romroof1` [needs:rct2dat] dat=ROMROOF1.DAT
- `rct2.scenery_small.romroof2` [needs:rct2dat] dat=ROMROOF2.DAT
- `rct2.scenery_small.roof1` [needs:rct2dat] dat=ROOF1.DAT
- `rct2.scenery_small.roof10` [needs:rct2dat] dat=ROOF10.DAT
- `rct2.scenery_small.roof11` [needs:rct2dat] dat=ROOF11.DAT
- `rct2.scenery_small.roof12` [needs:rct2dat] dat=ROOF12.DAT
- `rct2.scenery_small.roof13` [needs:rct2dat] dat=ROOF13.DAT
- `rct2.scenery_small.roof14` [needs:rct2dat] dat=ROOF14.DAT
- `rct2.scenery_small.roof2` [needs:rct2dat] dat=ROOF2.DAT
- `rct2.scenery_small.roof3` [needs:rct2dat] dat=ROOF3.DAT
- `rct2.scenery_small.roof4` [needs:rct2dat] dat=ROOF4.DAT
- `rct2.scenery_small.roof5` [needs:rct2dat] dat=ROOF5.DAT
- `rct2.scenery_small.roof6` [needs:rct2dat] dat=ROOF6.DAT
- `rct2.scenery_small.roof7` [needs:rct2dat] dat=ROOF7.DAT
- `rct2.scenery_small.roof8` [needs:rct2dat] dat=ROOF8.DAT
- `rct2.scenery_small.roof9` [needs:rct2dat] dat=ROOF9.DAT
- `rct2.scenery_small.sktbase` [needs:rct2dat] dat=SKTBASE.DAT
- `rct2.scenery_small.sktbaset` [needs:rct2dat] dat=SKTBASET.DAT
- `rct2.scenery_small.sktdw` [needs:rct2dat] dat=SKTDW.DAT
- `rct2.scenery_small.sktdw2` [needs:rct2dat] dat=SKTDW2.DAT
- `rct2.scenery_small.smskull` [needs:rct2dat] dat=SMSKULL.DAT
- `rct2.scenery_small.snail` [needs:rct2dat] dat=SNAIL.DAT
- `rct2.scenery_small.spcroof1` [needs:rct2dat] dat=SPCROOF1.DAT
- `rct2.scenery_small.spider1` [needs:rct2dat] dat=SPIDER1.DAT
- `rct2.scenery_small.stbase` [needs:rct2dat] dat=STBASE.DAT
- `rct2.scenery_small.stlbaset` [needs:rct2dat] dat=STLBASET.DAT
- `rct2.scenery_small.stldw` [needs:rct2dat] dat=STLDW.DAT
- `rct2.scenery_small.stldw2` [needs:rct2dat] dat=STLDW2.DAT
- `rct2.scenery_small.sumrf` [needs:rct2dat] dat=SUMRF.DAT
- `rct2.scenery_small.suppleg1` [needs:rct2dat] dat=SUPPLEG1.DAT
- `rct2.scenery_small.suppleg2` [needs:rct2dat] dat=SUPPLEG2.DAT
- `rct2.scenery_small.suppw1` [needs:rct2dat] dat=SUPPW1.DAT
- `rct2.scenery_small.suppw2` [needs:rct2dat] dat=SUPPW2.DAT
- `rct2.scenery_small.suppw3` [needs:rct2dat] dat=SUPPW3.DAT
- `rct2.scenery_small.tac` [needs:rct2dat] dat=TAC.DAT
- `rct2.scenery_small.tal` [needs:rct2dat] dat=TAL.DAT
- `rct2.scenery_small.tap` [needs:rct2dat] dat=TAP.DAT
- `rct2.scenery_small.tas` [needs:rct2dat] dat=TAS.DAT
- `rct2.scenery_small.tas1` [needs:rct2dat] dat=TAS1.DAT
- `rct2.scenery_small.tas2` [needs:rct2dat] dat=TAS2.DAT
- `rct2.scenery_small.tas3` [needs:rct2dat] dat=TAS3.DAT
- `rct2.scenery_small.tas4` [needs:rct2dat] dat=TAS4.DAT
- `rct2.scenery_small.tb1` [needs:rct2dat] dat=TB1.DAT
- `rct2.scenery_small.tb2` [needs:rct2dat] dat=TB2.DAT
- `rct2.scenery_small.tbc` [needs:rct2dat] dat=TBC.DAT
- `rct2.scenery_small.tbn` [needs:rct2dat] dat=TBN.DAT
- `rct2.scenery_small.tbn1` [needs:rct2dat] dat=TBN1.DAT
- `rct2.scenery_small.tbp` [needs:rct2dat] dat=TBP.DAT
- `rct2.scenery_small.tbr` [needs:rct2dat] dat=TBR.DAT
- `rct2.scenery_small.tbr1` [needs:rct2dat] dat=TBR1.DAT
- `rct2.scenery_small.tbr2` [needs:rct2dat] dat=TBR2.DAT
- `rct2.scenery_small.tbr3` [needs:rct2dat] dat=TBR3.DAT
- `rct2.scenery_small.tbr4` [needs:rct2dat] dat=TBR4.DAT
- `rct2.scenery_small.tbw` [needs:rct2dat] dat=TBW.DAT
- `rct2.scenery_small.tcb` [needs:rct2dat] dat=TCB.DAT
- `rct2.scenery_small.tcc` [needs:rct2dat] dat=TCC.DAT
- `rct2.scenery_small.tcd` [needs:rct2dat] dat=TCD.DAT
- `rct2.scenery_small.tce` [needs:rct2dat] dat=TCE.DAT
- `rct2.scenery_small.tcf` [needs:rct2dat] dat=TCF.DAT
- `rct2.scenery_small.tcfs` [needs:rct2dat] dat=TCFS.DAT
- `rct2.scenery_small.tcj` [needs:rct2dat] dat=TCJ.DAT
- `rct2.scenery_small.tck` [needs:rct2dat] dat=TCK.DAT
- `rct2.scenery_small.tcl` [needs:rct2dat] dat=TCL.DAT
- `rct2.scenery_small.tcn` [needs:rct2dat] dat=TCN.DAT
- `rct2.scenery_small.tco` [needs:rct2dat] dat=TCO.DAT
- `rct2.scenery_small.tcrp` [needs:rct2dat] dat=TCRP.DAT
- `rct2.scenery_small.tct` [needs:rct2dat] dat=TCT.DAT
- `rct2.scenery_small.tct1` [needs:rct2dat] dat=TCT1.DAT
- `rct2.scenery_small.tct2` [needs:rct2dat] dat=TCT2.DAT
- `rct2.scenery_small.tcy` [needs:rct2dat] dat=TCY.DAT
- `rct2.scenery_small.tdf` [needs:rct2dat] dat=TDF.DAT
- `rct2.scenery_small.tdm` [needs:rct2dat] dat=TDM.DAT
- `rct2.scenery_small.tdn4` [needs:rct2dat] dat=TDN4.DAT
- `rct2.scenery_small.tdn5` [needs:rct2dat] dat=TDN5.DAT
- `rct2.scenery_small.tdt1` [needs:rct2dat] dat=TDT1.DAT
- `rct2.scenery_small.tdt2` [needs:rct2dat] dat=TDT2.DAT
- `rct2.scenery_small.tdt3` [needs:rct2dat] dat=TDT3.DAT
- `rct2.scenery_small.teepee1` [needs:rct2dat] dat=TEEPEE1.DAT
- `rct2.scenery_small.tef` [needs:rct2dat] dat=TEF.DAT
- `rct2.scenery_small.tel` [needs:rct2dat] dat=TEL.DAT
- `rct2.scenery_small.ten` [needs:rct2dat] dat=TEN.DAT
- `rct2.scenery_small.tep` [needs:rct2dat] dat=TEP.DAT
- `rct2.scenery_small.terb` [needs:rct2dat] dat=TERB.DAT
- `rct2.scenery_small.ters` [needs:rct2dat] dat=TERS.DAT
- `rct2.scenery_small.tes1` [needs:rct2dat] dat=TES1.DAT
- `rct2.scenery_small.tf1` [needs:rct2dat] dat=TF1.DAT
- `rct2.scenery_small.tf2` [needs:rct2dat] dat=TF2.DAT
- `rct2.scenery_small.tg1` [needs:rct2dat] dat=TG1.DAT
- `rct2.scenery_small.tg10` [needs:rct2dat] dat=TG10.DAT
- `rct2.scenery_small.tg11` [needs:rct2dat] dat=TG11.DAT
- `rct2.scenery_small.tg12` [needs:rct2dat] dat=TG12.DAT
- `rct2.scenery_small.tg13` [needs:rct2dat] dat=TG13.DAT
- `rct2.scenery_small.tg14` [needs:rct2dat] dat=TG14.DAT
- `rct2.scenery_small.tg15` [needs:rct2dat] dat=TG15.DAT
- `rct2.scenery_small.tg16` [needs:rct2dat] dat=TG16.DAT
- `rct2.scenery_small.tg17` [needs:rct2dat] dat=TG17.DAT
- `rct2.scenery_small.tg18` [needs:rct2dat] dat=TG18.DAT
- `rct2.scenery_small.tg19` [needs:rct2dat] dat=TG19.DAT
- `rct2.scenery_small.tg2` [needs:rct2dat] dat=TG2.DAT
- `rct2.scenery_small.tg20` [needs:rct2dat] dat=TG20.DAT
- `rct2.scenery_small.tg21` [needs:rct2dat] dat=TG21.DAT
- `rct2.scenery_small.tg3` [needs:rct2dat] dat=TG3.DAT
- `rct2.scenery_small.tg4` [needs:rct2dat] dat=TG4.DAT
- `rct2.scenery_small.tg5` [needs:rct2dat] dat=TG5.DAT
- `rct2.scenery_small.tg6` [needs:rct2dat] dat=TG6.DAT
- `rct2.scenery_small.tg7` [needs:rct2dat] dat=TG7.DAT
- `rct2.scenery_small.tg8` [needs:rct2dat] dat=TG8.DAT
- `rct2.scenery_small.tg9` [needs:rct2dat] dat=TG9.DAT
- `rct2.scenery_small.tgc1` [needs:rct2dat] dat=TGC1.DAT
- `rct2.scenery_small.tgc2` [needs:rct2dat] dat=TGC2.DAT
- `rct2.scenery_small.tge1` [needs:rct2dat] dat=TGE1.DAT
- `rct2.scenery_small.tge2` [needs:rct2dat] dat=TGE2.DAT
- `rct2.scenery_small.tge3` [needs:rct2dat] dat=TGE3.DAT
- `rct2.scenery_small.tge4` [needs:rct2dat] dat=TGE4.DAT
- `rct2.scenery_small.tge5` [needs:rct2dat] dat=TGE5.DAT
- `rct2.scenery_small.tgg` [needs:rct2dat] dat=TGG.DAT
- `rct2.scenery_small.tgh1` [needs:rct2dat] dat=TGH1.DAT
- `rct2.scenery_small.tgh2` [needs:rct2dat] dat=TGH2.DAT
- `rct2.scenery_small.tghc` [needs:rct2dat] dat=TGHC.DAT
- `rct2.scenery_small.tghc2` [needs:rct2dat] dat=TGHC2.DAT
- `rct2.scenery_small.tgs` [needs:rct2dat] dat=TGS.DAT
- `rct2.scenery_small.tgs1` [needs:rct2dat] dat=TGS1.DAT
- `rct2.scenery_small.tgs2` [needs:rct2dat] dat=TGS2.DAT
- `rct2.scenery_small.tgs3` [needs:rct2dat] dat=TGS3.DAT
- `rct2.scenery_small.tgs4` [needs:rct2dat] dat=TGS4.DAT
- `rct2.scenery_small.th1` [needs:rct2dat] dat=TH1.DAT
- `rct2.scenery_small.th2` [needs:rct2dat] dat=TH2.DAT
- `rct2.scenery_small.thl` [needs:rct2dat] dat=THL.DAT
- `rct2.scenery_small.thrs` [needs:rct2dat] dat=THRS.DAT
- `rct2.scenery_small.tht` [needs:rct2dat] dat=THT.DAT
- `rct2.scenery_small.tic` [needs:rct2dat] dat=TIC.DAT
- `rct2.scenery_small.tig` [needs:rct2dat] dat=TIG.DAT
- `rct2.scenery_small.titc` [needs:rct2dat] dat=TITC.DAT
- `rct2.scenery_small.tjb1` [needs:rct2dat] dat=TJB1.DAT
- `rct2.scenery_small.tjb2` [needs:rct2dat] dat=TJB2.DAT
- `rct2.scenery_small.tjb3` [needs:rct2dat] dat=TJB3.DAT
- `rct2.scenery_small.tjb4` [needs:rct2dat] dat=TJB4.DAT
- `rct2.scenery_small.tjf` [needs:rct2dat] dat=TJF.DAT
- `rct2.scenery_small.tjp1` [needs:rct2dat] dat=TJP1.DAT
- `rct2.scenery_small.tjp2` [needs:rct2dat] dat=TJP2.DAT
- `rct2.scenery_small.tjt1` [needs:rct2dat] dat=TJT1.DAT
- `rct2.scenery_small.tjt2` [needs:rct2dat] dat=TJT2.DAT
- `rct2.scenery_small.tjt3` [needs:rct2dat] dat=TJT3.DAT
- `rct2.scenery_small.tjt4` [needs:rct2dat] dat=TJT4.DAT
- `rct2.scenery_small.tjt5` [needs:rct2dat] dat=TJT5.DAT
- `rct2.scenery_small.tjt6` [needs:rct2dat] dat=TJT6.DAT
- `rct2.scenery_small.tk1` [needs:rct2dat] dat=TK1.DAT
- `rct2.scenery_small.tk2` [needs:rct2dat] dat=TK2.DAT
- `rct2.scenery_small.tk3` [needs:rct2dat] dat=TK3.DAT
- `rct2.scenery_small.tk4` [needs:rct2dat] dat=TK4.DAT
- `rct2.scenery_small.tl0` [needs:rct2dat] dat=TL0.DAT
- `rct2.scenery_small.tl1` [needs:rct2dat] dat=TL1.DAT
- `rct2.scenery_small.tl2` [needs:rct2dat] dat=TL2.DAT
- `rct2.scenery_small.tl3` [needs:rct2dat] dat=TL3.DAT
- `rct2.scenery_small.tlc` [needs:rct2dat] dat=TLC.DAT
- `rct2.scenery_small.tlp` [needs:rct2dat] dat=TLP.DAT
- `rct2.scenery_small.tly` [needs:rct2dat] dat=TLY.DAT
- `rct2.scenery_small.tm0` [needs:rct2dat] dat=TM0.DAT
- `rct2.scenery_small.tm1` [needs:rct2dat] dat=TM1.DAT
- `rct2.scenery_small.tm2` [needs:rct2dat] dat=TM2.DAT
- `rct2.scenery_small.tm3` [needs:rct2dat] dat=TM3.DAT
- `rct2.scenery_small.tmbj` [needs:rct2dat] dat=TMBJ.DAT
- `rct2.scenery_small.tmc` [needs:rct2dat] dat=TMC.DAT
- `rct2.scenery_small.tmg` [needs:rct2dat] dat=TMG.DAT
- `rct2.scenery_small.tmj` [needs:rct2dat] dat=TMJ.DAT
- `rct2.scenery_small.tml` [needs:rct2dat] dat=TML.DAT
- `rct2.scenery_small.tmm1` [needs:rct2dat] dat=TMM1.DAT
- `rct2.scenery_small.tmm2` [needs:rct2dat] dat=TMM2.DAT
- `rct2.scenery_small.tmm3` [needs:rct2dat] dat=TMM3.DAT
- `rct2.scenery_small.tmo1` [needs:rct2dat] dat=TMO1.DAT
- `rct2.scenery_small.tmo2` [needs:rct2dat] dat=TMO2.DAT
- `rct2.scenery_small.tmo3` [needs:rct2dat] dat=TMO3.DAT
- `rct2.scenery_small.tmo4` [needs:rct2dat] dat=TMO4.DAT
- `rct2.scenery_small.tmo5` [needs:rct2dat] dat=TMO5.DAT
- `rct2.scenery_small.tmp` [needs:rct2dat] dat=TMP.DAT
- `rct2.scenery_small.tms1` [needs:rct2dat] dat=TMS1.DAT
- `rct2.scenery_small.tmw` [needs:rct2dat] dat=TMW.DAT
- `rct2.scenery_small.tmzp` [needs:rct2dat] dat=TMZP.DAT
- `rct2.scenery_small.tns` [needs:rct2dat] dat=TNS.DAT
- `rct2.scenery_small.tnss` [needs:rct2dat] dat=TNSS.DAT
- `rct2.scenery_small.tntroof1` [needs:rct2dat] dat=TNTROOF1.DAT
- `rct2.scenery_small.toh1` [needs:rct2dat] dat=TOH1.DAT
- `rct2.scenery_small.toh2` [needs:rct2dat] dat=TOH2.DAT
- `rct2.scenery_small.toh3` [needs:rct2dat] dat=TOH3.DAT
- `rct2.scenery_small.torn1` [needs:rct2dat] dat=TORN1.DAT
- `rct2.scenery_small.torn2` [needs:rct2dat] dat=TORN2.DAT
- `rct2.scenery_small.tos` [needs:rct2dat] dat=TOS.DAT
- `rct2.scenery_small.tot1` [needs:rct2dat] dat=TOT1.DAT
- `rct2.scenery_small.tot2` [needs:rct2dat] dat=TOT2.DAT
- `rct2.scenery_small.tot3` [needs:rct2dat] dat=TOT3.DAT
- `rct2.scenery_small.tot4` [needs:rct2dat] dat=TOT4.DAT
- `rct2.scenery_small.totem1` [needs:rct2dat] dat=TOTEM1.DAT
- `rct2.scenery_small.tp1` [needs:rct2dat] dat=TP1.DAT
- `rct2.scenery_small.tp2` [needs:rct2dat] dat=TP2.DAT
- `rct2.scenery_small.tpm` [needs:rct2dat] dat=TPM.DAT
- `rct2.scenery_small.tq1` [needs:rct2dat] dat=TQ1.DAT
- `rct2.scenery_small.tq2` [needs:rct2dat] dat=TQ2.DAT
- `rct2.scenery_small.tqf` [needs:rct2dat] dat=TQF.DAT
- `rct2.scenery_small.tr1` [needs:rct2dat] dat=TR1.DAT
- `rct2.scenery_small.tr2` [needs:rct2dat] dat=TR2.DAT
- `rct2.scenery_small.trc` [needs:rct2dat] dat=TRC.DAT
- `rct2.scenery_small.trf` [needs:rct2dat] dat=TRF.DAT
- `rct2.scenery_small.trf2` [needs:rct2dat] dat=TRF2.DAT
- `rct2.scenery_small.trf3` [needs:rct2dat] dat=TRF3.DAT
- `rct2.scenery_small.trfs` [needs:rct2dat] dat=TRFS.DAT
- `rct2.scenery_small.trms` [needs:rct2dat] dat=TRMS.DAT
- `rct2.scenery_small.tropt1` [needs:rct2dat] dat=TROPT1.DAT
- `rct2.scenery_small.trws` [needs:rct2dat] dat=TRWS.DAT
- `rct2.scenery_small.ts0` [needs:rct2dat] dat=TS0.DAT
- `rct2.scenery_small.ts1` [needs:rct2dat] dat=TS1.DAT
- `rct2.scenery_small.ts2` [needs:rct2dat] dat=TS2.DAT
- `rct2.scenery_small.ts3` [needs:rct2dat] dat=TS3.DAT
- `rct2.scenery_small.ts4` [needs:rct2dat] dat=TS4.DAT
- `rct2.scenery_small.ts5` [needs:rct2dat] dat=TS5.DAT
- `rct2.scenery_small.ts6` [needs:rct2dat] dat=TS6.DAT
- `rct2.scenery_small.tsb` [needs:rct2dat] dat=TSB.DAT
- `rct2.scenery_small.tsc` [needs:rct2dat] dat=TSC.DAT
- `rct2.scenery_small.tsc2` [needs:rct2dat] dat=TSC2.DAT
- `rct2.scenery_small.tscp` [needs:rct2dat] dat=TSCP.DAT
- `rct2.scenery_small.tsd` [needs:rct2dat] dat=TSD.DAT
- `rct2.scenery_small.tsf1` [needs:rct2dat] dat=TSF1.DAT
- `rct2.scenery_small.tsf2` [needs:rct2dat] dat=TSF2.DAT
- `rct2.scenery_small.tsf3` [needs:rct2dat] dat=TSF3.DAT
- `rct2.scenery_small.tsg` [needs:rct2dat] dat=TSG.DAT
- `rct2.scenery_small.tsh` [needs:rct2dat] dat=TSH.DAT
- `rct2.scenery_small.tsh0` [needs:rct2dat] dat=TSH0.DAT
- `rct2.scenery_small.tsh1` [needs:rct2dat] dat=TSH1.DAT
- `rct2.scenery_small.tsh2` [needs:rct2dat] dat=TSH2.DAT
- `rct2.scenery_small.tsh3` [needs:rct2dat] dat=TSH3.DAT
- `rct2.scenery_small.tsh4` [needs:rct2dat] dat=TSH4.DAT
- `rct2.scenery_small.tsh5` [needs:rct2dat] dat=TSH5.DAT
- `rct2.scenery_small.tsk` [needs:rct2dat] dat=TSK.DAT
- `rct2.scenery_small.tsm` [needs:rct2dat] dat=TSM.DAT
- `rct2.scenery_small.tsmp` [needs:rct2dat] dat=TSMP.DAT
- `rct2.scenery_small.tsnb` [needs:rct2dat] dat=TSNB.DAT
- `rct2.scenery_small.tsnc` [needs:rct2dat] dat=TSNC.DAT
- `rct2.scenery_small.tsp` [needs:rct2dat] dat=TSP.DAT
- `rct2.scenery_small.tsp1` [needs:rct2dat] dat=TSP1.DAT
- `rct2.scenery_small.tsp2` [needs:rct2dat] dat=TSP2.DAT
- `rct2.scenery_small.tsph` [needs:rct2dat] dat=TSPH.DAT
- `rct2.scenery_small.tsq` [needs:rct2dat] dat=TSQ.DAT
- `rct2.scenery_small.tst1` [needs:rct2dat] dat=TST1.DAT
- `rct2.scenery_small.tst2` [needs:rct2dat] dat=TST2.DAT
- `rct2.scenery_small.tst3` [needs:rct2dat] dat=TST3.DAT
- `rct2.scenery_small.tst4` [needs:rct2dat] dat=TST4.DAT
- `rct2.scenery_small.tst5` [needs:rct2dat] dat=TST5.DAT
- `rct2.scenery_small.tstd` [needs:rct2dat] dat=TSTD.DAT
- `rct2.scenery_small.tt1` [needs:rct2dat] dat=TT1.DAT
- `rct2.scenery_small.ttf` [needs:rct2dat] dat=TTF.DAT
- `rct2.scenery_small.ttg` [needs:rct2dat] dat=TTG.DAT
- `rct2.scenery_small.tus` [needs:rct2dat] dat=TUS.DAT
- `rct2.scenery_small.tvl` [needs:rct2dat] dat=TVL.DAT
- `rct2.scenery_small.twf` [needs:rct2dat] dat=TWF.DAT
- `rct2.scenery_small.twh1` [needs:rct2dat] dat=TWH1.DAT
- `rct2.scenery_small.twh2` [needs:rct2dat] dat=TWH2.DAT
- `rct2.scenery_small.twn` [needs:rct2dat] dat=TWN.DAT
- `rct2.scenery_small.twp` [needs:rct2dat] dat=TWP.DAT
- `rct2.scenery_small.tww` [needs:rct2dat] dat=TWW.DAT
- `rct2.scenery_small.wag1` [needs:rct2dat] dat=WAG1.DAT
- `rct2.scenery_small.wag2` [needs:rct2dat] dat=WAG2.DAT
- `rct2.scenery_small.wasp` [needs:rct2dat] dat=WASP.DAT
- `rct2.scenery_small.wdbase` [needs:rct2dat] dat=WDBASE.DAT
- `rct2.scenery_small.wdiag` [needs:rct2dat] dat=WDIAG.DAT
- `rct2.scenery_small.whoriz` [needs:rct2dat] dat=WHORIZ.DAT
- `rct2.scenery_small.wspout` [needs:rct2dat] dat=WSPOUT.DAT
- `rct2tt.scenery_small.1920slmp` [needs:rct2dat] dat=1920SLMP.DAT
- `rct2tt.scenery_small.alenplt1` [needs:rct2dat] dat=ALENPLT1.DAT
- `rct2tt.scenery_small.alenplt2` [needs:rct2dat] dat=ALENPLT2.DAT
- `rct2tt.scenery_small.alentre1` [needs:rct2dat] dat=ALENTRE1.DAT
- `rct2tt.scenery_small.alentre2` [needs:rct2dat] dat=ALENTRE2.DAT
- `rct2tt.scenery_small.allseeye` [needs:rct2dat] dat=ALLSEEYE.DAT
- `rct2tt.scenery_small.alnstr01` [needs:rct2dat] dat=ALNSTR01.DAT
- `rct2tt.scenery_small.alnstr02` [needs:rct2dat] dat=ALNSTR02.DAT
- `rct2tt.scenery_small.alnstr03` [needs:rct2dat] dat=ALNSTR03.DAT
- `rct2tt.scenery_small.alnstr04` [needs:rct2dat] dat=ALNSTR04.DAT
- `rct2tt.scenery_small.alnstr05` [needs:rct2dat] dat=ALNSTR05.DAT
- `rct2tt.scenery_small.alnstr06` [needs:rct2dat] dat=ALNSTR06.DAT
- `rct2tt.scenery_small.alnstr07` [needs:rct2dat] dat=ALNSTR07.DAT
- `rct2tt.scenery_small.argonau1` [needs:rct2dat] dat=ARGONOU1.DAT
- `rct2tt.scenery_small.argonau2` [needs:rct2dat] dat=ARGONOU2.DAT
- `rct2tt.scenery_small.argonau3` [needs:rct2dat] dat=ARGONOU3.DAT
- `rct2tt.scenery_small.armrbody` [needs:rct2dat] dat=ARMRBODY.DAT
- `rct2tt.scenery_small.armrhelm` [needs:rct2dat] dat=ARMRHELM.DAT
- `rct2tt.scenery_small.armrshld` [needs:rct2dat] dat=ARMRSHLD.DAT
- `rct2tt.scenery_small.armrswrd` [needs:rct2dat] dat=ARMRSWRD.DAT
- `rct2tt.scenery_small.artdec01` [needs:rct2dat] dat=ARTDEC01.DAT
- `rct2tt.scenery_small.artdec02` [needs:rct2dat] dat=ARTDEC02.DAT
- `rct2tt.scenery_small.artdec03` [needs:rct2dat] dat=ARTDEC03.DAT
- `rct2tt.scenery_small.artdec04` [needs:rct2dat] dat=ARTDEC04.DAT
- `rct2tt.scenery_small.artdec05` [needs:rct2dat] dat=ARTDEC05.DAT
- `rct2tt.scenery_small.artdec06` [needs:rct2dat] dat=ARTDEC06.DAT
- `rct2tt.scenery_small.artdec07` [needs:rct2dat] dat=ARTDEC07.DAT
- `rct2tt.scenery_small.artdec08` [needs:rct2dat] dat=ARTDEC08.DAT
- `rct2tt.scenery_small.artdec09` [needs:rct2dat] dat=ARTDEC09.DAT
- `rct2tt.scenery_small.artdec10` [needs:rct2dat] dat=ARTDEC10.DAT
- `rct2tt.scenery_small.artdec11` [needs:rct2dat] dat=ARTDEC11.DAT
- `rct2tt.scenery_small.artdec12` [needs:rct2dat] dat=ARTDEC12.DAT
- `rct2tt.scenery_small.artdec13` [needs:rct2dat] dat=ARTDEC13.DAT
- `rct2tt.scenery_small.artdec14` [needs:rct2dat] dat=ARTDEC14.DAT
- `rct2tt.scenery_small.artdec15` [needs:rct2dat] dat=ARTDEC15.DAT
- `rct2tt.scenery_small.artdec16` [needs:rct2dat] dat=ARTDEC16.DAT
- `rct2tt.scenery_small.artdec17` [needs:rct2dat] dat=ARTDEC17.DAT
- `rct2tt.scenery_small.artdec18` [needs:rct2dat] dat=ARTDEC18.DAT
- `rct2tt.scenery_small.artdec19` [needs:rct2dat] dat=ARTDEC19.DAT
- `rct2tt.scenery_small.artdec20` [needs:rct2dat] dat=ARTDEC20.DAT
- `rct2tt.scenery_small.artdec21` [needs:rct2dat] dat=ARTDEC21.DAT
- `rct2tt.scenery_small.artdec22` [needs:rct2dat] dat=ARTDEC22.DAT
- `rct2tt.scenery_small.artdec23` [needs:rct2dat] dat=ARTDEC23.DAT
- `rct2tt.scenery_small.artdec24` [needs:rct2dat] dat=ARTDEC24.DAT
- `rct2tt.scenery_small.artdec28` [needs:rct2dat] dat=ARTDEC28.DAT
- `rct2tt.scenery_small.artdec29` [needs:rct2dat] dat=ARTDEC29.DAT
- `rct2tt.scenery_small.astrongt` [needs:rct2dat] dat=ASTRONGT.DAT
- `rct2tt.scenery_small.bigbassx` [needs:rct2dat] dat=BIGBASSX.DAT
- `rct2tt.scenery_small.biggutar` [needs:rct2dat] dat=BIGGUTAR.DAT
- `rct2tt.scenery_small.bkrgang1` [needs:rct2dat] dat=BKRGANG1.DAT
- `rct2tt.scenery_small.bolpot01` [needs:rct2dat] dat=BOLPOT01.DAT
- `rct2tt.scenery_small.cagdstat` [needs:rct2dat] dat=CAGDSTAT.DAT
- `rct2tt.scenery_small.cavemenx` [needs:rct2dat] dat=CAVEMENX.DAT
- `rct2tt.scenery_small.chanmaid` [needs:rct2dat] dat=CHANMAID.DAT
- `rct2tt.scenery_small.chprbke1` [needs:rct2dat] dat=CHPRBKE1.DAT
- `rct2tt.scenery_small.chprbke2` [needs:rct2dat] dat=CHPRBKE2.DAT
- `rct2tt.scenery_small.clnsmen1` [needs:rct2dat] dat=CLNSMEN1.DAT
- `rct2tt.scenery_small.compeyex` [needs:rct2dat] dat=COMPEYEX.DAT
- `rct2tt.scenery_small.cookspit` [needs:rct2dat] dat=COOKSPIT.DAT
- `rct2tt.scenery_small.dinsign1` [needs:rct2dat] dat=DINSIGN1.DAT
- `rct2tt.scenery_small.dinsign2` [needs:rct2dat] dat=DINSIGN2.DAT
- `rct2tt.scenery_small.dinsign3` [needs:rct2dat] dat=DINSIGN3.DAT
- `rct2tt.scenery_small.dinsign4` [needs:rct2dat] dat=DINSIGN4.DAT
- `rct2tt.scenery_small.dkfight1` [needs:rct2dat] dat=DKFIGHT1.DAT
- `rct2tt.scenery_small.dkfight2` [needs:rct2dat] dat=DKFIGHT2.DAT
- `rct2tt.scenery_small.drgnattk` [needs:rct2dat] dat=DRGNATTK.DAT
- `rct2tt.scenery_small.elecfen1` [needs:rct2dat] dat=ELECFEN1.DAT
- `rct2tt.scenery_small.elecfen2` [needs:rct2dat] dat=ELECFEN2.DAT
- `rct2tt.scenery_small.elecfen3` [needs:rct2dat] dat=ELECFEN3.DAT
- `rct2tt.scenery_small.elecfen4` [needs:rct2dat] dat=ELECFEN4.DAT
- `rct2tt.scenery_small.elecfen5` [needs:rct2dat] dat=ELECFEN5.DAT
- `rct2tt.scenery_small.evalien1` [needs:rct2dat] dat=EVALIEN1.DAT
- `rct2tt.scenery_small.evalien2` [needs:rct2dat] dat=EVALIEN2.DAT
- `rct2tt.scenery_small.evalien3` [needs:rct2dat] dat=EVALIEN3.DAT
- `rct2tt.scenery_small.fircanon` [needs:rct2dat] dat=FIRCANON.DAT
- `rct2tt.scenery_small.firemanx` [needs:rct2dat] dat=FIREMANX.DAT
- `rct2tt.scenery_small.fltsign1` [needs:rct2dat] dat=FLTSIGN1.DAT
- `rct2tt.scenery_small.fltsign2` [needs:rct2dat] dat=FLTSIGN2.DAT
- `rct2tt.scenery_small.frbeacon` [needs:rct2dat] dat=FRBEACON.DAT
- `rct2tt.scenery_small.furobot1` [needs:rct2dat] dat=FUROBOT1.DAT
- `rct2tt.scenery_small.furobot2` [needs:rct2dat] dat=FUROBOT2.DAT
- `rct2tt.scenery_small.futsky01` [needs:rct2dat] dat=FUTSKY01.DAT
- `rct2tt.scenery_small.futsky02` [needs:rct2dat] dat=FUTSKY02.DAT
- `rct2tt.scenery_small.futsky03` [needs:rct2dat] dat=FUTSKY03.DAT
- `rct2tt.scenery_small.futsky04` [needs:rct2dat] dat=FUTSKY04.DAT
- `rct2tt.scenery_small.futsky05` [needs:rct2dat] dat=FUTSKY05.DAT
- `rct2tt.scenery_small.futsky06` [needs:rct2dat] dat=FUTSKY06.DAT
- `rct2tt.scenery_small.futsky07` [needs:rct2dat] dat=FUTSKY07.DAT
- `rct2tt.scenery_small.futsky08` [needs:rct2dat] dat=FUTSKY08.DAT
- `rct2tt.scenery_small.futsky09` [needs:rct2dat] dat=FUTSKY09.DAT
- `rct2tt.scenery_small.futsky10` [needs:rct2dat] dat=FUTSKY10.DAT
- `rct2tt.scenery_small.futsky11` [needs:rct2dat] dat=FUTSKY11.DAT
- `rct2tt.scenery_small.futsky12` [needs:rct2dat] dat=FUTSKY12.DAT
- `rct2tt.scenery_small.futsky13` [needs:rct2dat] dat=FUTSKY13.DAT
- `rct2tt.scenery_small.futsky14` [needs:rct2dat] dat=FUTSKY14.DAT
- `rct2tt.scenery_small.futsky15` [needs:rct2dat] dat=FUTSKY15.DAT
- `rct2tt.scenery_small.futsky16` [needs:rct2dat] dat=FUTSKY16.DAT
- `rct2tt.scenery_small.futsky17` [needs:rct2dat] dat=FUTSKY17.DAT
- `rct2tt.scenery_small.futsky18` [needs:rct2dat] dat=FUTSKY18.DAT
- `rct2tt.scenery_small.futsky19` [needs:rct2dat] dat=FUTSKY19.DAT
- `rct2tt.scenery_small.futsky21` [needs:rct2dat] dat=FUTSKY21.DAT
- `rct2tt.scenery_small.futsky23` [needs:rct2dat] dat=FUTSKY23.DAT
- `rct2tt.scenery_small.futsky29` [needs:rct2dat] dat=FUTSKY29.DAT
- `rct2tt.scenery_small.futsky33` [needs:rct2dat] dat=FUTSKY33.DAT
- `rct2tt.scenery_small.futsky34` [needs:rct2dat] dat=FUTSKY34.DAT
- `rct2tt.scenery_small.futsky35` [needs:rct2dat] dat=FUTSKY35.DAT
- `rct2tt.scenery_small.futsky36` [needs:rct2dat] dat=FUTSKY36.DAT
- `rct2tt.scenery_small.futsky37` [needs:rct2dat] dat=FUTSKY37.DAT
- `rct2tt.scenery_small.futsky38` [needs:rct2dat] dat=FUTSKY38.DAT
- `rct2tt.scenery_small.futsky39` [needs:rct2dat] dat=FUTSKY39.DAT
- `rct2tt.scenery_small.futsky40` [needs:rct2dat] dat=FUTSKY40.DAT
- `rct2tt.scenery_small.futsky41` [needs:rct2dat] dat=FUTSKY41.DAT
- `rct2tt.scenery_small.futsky42` [needs:rct2dat] dat=FUTSKY42.DAT
- `rct2tt.scenery_small.futsky44` [needs:rct2dat] dat=FUTSKY44.DAT
- `rct2tt.scenery_small.futsky46` [needs:rct2dat] dat=FUTSKY46.DAT
- `rct2tt.scenery_small.futsky47` [needs:rct2dat] dat=FUTSKY47.DAT
- `rct2tt.scenery_small.futsky48` [needs:rct2dat] dat=FUTSKY48.DAT
- `rct2tt.scenery_small.futsky52` [needs:rct2dat] dat=FUTSKY52.DAT
- `rct2tt.scenery_small.futsky53` [needs:rct2dat] dat=FUTSKY53.DAT
- `rct2tt.scenery_small.futsky54` [needs:rct2dat] dat=FUTSKY54.DAT
- `rct2tt.scenery_small.fwrprdc1` [needs:rct2dat] dat=FWRPRDC1.DAT
- `rct2tt.scenery_small.gangster` [needs:rct2dat] dat=GANGSTER.DAT
- `rct2tt.scenery_small.gdalien1` [needs:rct2dat] dat=GDALIEN1.DAT
- `rct2tt.scenery_small.gdalien2` [needs:rct2dat] dat=GDALIEN2.DAT
- `rct2tt.scenery_small.gdalien3` [needs:rct2dat] dat=GDALIEN3.DAT
- `rct2tt.scenery_small.geyserxx` [needs:rct2dat] dat=GEYSERXX.DAT
- `rct2tt.scenery_small.ggntocto` [needs:rct2dat] dat=GGNTOCTO.DAT
- `rct2tt.scenery_small.ggntspid` [needs:rct2dat] dat=GGNTSPID.DAT
- `rct2tt.scenery_small.gldchest` [needs:rct2dat] dat=GLDCHEST.DAT
- `rct2tt.scenery_small.goldflec` [needs:rct2dat] dat=GOLDFLEC.DAT
- `rct2tt.scenery_small.gscorpo2` [needs:rct2dat] dat=GSCORPO2.DAT
- `rct2tt.scenery_small.gscorpon` [needs:rct2dat] dat=GSCORPON.DAT
- `rct2tt.scenery_small.guyqwifx` [needs:rct2dat] dat=GUYQWIFX.DAT
- `rct2tt.scenery_small.haybails` [needs:rct2dat] dat=HAYBAILS.DAT
- `rct2tt.scenery_small.hevbth01` [needs:rct2dat] dat=HEVBTH01.DAT
- `rct2tt.scenery_small.hevbth02` [needs:rct2dat] dat=HEVBTH02.DAT
- `rct2tt.scenery_small.hevbth03` [needs:rct2dat] dat=HEVBTH03.DAT
- `rct2tt.scenery_small.hevbth04` [needs:rct2dat] dat=HEVBTH04.DAT
- `rct2tt.scenery_small.hevbth05` [needs:rct2dat] dat=HEVBTH05.DAT
- `rct2tt.scenery_small.hevbth06` [needs:rct2dat] dat=HEVBTH06.DAT
- `rct2tt.scenery_small.hevbth07` [needs:rct2dat] dat=HEVBTH07.DAT
- `rct2tt.scenery_small.hevbth08` [needs:rct2dat] dat=HEVBTH08.DAT
- `rct2tt.scenery_small.hevbth09` [needs:rct2dat] dat=HEVBTH09.DAT
- `rct2tt.scenery_small.hevbth10` [needs:rct2dat] dat=HEVBTH10.DAT
- `rct2tt.scenery_small.hevbth11` [needs:rct2dat] dat=HEVBTH11.DAT
- `rct2tt.scenery_small.hevbth12` [needs:rct2dat] dat=HEVBTH12.DAT
- `rct2tt.scenery_small.hevbth13` [needs:rct2dat] dat=HEVBTH13.DAT
- `rct2tt.scenery_small.hevbth14` [needs:rct2dat] dat=HEVBTH14.DAT
- `rct2tt.scenery_small.hevbth15` [needs:rct2dat] dat=HEVBTH15.DAT
- `rct2tt.scenery_small.hevbth16` [needs:rct2dat] dat=HEVBTH16.DAT
- `rct2tt.scenery_small.hevbth17` [needs:rct2dat] dat=HEVBTH17.DAT
- `rct2tt.scenery_small.hevrof01` [needs:rct2dat] dat=HEVROF01.DAT
- `rct2tt.scenery_small.hevrof02` [needs:rct2dat] dat=HEVROF02.DAT
- `rct2tt.scenery_small.hevrof03` [needs:rct2dat] dat=HEVROF03.DAT
- `rct2tt.scenery_small.hevrof04` [needs:rct2dat] dat=HEVROF04.DAT
- `rct2tt.scenery_small.horsecrt` [needs:rct2dat] dat=HORSECRT.DAT
- `rct2tt.scenery_small.hovrcar1` [needs:rct2dat] dat=HOVRCAR1.DAT
- `rct2tt.scenery_small.hovrcar2` [needs:rct2dat] dat=HOVRCAR2.DAT
- `rct2tt.scenery_small.hovrcar3` [needs:rct2dat] dat=HOVRCAR3.DAT
- `rct2tt.scenery_small.hovrcar4` [needs:rct2dat] dat=HOVRCAR4.DAT
- `rct2tt.scenery_small.hrbwal01` [needs:rct2dat] dat=HRBWAL01.DAT
- `rct2tt.scenery_small.hrbwal02` [needs:rct2dat] dat=HRBWAL02.DAT
- `rct2tt.scenery_small.hrbwal03` [needs:rct2dat] dat=HRBWAL03.DAT
- `rct2tt.scenery_small.hrbwal04` [needs:rct2dat] dat=HRBWAL04.DAT
- `rct2tt.scenery_small.hrbwal05` [needs:rct2dat] dat=HRBWAL05.DAT
- `rct2tt.scenery_small.hrbwal06` [needs:rct2dat] dat=HRBWAL06.DAT
- `rct2tt.scenery_small.hurcluls` [needs:rct2dat] dat=HURCLULS.DAT
- `rct2tt.scenery_small.hvrbike1` [needs:rct2dat] dat=HVRBIKE1.DAT
- `rct2tt.scenery_small.hvrbike2` [needs:rct2dat] dat=HVRBIKE2.DAT
- `rct2tt.scenery_small.hvrbike3` [needs:rct2dat] dat=HVRBIKE3.DAT
- `rct2tt.scenery_small.hvrbike4` [needs:rct2dat] dat=HVRBIKE4.DAT
- `rct2tt.scenery_small.indwal01` [needs:rct2dat] dat=INDWAL01.DAT
- `rct2tt.scenery_small.indwal02` [needs:rct2dat] dat=INDWAL02.DAT
- `rct2tt.scenery_small.indwal03` [needs:rct2dat] dat=INDWAL03.DAT
- `rct2tt.scenery_small.indwal04` [needs:rct2dat] dat=INDWAL04.DAT
- `rct2tt.scenery_small.indwal05` [needs:rct2dat] dat=INDWAL05.DAT
- `rct2tt.scenery_small.indwal06` [needs:rct2dat] dat=INDWAL06.DAT
- `rct2tt.scenery_small.indwal07` [needs:rct2dat] dat=INDWAL07.DAT
- `rct2tt.scenery_small.indwal08` [needs:rct2dat] dat=INDWAL08.DAT
- `rct2tt.scenery_small.indwal09` [needs:rct2dat] dat=INDWAL09.DAT
- `rct2tt.scenery_small.indwal10` [needs:rct2dat] dat=INDWAL10.DAT
- `rct2tt.scenery_small.indwal11` [needs:rct2dat] dat=INDWAL11.DAT
- `rct2tt.scenery_small.indwal12` [needs:rct2dat] dat=INDWAL12.DAT
- `rct2tt.scenery_small.indwal13` [needs:rct2dat] dat=INDWAL13.DAT
- `rct2tt.scenery_small.indwal14` [needs:rct2dat] dat=INDWAL14.DAT
- `rct2tt.scenery_small.indwal15` [needs:rct2dat] dat=INDWAL15.DAT
- `rct2tt.scenery_small.indwal16` [needs:rct2dat] dat=INDWAL16.DAT
- `rct2tt.scenery_small.indwal17` [needs:rct2dat] dat=INDWAL17.DAT
- `rct2tt.scenery_small.indwal18` [needs:rct2dat] dat=INDWAL18.DAT
- `rct2tt.scenery_small.indwal19` [needs:rct2dat] dat=INDWAL19.DAT
- `rct2tt.scenery_small.indwal20` [needs:rct2dat] dat=INDWAL20.DAT
- `rct2tt.scenery_small.indwal21` [needs:rct2dat] dat=INDWAL21.DAT
- `rct2tt.scenery_small.indwal22` [needs:rct2dat] dat=INDWAL22.DAT
- `rct2tt.scenery_small.indwal23` [needs:rct2dat] dat=INDWAL23.DAT
- `rct2tt.scenery_small.indwal24` [needs:rct2dat] dat=INDWAL24.DAT
- `rct2tt.scenery_small.indwal25` [needs:rct2dat] dat=INDWAL25.DAT
- `rct2tt.scenery_small.indwal26` [needs:rct2dat] dat=INDWAL26.DAT
- `rct2tt.scenery_small.indwal27` [needs:rct2dat] dat=INDWAL27.DAT
- `rct2tt.scenery_small.indwal28` [needs:rct2dat] dat=INDWAL28.DAT
- `rct2tt.scenery_small.indwal29` [needs:rct2dat] dat=INDWAL29.DAT
- `rct2tt.scenery_small.indwal30` [needs:rct2dat] dat=INDWAL30.DAT
- `rct2tt.scenery_small.indwal31` [needs:rct2dat] dat=INDWAL31.DAT
- `rct2tt.scenery_small.indwal32` [needs:rct2dat] dat=INDWAL32.DAT
- `rct2tt.scenery_small.jailxx01` [needs:rct2dat] dat=JAILXX01.DAT
- `rct2tt.scenery_small.jailxx02` [needs:rct2dat] dat=JAILXX02.DAT
- `rct2tt.scenery_small.jailxx03` [needs:rct2dat] dat=JAILXX03.DAT
- `rct2tt.scenery_small.jailxx04` [needs:rct2dat] dat=JAILXX04.DAT
- `rct2tt.scenery_small.jailxx05` [needs:rct2dat] dat=JAILXX05.DAT
- `rct2tt.scenery_small.jailxx06` [needs:rct2dat] dat=JAILXX06.DAT
- `rct2tt.scenery_small.jailxx07` [needs:rct2dat] dat=JAILXX07.DAT
- `rct2tt.scenery_small.jailxx08` [needs:rct2dat] dat=JAILXX08.DAT
- `rct2tt.scenery_small.jailxx09` [needs:rct2dat] dat=JAILXX09.DAT
- `rct2tt.scenery_small.jailxx10` [needs:rct2dat] dat=JAILXX10.DAT
- `rct2tt.scenery_small.jailxx11` [needs:rct2dat] dat=JAILXX11.DAT
- `rct2tt.scenery_small.jailxx12` [needs:rct2dat] dat=JAILXX12.DAT
- `rct2tt.scenery_small.jailxx13` [needs:rct2dat] dat=JAILXX13.DAT
- `rct2tt.scenery_small.jailxx14` [needs:rct2dat] dat=JAILXX14.DAT
- `rct2tt.scenery_small.jailxx15` [needs:rct2dat] dat=JAILXX15.DAT
- `rct2tt.scenery_small.jailxx16` [needs:rct2dat] dat=JAILXX16.DAT
- `rct2tt.scenery_small.jailxx20` [needs:rct2dat] dat=JAILXX20.DAT
- `rct2tt.scenery_small.jailxx21` [needs:rct2dat] dat=JAILXX21.DAT
- `rct2tt.scenery_small.jazzmbr1` [needs:rct2dat] dat=JAZZMBR1.DAT
- `rct2tt.scenery_small.jazzmbr2` [needs:rct2dat] dat=JAZZMBR2.DAT
- `rct2tt.scenery_small.jazzmbr3` [needs:rct2dat] dat=JAZZMBR3.DAT
- `rct2tt.scenery_small.jazzmbr4` [needs:rct2dat] dat=JAZZMBR4.DAT
- `rct2tt.scenery_small.killrvin` [needs:rct2dat] dat=KILLRVIN.DAT
- `rct2tt.scenery_small.knfight1` [needs:rct2dat] dat=KNFIGHT1.DAT
- `rct2tt.scenery_small.knfight2` [needs:rct2dat] dat=KNFIGHT2.DAT
- `rct2tt.scenery_small.largecpu` [needs:rct2dat] dat=LARGECPU.DAT
- `rct2tt.scenery_small.laserx01` [needs:rct2dat] dat=LASERX01.DAT
- `rct2tt.scenery_small.laserx02` [needs:rct2dat] dat=LASERX02.DAT
- `rct2tt.scenery_small.mamthw01` [needs:rct2dat] dat=MAMTHW01.DAT
- `rct2tt.scenery_small.mamthw02` [needs:rct2dat] dat=MAMTHW02.DAT
- `rct2tt.scenery_small.mamthw03` [needs:rct2dat] dat=MAMTHW03.DAT
- `rct2tt.scenery_small.mamthw04` [needs:rct2dat] dat=MAMTHW04.DAT
- `rct2tt.scenery_small.mamthw05` [needs:rct2dat] dat=MAMTHW05.DAT
- `rct2tt.scenery_small.mamthw06` [needs:rct2dat] dat=MAMTHW06.DAT
- `rct2tt.scenery_small.mcastl02` [needs:rct2dat] dat=MCASTL02.DAT
- `rct2tt.scenery_small.mcastl03` [needs:rct2dat] dat=MCASTL03.DAT
- `rct2tt.scenery_small.mcastl04` [needs:rct2dat] dat=MCASTL04.DAT
- `rct2tt.scenery_small.mcastl05` [needs:rct2dat] dat=MCASTL05.DAT
- `rct2tt.scenery_small.mcastl06` [needs:rct2dat] dat=MCASTL06.DAT
- `rct2tt.scenery_small.mcastl07` [needs:rct2dat] dat=MCASTL07.DAT
- `rct2tt.scenery_small.mcastl08` [needs:rct2dat] dat=MCASTL08.DAT
- `rct2tt.scenery_small.mcastl09` [needs:rct2dat] dat=MCASTL09.DAT
- `rct2tt.scenery_small.mcastl10` [needs:rct2dat] dat=MCASTL10.DAT
- `rct2tt.scenery_small.mcastl19` [needs:rct2dat] dat=MCASTL19.DAT
- `rct2tt.scenery_small.mdbucket` [needs:rct2dat] dat=MDBUCKET.DAT
- `rct2tt.scenery_small.mdusasta` [needs:rct2dat] dat=MDUSASTA.DAT
- `rct2tt.scenery_small.medstool` [needs:rct2dat] dat=MEDSTOOL.DAT
- `rct2tt.scenery_small.medtools` [needs:rct2dat] dat=MEDTOOLS.DAT
- `rct2tt.scenery_small.medtrget` [needs:rct2dat] dat=MEDTRGET.DAT
- `rct2tt.scenery_small.meteorcr` [needs:rct2dat] dat=METEORCR.DAT
- `rct2tt.scenery_small.meteorst` [needs:rct2dat] dat=METEORST.DAT
- `rct2tt.scenery_small.metrcrs1` [needs:rct2dat] dat=METRCYS1.DAT
- `rct2tt.scenery_small.metrcrs2` [needs:rct2dat] dat=METRCYS2.DAT
- `rct2tt.scenery_small.minotaur` [needs:rct2dat] dat=MINOTAUR.DAT
- `rct2tt.scenery_small.oldnyk01` [needs:rct2dat] dat=OLDNYK01.DAT
- `rct2tt.scenery_small.oldnyk02` [needs:rct2dat] dat=OLDNYK02.DAT
- `rct2tt.scenery_small.oldnyk03` [needs:rct2dat] dat=OLDNYK03.DAT
- `rct2tt.scenery_small.oldnyk04` [needs:rct2dat] dat=OLDNYK04.DAT
- `rct2tt.scenery_small.oldnyk05` [needs:rct2dat] dat=OLDNYK05.DAT
- `rct2tt.scenery_small.oldnyk06` [needs:rct2dat] dat=OLDNYK06.DAT
- `rct2tt.scenery_small.oldnyk07` [needs:rct2dat] dat=OLDNYK07.DAT
- `rct2tt.scenery_small.oldnyk08` [needs:rct2dat] dat=OLDNYK08.DAT
- `rct2tt.scenery_small.oldnyk09` [needs:rct2dat] dat=OLDNYK09.DAT
- `rct2tt.scenery_small.oldnyk10` [needs:rct2dat] dat=OLDNYK10.DAT
- `rct2tt.scenery_small.oldnyk11` [needs:rct2dat] dat=OLDNYK11.DAT
- `rct2tt.scenery_small.oldnyk12` [needs:rct2dat] dat=OLDNYK12.DAT
- `rct2tt.scenery_small.oldnyk13` [needs:rct2dat] dat=OLDNYK13.DAT
- `rct2tt.scenery_small.oldnyk14` [needs:rct2dat] dat=OLDNYK14.DAT
- `rct2tt.scenery_small.oldnyk15` [needs:rct2dat] dat=OLDNYK15.DAT
- `rct2tt.scenery_small.oldnyk16` [needs:rct2dat] dat=OLDNYK16.DAT
- `rct2tt.scenery_small.oldnyk17` [needs:rct2dat] dat=OLDNYK17.DAT
- `rct2tt.scenery_small.oldnyk18` [needs:rct2dat] dat=OLDNYK18.DAT
- `rct2tt.scenery_small.oldnyk19` [needs:rct2dat] dat=OLDNYK19.DAT
- `rct2tt.scenery_small.oldnyk31` [needs:rct2dat] dat=OLDNYK31.DAT
- `rct2tt.scenery_small.oldnyk33` [needs:rct2dat] dat=OLDNYK33.DAT
- `rct2tt.scenery_small.oldnyk34` [needs:rct2dat] dat=OLDNYK34.DAT
- `rct2tt.scenery_small.oldnyk35` [needs:rct2dat] dat=OLDNYK35.DAT
- `rct2tt.scenery_small.pdflag02` [needs:rct2dat] dat=PDFLAG02.DAT
- `rct2tt.scenery_small.pdflag03` [needs:rct2dat] dat=PDFLAG03.DAT
- `rct2tt.scenery_small.pdflag04` [needs:rct2dat] dat=PDFLAG04.DAT
- `rct2tt.scenery_small.pdflag05` [needs:rct2dat] dat=PDFLAG05.DAT
- `rct2tt.scenery_small.pdflag06` [needs:rct2dat] dat=PDFLAG06.DAT
- `rct2tt.scenery_small.pdflag08` [needs:rct2dat] dat=PDFLAG08.DAT
- `rct2tt.scenery_small.pdflag13` [needs:rct2dat] dat=PDFLAG13.DAT
- `rct2tt.scenery_small.pdflag14` [needs:rct2dat] dat=PDFLAG14.DAT
- `rct2tt.scenery_small.pdflag15` [needs:rct2dat] dat=PDFLAG15.DAT
- `rct2tt.scenery_small.pdflag16` [needs:rct2dat] dat=PDFLAG16.DAT
- `rct2tt.scenery_small.polwtbtn` [needs:rct2dat] dat=POLWTBTN.DAT
- `rct2tt.scenery_small.primhead` [needs:rct2dat] dat=PRIMHEAD.DAT
- `rct2tt.scenery_small.primhear` [needs:rct2dat] dat=PRIMHEAR.DAT
- `rct2tt.scenery_small.primroor` [needs:rct2dat] dat=PRIMROOR.DAT
- `rct2tt.scenery_small.primroot` [needs:rct2dat] dat=PRIMROOT.DAT
- `rct2tt.scenery_small.primscrn` [needs:rct2dat] dat=PRIMSCRN.DAT
- `rct2tt.scenery_small.primst01` [needs:rct2dat] dat=PRIMST01.DAT
- `rct2tt.scenery_small.primst02` [needs:rct2dat] dat=PRIMST02.DAT
- `rct2tt.scenery_small.primst03` [needs:rct2dat] dat=PRIMST03.DAT
- `rct2tt.scenery_small.primtall` [needs:rct2dat] dat=PRIMTALL.DAT
- `rct2tt.scenery_small.primwal1` [needs:rct2dat] dat=PRIMWAL1.DAT
- `rct2tt.scenery_small.primwal2` [needs:rct2dat] dat=PRIMWAL2.DAT
- `rct2tt.scenery_small.primwal3` [needs:rct2dat] dat=PRIMWAL3.DAT
- `rct2tt.scenery_small.psntwl01` [needs:rct2dat] dat=PSNTWL01.DAT
- `rct2tt.scenery_small.psntwl02` [needs:rct2dat] dat=PSNTWL02.DAT
- `rct2tt.scenery_small.psntwl03` [needs:rct2dat] dat=PSNTWL03.DAT
- `rct2tt.scenery_small.psntwl04` [needs:rct2dat] dat=PSNTWL04.DAT
- `rct2tt.scenery_small.psntwl05` [needs:rct2dat] dat=PSNTWL05.DAT
- `rct2tt.scenery_small.psntwl06` [needs:rct2dat] dat=PSNTWL06.DAT
- `rct2tt.scenery_small.psntwl07` [needs:rct2dat] dat=PSNTWL07.DAT
- `rct2tt.scenery_small.psntwl08` [needs:rct2dat] dat=PSNTWL08.DAT
- `rct2tt.scenery_small.psntwl09` [needs:rct2dat] dat=PSNTWL09.DAT
- `rct2tt.scenery_small.psntwl10` [needs:rct2dat] dat=PSNTWL10.DAT
- `rct2tt.scenery_small.psntwl11` [needs:rct2dat] dat=PSNTWL11.DAT
- `rct2tt.scenery_small.psntwl12` [needs:rct2dat] dat=PSNTWL12.DAT
- `rct2tt.scenery_small.psntwl13` [needs:rct2dat] dat=PSNTWL13.DAT
- `rct2tt.scenery_small.psntwl14` [needs:rct2dat] dat=PSNTWL14.DAT
- `rct2tt.scenery_small.psntwl15` [needs:rct2dat] dat=PSNTWL15.DAT
- `rct2tt.scenery_small.psntwl16` [needs:rct2dat] dat=PSNTWL16.DAT
- `rct2tt.scenery_small.psntwl17` [needs:rct2dat] dat=PSNTWL17.DAT
- `rct2tt.scenery_small.psntwl20` [needs:rct2dat] dat=PSNTWL20.DAT
- `rct2tt.scenery_small.psntwl21` [needs:rct2dat] dat=PSNTWL21.DAT
- `rct2tt.scenery_small.psntwl23` [needs:rct2dat] dat=PSNTWL23.DAT
- `rct2tt.scenery_small.psntwl24` [needs:rct2dat] dat=PSNTWL24.DAT
- `rct2tt.scenery_small.psntwl25` [needs:rct2dat] dat=PSNTWL25.DAT
- `rct2tt.scenery_small.psntwl29` [needs:rct2dat] dat=PSNTWL29.DAT
- `rct2tt.scenery_small.psntwl30` [needs:rct2dat] dat=PSNTWL30.DAT
- `rct2tt.scenery_small.psntwl31` [needs:rct2dat] dat=PSNTWL31.DAT
- `rct2tt.scenery_small.rcknrolr` [needs:rct2dat] dat=RCKNROLR.DAT
- `rct2tt.scenery_small.rdmeto03` [needs:rct2dat] dat=RDMETO03.DAT
- `rct2tt.scenery_small.rdmeto04` [needs:rct2dat] dat=RDMETO04.DAT
- `rct2tt.scenery_small.robnhood` [needs:rct2dat] dat=ROBNHOOD.DAT
- `rct2tt.scenery_small.rswatres` [needs:rct2dat] dat=RSWATRES.DAT
- `rct2tt.scenery_small.runway01` [needs:rct2dat] dat=RUNWAY01.DAT
- `rct2tt.scenery_small.runway02` [needs:rct2dat] dat=RUNWAY02.DAT
- `rct2tt.scenery_small.runway03` [needs:rct2dat] dat=RUNWAY03.DAT
- `rct2tt.scenery_small.runway04` [needs:rct2dat] dat=RUNWAY04.DAT
- `rct2tt.scenery_small.runway05` [needs:rct2dat] dat=RUNWAY05.DAT
- `rct2tt.scenery_small.runway06` [needs:rct2dat] dat=RUNWAY06.DAT
- `rct2tt.scenery_small.schnbost` [needs:rct2dat] dat=SCHNBOST.DAT
- `rct2tt.scenery_small.schnbouy` [needs:rct2dat] dat=SCHNBOUY.DAT
- `rct2tt.scenery_small.schncrsh` [needs:rct2dat] dat=SCHNCRSH.DAT
- `rct2tt.scenery_small.schndrum` [needs:rct2dat] dat=SCHNDRUM.DAT
- `rct2tt.scenery_small.schnpl01` [needs:rct2dat] dat=SCHNPL01.DAT
- `rct2tt.scenery_small.schnpl02` [needs:rct2dat] dat=SCHNPL02.DAT
- `rct2tt.scenery_small.schnpl03` [needs:rct2dat] dat=SCHNPL03.DAT
- `rct2tt.scenery_small.schnpl04` [needs:rct2dat] dat=SCHNPL04.DAT
- `rct2tt.scenery_small.schnpl05` [needs:rct2dat] dat=SCHNPL05.DAT
- `rct2tt.scenery_small.schnpl06` [needs:rct2dat] dat=SCHNPL06.DAT
- `rct2tt.scenery_small.schntnny` [needs:rct2dat] dat=SCHNTNNY.DAT
- `rct2tt.scenery_small.sdragfly` [needs:rct2dat] dat=SDRAGFLY.DAT
- `rct2tt.scenery_small.shwdfrst` [needs:rct2dat] dat=SHWDFRST.DAT
- `rct2tt.scenery_small.skeleto1` [needs:rct2dat] dat=SKELETO1.DAT
- `rct2tt.scenery_small.skeleto2` [needs:rct2dat] dat=SKELETO2.DAT
- `rct2tt.scenery_small.skeleto3` [needs:rct2dat] dat=SKELETO3.DAT
- `rct2tt.scenery_small.smallcpu` [needs:rct2dat] dat=SMALLCPU.DAT
- `rct2tt.scenery_small.smoksk01` [needs:rct2dat] dat=SMOKSK01.DAT
- `rct2tt.scenery_small.smoksk02` [needs:rct2dat] dat=SMOKSK02.DAT
- `rct2tt.scenery_small.smoksk03` [needs:rct2dat] dat=SMOKSK03.DAT
- `rct2tt.scenery_small.soupcrn2` [needs:rct2dat] dat=SOUPCRN2.DAT
- `rct2tt.scenery_small.soupcrnr` [needs:rct2dat] dat=SOUPCRNR.DAT
- `rct2tt.scenery_small.souped01` [needs:rct2dat] dat=SOUPED01.DAT
- `rct2tt.scenery_small.souped02` [needs:rct2dat] dat=SOUPED02.DAT
- `rct2tt.scenery_small.souptl01` [needs:rct2dat] dat=SOUPTL01.DAT
- `rct2tt.scenery_small.souptl02` [needs:rct2dat] dat=SOUPTL02.DAT
- `rct2tt.scenery_small.spacrang` [needs:rct2dat] dat=SPACRANG.DAT
- `rct2tt.scenery_small.spcshp01` [needs:rct2dat] dat=SPCSHP01.DAT
- `rct2tt.scenery_small.spcshp02` [needs:rct2dat] dat=SPCSHP02.DAT
- `rct2tt.scenery_small.spcshp03` [needs:rct2dat] dat=SPCSHP03.DAT
- `rct2tt.scenery_small.spcshp04` [needs:rct2dat] dat=SPCSHP04.DAT
- `rct2tt.scenery_small.spcshp05` [needs:rct2dat] dat=SPCSHP05.DAT
- `rct2tt.scenery_small.spcshp06` [needs:rct2dat] dat=SPCSHP06.DAT
- `rct2tt.scenery_small.spcshp07` [needs:rct2dat] dat=SPCSHP07.DAT
- `rct2tt.scenery_small.spcshp08` [needs:rct2dat] dat=SPCSHP08.DAT
- `rct2tt.scenery_small.spcshp09` [needs:rct2dat] dat=SPCSHP09.DAT
- `rct2tt.scenery_small.spcshp10` [needs:rct2dat] dat=SPCSHP10.DAT
- `rct2tt.scenery_small.spcshp11` [needs:rct2dat] dat=SPCSHP11.DAT
- `rct2tt.scenery_small.spcshp12` [needs:rct2dat] dat=SPCSHP12.DAT
- `rct2tt.scenery_small.speakr01` [needs:rct2dat] dat=SPEAKR01.DAT
- `rct2tt.scenery_small.speakr02` [needs:rct2dat] dat=SPEAKR02.DAT
- `rct2tt.scenery_small.spiktail` [needs:rct2dat] dat=SPIKTAIL.DAT
- `rct2tt.scenery_small.spterdac` [needs:rct2dat] dat=SPTERDAC.DAT
- `rct2tt.scenery_small.stgband1` [needs:rct2dat] dat=STGBAND1.DAT
- `rct2tt.scenery_small.stgband2` [needs:rct2dat] dat=STGBAND2.DAT
- `rct2tt.scenery_small.stgband3` [needs:rct2dat] dat=STGBAND3.DAT
- `rct2tt.scenery_small.stgband4` [needs:rct2dat] dat=STGBAND4.DAT
- `rct2tt.scenery_small.stmdran1` [needs:rct2dat] dat=STMDRAN1.DAT
- `rct2tt.scenery_small.stnesta1` [needs:rct2dat] dat=STNESTA1.DAT
- `rct2tt.scenery_small.stnesta2` [needs:rct2dat] dat=STNESTA2.DAT
- `rct2tt.scenery_small.stnesta3` [needs:rct2dat] dat=STNESTA3.DAT
- `rct2tt.scenery_small.stnesta4` [needs:rct2dat] dat=STNESTA4.DAT
- `rct2tt.scenery_small.stoolset` [needs:rct2dat] dat=STOOLSET.DAT
- `rct2tt.scenery_small.strictop` [needs:rct2dat] dat=STRICTOP.DAT
- `rct2tt.scenery_small.swamplt1` [needs:rct2dat] dat=SWAMPLT1.DAT
- `rct2tt.scenery_small.swamplt2` [needs:rct2dat] dat=SWAMPLT2.DAT
- `rct2tt.scenery_small.swamplt3` [needs:rct2dat] dat=SWAMPLT3.DAT
- `rct2tt.scenery_small.swamplt4` [needs:rct2dat] dat=SWAMPLT4.DAT
- `rct2tt.scenery_small.swamplt5` [needs:rct2dat] dat=SWAMPLT5.DAT
- `rct2tt.scenery_small.swamplt6` [needs:rct2dat] dat=SWAMPLT6.DAT
- `rct2tt.scenery_small.swamplt7` [needs:rct2dat] dat=SWAMPLT7.DAT
- `rct2tt.scenery_small.swamplt8` [needs:rct2dat] dat=SWAMPLT8.DAT
- `rct2tt.scenery_small.swamplt9` [needs:rct2dat] dat=SWAMPLT9.DAT
- `rct2tt.scenery_small.swrdstne` [needs:rct2dat] dat=SWRDSTNE.DAT
- `rct2tt.scenery_small.tarpit01` [needs:rct2dat] dat=TARPIT01.DAT
- `rct2tt.scenery_small.tarpit02` [needs:rct2dat] dat=TARPIT02.DAT
- `rct2tt.scenery_small.tarpit03` [needs:rct2dat] dat=TARPIT03.DAT
- `rct2tt.scenery_small.tarpit04` [needs:rct2dat] dat=TARPIT04.DAT
- `rct2tt.scenery_small.tarpit05` [needs:rct2dat] dat=TARPIT05.DAT
- `rct2tt.scenery_small.tarpit06` [needs:rct2dat] dat=TARPIT06.DAT
- `rct2tt.scenery_small.tarpit07` [needs:rct2dat] dat=TARPIT07.DAT
- `rct2tt.scenery_small.tarpit08` [needs:rct2dat] dat=TARPIT08.DAT
- `rct2tt.scenery_small.tarpit09` [needs:rct2dat] dat=TARPIT09.DAT
- `rct2tt.scenery_small.tarpit10` [needs:rct2dat] dat=TARPIT10.DAT
- `rct2tt.scenery_small.tarpit11` [needs:rct2dat] dat=TARPIT11.DAT
- `rct2tt.scenery_small.tarpit12` [needs:rct2dat] dat=TARPIT12.DAT
- `rct2tt.scenery_small.tarpit13` [needs:rct2dat] dat=TARPIT13.DAT
- `rct2tt.scenery_small.tarpit14` [needs:rct2dat] dat=TARPIT14.DAT
- `rct2tt.scenery_small.titansta` [needs:rct2dat] dat=TITANSTA.DAT
- `rct2tt.scenery_small.tyranrex` [needs:rct2dat] dat=TYRANREX.DAT
- `rct2tt.scenery_small.valkri01` [needs:rct2dat] dat=VALKRI01.DAT
- `rct2tt.scenery_small.valkri02` [needs:rct2dat] dat=VALKRI02.DAT
- `rct2tt.scenery_small.volcvent` [needs:rct2dat] dat=VOLCVENT.DAT
- `rct2tt.scenery_small.waveking` [needs:rct2dat] dat=WAVEKING.DAT
- `rct2tt.scenery_small.wdncart2` [needs:rct2dat] dat=WDNCART2.DAT
- `rct2tt.scenery_small.wepnrack` [needs:rct2dat] dat=WEPNRACK.DAT
- `rct2tt.scenery_small.whccolds` [needs:rct2dat] dat=WHCCOLDS.DAT
- `rct2tt.scenery_small.wiskybl1` [needs:rct2dat] dat=WISKYBL1.DAT
- `rct2tt.scenery_small.wiskybl2` [needs:rct2dat] dat=WISKYBL2.DAT
- `rct2tt.scenery_small.yewtreex` [needs:rct2dat] dat=YEWTREEX.DAT
- `rct2tt.scenery_small.zeusstat` [needs:rct2dat] dat=ZEUSSTAT.DAT
- `rct2ww.scenery_small.1x1atre2` [needs:rct2dat] dat=1X1ATRE2.DAT
- `rct2ww.scenery_small.1x1atree` [needs:rct2dat] dat=1X1ATREE.DAT
- `rct2ww.scenery_small.1x1brang` [needs:rct2dat] dat=1X1BRANG.DAT
- `rct2ww.scenery_small.1x1didge` [needs:rct2dat] dat=1X1DIDGE.DAT
- `rct2ww.scenery_small.1x1emuxx` [needs:rct2dat] dat=1X1EMUXX.DAT
- `rct2ww.scenery_small.1x1jugt2` [needs:rct2dat] dat=1X1JUGT2.DAT
- `rct2ww.scenery_small.1x1jugt3` [needs:rct2dat] dat=1X1JUGT3.DAT
- `rct2ww.scenery_small.1x1kanga` [needs:rct2dat] dat=1X1KANGA.DAT
- `rct2ww.scenery_small.1x1termm` [needs:rct2dat] dat=1X1TERMM.DAT
- `rct2ww.scenery_small.adpanda` [needs:rct2dat] dat=ADPANDA.DAT
- `rct2ww.scenery_small.antilopf` [needs:rct2dat] dat=ANTILOPF.DAT
- `rct2ww.scenery_small.antilopm` [needs:rct2dat] dat=ANTILOPM.DAT
- `rct2ww.scenery_small.antilopp` [needs:rct2dat] dat=ANTILOPP.DAT
- `rct2ww.scenery_small.babpanda` [needs:rct2dat] dat=BABPANDA.DAT
- `rct2ww.scenery_small.babyele` [needs:rct2dat] dat=BABYELE.DAT
- `rct2ww.scenery_small.balllan2` [needs:rct2dat] dat=BALLLAN2.DAT
- `rct2ww.scenery_small.balllant` [needs:rct2dat] dat=BALLLANT.DAT
- `rct2ww.scenery_small.bamboobs` [needs:rct2dat] dat=BAMBOOBS.DAT
- `rct2ww.scenery_small.bamboopl` [needs:rct2dat] dat=BAMBOOPL.DAT
- `rct2ww.scenery_small.bstatue1` [needs:rct2dat] dat=BSTATUE1.DAT
- `rct2ww.scenery_small.campfani` [needs:rct2dat] dat=CAMPFANI.DAT
- `rct2ww.scenery_small.conveyr1` [needs:rct2dat] dat=CONVEYR1.DAT
- `rct2ww.scenery_small.conveyr2` [needs:rct2dat] dat=CONVEYR2.DAT
- `rct2ww.scenery_small.conveyr3` [needs:rct2dat] dat=CONVEYR3.DAT
- `rct2ww.scenery_small.conveyr4` [needs:rct2dat] dat=CONVEYR4.DAT
- `rct2ww.scenery_small.conveyr5` [needs:rct2dat] dat=CONVEYR5.DAT
- `rct2ww.scenery_small.fishhole` [needs:rct2dat] dat=FISHHOLE.DAT
- `rct2ww.scenery_small.flamngo1` [needs:rct2dat] dat=FLAMNGO1.DAT
- `rct2ww.scenery_small.flamngo2` [needs:rct2dat] dat=FLAMNGO2.DAT
- `rct2ww.scenery_small.flamngo3` [needs:rct2dat] dat=FLAMNGO3.DAT
- `rct2ww.scenery_small.fountarc` [needs:rct2dat] dat=FOUNTARC.DAT
- `rct2ww.scenery_small.fountrow` [needs:rct2dat] dat=FOUNTROW.DAT
- `rct2ww.scenery_small.fstatue1` [needs:rct2dat] dat=FSTATUE1.DAT
- `rct2ww.scenery_small.g1dancer` [needs:rct2dat] dat=G1DANCER.DAT
- `rct2ww.scenery_small.g2dancer` [needs:rct2dat] dat=G2DANCER.DAT
- `rct2ww.scenery_small.icebarl1` [needs:rct2dat] dat=RSSB1H03.DAT
- `rct2ww.scenery_small.icebarl2` [needs:rct2dat] dat=RSSB1H04.DAT
- `rct2ww.scenery_small.icebarl3` [needs:rct2dat] dat=RSSB1H05.DAT
- `rct2ww.scenery_small.inflag01` [needs:rct2dat] dat=ISF1.DAT
- `rct2ww.scenery_small.inflag02` [needs:rct2dat] dat=ISF2.DAT
- `rct2ww.scenery_small.inflag03` [needs:rct2dat] dat=ISF3.DAT
- `rct2ww.scenery_small.inflag04` [needs:rct2dat] dat=ISF4.DAT
- `rct2ww.scenery_small.inflag05` [needs:rct2dat] dat=ISF5.DAT
- `rct2ww.scenery_small.inuit` [needs:rct2dat] dat=INUIT1.DAT
- `rct2ww.scenery_small.inuit2` [needs:rct2dat] dat=INUIT2.DAT
- `rct2ww.scenery_small.jachtree` [needs:rct2dat] dat=JACHTREE.DAT
- `rct2ww.scenery_small.japchblo` [needs:rct2dat] dat=JAPCHBLO.DAT
- `rct2ww.scenery_small.jappintr` [needs:rct2dat] dat=JAPPINTR.DAT
- `rct2ww.scenery_small.japsnotr` [needs:rct2dat] dat=JAPSNOTR.DAT
- `rct2ww.scenery_small.jpflag01` [needs:rct2dat] dat=JSF1.DAT
- `rct2ww.scenery_small.jpflag02` [needs:rct2dat] dat=JSF2.DAT
- `rct2ww.scenery_small.jpflag03` [needs:rct2dat] dat=JSF3.DAT
- `rct2ww.scenery_small.jpflag04` [needs:rct2dat] dat=JSF4.DAT
- `rct2ww.scenery_small.jpflag05` [needs:rct2dat] dat=JSF5.DAT
- `rct2ww.scenery_small.jpflag06` [needs:rct2dat] dat=JSF6.DAT
- `rct2ww.scenery_small.oilpump` [needs:rct2dat] dat=OILPUMP.DAT
- `rct2ww.scenery_small.oriegong` [needs:rct2dat] dat=ORIEGONG.DAT
- `rct2ww.scenery_small.pcg` [needs:rct2dat] dat=PCG.DAT
- `rct2ww.scenery_small.pco` [needs:rct2dat] dat=PCO.DAT
- `rct2ww.scenery_small.pipebase` [needs:rct2dat] dat=RSSB2H02.DAT
- `rct2ww.scenery_small.pipevent` [needs:rct2dat] dat=RSSB2H01.DAT
- `rct2ww.scenery_small.postbox` [needs:rct2dat] dat=POSTBOX.DAT
- `rct2ww.scenery_small.pst` [needs:rct2dat] dat=PST.DAT
- `rct2ww.scenery_small.ptj` [needs:rct2dat] dat=PTJ.DAT
- `rct2ww.scenery_small.ptk` [needs:rct2dat] dat=PTK.DAT
- `rct2ww.scenery_small.pva` [needs:rct2dat] dat=PVA.DAT
- `rct2ww.scenery_small.rbrick01` [needs:rct2dat] dat=RBRICK01.DAT
- `rct2ww.scenery_small.rbrick02` [needs:rct2dat] dat=RBRICK02.DAT
- `rct2ww.scenery_small.rbrick03` [needs:rct2dat] dat=RBRICK03.DAT
- `rct2ww.scenery_small.rbrick04` [needs:rct2dat] dat=RBRICK04.DAT
- `rct2ww.scenery_small.rbrick05` [needs:rct2dat] dat=RBRICK05.DAT
- `rct2ww.scenery_small.rbrick07` [needs:rct2dat] dat=RBRICK07.DAT
- `rct2ww.scenery_small.rbrick08` [needs:rct2dat] dat=RBRICK08.DAT
- `rct2ww.scenery_small.rcorr01` [needs:rct2dat] dat=RCORR01.DAT
- `rct2ww.scenery_small.rcorr02` [needs:rct2dat] dat=RCORR02.DAT
- `rct2ww.scenery_small.rcorr03` [needs:rct2dat] dat=RCORR03.DAT
- `rct2ww.scenery_small.rcorr04` [needs:rct2dat] dat=RCORR04.DAT
- `rct2ww.scenery_small.rcorr05` [needs:rct2dat] dat=RCORR05.DAT
- `rct2ww.scenery_small.rcorr07` [needs:rct2dat] dat=RCORR07.DAT
- `rct2ww.scenery_small.rcorr08` [needs:rct2dat] dat=RCORR08.DAT
- `rct2ww.scenery_small.rcorr09` [needs:rct2dat] dat=RCORR09.DAT
- `rct2ww.scenery_small.rcorr10` [needs:rct2dat] dat=RCORR10.DAT
- `rct2ww.scenery_small.rcorr11` [needs:rct2dat] dat=RCORR11.DAT
- `rct2ww.scenery_small.rdrab05` [needs:rct2dat] dat=RDRAB05.DAT
- `rct2ww.scenery_small.rdrab06` [needs:rct2dat] dat=RDRAB06.DAT
- `rct2ww.scenery_small.rdrab07` [needs:rct2dat] dat=RDRAB07.DAT
- `rct2ww.scenery_small.rdrab08` [needs:rct2dat] dat=RDRAB08.DAT
- `rct2ww.scenery_small.rdrab09` [needs:rct2dat] dat=RDRAB09.DAT
- `rct2ww.scenery_small.rdrab10` [needs:rct2dat] dat=RDRAB10.DAT
- `rct2ww.scenery_small.rdrab11` [needs:rct2dat] dat=RDRAB11.DAT
- `rct2ww.scenery_small.rdrab12` [needs:rct2dat] dat=RDRAB12.DAT
- `rct2ww.scenery_small.rdrab13` [needs:rct2dat] dat=RDRAB13.DAT
- `rct2ww.scenery_small.rdrab14` [needs:rct2dat] dat=RDRAB14.DAT
- `rct2ww.scenery_small.rgeorg01` [needs:rct2dat] dat=RGEORG01.DAT
- `rct2ww.scenery_small.rgeorg02` [needs:rct2dat] dat=RGEORG02.DAT
- `rct2ww.scenery_small.rgeorg03` [needs:rct2dat] dat=RGEORG03.DAT
- `rct2ww.scenery_small.rgeorg04` [needs:rct2dat] dat=RGEORG04.DAT
- `rct2ww.scenery_small.rgeorg05` [needs:rct2dat] dat=RGEORG05.DAT
- `rct2ww.scenery_small.rgeorg06` [needs:rct2dat] dat=RGEORG06.DAT
- `rct2ww.scenery_small.rgeorg07` [needs:rct2dat] dat=RGEORG07.DAT
- `rct2ww.scenery_small.rgeorg08` [needs:rct2dat] dat=RGEORG08.DAT
- `rct2ww.scenery_small.rgeorg09` [needs:rct2dat] dat=RGEORG09.DAT
- `rct2ww.scenery_small.rgeorg10` [needs:rct2dat] dat=RGEORG10.DAT
- `rct2ww.scenery_small.rgeorg11` [needs:rct2dat] dat=RGEORG11.DAT
- `rct2ww.scenery_small.rgeorg12` [needs:rct2dat] dat=RGEORG12.DAT
- `rct2ww.scenery_small.rkreml01` [needs:rct2dat] dat=RKREML01.DAT
- `rct2ww.scenery_small.rkreml02` [needs:rct2dat] dat=RKREML02.DAT
- `rct2ww.scenery_small.rkreml03` [needs:rct2dat] dat=RKREML03.DAT
- `rct2ww.scenery_small.rkreml04` [needs:rct2dat] dat=RKREML04.DAT
- `rct2ww.scenery_small.rkreml05` [needs:rct2dat] dat=RKREML05.DAT
- `rct2ww.scenery_small.rkreml06` [needs:rct2dat] dat=RKREML06.DAT
- `rct2ww.scenery_small.rkreml07` [needs:rct2dat] dat=RKREML07.DAT
- `rct2ww.scenery_small.rkreml11` [needs:rct2dat] dat=RKREML11.DAT
- `rct2ww.scenery_small.rlog01` [needs:rct2dat] dat=RLOG01.DAT
- `rct2ww.scenery_small.rlog02` [needs:rct2dat] dat=RLOG02.DAT
- `rct2ww.scenery_small.rlog03` [needs:rct2dat] dat=RLOG03.DAT
- `rct2ww.scenery_small.rlog04` [needs:rct2dat] dat=RLOG04.DAT
- `rct2ww.scenery_small.rlog05` [needs:rct2dat] dat=RLOG05.DAT
- `rct2ww.scenery_small.rmarble1` [needs:rct2dat] dat=RMARBLE1.DAT
- `rct2ww.scenery_small.rmarble2` [needs:rct2dat] dat=RMARBLE2.DAT
- `rct2ww.scenery_small.rmarble3` [needs:rct2dat] dat=RMARBLE3.DAT
- `rct2ww.scenery_small.rmarble4` [needs:rct2dat] dat=RMARBLE4.DAT
- `rct2ww.scenery_small.rmud01` [needs:rct2dat] dat=RMUD01.DAT
- `rct2ww.scenery_small.rmud02` [needs:rct2dat] dat=RMUD02.DAT
- `rct2ww.scenery_small.rmud03` [needs:rct2dat] dat=RMUD03.DAT
- `rct2ww.scenery_small.rmud05` [needs:rct2dat] dat=RMUD05.DAT
- `rct2ww.scenery_small.roofice1` [needs:rct2dat] dat=RICE01.DAT
- `rct2ww.scenery_small.roofice2` [needs:rct2dat] dat=RICE02.DAT
- `rct2ww.scenery_small.roofice3` [needs:rct2dat] dat=RICE03.DAT
- `rct2ww.scenery_small.roofice4` [needs:rct2dat] dat=RICE04.DAT
- `rct2ww.scenery_small.roofice5` [needs:rct2dat] dat=RICE05.DAT
- `rct2ww.scenery_small.roofice6` [needs:rct2dat] dat=RICE06.DAT
- `rct2ww.scenery_small.roofig01` [needs:rct2dat] dat=ROOFIG01.DAT
- `rct2ww.scenery_small.roofig02` [needs:rct2dat] dat=ROOFIG02.DAT
- `rct2ww.scenery_small.roofig03` [needs:rct2dat] dat=ROOFIG03.DAT
- `rct2ww.scenery_small.roofig04` [needs:rct2dat] dat=ROOFIG04.DAT
- `rct2ww.scenery_small.roofig06` [needs:rct2dat] dat=ROOFIG06.DAT
- `rct2ww.scenery_small.rshogi1` [needs:rct2dat] dat=RSHOGI1.DAT
- `rct2ww.scenery_small.rshogi2` [needs:rct2dat] dat=RSHOGI2.DAT
- `rct2ww.scenery_small.rshogi3` [needs:rct2dat] dat=RSHOGI3.DAT
- `rct2ww.scenery_small.rtudor01` [needs:rct2dat] dat=RTUDOR01.DAT
- `rct2ww.scenery_small.rtudor02` [needs:rct2dat] dat=RTUDOR02.DAT
- `rct2ww.scenery_small.rtudor03` [needs:rct2dat] dat=RTUDOR03.DAT
- `rct2ww.scenery_small.rwdaub01` [needs:rct2dat] dat=RWD01.DAT
- `rct2ww.scenery_small.rwdaub02` [needs:rct2dat] dat=RWD02.DAT
- `rct2ww.scenery_small.rwdaub03` [needs:rct2dat] dat=RWD03.DAT
- `rct2ww.scenery_small.sb1hspb1` [needs:rct2dat] dat=SB1HSPB1.DAT
- `rct2ww.scenery_small.sb1hspb2` [needs:rct2dat] dat=SB1HSPB2.DAT
- `rct2ww.scenery_small.sb1hspb3` [needs:rct2dat] dat=SB1HSPB3.DAT
- `rct2ww.scenery_small.sb2palm1` [needs:rct2dat] dat=SB2PALM1.DAT
- `rct2ww.scenery_small.sb2sky01` [needs:rct2dat] dat=SB2SKY01.DAT
- `rct2ww.scenery_small.sballoon` [needs:rct2dat] dat=SBALLOON.DAT
- `rct2ww.scenery_small.sbh1tepe` [needs:rct2dat] dat=SBH1TEPE.DAT
- `rct2ww.scenery_small.sbh1wgwh` [needs:rct2dat] dat=SBH1WGWH.DAT
- `rct2ww.scenery_small.sbh2shlt` [needs:rct2dat] dat=SBH2SHLT.DAT
- `rct2ww.scenery_small.sbh3cac1` [needs:rct2dat] dat=SBH3CAC1.DAT
- `rct2ww.scenery_small.sbh3cac2` [needs:rct2dat] dat=SBH3CAC2.DAT
- `rct2ww.scenery_small.sbh3cac3` [needs:rct2dat] dat=SBH3CAC3.DAT
- `rct2ww.scenery_small.sbh3cskl` [needs:rct2dat] dat=SBH3CSKL.DAT
- `rct2ww.scenery_small.sbh3oscr` [needs:rct2dat] dat=SBH3OSCR.DAT
- `rct2ww.scenery_small.sbh3plm1` [needs:rct2dat] dat=SBH3PLM1.DAT
- `rct2ww.scenery_small.sbh3plm2` [needs:rct2dat] dat=SBH3PLM2.DAT
- `rct2ww.scenery_small.sbh3plm3` [needs:rct2dat] dat=SBH3PLM3.DAT
- `rct2ww.scenery_small.sbh3rt66` [needs:rct2dat] dat=SBH3RT66.DAT
- `rct2ww.scenery_small.sbh4totm` [needs:rct2dat] dat=SBH4TOTM.DAT
- `rct2ww.scenery_small.sbskys01` [needs:rct2dat] dat=SBSKYS01.DAT
- `rct2ww.scenery_small.sbskys02` [needs:rct2dat] dat=SBSKYS02.DAT
- `rct2ww.scenery_small.sbskys03` [needs:rct2dat] dat=SBSKYS03.DAT
- `rct2ww.scenery_small.sbskys04` [needs:rct2dat] dat=SBSKYS04.DAT
- `rct2ww.scenery_small.sbskys05` [needs:rct2dat] dat=SBSKYS05.DAT
- `rct2ww.scenery_small.sbskys06` [needs:rct2dat] dat=SBSKYS06.DAT
- `rct2ww.scenery_small.sbskys07` [needs:rct2dat] dat=SBSKYS07.DAT
- `rct2ww.scenery_small.sbskys08` [needs:rct2dat] dat=SBSKYS08.DAT
- `rct2ww.scenery_small.sbskys09` [needs:rct2dat] dat=SBSKYS09.DAT
- `rct2ww.scenery_small.sbskys10` [needs:rct2dat] dat=SBSKYS10.DAT
- `rct2ww.scenery_small.sbskys11` [needs:rct2dat] dat=SBSKYS11.DAT
- `rct2ww.scenery_small.sbskys12` [needs:rct2dat] dat=SBSKYS12.DAT
- `rct2ww.scenery_small.sbskys13` [needs:rct2dat] dat=SBSKYS13.DAT
- `rct2ww.scenery_small.sbskys14` [needs:rct2dat] dat=SBSKYS14.DAT
- `rct2ww.scenery_small.sbskys15` [needs:rct2dat] dat=SBSKYS15.DAT
- `rct2ww.scenery_small.sbskys16` [needs:rct2dat] dat=SBSKYS16.DAT
- `rct2ww.scenery_small.sbskys17` [needs:rct2dat] dat=SBSKYS17.DAT
- `rct2ww.scenery_small.sbskys18` [needs:rct2dat] dat=SBSKYS18.DAT
- `rct2ww.scenery_small.sbwind01` [needs:rct2dat] dat=SBWIND01.DAT
- `rct2ww.scenery_small.sbwind02` [needs:rct2dat] dat=SBWIND02.DAT
- `rct2ww.scenery_small.sbwind03` [needs:rct2dat] dat=SBWIND03.DAT
- `rct2ww.scenery_small.sbwind04` [needs:rct2dat] dat=SBWIND04.DAT
- `rct2ww.scenery_small.sbwind05` [needs:rct2dat] dat=SBWIND05.DAT
- `rct2ww.scenery_small.sbwind06` [needs:rct2dat] dat=SBWIND06.DAT
- `rct2ww.scenery_small.sbwind07` [needs:rct2dat] dat=SBWIND07.DAT
- `rct2ww.scenery_small.sbwind08` [needs:rct2dat] dat=SBWIND08.DAT
- `rct2ww.scenery_small.sbwind09` [needs:rct2dat] dat=SBWIND09.DAT
- `rct2ww.scenery_small.sbwind10` [needs:rct2dat] dat=SBWIND10.DAT
- `rct2ww.scenery_small.sbwind11` [needs:rct2dat] dat=SBWIND11.DAT
- `rct2ww.scenery_small.sbwind12` [needs:rct2dat] dat=SBWIND12.DAT
- `rct2ww.scenery_small.sbwind13` [needs:rct2dat] dat=SBWIND13.DAT
- `rct2ww.scenery_small.sbwind14` [needs:rct2dat] dat=SBWIND14.DAT
- `rct2ww.scenery_small.sbwind15` [needs:rct2dat] dat=SBWIND15.DAT
- `rct2ww.scenery_small.sbwind16` [needs:rct2dat] dat=SBWIND16.DAT
- `rct2ww.scenery_small.sbwind17` [needs:rct2dat] dat=SBWIND17.DAT
- `rct2ww.scenery_small.sbwind18` [needs:rct2dat] dat=SBWIND18.DAT
- `rct2ww.scenery_small.sbwind19` [needs:rct2dat] dat=SBWIND19.DAT
- `rct2ww.scenery_small.sbwind20` [needs:rct2dat] dat=SBWIND20.DAT
- `rct2ww.scenery_small.sbwind21` [needs:rct2dat] dat=SBWIND21.DAT
- `rct2ww.scenery_small.sbwplm01` [needs:rct2dat] dat=SBWPLM01.DAT
- `rct2ww.scenery_small.sbwplm02` [needs:rct2dat] dat=SBWPLM02.DAT
- `rct2ww.scenery_small.sbwplm03` [needs:rct2dat] dat=SBWPLM03.DAT
- `rct2ww.scenery_small.sbwplm04` [needs:rct2dat] dat=SBWPLM04.DAT
- `rct2ww.scenery_small.sbwplm05` [needs:rct2dat] dat=SBWPLM05.DAT
- `rct2ww.scenery_small.sbwplm06` [needs:rct2dat] dat=SBWPLM06.DAT
- `rct2ww.scenery_small.sbwplm07` [needs:rct2dat] dat=SBWPLM07.DAT
- `rct2ww.scenery_small.sbwplm08` [needs:rct2dat] dat=SBWPLM08.DAT
- `rct2ww.scenery_small.smallgeo` [needs:rct2dat] dat=RSSB1H01.DAT
- `rct2ww.scenery_small.talllan1` [needs:rct2dat] dat=TALLLAN1.DAT
- `rct2ww.scenery_small.talllan2` [needs:rct2dat] dat=TALLLAN2.DAT
- `rct2ww.scenery_small.terrarmy` [needs:rct2dat] dat=TERRARMY.DAT
- `rct2ww.scenery_small.tjblock1` [needs:rct2dat] dat=TJBLOCK1.DAT
- `rct2ww.scenery_small.tjblock2` [needs:rct2dat] dat=TJBLOCK2.DAT
- `rct2ww.scenery_small.tjblock3` [needs:rct2dat] dat=TJBLOCK3.DAT
- `rct2ww.scenery_small.tnt1` [needs:rct2dat] dat=TNT1.DAT
- `rct2ww.scenery_small.tnt2` [needs:rct2dat] dat=TNT2.DAT
- `rct2ww.scenery_small.tnt3` [needs:rct2dat] dat=TNT3.DAT
- `rct2ww.scenery_small.tnt4` [needs:rct2dat] dat=TNT4.DAT
- `rct2ww.scenery_small.trckprt1` [needs:rct2dat] dat=TRCKPRT1.DAT
- `rct2ww.scenery_small.trckprt2` [needs:rct2dat] dat=TRCKPRT2.DAT
- `rct2ww.scenery_small.trckprt3` [needs:rct2dat] dat=TRCKPRT3.DAT
- `rct2ww.scenery_small.trckprt4` [needs:rct2dat] dat=TRCKPRT4.DAT
- `rct2ww.scenery_small.trckprt5` [needs:rct2dat] dat=TRCKPRT5.DAT
- `rct2ww.scenery_small.trckprt6` [needs:rct2dat] dat=TRCKPRT6.DAT
- `rct2ww.scenery_small.trckprt7` [needs:rct2dat] dat=TRCKPRT7.DAT
- `rct2ww.scenery_small.trckprt8` [needs:rct2dat] dat=TRCKPRT8.DAT
- `rct2ww.scenery_small.trckprt9` [needs:rct2dat] dat=TRCKPRT9.DAT
- `rct2ww.scenery_small.ukphone` [needs:rct2dat] dat=UKPHONE.DAT
- `rct2ww.scenery_small.vertpipe` [needs:rct2dat] dat=RSSB1H02.DAT
- `rct2ww.scenery_small.waborg01` [needs:rct2dat] dat=WABORG01.DAT
- `rct2ww.scenery_small.waborg02` [needs:rct2dat] dat=WABORG02.DAT
- `rct2ww.scenery_small.waborg03` [needs:rct2dat] dat=WABORG03.DAT
- `rct2ww.scenery_small.waborg04` [needs:rct2dat] dat=WABORG04.DAT
- `rct2ww.scenery_small.waborg05` [needs:rct2dat] dat=WABORG05.DAT
- `rct2ww.scenery_small.waborg06` [needs:rct2dat] dat=WABORG06.DAT
- `rct2ww.scenery_small.waborg07` [needs:rct2dat] dat=WABORG07.DAT
- `rct2ww.scenery_small.waborg08` [needs:rct2dat] dat=WABORG08.DAT
- `rct2ww.scenery_small.waztec01` [needs:rct2dat] dat=WAZTEC01.DAT
- `rct2ww.scenery_small.waztec02` [needs:rct2dat] dat=WAZTEC02.DAT
- `rct2ww.scenery_small.waztec03` [needs:rct2dat] dat=WAZTEC03.DAT
- `rct2ww.scenery_small.waztec04` [needs:rct2dat] dat=WAZTEC04.DAT
- `rct2ww.scenery_small.waztec05` [needs:rct2dat] dat=WAZTEC05.DAT
- `rct2ww.scenery_small.waztec06` [needs:rct2dat] dat=WAZTEC06.DAT
- `rct2ww.scenery_small.waztec07` [needs:rct2dat] dat=WAZTEC07.DAT
- `rct2ww.scenery_small.waztec08` [needs:rct2dat] dat=WAZTEC08.DAT
- `rct2ww.scenery_small.waztec09` [needs:rct2dat] dat=WAZTEC09.DAT
- `rct2ww.scenery_small.waztec10` [needs:rct2dat] dat=WAZTEC10.DAT
- `rct2ww.scenery_small.waztec11` [needs:rct2dat] dat=WAZTEC11.DAT
- `rct2ww.scenery_small.waztec12` [needs:rct2dat] dat=WAZTEC12.DAT
- `rct2ww.scenery_small.waztec13` [needs:rct2dat] dat=WAZTEC13.DAT
- `rct2ww.scenery_small.waztec14` [needs:rct2dat] dat=WAZTEC14.DAT
- `rct2ww.scenery_small.waztec15` [needs:rct2dat] dat=WAZTEC15.DAT
- `rct2ww.scenery_small.waztec16` [needs:rct2dat] dat=WAZTEC16.DAT
- `rct2ww.scenery_small.waztec17` [needs:rct2dat] dat=WAZTEC17.DAT
- `rct2ww.scenery_small.waztec18` [needs:rct2dat] dat=WAZTEC18.DAT
- `rct2ww.scenery_small.waztec19` [needs:rct2dat] dat=WAZTEC19.DAT
- `rct2ww.scenery_small.waztec20` [needs:rct2dat] dat=WAZTEC20.DAT
- `rct2ww.scenery_small.waztec21` [needs:rct2dat] dat=WAZTEC21.DAT
- `rct2ww.scenery_small.waztec22` [needs:rct2dat] dat=WAZTEC22.DAT
- `rct2ww.scenery_small.waztec23` [needs:rct2dat] dat=WAZTEC23.DAT
- `rct2ww.scenery_small.waztec24` [needs:rct2dat] dat=WAZTEC24.DAT
- `rct2ww.scenery_small.waztec25` [needs:rct2dat] dat=WAZTEC25.DAT
- `rct2ww.scenery_small.waztec26` [needs:rct2dat] dat=WAZTEC26.DAT
- `rct2ww.scenery_small.waztec27` [needs:rct2dat] dat=WAZTEC27.DAT
- `rct2ww.scenery_small.wcuzco01` [needs:rct2dat] dat=WCUZCO01.DAT
- `rct2ww.scenery_small.wcuzco02` [needs:rct2dat] dat=WCUZCO02.DAT
- `rct2ww.scenery_small.wcuzco03` [needs:rct2dat] dat=WCUZCO03.DAT
- `rct2ww.scenery_small.wcuzco04` [needs:rct2dat] dat=WCUZCO04.DAT
- `rct2ww.scenery_small.wcuzco05` [needs:rct2dat] dat=WCUZCO05.DAT
- `rct2ww.scenery_small.wcuzco06` [needs:rct2dat] dat=WCUZCO06.DAT
- `rct2ww.scenery_small.wcuzco07` [needs:rct2dat] dat=WCUZCO07.DAT
- `rct2ww.scenery_small.wcuzco08` [needs:rct2dat] dat=WCUZCO08.DAT
- `rct2ww.scenery_small.wcuzco09` [needs:rct2dat] dat=WCUZCO09.DAT
- `rct2ww.scenery_small.wcuzco10` [needs:rct2dat] dat=WCUZCO10.DAT
- `rct2ww.scenery_small.wcuzco11` [needs:rct2dat] dat=WCUZCO11.DAT
- `rct2ww.scenery_small.wcuzco12` [needs:rct2dat] dat=WCUZCO12.DAT
- `rct2ww.scenery_small.wcuzco13` [needs:rct2dat] dat=WCUZCO13.DAT
- `rct2ww.scenery_small.wcuzco14` [needs:rct2dat] dat=WCUZCO14.DAT
- `rct2ww.scenery_small.wcuzco15` [needs:rct2dat] dat=WCUZCO15.DAT
- `rct2ww.scenery_small.wcuzco16` [needs:rct2dat] dat=WCUZCO16.DAT
- `rct2ww.scenery_small.wcuzco17` [needs:rct2dat] dat=WCUZCO17.DAT
- `rct2ww.scenery_small.wcuzco18` [needs:rct2dat] dat=WCUZCO18.DAT
- `rct2ww.scenery_small.wcuzco19` [needs:rct2dat] dat=WCUZCO19.DAT
- `rct2ww.scenery_small.wcuzco20` [needs:rct2dat] dat=WCUZCO20.DAT
- `rct2ww.scenery_small.wcuzco21` [needs:rct2dat] dat=WCUZCO21.DAT
- `rct2ww.scenery_small.wcuzco22` [needs:rct2dat] dat=WCUZCO22.DAT
- `rct2ww.scenery_small.wcuzco23` [needs:rct2dat] dat=WCUZCO23.DAT
- `rct2ww.scenery_small.wcuzco24` [needs:rct2dat] dat=WCUZCO24.DAT
- `rct2ww.scenery_small.wcuzco25` [needs:rct2dat] dat=WCUZCO25.DAT
- `rct2ww.scenery_small.wcuzco26` [needs:rct2dat] dat=WCUZCO26.DAT
- `rct2ww.scenery_small.wcuzco27` [needs:rct2dat] dat=WCUZCO27.DAT
- `rct2ww.scenery_small.wcuzco28` [needs:rct2dat] dat=WCUZCO28.DAT
- `rct2ww.scenery_small.wcuzfoun` [needs:rct2dat] dat=WCUZFOUN.DAT
- `rct2ww.scenery_small.wdrab09` [needs:rct2dat] dat=WDRAB09.DAT
- `rct2ww.scenery_small.wdrab10` [needs:rct2dat] dat=WDRAB10.DAT
- `rct2ww.scenery_small.wdrab11` [needs:rct2dat] dat=WDRAB11.DAT
- `rct2ww.scenery_small.wdrab12` [needs:rct2dat] dat=WDRAB12.DAT
- `rct2ww.scenery_small.wdrab13` [needs:rct2dat] dat=WDRAB13.DAT
- `rct2ww.scenery_small.wgeorg07` [needs:rct2dat] dat=WGEORG07.DAT
- `rct2ww.scenery_small.wgeorg08` [needs:rct2dat] dat=WGEORG08.DAT
- `rct2ww.scenery_small.wgeorg09` [needs:rct2dat] dat=WGEORG09.DAT
- `rct2ww.scenery_small.wgeorg10` [needs:rct2dat] dat=WGEORG10.DAT
- `rct2ww.scenery_small.wgeorg11` [needs:rct2dat] dat=WGEORG11.DAT
- `rct2ww.scenery_small.wgeorg12` [needs:rct2dat] dat=WGEORG12.DAT
- `rct2ww.scenery_small.wkreml01` [needs:rct2dat] dat=WKREML01.DAT
- `rct2ww.scenery_small.wkreml02` [needs:rct2dat] dat=WKREML02.DAT
- `rct2ww.scenery_small.wkreml03` [needs:rct2dat] dat=WKREML03.DAT
- `rct2ww.scenery_small.wkreml04` [needs:rct2dat] dat=WKREML04.DAT
- `rct2ww.scenery_small.wkreml05` [needs:rct2dat] dat=WKREML05.DAT
- `rct2ww.scenery_small.wkreml06` [needs:rct2dat] dat=WKREML06.DAT
- `rct2ww.scenery_small.wmayan01` [needs:rct2dat] dat=WMAYAN01.DAT
- `rct2ww.scenery_small.wmayan02` [needs:rct2dat] dat=WMAYAN02.DAT
- `rct2ww.scenery_small.wmayan03` [needs:rct2dat] dat=WMAYAN03.DAT
- `rct2ww.scenery_small.wmayan04` [needs:rct2dat] dat=WMAYAN04.DAT
- `rct2ww.scenery_small.wmayan05` [needs:rct2dat] dat=WMAYAN05.DAT
- `rct2ww.scenery_small.wmayan06` [needs:rct2dat] dat=WMAYAN06.DAT
- `rct2ww.scenery_small.wmayan07` [needs:rct2dat] dat=WMAYAN07.DAT
- `rct2ww.scenery_small.wmayan08` [needs:rct2dat] dat=WMAYAN08.DAT
- `rct2ww.scenery_small.wmayan09` [needs:rct2dat] dat=WMAYAN09.DAT
- `rct2ww.scenery_small.wmayan10` [needs:rct2dat] dat=WMAYAN10.DAT
- `rct2ww.scenery_small.wmayan11` [needs:rct2dat] dat=WMAYAN11.DAT
- `rct2ww.scenery_small.wmayan12` [needs:rct2dat] dat=WMAYAN12.DAT
- `rct2ww.scenery_small.wmayan13` [needs:rct2dat] dat=WMAYAN13.DAT
- `rct2ww.scenery_small.wmayan14` [needs:rct2dat] dat=WMAYAN14.DAT
- `rct2ww.scenery_small.wmayan15` [needs:rct2dat] dat=WMAYAN15.DAT
- `rct2ww.scenery_small.wmayan16` [needs:rct2dat] dat=WMAYAN16.DAT
- `rct2ww.scenery_small.wmayan17` [needs:rct2dat] dat=WMAYAN17.DAT
- `rct2ww.scenery_small.wmayan18` [needs:rct2dat] dat=WMAYAN18.DAT
- `rct2ww.scenery_small.wmayan20` [needs:rct2dat] dat=WMAYAN20.DAT
- `rct2ww.scenery_small.wmayan21` [needs:rct2dat] dat=WMAYAN21.DAT
- `rct2ww.scenery_small.wmayan22` [needs:rct2dat] dat=WMAYAN22.DAT
- `rct2ww.scenery_small.wmayan23` [needs:rct2dat] dat=WMAYAN23.DAT
- `rct2ww.scenery_small.wmayan24` [needs:rct2dat] dat=WMAYAN24.DAT
- `rct2ww.scenery_small.wmayan25` [needs:rct2dat] dat=WMAYAN25.DAT
- `rct2ww.scenery_small.wmayan26` [needs:rct2dat] dat=WMAYAN26.DAT
- `rct2ww.scenery_small.wnauti01` [needs:rct2dat] dat=WNAUTI01.DAT
- `rct2ww.scenery_small.wnauti02` [needs:rct2dat] dat=WNAUTI02.DAT
- `rct2ww.scenery_small.wnauti03` [needs:rct2dat] dat=WNAUTI03.DAT
- `rct2ww.scenery_small.wnauti04` [needs:rct2dat] dat=WNAUTI04.DAT
- `rct2ww.scenery_small.wnauti05` [needs:rct2dat] dat=WNAUTI05.DAT
- `rct2ww.scenery_small.wropecor` [needs:rct2dat] dat=WROPECOR.DAT
- `rct2ww.scenery_small.wropeswa` [needs:rct2dat] dat=WROPESWA.DAT
- `rct2ww.scenery_small.wtudor12` [needs:rct2dat] dat=WTUDOR12.DAT
- `rct2ww.scenery_small.wtudor13` [needs:rct2dat] dat=WTUDOR13.DAT
- `rct2ww.scenery_small.wtudor14` [needs:rct2dat] dat=WTUDOR14.DAT
- `rct2ww.scenery_small.wtudor15` [needs:rct2dat] dat=WTUDOR15.DAT
- `rct2ww.scenery_small.wtudor16` [needs:rct2dat] dat=WTUDOR16.DAT
- `rct2ww.scenery_small.wtudor17` [needs:rct2dat] dat=WTUDOR17.DAT
- `rct2ww.scenery_small.wtudor18` [needs:rct2dat] dat=WTUDOR18.DAT

### scenery_wall (326)

- `official.scenery_wall.post_flipped` [needs:rct2dat] dat=WALLPOST.DAT
- `rct1.scenery_wall.playing_card_wall_1` [needs:csg]
- `rct1.scenery_wall.playing_card_wall_2` [needs:csg]
- `rct1.scenery_wall.roman_column_wall` [needs:csg]
- `rct1.scenery_wall.wooden_fence_brown` [needs:csg]
- `rct1.scenery_wall.wooden_fence_brown_gate` [needs:csg]
- `rct1.scenery_wall.wooden_fence_red` [needs:csg]
- `rct1.scenery_wall.wooden_fence_white` [needs:csg]
- `rct1aa.scenery_wall.glass_wall` [mixed:csg]
- `rct1aa.scenery_wall.wooden_post_wall_1` [needs:csg]
- `rct1aa.scenery_wall.wooden_post_wall_2` [needs:csg]
- `rct1ll.scenery_wall.medieval_wooden_fence` [needs:csg]
- `rct1ll.scenery_wall.wooden_fence_brown_snow` [needs:csg]
- `rct2.scenery_wall.wallbadm` [needs:rct2dat] dat=WALLBADM.DAT
- `rct2.scenery_wall.wallbb16` [mixed:rct2dat] dat=WALLBB16.DAT
- `rct2.scenery_wall.wallbb32` [mixed:rct2dat] dat=WALLBB32.DAT
- `rct2.scenery_wall.wallbb33` [needs:rct2dat] dat=WALLBB33.DAT
- `rct2.scenery_wall.wallbb34` [needs:rct2dat] dat=WALLBB34.DAT
- `rct2.scenery_wall.wallbb8` [mixed:rct2dat] dat=WALLBB8.DAT
- `rct2.scenery_wall.wallbr16` [mixed:rct2dat] dat=WALLBR16.DAT
- `rct2.scenery_wall.wallbr32` [mixed:rct2dat] dat=WALLBR32.DAT
- `rct2.scenery_wall.wallbr8` [mixed:rct2dat] dat=WALLBR8.DAT
- `rct2.scenery_wall.wallbrdr` [needs:rct2dat] dat=WALLBRDR.DAT
- `rct2.scenery_wall.wallbrwn` [needs:rct2dat] dat=WALLBRWN.DAT
- `rct2.scenery_wall.wallcb16` [mixed:rct2dat] dat=WALLCB16.DAT
- `rct2.scenery_wall.wallcb32` [mixed:rct2dat] dat=WALLCB32.DAT
- `rct2.scenery_wall.wallcb8` [mixed:rct2dat] dat=WALLCB8.DAT
- `rct2.scenery_wall.wallcbdr` [needs:rct2dat] dat=WALLCBDR.DAT
- `rct2.scenery_wall.wallcbpc` [needs:rct2dat] dat=WALLCBPC.DAT
- `rct2.scenery_wall.wallcbwn` [needs:rct2dat] dat=WALLCBWN.DAT
- `rct2.scenery_wall.wallcf16` [mixed:rct2dat] dat=WALLCF16.DAT
- `rct2.scenery_wall.wallcf32` [mixed:rct2dat] dat=WALLCF32.DAT
- `rct2.scenery_wall.wallcf8` [mixed:rct2dat] dat=WALLCF8.DAT
- `rct2.scenery_wall.wallcfar` [needs:rct2dat] dat=WALLCFAR.DAT
- `rct2.scenery_wall.wallcfdr` [needs:rct2dat] dat=WALLCFDR.DAT
- `rct2.scenery_wall.wallcfpc` [needs:rct2dat] dat=WALLCFPC.DAT
- `rct2.scenery_wall.wallcfwn` [needs:rct2dat] dat=WALLCFWN.DAT
- `rct2.scenery_wall.wallco16` [needs:rct2dat] dat=WALLCO16.DAT
- `rct2.scenery_wall.wallcw32` [needs:rct2dat] dat=WALLCW32.DAT
- `rct2.scenery_wall.wallcx32` [needs:rct2dat] dat=WALLCX32.DAT
- `rct2.scenery_wall.wallcy32` [needs:rct2dat] dat=WALLCY32.DAT
- `rct2.scenery_wall.wallcz32` [needs:rct2dat] dat=WALLCZ32.DAT
- `rct2.scenery_wall.wallgl16` [needs:rct2dat] dat=WALLGL16.DAT
- `rct2.scenery_wall.wallgl32` [needs:rct2dat] dat=WALLGL32.DAT
- `rct2.scenery_wall.wallgl8` [needs:rct2dat] dat=WALLGL8.DAT
- `rct2.scenery_wall.wallig16` [mixed:rct2dat] dat=WALLIG16.DAT
- `rct2.scenery_wall.wallig24` [needs:rct2dat] dat=WALLIG24.DAT
- `rct2.scenery_wall.walljb16` [needs:rct2dat] dat=WALLJB16.DAT
- `rct2.scenery_wall.walljn32` [needs:rct2dat] dat=WALLJN32.DAT
- `rct2.scenery_wall.walllt32` [needs:rct2dat] dat=WALLLT32.DAT
- `rct2.scenery_wall.wallmm16` [mixed:rct2dat] dat=WALLMM16.DAT
- `rct2.scenery_wall.wallmm17` [mixed:rct2dat] dat=WALLMM17.DAT
- `rct2.scenery_wall.wallmn32` [needs:rct2dat] dat=WALLMN32.DAT
- `rct2.scenery_wall.wallnt32` [needs:rct2dat] dat=WALLNT32.DAT
- `rct2.scenery_wall.wallnt33` [needs:rct2dat] dat=WALLNT33.DAT
- `rct2.scenery_wall.wallpg32` [needs:rct2dat] dat=WALLPG32.DAT
- `rct2.scenery_wall.wallpost` [needs:rct2dat] dat=WALLPOST.DAT
- `rct2.scenery_wall.wallpr32` [needs:rct2dat] dat=WALLPR32.DAT
- `rct2.scenery_wall.wallpr33` [needs:rct2dat] dat=WALLPR33.DAT
- `rct2.scenery_wall.wallpr34` [needs:rct2dat] dat=WALLPR34.DAT
- `rct2.scenery_wall.wallpr35` [needs:rct2dat] dat=WALLPR35.DAT
- `rct2.scenery_wall.wallrh32` [mixed:rct2dat] dat=WALLRH32.DAT
- `rct2.scenery_wall.wallrk32` [needs:rct2dat] dat=WALLRK32.DAT
- `rct2.scenery_wall.wallrs16` [mixed:rct2dat] dat=WALLRS16.DAT
- `rct2.scenery_wall.wallrs32` [mixed:rct2dat] dat=WALLRS32.DAT
- `rct2.scenery_wall.wallrs8` [mixed:rct2dat] dat=WALLRS8.DAT
- `rct2.scenery_wall.wallsc16` [needs:rct2dat] dat=WALLSC16.DAT
- `rct2.scenery_wall.wallsign` [needs:rct2dat] dat=WALLSIGN.DAT
- `rct2.scenery_wall.wallsk16` [needs:rct2dat] dat=WALLSK16.DAT
- `rct2.scenery_wall.wallsk32` [needs:rct2dat] dat=WALLSK32.DAT
- `rct2.scenery_wall.wallsp32` [needs:rct2dat] dat=WALLSP32.DAT
- `rct2.scenery_wall.wallst16` [mixed:rct2dat] dat=WALLST16.DAT
- `rct2.scenery_wall.wallst32` [mixed:rct2dat] dat=WALLST32.DAT
- `rct2.scenery_wall.wallst8` [mixed:rct2dat] dat=WALLST8.DAT
- `rct2.scenery_wall.wallstfn` [needs:rct2dat] dat=WALLSTFN.DAT
- `rct2.scenery_wall.wallstwn` [needs:rct2dat] dat=WALLSTWN.DAT
- `rct2.scenery_wall.walltn32` [mixed:rct2dat] dat=WALLTN32.DAT
- `rct2.scenery_wall.walltxgt` [needs:rct2dat] dat=WALLTXGT.DAT
- `rct2.scenery_wall.wallu132` [needs:rct2dat] dat=WALLU132.DAT
- `rct2.scenery_wall.wallu232` [needs:rct2dat] dat=WALLU232.DAT
- `rct2.scenery_wall.wallwd16` [mixed:rct2dat] dat=WALLWD16.DAT
- `rct2.scenery_wall.wallwd32` [mixed:rct2dat] dat=WALLWD32.DAT
- `rct2.scenery_wall.wallwd33` [needs:rct2dat] dat=WALLWD33.DAT
- `rct2.scenery_wall.wallwd8` [mixed:rct2dat] dat=WALLWD8.DAT
- `rct2.scenery_wall.wallwdps` [needs:rct2dat] dat=WALLWDPS.DAT
- `rct2.scenery_wall.wallwf32` [needs:rct2dat] dat=WALLWF32.DAT
- `rct2.scenery_wall.wbr1` [needs:rct2dat] dat=WBR1.DAT
- `rct2.scenery_wall.wbr1a` [mixed:rct2dat] dat=WBR1A.DAT
- `rct2.scenery_wall.wbr2` [needs:rct2dat] dat=WBR2.DAT
- `rct2.scenery_wall.wbr2a` [mixed:rct2dat] dat=WBR2A.DAT
- `rct2.scenery_wall.wbr3` [needs:rct2dat] dat=WBR3.DAT
- `rct2.scenery_wall.wbrg` [needs:rct2dat] dat=WBRG.DAT
- `rct2.scenery_wall.wbw` [needs:rct2dat] dat=WBW.DAT
- `rct2.scenery_wall.wc1` [needs:rct2dat] dat=WC1.DAT
- `rct2.scenery_wall.wc10` [needs:rct2dat] dat=WC10.DAT
- `rct2.scenery_wall.wc11` [needs:rct2dat] dat=WC11.DAT
- `rct2.scenery_wall.wc12` [needs:rct2dat] dat=WC12.DAT
- `rct2.scenery_wall.wc13` [needs:rct2dat] dat=WC13.DAT
- `rct2.scenery_wall.wc14` [needs:rct2dat] dat=WC14.DAT
- `rct2.scenery_wall.wc15` [mixed:rct2dat] dat=WC15.DAT
- `rct2.scenery_wall.wc16` [needs:rct2dat] dat=WC16.DAT
- `rct2.scenery_wall.wc17` [needs:rct2dat] dat=WC17.DAT
- `rct2.scenery_wall.wc18` [needs:rct2dat] dat=WC18.DAT
- `rct2.scenery_wall.wc2` [needs:rct2dat] dat=WC2.DAT
- `rct2.scenery_wall.wc3` [needs:rct2dat] dat=WC3.DAT
- `rct2.scenery_wall.wc4` [needs:rct2dat] dat=WC4.DAT
- `rct2.scenery_wall.wc5` [needs:rct2dat] dat=WC5.DAT
- `rct2.scenery_wall.wc6` [needs:rct2dat] dat=WC6.DAT
- `rct2.scenery_wall.wc7` [needs:rct2dat] dat=WC7.DAT
- `rct2.scenery_wall.wc8` [needs:rct2dat] dat=WC8.DAT
- `rct2.scenery_wall.wc9` [needs:rct2dat] dat=WC9.DAT
- `rct2.scenery_wall.wch` [needs:rct2dat] dat=WCH.DAT
- `rct2.scenery_wall.wchg` [needs:rct2dat] dat=WCHG.DAT
- `rct2.scenery_wall.wcw1` [needs:rct2dat] dat=WCW1.DAT
- `rct2.scenery_wall.wcw2` [needs:rct2dat] dat=WCW2.DAT
- `rct2.scenery_wall.wew` [needs:rct2dat] dat=WEW.DAT
- `rct2.scenery_wall.wfw1` [needs:rct2dat] dat=WFW1.DAT
- `rct2.scenery_wall.wfwg` [needs:rct2dat] dat=WFWG.DAT
- `rct2.scenery_wall.wgw2` [needs:rct2dat] dat=WGW2.DAT
- `rct2.scenery_wall.whg` [needs:rct2dat] dat=WHG.DAT
- `rct2.scenery_wall.whgg` [needs:rct2dat] dat=WHGG.DAT
- `rct2.scenery_wall.wjf` [needs:rct2dat] dat=WJF.DAT
- `rct2.scenery_wall.wmf` [needs:rct2dat] dat=WMF.DAT
- `rct2.scenery_wall.wmfg` [needs:rct2dat] dat=WMFG.DAT
- `rct2.scenery_wall.wmw` [needs:rct2dat] dat=WMW.DAT
- `rct2.scenery_wall.wmww` [needs:rct2dat] dat=WMWW.DAT
- `rct2.scenery_wall.wpf` [needs:rct2dat] dat=WPF.DAT
- `rct2.scenery_wall.wpfg` [needs:rct2dat] dat=WPFG.DAT
- `rct2.scenery_wall.wpw1` [needs:rct2dat] dat=WPW1.DAT
- `rct2.scenery_wall.wpw2` [needs:rct2dat] dat=WPW2.DAT
- `rct2.scenery_wall.wpw3` [needs:rct2dat] dat=WPW3.DAT
- `rct2.scenery_wall.wrw` [needs:rct2dat] dat=WRW.DAT
- `rct2.scenery_wall.wrwa` [needs:rct2dat] dat=WRWA.DAT
- `rct2.scenery_wall.wsw` [needs:rct2dat] dat=WSW.DAT
- `rct2.scenery_wall.wsw1` [needs:rct2dat] dat=WSW1.DAT
- `rct2.scenery_wall.wsw2` [needs:rct2dat] dat=WSW2.DAT
- `rct2.scenery_wall.wswg` [needs:rct2dat] dat=WSWG.DAT
- `rct2.scenery_wall.wwtw` [needs:rct2dat] dat=WWTW.DAT
- `rct2.scenery_wall.wwtwa` [needs:rct2dat] dat=WWTWA.DAT
- `rct2tt.scenery_wall.jailxx19` [needs:rct2dat] dat=JAILXX19.DAT
- `rct2tt.scenery_wall.mspkwa01` [needs:rct2dat] dat=MSPKWA01.DAT
- `rct2ww.scenery_wall.tmarch1` [needs:rct2dat] dat=TMARCH1.DAT,TMARCH2.DAT
- `rct2ww.scenery_wall.tmarch2` [needs:rct2dat] dat=TMARCH1.DAT,TMARCH2.DAT
- `rct2ww.scenery_wall.w2corr01` [needs:rct2dat] dat=W2CORR01.DAT
- `rct2ww.scenery_wall.w2corr02` [needs:rct2dat] dat=W2CORR02.DAT
- `rct2ww.scenery_wall.w2corr03` [needs:rct2dat] dat=W2CORR03.DAT
- `rct2ww.scenery_wall.w2corr04` [needs:rct2dat] dat=W2CORR04.DAT
- `rct2ww.scenery_wall.w2corr05` [needs:rct2dat] dat=W2CORR05.DAT
- `rct2ww.scenery_wall.w2corr06` [needs:rct2dat] dat=W2CORR06.DAT
- `rct2ww.scenery_wall.w2corr07` [needs:rct2dat] dat=W2CORR07.DAT
- `rct2ww.scenery_wall.w2corr08` [needs:rct2dat] dat=W2CORR08.DAT
- `rct2ww.scenery_wall.w3corr01` [needs:rct2dat] dat=W3CORR01.DAT
- `rct2ww.scenery_wall.w3corr02` [needs:rct2dat] dat=W3CORR02.DAT
- `rct2ww.scenery_wall.w3corr03` [needs:rct2dat] dat=W3CORR03.DAT
- `rct2ww.scenery_wall.w3corr04` [needs:rct2dat] dat=W3CORR04.DAT
- `rct2ww.scenery_wall.w3corr05` [needs:rct2dat] dat=W3CORR05.DAT
- `rct2ww.scenery_wall.w3corr06` [needs:rct2dat] dat=W3CORR06.DAT
- `rct2ww.scenery_wall.w3corr07` [needs:rct2dat] dat=W3CORR07.DAT
- `rct2ww.scenery_wall.w3corr08` [needs:rct2dat] dat=W3CORR08.DAT
- `rct2ww.scenery_wall.wallic10` [needs:rct2dat] dat=WICE10.DAT
- `rct2ww.scenery_wall.wallice1` [needs:rct2dat] dat=WICE01.DAT
- `rct2ww.scenery_wall.wallice2` [needs:rct2dat] dat=WICE02.DAT
- `rct2ww.scenery_wall.wallice3` [needs:rct2dat] dat=WICE03.DAT
- `rct2ww.scenery_wall.wallice4` [needs:rct2dat] dat=WICE04.DAT
- `rct2ww.scenery_wall.wallice5` [needs:rct2dat] dat=WICE05.DAT
- `rct2ww.scenery_wall.wallice6` [needs:rct2dat] dat=WICE06.DAT
- `rct2ww.scenery_wall.wallice7` [needs:rct2dat] dat=WICE07.DAT
- `rct2ww.scenery_wall.wallice8` [needs:rct2dat] dat=WICE08.DAT
- `rct2ww.scenery_wall.wallice9` [needs:rct2dat] dat=WICE09.DAT
- `rct2ww.scenery_wall.wallna01` [needs:rct2dat] dat=WALLNA01.DAT
- `rct2ww.scenery_wall.wallna02` [needs:rct2dat] dat=WALLNA02.DAT
- `rct2ww.scenery_wall.wallna03` [needs:rct2dat] dat=WALLNA03.DAT
- `rct2ww.scenery_wall.wallna04` [needs:rct2dat] dat=WALLNA04.DAT
- `rct2ww.scenery_wall.wallna05` [needs:rct2dat] dat=WALLNA05.DAT
- `rct2ww.scenery_wall.wallna06` [needs:rct2dat] dat=WALLNA06.DAT
- `rct2ww.scenery_wall.wallna07` [needs:rct2dat] dat=WALLNA07.DAT
- `rct2ww.scenery_wall.wallna08` [needs:rct2dat] dat=WALLNA08.DAT
- `rct2ww.scenery_wall.wallna09` [needs:rct2dat] dat=WALLNA09.DAT
- `rct2ww.scenery_wall.wallna10` [needs:rct2dat] dat=WALLNA10.DAT
- `rct2ww.scenery_wall.wallna11` [needs:rct2dat] dat=WALLNA11.DAT
- `rct2ww.scenery_wall.wallna12` [needs:rct2dat] dat=WALLNA12.DAT
- `rct2ww.scenery_wall.wallna13` [needs:rct2dat] dat=WALLNA13.DAT
- `rct2ww.scenery_wall.wallna14` [needs:rct2dat] dat=WALLNA14.DAT
- `rct2ww.scenery_wall.wbambo01` [needs:rct2dat] dat=WBAMBO01.DAT
- `rct2ww.scenery_wall.wbambo02` [needs:rct2dat] dat=WBAMBO02.DAT
- `rct2ww.scenery_wall.wbambo03` [needs:rct2dat] dat=WBAMBO03.DAT
- `rct2ww.scenery_wall.wbambo04` [needs:rct2dat] dat=WBAMBO04.DAT
- `rct2ww.scenery_wall.wbambo05` [needs:rct2dat] dat=WBAMBO05.DAT
- `rct2ww.scenery_wall.wbambo11` [needs:rct2dat] dat=WBAMBO11.DAT
- `rct2ww.scenery_wall.wbambo12` [needs:rct2dat] dat=WBAMBO12.DAT
- `rct2ww.scenery_wall.wbambo13` [needs:rct2dat] dat=WBAMBO13.DAT
- `rct2ww.scenery_wall.wbambo14` [needs:rct2dat] dat=WBAMBO14.DAT
- `rct2ww.scenery_wall.wbambo15` [needs:rct2dat] dat=WBAMBO15.DAT
- `rct2ww.scenery_wall.wbambo21` [needs:rct2dat] dat=WBAMBO21.DAT
- `rct2ww.scenery_wall.wbambopc` [needs:rct2dat] dat=WBAMBOPC.DAT
- `rct2ww.scenery_wall.wbrick01` [needs:rct2dat] dat=WBRICK01.DAT
- `rct2ww.scenery_wall.wbrick02` [needs:rct2dat] dat=WBRICK02.DAT
- `rct2ww.scenery_wall.wbrick03` [needs:rct2dat] dat=WBRICK03.DAT
- `rct2ww.scenery_wall.wbrick04` [needs:rct2dat] dat=WBRICK04.DAT
- `rct2ww.scenery_wall.wbrick05` [needs:rct2dat] dat=WBRICK05.DAT
- `rct2ww.scenery_wall.wbrick08` [needs:rct2dat] dat=WBRICK08.DAT
- `rct2ww.scenery_wall.wbrick11` [needs:rct2dat] dat=WBRICK11.DAT
- `rct2ww.scenery_wall.wbrick12` [needs:rct2dat] dat=WBRICK12.DAT
- `rct2ww.scenery_wall.wbrick13` [needs:rct2dat] dat=WBRICK13.DAT
- `rct2ww.scenery_wall.wcorr01` [needs:rct2dat] dat=WCORR01.DAT
- `rct2ww.scenery_wall.wcorr02` [needs:rct2dat] dat=WCORR02.DAT
- `rct2ww.scenery_wall.wcorr03` [needs:rct2dat] dat=WCORR03.DAT
- `rct2ww.scenery_wall.wcorr04` [needs:rct2dat] dat=WCORR04.DAT
- `rct2ww.scenery_wall.wcorr05` [needs:rct2dat] dat=WCORR05.DAT
- `rct2ww.scenery_wall.wcorr06` [needs:rct2dat] dat=WCORR06.DAT
- `rct2ww.scenery_wall.wcorr07` [needs:rct2dat] dat=WCORR07.DAT
- `rct2ww.scenery_wall.wcorr08` [needs:rct2dat] dat=WCORR08.DAT
- `rct2ww.scenery_wall.wcorr09` [needs:rct2dat] dat=WCORR09.DAT
- `rct2ww.scenery_wall.wcorr10` [needs:rct2dat] dat=WCORR10.DAT
- `rct2ww.scenery_wall.wcorr11` [needs:rct2dat] dat=WCORR11.DAT
- `rct2ww.scenery_wall.wcorr12` [needs:rct2dat] dat=WCORR12.DAT
- `rct2ww.scenery_wall.wcorr13` [needs:rct2dat] dat=WCORR13.DAT
- `rct2ww.scenery_wall.wcorr14` [needs:rct2dat] dat=WCORR14.DAT
- `rct2ww.scenery_wall.wcorr15` [needs:rct2dat] dat=WCORR15.DAT
- `rct2ww.scenery_wall.wcorr16` [needs:rct2dat] dat=WCORR16.DAT
- `rct2ww.scenery_wall.wdrab01` [needs:rct2dat] dat=WDRAB01.DAT
- `rct2ww.scenery_wall.wdrab02` [needs:rct2dat] dat=WDRAB02.DAT
- `rct2ww.scenery_wall.wdrab03` [needs:rct2dat] dat=WDRAB03.DAT
- `rct2ww.scenery_wall.wdrab04` [needs:rct2dat] dat=WDRAB04.DAT
- `rct2ww.scenery_wall.wdrab05` [needs:rct2dat] dat=WDRAB05.DAT
- `rct2ww.scenery_wall.wdrab06` [needs:rct2dat] dat=WDRAB06.DAT
- `rct2ww.scenery_wall.wdrab07` [needs:rct2dat] dat=WDRAB07.DAT
- `rct2ww.scenery_wall.wdrab08` [needs:rct2dat] dat=WDRAB08.DAT
- `rct2ww.scenery_wall.wgeorg01` [needs:rct2dat] dat=WGEORG01.DAT
- `rct2ww.scenery_wall.wgeorg02` [needs:rct2dat] dat=WGEORG02.DAT
- `rct2ww.scenery_wall.wgeorg03` [needs:rct2dat] dat=WGEORG03.DAT
- `rct2ww.scenery_wall.wgeorg04` [needs:rct2dat] dat=WGEORG04.DAT
- `rct2ww.scenery_wall.wgeorg05` [needs:rct2dat] dat=WGEORG05.DAT
- `rct2ww.scenery_wall.wgeorg06` [needs:rct2dat] dat=WGEORG06.DAT
- `rct2ww.scenery_wall.wgwoc1` [needs:rct2dat] dat=WGWOC1.DAT
- `rct2ww.scenery_wall.wgwoc2` [needs:rct2dat] dat=WGWOC2.DAT
- `rct2ww.scenery_wall.wgwoc3` [needs:rct2dat] dat=WGWOC3.DAT
- `rct2ww.scenery_wall.wigloo1` [needs:rct2dat] dat=WIGLOO1.DAT
- `rct2ww.scenery_wall.wigloo2` [needs:rct2dat] dat=WIGLOO2.DAT
- `rct2ww.scenery_wall.wkreml07` [needs:rct2dat] dat=WKREML07.DAT
- `rct2ww.scenery_wall.wkreml08` [needs:rct2dat] dat=WKREML08.DAT
- `rct2ww.scenery_wall.wkreml09` [needs:rct2dat] dat=WKREML09.DAT
- `rct2ww.scenery_wall.wkreml10` [needs:rct2dat] dat=WKREML10.DAT
- `rct2ww.scenery_wall.wlog01` [needs:rct2dat] dat=WLOG01.DAT
- `rct2ww.scenery_wall.wlog02` [needs:rct2dat] dat=WLOG02.DAT
- `rct2ww.scenery_wall.wlog03` [needs:rct2dat] dat=WLOG03.DAT
- `rct2ww.scenery_wall.wlog04` [needs:rct2dat] dat=WLOG04.DAT
- `rct2ww.scenery_wall.wlog05` [needs:rct2dat] dat=WLOG05.DAT
- `rct2ww.scenery_wall.wlog06` [needs:rct2dat] dat=WLOG06.DAT
- `rct2ww.scenery_wall.wmarble1` [needs:rct2dat] dat=WMARBLE1.DAT
- `rct2ww.scenery_wall.wmarble2` [needs:rct2dat] dat=WMARBLE2.DAT
- `rct2ww.scenery_wall.wmarble3` [needs:rct2dat] dat=WMARBLE3.DAT
- `rct2ww.scenery_wall.wmarble4` [needs:rct2dat] dat=WMARBLE4.DAT
- `rct2ww.scenery_wall.wmarble5` [needs:rct2dat] dat=WMARBLE5.DAT
- `rct2ww.scenery_wall.wmarble6` [needs:rct2dat] dat=WMARBLE6.DAT
- `rct2ww.scenery_wall.wmarbpl1` [needs:rct2dat] dat=WMARBPL1.DAT
- `rct2ww.scenery_wall.wmarbpl2` [needs:rct2dat] dat=WMARBPL2.DAT
- `rct2ww.scenery_wall.wmarbpl3` [needs:rct2dat] dat=WMARBPL3.DAT
- `rct2ww.scenery_wall.wmarbpl4` [needs:rct2dat] dat=WMARBPL4.DAT
- `rct2ww.scenery_wall.wmarbpl5` [needs:rct2dat] dat=WMARBPL5.DAT
- `rct2ww.scenery_wall.wmarbpl6` [needs:rct2dat] dat=WMARBPL6.DAT
- `rct2ww.scenery_wall.wmarbpl7` [needs:rct2dat] dat=WMARBPL7.DAT
- `rct2ww.scenery_wall.wmud01` [needs:rct2dat] dat=WMUD01.DAT
- `rct2ww.scenery_wall.wmud02` [needs:rct2dat] dat=WMUD02.DAT
- `rct2ww.scenery_wall.wmud03` [needs:rct2dat] dat=WMUD03.DAT
- `rct2ww.scenery_wall.wmud04` [needs:rct2dat] dat=WMUD04.DAT
- `rct2ww.scenery_wall.wmud05` [needs:rct2dat] dat=WMUD05.DAT
- `rct2ww.scenery_wall.wmud06` [needs:rct2dat] dat=WMUD06.DAT
- `rct2ww.scenery_wall.wmud07` [needs:rct2dat] dat=WMUD07.DAT
- `rct2ww.scenery_wall.wmud08` [needs:rct2dat] dat=WMUD08.DAT
- `rct2ww.scenery_wall.wpalm01` [needs:rct2dat] dat=WPALM01.DAT
- `rct2ww.scenery_wall.wpalm02` [needs:rct2dat] dat=WPALM02.DAT
- `rct2ww.scenery_wall.wpalm03` [needs:rct2dat] dat=WPALM03.DAT
- `rct2ww.scenery_wall.wpalm04` [needs:rct2dat] dat=WPALM04.DAT
- `rct2ww.scenery_wall.wpalm05` [needs:rct2dat] dat=WPALM05.DAT
- `rct2ww.scenery_wall.wshogi01` [needs:rct2dat] dat=WSHOGI01.DAT
- `rct2ww.scenery_wall.wshogi02` [needs:rct2dat] dat=WSHOGI02.DAT
- `rct2ww.scenery_wall.wshogi03` [needs:rct2dat] dat=WSHOGI03.DAT
- `rct2ww.scenery_wall.wshogi04` [needs:rct2dat] dat=WSHOGI04.DAT
- `rct2ww.scenery_wall.wshogi05` [needs:rct2dat] dat=WSHOGI05.DAT
- `rct2ww.scenery_wall.wshogi06` [needs:rct2dat] dat=WSHOGI06.DAT
- `rct2ww.scenery_wall.wshogi07` [needs:rct2dat] dat=WSHOGI07.DAT
- `rct2ww.scenery_wall.wshogi08` [needs:rct2dat] dat=WSHOGI08.DAT
- `rct2ww.scenery_wall.wshogi09` [needs:rct2dat] dat=WSHOGI09.DAT
- `rct2ww.scenery_wall.wshogi10` [needs:rct2dat] dat=WSHOGI10.DAT
- `rct2ww.scenery_wall.wshogi11` [needs:rct2dat] dat=WSHOGI11.DAT
- `rct2ww.scenery_wall.wshogi12` [needs:rct2dat] dat=WSHOGI12.DAT
- `rct2ww.scenery_wall.wshogi13` [needs:rct2dat] dat=WSHOGI13.DAT
- `rct2ww.scenery_wall.wshogi14` [needs:rct2dat] dat=WSHOGI14.DAT
- `rct2ww.scenery_wall.wshogi15` [needs:rct2dat] dat=WSHOGI15.DAT
- `rct2ww.scenery_wall.wshogi16` [needs:rct2dat] dat=WSHOGI16.DAT
- `rct2ww.scenery_wall.wshogi17` [needs:rct2dat] dat=WSHOGI17.DAT
- `rct2ww.scenery_wall.wskysc01` [needs:rct2dat] dat=WSKYSC01.DAT
- `rct2ww.scenery_wall.wskysc02` [needs:rct2dat] dat=WSKYSC02.DAT
- `rct2ww.scenery_wall.wskysc03` [needs:rct2dat] dat=WSKYSC03.DAT
- `rct2ww.scenery_wall.wskysc04` [needs:rct2dat] dat=WSKYSC04.DAT
- `rct2ww.scenery_wall.wskysc05` [needs:rct2dat] dat=WSKYSC05.DAT
- `rct2ww.scenery_wall.wskysc06` [needs:rct2dat] dat=WSKYSC06.DAT
- `rct2ww.scenery_wall.wskysc07` [needs:rct2dat] dat=WSKYSC07.DAT
- `rct2ww.scenery_wall.wskysc08` [needs:rct2dat] dat=WSKYSC08.DAT
- `rct2ww.scenery_wall.wskysc09` [needs:rct2dat] dat=WSKYSC09.DAT
- `rct2ww.scenery_wall.wskysc10` [needs:rct2dat] dat=WSKYSC10.DAT
- `rct2ww.scenery_wall.wskysc11` [needs:rct2dat] dat=WSKYSC11.DAT
- `rct2ww.scenery_wall.wskysc12` [needs:rct2dat] dat=WSKYSC12.DAT
- `rct2ww.scenery_wall.wtudor01` [needs:rct2dat] dat=WTUDOR01.DAT
- `rct2ww.scenery_wall.wtudor02` [needs:rct2dat] dat=WTUDOR02.DAT
- `rct2ww.scenery_wall.wtudor03` [needs:rct2dat] dat=WTUDOR03.DAT,WTUDOR04.DAT
- `rct2ww.scenery_wall.wtudor04` [needs:rct2dat] dat=WTUDOR03.DAT,WTUDOR04.DAT
- `rct2ww.scenery_wall.wtudor05` [needs:rct2dat] dat=WTUDOR05.DAT
- `rct2ww.scenery_wall.wtudor06` [needs:rct2dat] dat=WTUDOR06.DAT
- `rct2ww.scenery_wall.wtudor07` [needs:rct2dat] dat=WTUDOR07.DAT
- `rct2ww.scenery_wall.wtudor08` [needs:rct2dat] dat=WTUDOR08.DAT
- `rct2ww.scenery_wall.wtudor09` [needs:rct2dat] dat=WTUDOR09.DAT
- `rct2ww.scenery_wall.wtudor10` [needs:rct2dat] dat=WTUDOR10.DAT
- `rct2ww.scenery_wall.wtudor11` [needs:rct2dat] dat=WTUDOR11.DAT
- `rct2ww.scenery_wall.wwdaub01` [needs:rct2dat] dat=WALLWD01.DAT
- `rct2ww.scenery_wall.wwdaub02` [needs:rct2dat] dat=WALLWD02.DAT
- `rct2ww.scenery_wall.wwdaub03` [needs:rct2dat] dat=WALLWD03.DAT
- `rct2ww.scenery_wall.wwdaub04` [needs:rct2dat] dat=WALLWD04.DAT
- `rct2ww.scenery_wall.wwdaub05` [needs:rct2dat] dat=WALLWD05.DAT
- `rct2ww.scenery_wall.wwdaub06` [needs:rct2dat] dat=WALLWD06.DAT
- `rct2ww.scenery_wall.wwdaub07` [needs:rct2dat] dat=WALLWD07.DAT
- `rct2ww.scenery_wall.wwind03` [needs:rct2dat] dat=WWIND03.DAT
- `rct2ww.scenery_wall.wwind04` [needs:rct2dat] dat=WWIND04.DAT
- `rct2ww.scenery_wall.wwind05` [needs:rct2dat] dat=WWIND05.DAT
- `rct2ww.scenery_wall.wwind06` [needs:rct2dat] dat=WWIND06.DAT

### station (12)

- `rct2.station.abstract` [mixed:g1] g1=[22792..22823],[22517..22540]
- `rct2.station.canvas_tent` [mixed:g1] g1=[22680..22695],[22445..22456]
- `rct2.station.castle_brown` [mixed:g1] g1=[22712..22727],[22469..22480]
- `rct2.station.castle_grey` [mixed:g1] g1=[22728..22743],[22457..22468]
- `rct2.station.classical` [mixed:g1] g1=[22696..22711],[22505..22516]
- `rct2.station.jungle` [mixed:g1] g1=[22776..22791],[22481..22492]
- `rct2.station.log` [mixed:g1] g1=[22744..22759],[22493..22504]
- `rct2.station.pagoda` [mixed:g1] g1=[22840..22855],[22553..22564]
- `rct2.station.plain` [mixed:g1] g1=[22664..22679]
- `rct2.station.snow` [mixed:g1] g1=[22824..22839],[22541..22552]
- `rct2.station.space` [mixed:g1] g1=[22856..22871],[22565..22576]
- `rct2.station.wooden` [mixed:g1] g1=[22760..22775],[22433..22444]

### terrain_edge (17)

- `rct1.terrain_edge.brick` [mixed:csg]
- `rct1.terrain_edge.iron` [mixed:csg]
- `rct1aa.terrain_edge.grey` [mixed:csg]
- `rct1aa.terrain_edge.red` [mixed:csg]
- `rct1aa.terrain_edge.yellow` [mixed:csg]
- `rct1beta.terrain_edge.brick` [mixed:g1] g1=[1639],[1641],[1651..1654]
- `rct1beta.terrain_edge.rock` [mixed:g1] g1=[1639],[1641],[1651..1654]
- `rct1ll.terrain_edge.green` [mixed:csg]
- `rct1ll.terrain_edge.purple` [mixed:csg]
- `rct1ll.terrain_edge.skyscraper_a` [mixed:csg]
- `rct1ll.terrain_edge.skyscraper_b` [mixed:csg]
- `rct1ll.terrain_edge.stone_brown` [mixed:csg]
- `rct1ll.terrain_edge.stone_grey` [mixed:csg]
- `rct2.terrain_edge.ice` [mixed:g1] g1=[5596],[1831..1874],[1879..1906],[1908],[1910..1914]
- `rct2.terrain_edge.rock` [mixed:g1] g1=[5593],[1579..1622],[1627..1654],[1656],[1658..1662]
- `rct2.terrain_edge.wood_black` [mixed:g1] g1=[5595],[1663..1706],[1711..1738],[1740],[1742..1746]
- `rct2.terrain_edge.wood_red` [mixed:g1] g1=[5594],[1747..1790],[1795..1822],[1824],[1826..1830]

### terrain_surface (18)

- `rct1aa.terrain_surface.roof_red` [mixed:csg]
- `rct1ll.terrain_surface.roof_grey` [mixed:csg]
- `rct1ll.terrain_surface.rust` [mixed:csg]
- `rct1ll.terrain_surface.wood` [mixed:csg]
- `rct2.terrain_surface.chequerboard` [needs:g1] g1=[5584],[2371..2427],[2428..2484]
- `rct2.terrain_surface.dirt` [needs:g1] g1=[5581],[28977..28982],[2485..2541]
- `rct2.terrain_surface.grass` [needs:g1] g1=[5579],[28959..28964],[1915..1971],[2663..3042]
- `rct2.terrain_surface.grass_clumps` [needs:g1] g1=[5585],[29001..29006],[2200..2256]
- `rct2.terrain_surface.grid_green` [needs:g1] g1=[5590],[2257..2313]
- `rct2.terrain_surface.grid_purple` [needs:g1] g1=[5589],[2257..2313]
- `rct2.terrain_surface.grid_red` [needs:g1] g1=[5587],[2257..2313]
- `rct2.terrain_surface.grid_yellow` [needs:g1] g1=[5588],[2257..2313]
- `rct2.terrain_surface.ice` [needs:g1] g1=[5586],[29007..29012],[2143..2199]
- `rct2.terrain_surface.martian` [needs:g1] g1=[5583],[28995..29000],[2314..2370]
- `rct2.terrain_surface.rock` [needs:g1] g1=[5582],[28989..28994],[2542..2598]
- `rct2.terrain_surface.sand` [needs:g1] g1=[5580],[28983..28988],[2086..2142]
- `rct2.terrain_surface.sand_brown` [needs:g1] g1=[5592],[28965..28970],[1972..2028]
- `rct2.terrain_surface.sand_red` [needs:g1] g1=[5591],[28971..28976],[2029..2085]


## Objects referencing `$G1` (need g1.dat / OpenGraphics)

50 objects. Total distinct g1 sprite count referenced: 9737.

| id | type | tree | g1 ranges |
|---|---|---|---|
| `rct1ll.footpath_railings.bamboo` | footpath_railings | rct1 | [3658..3674] |
| `rct1ll.footpath_railings.space` | footpath_railings | rct1 | [3425..3444], [3124..3140] |
| `rct2.peep_animations.entertainer_astronaut` | peep_animations | rct2 | [5125..5125], [13765..13768], [13769..13792], [13793..13844], [13845..13856], [13857..13896] |
| `rct2.peep_animations.entertainer_bandit` | peep_animations | rct2 | [5126..5126], [13105..13108], [13109..13132], [13133..13196], [13197..13208], [13209..13376] |
| `rct2.peep_animations.entertainer_elephant` | peep_animations | rct2 | [5120..5120], [12325..12348], [12349..12352], [12353..12364], [12365..12392], [12393..12432], [12433..12544] |
| `rct2.peep_animations.entertainer_gorilla` | peep_animations | rct2 | [5122..5122], [12545..12548], [12549..12572], [12573..12616], [12617..12664], [12665..12676] |
| `rct2.peep_animations.entertainer_knight` | peep_animations | rct2 | [5124..5124], [12893..12896], [12897..12920], [12921..12980], [12981..12992], [12993..13104] |
| `rct2.peep_animations.entertainer_panda` | peep_animations | rct2 | [5118..5118], [11973..11996], [11997..12000], [12001..12012], [12013..12040], [12041..12064], [12065..12128] |
| `rct2.peep_animations.entertainer_pirate` | peep_animations | rct2 | [5128..5128], [13377..13380], [13381..13404], [13405..13468], [13469..13480], [13481..13608] |
| `rct2.peep_animations.entertainer_roman` | peep_animations | rct2 | [5121..5121], [13897..13920], [13921..13924], [13925..13936], [13937..13968], [13969..14028], [14029..14184] |
| `rct2.peep_animations.entertainer_sheriff` | peep_animations | rct2 | [5127..5127], [13609..13612], [13613..13636], [13637..13700], [13701..13712], [13713..13764] |
| `rct2.peep_animations.entertainer_snowman` | peep_animations | rct2 | [5123..5123], [12677..12680], [12681..12704], [12705..12840], [12841..12880], [12881..12892] |
| `rct2.peep_animations.entertainer_tiger` | peep_animations | rct2 | [5119..5119], [12129..12152], [12153..12156], [12157..12168], [12169..12196], [12197..12220], [12221..12324] |
| `rct2.peep_animations.guest` | peep_animations | rct2 | [5490..5490], [6409..6432], [6433..6456], [6457..6480], [6481..6504], [6505..6528], [6529..6532], [6533..6536], [6537..6560], [6561..6584], [6585..6620], [6621..6624], [6625..6628], [6629..6636], [6637..6644], [6645..6652], [6653..6696], [6697..6756], [6757..6812], [6813..6824], [6825..6844], [6845..6908], [6909..6956], [6957..6988], [6989..7040], [7041..7100], [7101..7120], [7121..7148], [7149..7180], [7181..7244], [7245..7248], [7249..7284], [7285..7308], [7309..7328], [7329..7396], [7397..7400], [7401..7448], [7449..7452], [7453..7476], [7477..7500], [7501..7504], [7505..7552], [7553..7556], [7557..7580], [7581..7604], [7605..7608], [7609..7680], [7681..7684], [7685..7732], [7733..7780], [7781..7784], [7785..7832], [7833..7836], [7837..7860], [7861..7884], [7885..7888], [7889..7960], [7961..7964], [7965..8012], [8013..8060], [8061..8064], [8065..8184], [8185..8188], [8189..8284], [8285..8380], [8381..8384], [8385..8456], [8457..8460], [8461..8508], [8509..8556], [8557..8560], [8561..8632], [8633..8636], [8637..8660], [8661..8708], [8709..8712], [8713..8784], [8785..8788], [8789..8836], [8837..8884], [8885..8956], [8957..8972], [8981..8996], [9005..9076], [9077..9124], [9125..9172], [9173..9244], [9245..9292], [9293..9340], [9341..9412], [9413..9460], [9461..9508], [9509..9580], [9581..9628], [9629..9676], [9677..9748], [9749..9796], [9797..9844], [9845..9916], [9917..9964], [9965..10012], [10013..10084], [10085..10132], [10133..10180], [10181..10252], [10253..10300], [10301..10348], [10349..10420], [10421..10468], [10469..10516], [10517..10588], [10589..10636], [10637..10684], [10685..10708], [10709..10712], [10713..10716], [10717..10720], [10721..10744], [10745..10748], [10781..10784], [10785..10808], [10809..10812], [10845..10848], [10849..10920], [10921..10924], [10925..10972], [10973..11020], [11021..11024], [11025..11096], [11097..11100], [11101..11148], [11149..11196], [11197..11220], [11221..11224], [11225..11228] |
| `rct2.peep_animations.handyman` | peep_animations | rct2 | [5111..5111], [11261..11284], [11285..11288], [11289..11300], [11301..11324], [11325..11344], [11345..11376], [11377..11400], [11401..11440] |
| `rct2.peep_animations.mechanic` | peep_animations | rct2 | [5116..5116], [11441..11464], [11465..11468], [11469..11480], [11481..11512], [11513..11596], [11597..11668], [11669..11800], [11801..11880] |
| `rct2.peep_animations.security` | peep_animations | rct2 | [5096..5096], [11881..11904], [11905..11908], [11909..11920], [11921..11948], [11949..11972] |
| `rct2.ride.hskelt` | ride | rct2 | [20548..20751] |
| `rct2.station.abstract` | station | rct2 | [22792..22823], [22517..22540] |
| `rct2.station.canvas_tent` | station | rct2 | [22680..22695], [22445..22456] |
| `rct2.station.castle_brown` | station | rct2 | [22712..22727], [22469..22480] |
| `rct2.station.castle_grey` | station | rct2 | [22728..22743], [22457..22468] |
| `rct2.station.classical` | station | rct2 | [22696..22711], [22505..22516] |
| `rct2.station.jungle` | station | rct2 | [22776..22791], [22481..22492] |
| `rct2.station.log` | station | rct2 | [22744..22759], [22493..22504] |
| `rct2.station.pagoda` | station | rct2 | [22840..22855], [22553..22564] |
| `rct2.station.plain` | station | rct2 | [22664..22679] |
| `rct2.station.snow` | station | rct2 | [22824..22839], [22541..22552] |
| `rct2.station.space` | station | rct2 | [22856..22871], [22565..22576] |
| `rct2.station.wooden` | station | rct2 | [22760..22775], [22433..22444] |
| `rct1beta.terrain_edge.brick` | terrain_edge | official | [1639], [1641], [1651..1654] |
| `rct1beta.terrain_edge.rock` | terrain_edge | official | [1639], [1641], [1651..1654] |
| `rct2.terrain_edge.ice` | terrain_edge | rct2 | [5596], [1831..1874], [1879..1906], [1908], [1910..1914] |
| `rct2.terrain_edge.rock` | terrain_edge | rct2 | [5593], [1579..1622], [1627..1654], [1656], [1658..1662] |
| `rct2.terrain_edge.wood_black` | terrain_edge | rct2 | [5595], [1663..1706], [1711..1738], [1740], [1742..1746] |
| `rct2.terrain_edge.wood_red` | terrain_edge | rct2 | [5594], [1747..1790], [1795..1822], [1824], [1826..1830] |
| `rct2.terrain_surface.chequerboard` | terrain_surface | rct2 | [5584], [2371..2427], [2428..2484] |
| `rct2.terrain_surface.dirt` | terrain_surface | rct2 | [5581], [28977..28982], [2485..2541] |
| `rct2.terrain_surface.grass` | terrain_surface | rct2 | [5579], [28959..28964], [1915..1971], [2663..3042] |
| `rct2.terrain_surface.grass_clumps` | terrain_surface | rct2 | [5585], [29001..29006], [2200..2256] |
| `rct2.terrain_surface.grid_green` | terrain_surface | rct2 | [5590], [2257..2313] |
| `rct2.terrain_surface.grid_purple` | terrain_surface | rct2 | [5589], [2257..2313] |
| `rct2.terrain_surface.grid_red` | terrain_surface | rct2 | [5587], [2257..2313] |
| `rct2.terrain_surface.grid_yellow` | terrain_surface | rct2 | [5588], [2257..2313] |
| `rct2.terrain_surface.ice` | terrain_surface | rct2 | [5586], [29007..29012], [2143..2199] |
| `rct2.terrain_surface.martian` | terrain_surface | rct2 | [5583], [28995..29000], [2314..2370] |
| `rct2.terrain_surface.rock` | terrain_surface | rct2 | [5582], [28989..28994], [2542..2598] |
| `rct2.terrain_surface.sand` | terrain_surface | rct2 | [5580], [28983..28988], [2086..2142] |
| `rct2.terrain_surface.sand_brown` | terrain_surface | rct2 | [5592], [28965..28970], [1972..2028] |
| `rct2.terrain_surface.sand_red` | terrain_surface | rct2 | [5591], [28971..28976], [2029..2085] |
