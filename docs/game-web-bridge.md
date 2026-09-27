# The game and web bridge

Written for whoever works on either side of it.

This is the entire surface between the simulation and the product around it. It is
small on purpose. The alternative, letting the web side reach into engine state, is how
a narrow boundary becomes an accidental API that can never be changed.

Schemas live in `web/src/lib/bridge/messages.ts`; the game side is
`web/src/lib/game/runtime.ts`.

## Transport

The game currently runs in the **same document** as the page hosting it, `/play`, so
messages travel over an in-process typed event channel rather than `postMessage`.

Every payload is nonetheless structured-cloneable. Moving the runtime into a worker or
a frame later is then a transport change rather than a redesign. Nothing in the message
shapes depends on shared memory, closures or live object references.

## Direction

Direction is part of the type, so nothing can send a message the wrong way.

### Web to game

| Message | Payload | Meaning |
|---|---|---|
| `NEW_GAME` | `scenarioId`, `saveId` | start the named scenario |
| `LOAD_SAVE` | `saveId`, `park: Uint8Array` | open these park bytes |
| `REQUEST_SAVE` | `saveId`, `reason: manual \| autosave \| exit` | serialise the park now |
| `REQUEST_SCREENSHOT` | `width`, `height` | capture a thumbnail |
| `REQUEST_PARK_METADATA` | none | describe the current park |
| `REQUEST_GUEST_ALERTS` | none | what is the park telling the player |
| `REQUEST_SCENARIO_STATE` | none | where is this scenario up to |

### Game to web

| Message | Payload | Meaning |
|---|---|---|
| `GAME_READY` | `gameVersion`, `contentVersion` | the engine is running **and simulating** |
| `SAVE_READY` | `saveId`, `park`, `reason`, `parkMetadata` | here are the bytes and a snapshot |
| `SCREENSHOT_READY` | `png`, `width`, `height` | here is a thumbnail |
| `PARK_METADATA` | `metadata` | here is a snapshot |
| `GUEST_ALERTS` | `alerts` | here is the active alert list, most severe first |
| `SCENARIO_STATE` | `state` | a summary of the scenario, for onboarding and the objective |
| `EXIT_GAME` | `reason: player \| error` | the player has left the park |
| `ERROR` | `stage`, `message`, `detail?` | something failed, in words a player can read |

`ERROR` carries a `stage` (`engine-download`, `engine-start`, `content-install`,
`park-load`, `park-save`, `screenshot`, `runtime`) so the shell can react differently
to "the download failed" and "this park is unreadable". `message` is for the player;
`detail` is for a console or a bug report and is never shown unless asked for.

## Park metadata

The only simulation data that crosses the boundary:

```
parkName  guestCount  parkRating  cash  rideCount  year  month  day  ticks  parkOpen
```

That is a deliberate list, not a convenience. It is what a save card needs today and
what a public park page will need later, which is why it was built in V1-0 even though
park pages are a V1.1 feature: adding it later would mean reopening the engine for a
decision already taken.

**The park file is authoritative.** This metadata is a read-only snapshot for display.
Nothing reconstructs a park from it, and no web-side store keeps guests, rides,
finances, paths or entities.

## Guest alerts

The second, and so far only other, piece of simulation data that crosses the boundary.
Each alert carries:

```
kind  severity  guests  perMille  hasFacility  raisedAtTick  lastChangedTick
title  advice
```

The shell polls for these every five seconds and renders them; it does not decide when
something is worth saying. Thresholds, hysteresis and cooldown all live in the engine,
because they depend on guest state the bridge does not carry and should not start to.
See `docs/guest-alerts.md`.

`kind` is a string rather than a closed union on purpose: a new alert added in the
engine appears in the panel without a matching change on the web side.

## Scenario state

The third and last piece of simulation data that crosses the boundary, added in V1-4
for the onboarding:

```
guests  rating  cash  rideOpen  rideCustomers  shopsOpen
hasFood  hasDrink  hasToilet  benches  bins  handymen  litter
viewX  viewY  objectiveGuests  objectiveRating  scenarioComplete
```

Every field is here because some onboarding instruction has to decide whether the player
has done a thing, and those decisions have to be answerable from the park: a tutorial
step that advances because a menu was opened teaches nothing, and one that cannot
recompute where it is makes nonsense of resuming a save.

It is a summary and must stay one. No entities, no tiles, nothing a park could be
rebuilt from. The alternative — the web side reasoning about ride types and path
elements over a much wider bridge — is the accidental API this boundary exists to
prevent.

`viewX` and `viewY` are there for one instruction: "look around your park" is complete
when the camera has moved, and that cannot be known without knowing where it started.

## Engine entry points behind it

Seven exported functions, all prefixed `Sunrise`:

