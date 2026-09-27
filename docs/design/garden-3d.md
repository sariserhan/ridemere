# Garden park presentation

Reference: `garden-3d-concept.png`, generated with the built-in Image Gen tool on
2026-09-27. The brief requested a full gameplay view of the existing compact park,
soft miniature geometry, sage terrain, cream paths, timber kiosks, teal/ivory carousel,
brass details, a dark game header, and visible camera controls. The reference is not
shipped as a game background. Geometry, controls, lettering, lighting and shadows
are rendered live; no generated image stands in for gameplay.

Visual roles: sage ground, warm sand paths, teal ride/roof accents, coral secondary
roofs, ivory structure, timber fixtures, brass carousel details; dark navy HTML
controls. Model generators live in `web/src/lib/game/scene/models.ts`. Models retain
the actual park's layout and scale rather than moving rides to match a composition.

The 3D renderer does not reproduce the reference's dense fine grass or painted
textures. It removes the fixed sprite resolution
and establishes real geometry, lighting, antialiasing, orbit and zoom. Further art
refinement can happen without resampling 64-pixel sprites.

Surface asset: `web/public/art/grass-height.png`, generated using the built-in Image
Gen tool. Prompt: square seamless grayscale short mown lawn height/bump map,
straight-down orthographic, shallow irregular blades, low contrast, no lighting,
objects, flowers, shadows or text. Used only as a subtle filtered terrain bump map.
The image is original generated artwork; the renderer's geometry remains original
procedural code. The reference and texture are recorded here rather than in the
engine archive's object manifest because they are not engine sprite objects.

## Botanical and human detail pass (2026-09-27)

`vegetation.ts` now generates tapered, leaning trunks, bark grooves, roots, branching
limbs, twigs, and folded individual leaves. Broadleaf, columnar, young, evergreen,
and flowering forms vary deterministically with their planted position. Small
shrubs and kiosk planters use leafy geometry too. Leaf colour is authored in sRGB
and converted to linear vertex colour; neutral daylight avoids the previous pale,
yellowed foliage. These are original procedural models, not downloaded assets.

`crowd.ts` replaces the head-and-capsule representation with separate torso, hips,
neck, head, hair, face, upper/lower arms, hands, thighs, shins, and shoes. Colours and
height vary by stable entity ID. Two-bone legs plant and lift the feet, arms swing
opposite the legs, and bodies face their actual direction of travel. Simulation
movement determines gait progress; stationary guests settle and pause freezes the
pose. Native sitting state selects a seated pose. Geometry and materials are shared
through instancing so each limb type is one draw call for the crowd.

This is a more detailed real-time park style, not photorealism. Faces and clothing
remain simplified, ride mechanics still use the first procedural models, and the
native construction interface retains its sprites. The new botanical/human artwork
belongs to the default 3D view; no claim of final art acceptance is made.

## Softer models and crowd spacing (2026-09-27)

Sharp box primitives now use beveled edges. Small fixtures and heads have smoother
curves; kiosks have timber siding, curved fabric awnings and scalloped hems. The
carousel canopy curves through several height rings. Leaf silhouettes are rounded
and cupped, with shared normals rather than a hard four-triangle diamond. Connected
path tops remain flat so rounding does not introduce seams. Focused sun shadows,
softer fill light, subtler ground bump and a continuous surrounding landscape replace
the raised square presentation board. Tiny face/foot details use fewer polygons
than their larger silhouettes to avoid wasting geometry at subpixel sizes.

The new `crowd-motion.ts` uses a spatial grid, swept-circle clearance checks, bounded
movement steps, connected-path routing and steering around occupied positions.
Opposing traffic keeps right. Rendered gait follows the resulting displacement so
a blocked person stops walking. Initial coincident positions are assigned free
nearby path space. When that space is saturated, placement waits and retries with
a bounded work budget rather than drawing intersecting bodies. Different elevations
are separated; native sitting poses and sloped path heights remain supported.

This is presentation-layer avoidance: native pathfinding, queues, guest counts and
economy continue in the engine. Rendered positions can lag native destinations in
congestion. It does not add collision physics to the original 2D construction view.

