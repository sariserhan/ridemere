import type { SceneTrack } from "./types";
export type BuildOperation = "design" | "path" | "queue" | "scenery" | "addition" | "ride" | "entrance" | "exit" | "removePath" | "removeScenery" | "wall" | "removeWall";
export interface BuildTool { id: string; label: string; category: string; op: BuildOperation; object?: string; design?: string; description?: string }
export interface BuildTile { x: number; y: number; z: number }
export interface BuildRequest { op: BuildOperation; object?: string; design?: string; x: number; y: number; direction: number; ride?: number; apply: boolean }
export interface BuildResult { ok: boolean; error?: string; cost?: number; footprint?: number[][]; tracks?: SceneTrack[]; stats?: { width: number; depth: number; pieces: number; height: number }; rideId?: number; needsEntrance?: boolean }
export const buildTools: BuildTool[] = [
  { id: "path", label: "Garden path", category: "Paths", op: "path" },
  { id: "stone_path", label: "Stone paving", category: "Paths", op: "path", object: "sunrise.footpath_surface.stone" },
  { id: "wood_path", label: "Wooden boardwalk", category: "Paths", op: "path", object: "sunrise.footpath_surface.wood" },
  { id: "queue", label: "Queue path", category: "Paths", op: "queue" },
  ...[["bench", "Bench"], ["bin", "Litter bin"]].map(([id,label]) => ({ id, label, category: "Paths", op: "addition" as const, object: `sunrise.footpath_item.${id}` })),
  ...[["carousel", "Carousel"], ["dodgems", "Bumper cars"], ["ferris_wheel", "Ferris wheel"], ["swinging_ship", "Swinging ship"]].map(([id,label]) => ({ id, label, category: "Rides", op: "ride" as const, object: `sunrise.ride.${id}` })),
  ...[["alpine_coaster", "Alpine trail coaster"], ["single_rail_coaster", "Single-rail coaster"], ["hybrid_coaster", "Hybrid coaster"]].map(([id,label]) => ({ id, label, category: "Coasters", op: "design" as const, object: `openrct2.ride.${id}` })),
  {"id": "alpine_coaster_ridge", "label": "Alpine Ridge", "category": "Coasters", "op": "design", "object": "openrct2.ride.alpine_coaster", "design": "ridge", "description": "Large \u00b7 multiple hills and S-bends"},
  {"id": "alpine_coaster_serpent", "label": "Canyon Serpent", "category": "Coasters", "op": "design", "object": "openrct2.ride.alpine_coaster", "design": "serpent", "description": "Huge \u00b7 switchbacks and folded return"},
  {"id": "alpine_coaster_grand", "label": "Summit Expedition", "category": "Coasters", "op": "design", "object": "openrct2.ride.alpine_coaster", "design": "grand", "description": "Giant \u00b7 tall lift, four hills and switchbacks"},
  {"id": "single_rail_coaster_ridge", "label": "Skyline Rush", "category": "Coasters", "op": "design", "object": "openrct2.ride.single_rail_coaster", "design": "ridge", "description": "Large \u00b7 multiple hills and S-bends"},
  {"id": "single_rail_coaster_serpent", "label": "Viper Run", "category": "Coasters", "op": "design", "object": "openrct2.ride.single_rail_coaster", "design": "serpent", "description": "Huge \u00b7 switchbacks and folded return"},
  {"id": "single_rail_coaster_grand", "label": "Leviathan", "category": "Coasters", "op": "design", "object": "openrct2.ride.single_rail_coaster", "design": "grand", "description": "Giant \u00b7 tall lift, four hills and switchbacks"},
  {"id": "hybrid_coaster_ridge", "label": "Timber Ridge", "category": "Coasters", "op": "design", "object": "openrct2.ride.hybrid_coaster", "design": "ridge", "description": "Large \u00b7 multiple hills and S-bends"},
  {"id": "hybrid_coaster_serpent", "label": "Thunder Gorge", "category": "Coasters", "op": "design", "object": "openrct2.ride.hybrid_coaster", "design": "serpent", "description": "Huge \u00b7 switchbacks and folded return"},
  {"id": "hybrid_coaster_grand", "label": "Behemoth", "category": "Coasters", "op": "design", "object": "openrct2.ride.hybrid_coaster", "design": "grand", "description": "Giant \u00b7 tall lift, four hills and switchbacks"},
  ...[["log_flume", "Timber Creek", ""], ["log_flume_ridge", "Cascade Falls", "ridge"], ["log_flume_serpent", "Wilderness Splash", "serpent"]].map(([id,label,design]) => ({ id, label, design, category: "Water rides", op: "design" as const, object: "sunrise.ride.log_flume", description: "Ready-built log flume · lift hill and splashdown" })),
  { id: "drop_tower", label: "Drop tower", category: "Rides", op: "design", object: "sunrise.ride.drop_tower" },
  { id: "entrance", label: "Ride entrance", category: "Rides", op: "entrance" },
  { id: "exit", label: "Ride exit", category: "Rides", op: "exit" },
  ...[["grill_stand", "Food stand"], ["refreshment_stand", "Drink stand"], ["gift_stand", "Gift shop"], ["restroom", "Restroom"], ["information_point", "Information point"], ["pizza_stand", "Pizza kitchen"], ["ice_cream_stand", "Ice cream parlour"], ["chips_stand", "Fries stand"], ["popcorn_stand", "Popcorn cart"], ["coffee_stand", "Coffee house"], ["balloon_stand", "Balloon shop"], ["first_aid", "First aid"], ["cash_machine", "Cash machine"]].map(([id,label]) => ({ id, label, category: "Shops", op: "ride" as const, object: `sunrise.ride.${id}` })),
  ...[["tree_broadleaf", "Broadleaf tree"], ["tree_shade", "Shade tree"], ["tree_column", "Column tree"], ["tree_evergreen", "Evergreen tree"], ["tree_ornamental", "Ornamental tree"], ["tree_flowering", "Flowering tree"], ["tree_young", "Young tree"], ["tree_dense", "Dense park tree"]].map(([id,label]) => ({ id, label, category: "Trees", op: "scenery" as const, object: `sunrise.scenery_small.${id}` })),
  ...[["shrub_round", "Round shrub"], ["shrub_hedge", "Hedge"], ["shrub_tall", "Tall shrub"], ["shrub_topiary", "Topiary"], ["flowers_warm", "Warm flower bed"], ["flowers_cool", "Cool flower bed"], ["ornamental_grass", "Ornamental grass"], ["ground_planting", "Ground cover"]].map(([id,label]) => ({ id, label, category: "Planting", op: "scenery" as const, object: `sunrise.scenery_small.${id}` })),
  ...[["lamp_tall", "Tall park lamp"], ["lamp_garden", "Garden lamp"], ["sign_direction", "Direction sign"], ["sign_board", "Park noticeboard"], ["prop_bollard", "Bollard"], ["prop_banner", "Park banner"], ["prop_clock", "Park clock"], ["prop_picnic_table", "Picnic table"]].map(([id,label]) => ({ id, label, category: "Park furniture", op: "scenery" as const, object: `sunrise.scenery_small.${id}` })),
  ...[["planter_square", "Square planter"], ["planter_round", "Round planter"], ["bed_rectangular", "Raised flower bed"], ["bed_corner", "Corner flower bed"], ["prop_sculpture", "Sculpture"], ["prop_fountain", "Fountain"], ["accent_pillar", "Stone pillar"], ["accent_arch", "Garden arch"]].map(([id,label]) => ({ id, label, category: "Garden features", op: "scenery" as const, object: `sunrise.scenery_small.${id}` })),
  ...[["fence_metal", "Metal railing"], ["fence_timber", "Timber fence"], ["wall_stone", "Low stone wall"]].map(([id,label]) => ({ id, label, category: "Fences", op: "wall" as const, object: `sunrise.scenery_wall.${id}` })),
  { id: "removePath", label: "Remove path", category: "Remove", op: "removePath" },
  { id: "removeScenery", label: "Remove scenery", category: "Remove", op: "removeScenery" },
  { id: "removeWall", label: "Remove fence or wall", category: "Remove", op: "removeWall" },
];
export const buildCategories = [...new Set(buildTools.map(tool => tool.category))];