| Export | Used by |
|---|---|
| `SunriseLoadPark(path)` | `NEW_GAME`, `LOAD_SAVE` |
| `SunriseSavePark(path)` | `REQUEST_SAVE` |
| `SunriseParkMetadataJson()` | `PARK_METADATA`, and attached to every `SAVE_READY` |
| `SunriseCaptureThumbnail(name, w, h)` | `REQUEST_SCREENSHOT` |
| `SunriseGuestAlertsJson()` | `GUEST_ALERTS` |
| `SunriseScenarioStateJson()` | `SCENARIO_STATE` |
| `SunriseParkStatsJson()` | readiness detection, see below |

Park bytes move through the Emscripten virtual filesystem: the shell writes them to a
fixed path and asks the engine to load it, or asks the engine to save and reads the
path back. Thumbnails are captured by the engine off-screen, not by reading the canvas,
so the image does not depend on window size, device pixel ratio or where the camera
happens to be pointing.

## Readiness is measured, not assumed

`Module.callMain` hands control to the browser event loop and returns immediately. The
engine is **not** ready at that moment, and a park loaded too early is silently undone
by the rest of start-up: the result is the engine's own empty default park, with a
ticking clock, a plausible date and no error anywhere.

That failure shipped briefly during V1-0 and was invisible to assertions that only
checked "a park loaded" and "time is passing". `GAME_READY` is therefore emitted only
after the engine's tick counter has been observed to advance, and the acceptance test
asserts the park's **name and ride count**, not merely that something opened.

## What is deliberately not here

`ACHIEVEMENT` and `CHALLENGE_RESULT` are named in the product plan and are not
implemented, because nothing produces them yet.

There is no message for arbitrary engine state, no scripting channel, and no way for
the web side to call into the simulation other than the seven functions above. Keep it
that way: every addition is a promise that becomes expensive to break.


## V1-6 lifecycle and content versions

`GAME_READY.contentVersion` is the SHA-256 of the shipped, development-stripped
`assets.zip`, written by `web/scripts/sync-game.mjs` to `/game/manifest.json`. The
runtime fetches that small manifest without caching and compares it with its installed
content version. Updating a scenario does not require an engine revision change.

`GameRuntime.exit()` now pauses Emscripten's main loop, stops SDL audio, terminates the worker pool,
releases the live `window.Module` reference, and clears bridge subscriptions. Save &
exit calls it **after** the park write finishes; the play view also calls it on cleanup.
Pending startup checks cancellation before starting the simulation. The initial save
timer and recurring poll/autosave timers are canceled on unmount.

The SDL silence timer runs independently of the main loop. Leaving it active after
exit keeps requesting audio activation and produces Firefox navigation-time promise
errors. Teardown cancels that timer, disconnects its processor and closes its audio
context. The browser regression retains a test-only module reference and verifies
that ticks stop, the pool is empty, audio closes, saved staff survive, and no browser
or console errors are emitted.

For Firefox screenshot checks in the Playwright Linux image, use a virtual display and
software WebGL (`HEADED=1`, `LIBGL_ALWAYS_SOFTWARE=1`). Headless Firefox in this image
can simulate successfully while failing to create a WebGL context. Rendering must be
checked separately; engine-state assertions alone are insufficient.


## Visible camera controls

`GameRuntime.panView(dx, dy)` calls `SunrisePanView`, translating screen pixels to
viewport units at the current zoom. Movement cancels automatic scrolling and entity
following, then uses the main window's normal saved-view update. `cameraAction`
uses native centre-preserving zoom and rotation, or `SunriseCentreView` to recover
an off-screen park. These operations do not change map objects or simulation state.

The web camera panel provides four directional controls, zoom, rotation, and home.
Move view enables a pointer-captured drag surface for mouse and touch, with arrow
keys and Escape. It shields construction from those gestures; Done moving, Escape,
or choosing a native top-toolbar tool restores normal interaction. Native right-drag
remains available when Move view is off. Collapsing the panel also ends drag mode.

Regression: `node wasm/test/webcamera.js http://localhost:3210` checks real camera
coordinates at desktop and phone widths, mouse/touch dragging, keyboard, zoom,
return-to-centre, panel collapse, native toolbar access, and save/reload. This does
not establish that every native construction window is usable on a phone.


## Smooth 3D presentation

`SunriseSceneJson(includeMap)` provides a read-only snapshot of the live park. Every
250 ms the view reads simulation ticks/pause state, cash, rating, guest and staff
positions/state/facing, ride identity/status, and train positions. Person rows are
`[entityId, x, height, y, isStaff, peepState, orientation]`, with coordinates in tile
units. State 8 is sitting; orientation uses 32 steps per turn. Every three seconds it also
reads all playable terrain rows, sampled surface corners, water, connected paths,
path additions, scenery, walls, entrances, and track endpoints. The static native
string replaces its previous contents rather than retaining one allocation per poll.
The frontend rebuilds geometry only when the topology/objects differ; moving guests
are instanced and coaster/carousel geometry is batched.

The browser renderer uses Three.js, same-origin resources, filtered terrain bump
mapping, antialiasing, an orthographic orbit camera, and rate-limited shadow updates.
It renders the current engine state, not the scenario JSON. Imported or edited parks
therefore use the same bridge as a new park. `SunriseViewAt` aligns the native camera
with manual 3D camera movement so construction and the camera lesson stay connected.
Pause uses the native pause action. Ride open/close uses the existing game action.