## Organic silhouettes (2026-09-27)

The next pass replaces the remaining angular human construction itself. The shared
`organic.ts` generator samples elliptical rings along curved profiles, then smooths
the UV seam normals. Shirts, sleeves and limbs now use these surfaces. Pelvises and
shoes have rounded silhouettes, and shoulder/elbow/knee joints bridge the articulated
segments. These meshes remain instanced and use the same collision-aware movement.
This is original procedural artwork; no external character models were introduced.

Kiosks now have smoothly shaded arched roofs and round posts. Bumper cars have curved
bodies, rubber bumper rings, seats and steering wheels beneath a curved canopy.
The ship has an ellipsoidal hull and oval rim; wheel cabins, tower seating and coaster
cars have rounded forms. Carousel horses have oval necks and tapered round legs.
Tree trunk radial sampling and bark variation were softened. Flat paths and useful
architectural surfaces retain their normal shape rather than becoming inflated.

Visual inspection includes the live populated park close-up at
`/tmp/ridemere-3d/organic-close.png` and an isolated rendering of the actual model
functions at `organic-gallery.png` in the same directory. The latter is a model QA
scene, not a screenshot of a playable park. Detailed anatomy, clothing and ride
mechanisms remain stylized; this is not photorealistic art acceptance.

## Construction in the 3D scene (2026-09-27)

`Build park` now opens `ParkBuildPanel` without unmounting `ParkRenderer`: the camera,
lighting, people and object models stay the same. Tap/click a terrain tile to select
it, inspect the translucent model and footprint, rotate the item, then place it.
Dragging and multi-touch gestures cannot trigger tile selection. Closing the tools
clears the preview without replacing the canvas. The tutorial yields its space to
the construction panel; mobile uses a bounded, scrollable bottom panel.

The initial tools cover level-ground paths and queues, benches/bins, eight scenery
items, four shops, carousel/dodgems/ferris wheel/swinging ship, ride entrances/exits,
and individual path/scenery removal. New flat rides start closed and prompt for
entrance/exit placement. Their footprint comes from native track metadata, not a
hardcoded rectangle. Door arrows must face adjacent track belonging to the selected
ride. The existing ride details panel opens/closes rides after construction.

`SunriseBuildAction` receives a JSON request (`op`, `object`, tile `x/y`, `direction`,
optional `ride`, and `apply`). Non-ride previews query native game actions for costs
and clearance. Ride previews return footprint metadata without creating temporary
rides; their cost/clearance is checked on placement. Successful synchronous nested
actions receive one native finance payment; failed ride placement removes its empty
ride without charging. Edits immediately refresh the 3D snapshot and use ordinary
park saves. No parallel scene-only building state is persisted.

The explicitly labeled **Advanced editor (2D)** retains custom coaster track editing,
terrain sculpting, elevated/sloped path tools, and staff management. Those tools have
not yet been ported to 3D. Available objects still depend on the scenario's loaded
content, and the UI reports an unavailable-object refusal from the engine.

## Expanded construction catalog (2026-09-27)

The menu now exposes 51 construction choices (54 tools including removal), up from
22 choices. All 32 small-scenery objects in the standalone pack are selectable under
Trees, Planting, Park furniture and Garden features. Paths add stone paving and wood
boardwalks; Fences adds metal railings, timber fences and low stone walls. Native
wall placement/removal targets a rotated tile edge. Path snapshots carry the surface
object identifier so previews, live rendering and reloaded parks retain their finish.

`gardenProp` now gives these objects distinct forms: proper picnic tables, two lamp
heights, directional signs and noticeboards, clock faces/hands, fabric banners,
bollards, an abstract bronze sculpture, water jets, stone columns and curved arches.
Planting includes low ground cover, grass blades, hedges, layered topiary, warm/cool
petalled flowers, round/square planters and rectangular/corner beds. Shade,
ornamental and dense tree variants have different proportions/branch density.
Everything remains original procedural geometry; no new third-party art is added.

## Visual build-item picker (2026-09-27)