The 3D canvas and native canvas are separate. The native canvas remains laid out while
hidden, preserving SDL sizing and native screenshot/save behavior. Switching to
construction disposes the 3D renderer, pointer listeners, observer, frame loop,
textures and geometry. Returning to 3D obtains a fresh full snapshot. Failure to
initialize/read the 3D view exposes a construction-view fallback; no saves are
rewritten or converted.

Known limits: construction remains in the native 2D UI. The first 3D models simplify
ride mechanics and complex scenery. Coaster geometry uses native endpoints with
smooth curve interpolation, not the full native bank/inversion spline data. Flat
ride animation is illustrative and gated by open/paused state; it does not reproduce
every native operating-cycle phase. Trees now use branching/leaf geometry and guests
have articulated walking bodies; neither is photorealistic. Save thumbnails
are still captured from the native renderer. Large imported parks and every track
piece have not received visual acceptance testing.

Run `node wasm/test/web3d.js http://localhost:3210 [chromium|firefox|webkit]` for live
scene, camera, onboarding, pause, ride picking/status, construction synchronization,
read-only snapshot, and save/reload coverage. Chromium additionally checks touch input.

`node wasm/test/crowd.js` checks grounded and separate feet, walking interpolation,
changing leg poses, idle/pause stability, sitting, entity removal and 1,000-person
geometry updates. It uses the actual crowd module without a WebGL context; its CPU
timing is not a browser frame-rate benchmark.

The 3D crowd treats native person positions as destinations, not unconditional draw
positions. `crowd-motion.ts` separates body footprints, routes displaced guests along
connected paths and waits when a local move is blocked. This does not mutate the
native simulation or save data. Congested arrivals can wait for a free rendering
position; `data-scene-people` and `data-scene-waiting` distinguish drawn and pending
people. The native guest counter keeps its simulation meaning. Avoidance is tested
with head-on traffic, duplicate starting positions, connected corners, long frames,
pausing, sitting and different elevations in `wasm/test/crowd.js`.

### 3D construction

`SunriseBuildAction(json)` returns a static JSON string (do not free). Requests use
`op: path | queue | scenery | addition | ride | entrance | exit | removePath | removeScenery`,
`x`, `y`, `direction` (0–3), optional object identifier/ride ID, and `apply`.
Results contain `ok`, optional `error`, native currency-unit `cost`, `footprint`
(tile pairs for ride previews), and `rideId`/`needsEntrance` for new rides.

Queries do not create provisional rides or edit map/cash. Actual construction uses
native action queries for ownership, clearance and affordability, executes nested
synchronously, and applies the returned payment once. It intentionally permits
building while paused. Failed track placement rolls back the new empty ride.
The renderer refreshes a full map snapshot after each successful action; normal
save/load owns persistence. Custom track and terrain editing remain in the explicit
advanced editor.

`SunriseBuildAction` also supports `op: "design"` for bundled ready-built alpine, single-rail, and hybrid coasters, plus the drop tower. Queries return `footprint` and `tracks` (the normal SceneTrack schema), including a highlighted footprint on clearance errors. Only four known object IDs are allowed. Construction requires an entirely clear, level, owned footprint, places the whole layout transactionally, charges once, and returns `rideId` / `needsEntrance`. Object loading happens only on apply, so existing saves can use newly exposed bundled rides. Entrances, exits, queues, and opening use the existing operations.

For coaster `design` operations, optional `design: "ridge" | "serpent" | "grand"` selects the larger layout families. Unknown keys and tower/layout combinations are rejected. Queries also return `stats: { width, depth, pieces, height }`, with `height` in scene world units above terrain; the UI converts to metres by multiplying by 3. Rotation changes footprint dimensions and endpoints while retaining circuit closure. An absent design key continues to construct the compact layout for backward compatibility.

### RCT2 gameplay expansion in the 3D view

`SunriseSceneJson` now also returns `staff` (id, native role/state, swept/bin totals), `litter` rows `[id,x,height,z,type]`, and `wellbeing` (nausea >= 140 count, vomit patch count, average in-park happiness as percent). Litter types 0/1 are vomit. These are native entities, not decorative random effects. People rows append native action and staff type after the original seven fields; action 8 is throwing up. Ride summaries append `customers`, `queue`, `price`, `profit` and `broken`.

`GameRuntime.hireStaff` calls existing native `SunriseHireHandyman` / `SunriseHireMechanic`. Cleaners retain sweep/bin orders and mechanics retain inspection/repair orders. Construction recognizes native `isShopOrFacility`, replacing name-based native classification, and loads new bundled shops on application so older saves can use them. Preview does not load objects or spend money.

`sunrise.ride.log_flume` supports compact (no design), `ridge`, and `serpent` presets. Each creates a closed native log-flume circuit; native entrance, exit, path/queue connections are still required. These are three layouts of one actual water ride type. Shops/facilities now have thirteen picture-card choices; total build tools: 79 (76 construction choices plus three removal tools).