The item dropdown is replaced by labeled thumbnail cards with category buttons,
case-insensitive search, an empty-results message, and a selected-item checkmark.
All 54 tools have a preview, including removal tools with a trash badge. Desktop
keeps the catalog open while placing; a phone selection collapses it to leave space
for the park and placement controls. The selected item remains visible with its
thumbnail, and Browse build items reopens the catalog. Card images/names do not
shrink to fit the scroll area.

Thumbnails in `web/public/art/build-items/` are 192×144 PNG renders of the actual
original procedural scene models, not generated concept art or third-party icons.
Regenerate after catalog/model changes with:

```
node web/scripts/build-item-thumbnails.mjs
```

The script uses the installed development Playwright/TypeScript dependencies and a
single temporary renderer, producing static assets. Runtime cards use ordinary
images, so the picker adds no WebGL context or model-generation work to gameplay.

The engine previously canceled keyboard defaults in HTML controls. GameRuntime now
registers a scoped capture guard before engine startup for `[data-game-ui]` overlays.
It stops game keyboard handlers without preventing browser text editing, focus or
button activation; input/click events still reach React. The guard is removed when
the runtime exits. Keyboard events from the game canvas keep their original route.

### Ready-built coasters and drop tower

The picture catalog now includes Alpine trail coaster, Single-rail coaster, Hybrid coaster, and Drop tower (58 tools / 55 build choices). The three coaster circuits have three-tile stations, chain lift hills, drops, and return turns; the alpine hill is lowest, single-rail highest. These are fixed layouts, rotated as a unit in the existing 3D builder. Custom track editing still uses the advanced editor.

`SunriseBuildAction` accepts `op: "design"` and one of four allowlisted bundled ride object identifiers. Native track metadata determines the complete footprint and preview track endpoints. Preview does not create rides, load objects, charge money, or alter the map. The whole footprint must be clear, level, and owned; this conservative restriction also prevents partial construction from clearing player scenery. Apply loads the bundled object if an older saved park has not selected it, builds every piece using native actions, and debits the total only after success. Failure demolishes the provisional ride with no payment. Hill placement subtracts each piece's `zBegin` from the connection height, matching native track design placement. The tower uses a base plus six sections and downward launch mode.

The player adds station entrance and exit, connects queue/exit paths, and opens the ride. Track geometry is shared between the live scene, translucent preview, and generated picture cards. `web/scripts/ride-design-previews.json` is native preview output used only by the thumbnail generator; the engine remains authoritative for construction.

### Large coaster layout collection

The coaster catalog now offers twelve layouts across the existing three native coaster types. Nine new presets add multi-hill circuits, S-bends, broad five-tile turns, and (for the larger two families) four extra corners forming a folded return. Grand layouts have four hills. Alpine Ridge, Canyon Serpent, Summit Expedition; Skyline Rush, Viper Run, Leviathan; and Timber Ridge, Thunder Gorge, Behemoth each have their own native-derived picture card. These are layout variants, not nine additional vehicle types. Native lift hills power uphill sections, and the original compact layouts remain available.

A `design` key (`ridge`, `serpent`, `grand`) selects the native allowlisted layout family; omission preserves the original compact design. The engine derives rotations, footprint and preview endpoints from track metadata and rejects any circuit that does not close. Opposite straight runs account for native S-bend advance (three tiles per piece), hill transitions and the folded return. Preview `stats` reports width, depth, piece count and rise; the UI converts rise to metres using native base-height units. Validated new layouts range from 31×23 tiles / 82 pieces to Behemoth at 66×34 tiles / 166 pieces. New layouts use the existing transactional construction and object loading paths.

`Show whole layout` fits the preview bounds to the current camera orientation. Zoom can now reach 0.08 so large parks and tracks can be inspected. This does not change selected placement coordinates or orientation.

Coaster Frontier is a new immediately accessible release scenario: 128×128 map, owned interior from (1,5) through (126,126), $150,000 starting cash, starter facilities, and a 1,500-guest objective. Existing parks and saves are not resized. The standard engine scenario generator, pack builder, provenance manifest and web selector all include it.
