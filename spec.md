# Browser Theme Park Simulator

## OpenRCT2-Derived Engine — Agent-Ready Engineering & Product Spec

## 0. Mission

Build an original, browser-native theme-park management game using **OpenRCT2 as the simulation-engine foundation**.

The finished product must:

* run directly in a modern browser;
* require no installation;
* eventually require no RollerCoaster Tycoon 2 installation or proprietary RCT2 assets;
* use original branding, graphics, music, sound effects, scenarios, names, UI presentation, and creative content;
* preserve the deep simulation strengths of OpenRCT2;
* later add browser-native features such as accounts, cloud saves, public parks, coaster sharing, community scenarios, and challenges.

This is **not** a task to clone the RCT2 brand or redistribute RCT2.

The goal is:

```text
OpenRCT2-derived simulation engine
             +
our original assets/content
             +
browser/WebAssembly runtime
             +
modern web platform
             =
our own browser theme-park simulator
```

---

# 1. Critical Phase Gate

Do NOT begin custom artwork, new gameplay systems, web accounts, cloud saves, monetization, community systems, or UI redesign until the browser-engine proof-of-concept passes.

The first engineering question is:

> Can the current OpenRCT2 codebase be compiled to WebAssembly, launched reliably in modern Chrome, load a park, simulate it correctly, accept keyboard/mouse input, play audio, and save/load through browser-backed storage?

Only after this works do we proceed.

---

# 2. Upstream Projects

Use:

## Primary engine

```text
OpenRCT2/OpenRCT2
```

Fork the current upstream repository.

Do not fork an arbitrarily old version simply because an old WASM experiment used it.

## Browser reference

Study:

```text
Mstrodl/ORCT2-web
```

Use it to understand:

* Emscripten build configuration;
* browser patches;
* SDL behavior;
* filesystem behavior;
* dependency issues;
* compile flags;
* runtime bootstrapping.

Do NOT assume its patches are current or production-ready.

Port concepts rather than pinning our entire project permanently to its old OpenRCT2 snapshot.

## Replacement-asset reference

Study:

```text
OpenRCT2/OpenGraphics
OpenRCT2/OpenSoundEffects
OpenRCT2/OpenMusic
```

These are references for understanding the asset surface and tooling.

Our commercial/original asset library should be independently created unless we explicitly decide to adopt compatible open assets after reviewing their licenses.

---

# 3. Licensing Boundary

OpenRCT2-derived engine code remains subject to its GPL licensing requirements.

Maintain:

```text
LICENSE
NOTICE / attribution where required
source availability
engine source repository
build instructions
```

Do NOT:

* remove required copyright/license notices;
* present OpenRCT2-derived engine code as proprietary;
* distribute original RCT/RCT2 graphics;
* distribute original RCT/RCT2 music;
* distribute original RCT/RCT2 sound effects;
* distribute proprietary scenarios;
* copy the RollerCoaster Tycoon name/logo;
* copy original RCT2 UI artwork;
* copy proprietary ride/scenery artwork.

Keep an explicit boundary between:

```text
engine/
    GPL-derived code

assets/
    our independently created assets

web/
    web-platform/application code
```

Document licensing of every external asset/package.

---

# 4. Repository Layout

Prefer:

```text
themepark/
│
├── engine/
│   └── openrct2/
│
├── web/
│   ├── app/
│   ├── public/
│   └── src/
│
├── wasm/
│   ├── patches/
│   ├── cmake/
│   ├── scripts/
│   └── runtime/
│
├── assets/
│   ├── source/
│   ├── generated/
│   ├── manifests/
│   └── tools/
│
├── tools/
│   ├── asset-audit/
│   ├── sprite-build/
│   └── packaging/
│
├── docs/
│   ├── architecture.md
│   ├── wasm.md
│   ├── asset-dependencies.md
│   ├── licensing.md
│   ├── roadmap.md
│   └── status.md
│
└── README.md
```

A monorepo is preferred unless upstream tooling makes another layout materially cleaner.

---

# 5. Major Architecture

The game simulation remains C++/OpenRCT2-derived.

Do NOT rewrite simulation systems in JavaScript/React.

Architecture:

```text
Web application
      │
      ├── homepage
      ├── account
      ├── park library
      ├── community
      └── /play
            │
            ▼
      WebAssembly runtime
            │
            ▼
      OpenRCT2-derived engine
            │
      ┌─────┼─────┐
      │     │     │
 simulation UI  audio
      │
 browser virtual filesystem
```

The web application and game runtime communicate through a **small explicit bridge**.

---

# 6. Web/WASM Bridge

Do not expose arbitrary C++ internals to JavaScript.

Define a stable small bridge.

Possible web → game commands:

```text
initializeGame()
loadPark(path)
newScenario(id)
saveGame()
setVolume(...)
setLocale(...)
pauseGame()
resumeGame()
```

Possible game → web events:

```text
GAME_READY
GAME_ERROR

SAVE_CREATED
SAVE_FAILED

PARK_LOADED

SCENARIO_STARTED
SCENARIO_COMPLETED

SCREENSHOT_READY
```

Later:

```text
ACHIEVEMENT_UNLOCKED
CHALLENGE_COMPLETED
```

The bridge should use JSON/simple values or explicit binary buffers.

Avoid creating a giant bidirectional API exposing every guest and ride.

---

# 7. Rendering

Initially preserve whatever rendering path is easiest to compile and validate under Emscripten.

Do NOT redesign rendering during browser proof-of-concept.

Investigate:

```text
SDL2
software renderer
WebGL-capable path
Canvas output
```

Record:

* frame rate;
* CPU usage;
* memory usage;
* canvas scaling behavior;
* fullscreen behavior;
* high-DPI behavior.

Target browsers initially:

```text
Chrome desktop
Edge desktop
Firefox desktop
Safari desktop
```

Chrome is the first acceptance target.

Mobile/touch is later.

---

# 8. Browser Filesystem

Desktop OpenRCT2 expects filesystem access.

Provide an Emscripten/browser-backed virtual filesystem.

Investigate/prefer:

```text
OPFS
```

when practical.

Use IndexedDB-backed filesystem where necessary for compatibility.

Logical layout:

```text
/game/
    config/
    saves/
    scenarios/
    objects/
    screenshots/
    assets/
```

Persist:

```text
configuration
local saves
imported development assets
custom scenarios
custom objects
```

Ensure browser refresh does not destroy saves.

---

# 9. Development Asset Import

For the initial browser proof-of-concept ONLY, support the developer selecting a legally owned RCT2 directory/files.

Do not upload those files to our server.

Desired flow:

```text
browser starts
     ↓
required development assets missing
     ↓
Select RCT2 Files/Folder
     ↓
browser reads locally
     ↓
copies required data into local browser storage
     ↓
OpenRCT2 launches
```

This is temporary development functionality.

The finished standalone product must not require this.

---

# 10. Networking

Do NOT implement OpenRCT2 multiplayer during the first browser milestones.

Browser networking differs from desktop networking.

Later investigate:

```text
WebSocket gateway
OpenRCT2 multiplayer protocol adaptation
browser-compatible transport
```

But exclude networking from M0–M9 unless required by unrelated build code.

---

# 11. Audio

M0/M1 goal:

Make current audio work in browser with development assets.

Later:

replace all proprietary:

```text
music
ride sounds
guest sounds
ambient sounds
UI sounds
mechanical sounds
```

with original content.

Audio architecture must support browser autoplay restrictions.

Game should not fail because audio cannot start before user interaction.

---

# 12. Save Files

Initial browser build should read/write normal compatible park save data where practical.

Test:

```text
create/load park
modify park
save
refresh browser
load save
verify modifications
```

Later cloud saves should treat the save file as opaque binary data where possible.

Do not reproduce simulation state separately in the web database.

---

# 13. Web Platform Technology

After browser engine viability is proven:

```text
Next.js
TypeScript
Tailwind
shadcn/ui
Better Auth
Neon PostgreSQL
Drizzle
Cloudflare R2
Vercel
```

The browser executes the simulation.

Server infrastructure does NOT continuously simulate parks.

---

# 14. Web Database Purpose

Postgres stores platform metadata:

```text
users
parks
park_owners
park_publications

coaster_blueprints
scenarios

challenges
challenge_entries

favorites
likes

reports

cloud_save_metadata
```

R2 stores:

```text
park save files
screenshots
coaster files
scenario files
share images
```

Do NOT store park simulation entities in PostgreSQL.

---

# 15. Original Art Direction

Target the previously approved direction:

* colorful;
* warm;
* polished;
* isometric;
* readable;
* detailed without becoming visually noisy;
* modernized compared with 1990s pixel art;
* still suitable for large simulated crowds;
* clearly original.

Do not imitate RCT2 sprite artwork directly.

---

# 16. Asset Production Strategy

Use 3D-assisted sprite production where practical.

Pipeline:

```text
Blender source model
        ↓
fixed isometric camera
        ↓
controlled lighting
        ↓
render rotations / animation frames
        ↓
post-process
        ↓
sprite atlas
        ↓
game object package
```

This should allow repeatable art generation rather than manually painting every frame.

Preserve source `.blend`/equivalent files.

---

# 17. Asset Source Rules

Every asset must have provenance.

Maintain manifest:

```text
asset_id
type
source_file
creator
license
generated_files
generation_tool
notes
```

Do not use:

* ripped RCT sprites;
* traced RCT assets;
* proprietary sound samples;
* copied amusement-park branding;
* unlicensed stock content.

---

# 18. Replacement Asset Categories

Create an audit of everything the engine currently expects from proprietary RCT2 assets.

At minimum classify:

```text
terrain
water
paths
path additions
walls
fences

trees
shrubs
flowers
small scenery
large scenery

shops
stalls
facilities

park entrances

guests / peeps
staff

flat rides
ride vehicles
coaster trains

roller-coaster track
ride track pieces

UI graphics
icons
fonts

sound effects
music

scenarios

object definitions
miscellaneous graphics
```

Do not guess completeness.

Generate the list from actual engine/runtime dependencies.

---

# 19. Asset Dependency Audit Tool

Build a tool/script that records asset dependencies at runtime/build time where possible.

Generate:

```text
docs/asset-dependencies.md
```

For each required proprietary dependency:

```text
identifier
category
used by
replacement status
replacement asset ID
blocking/non-blocking
```

Example:

```text
CATEGORY: guest sprites
STATUS: proprietary dependency
REPLACEMENT: not started
BLOCKS standalone build: YES
```

The standalone release gate is:

```text
0 proprietary RCT/RCT2 runtime dependencies
```

---

# 20. Initial Original Asset Pack

Do not attempt content parity with RCT2.

Target a deliberately small standalone game.

## Terrain

```text
grass
dirt
sand
stone
water
```

## Paths

At least:

```text
basic paved
wood
decorative stone
```

## Scenery

Approximately:

```text
10 trees
10 shrubs/flowers
8 fences/walls
15 decorative props
```

## Facilities

```text
burger shop
drink shop
snack shop
restroom
information
first aid if engine requires/supports
```

## Flat rides

Initially target:

```text
carousel
ferris wheel
bumper cars
swing ride
```

Exact rides may change based on replacement complexity.

## Coasters

Initially target approximately:

```text
junior coaster
wooden coaster
steel coaster
```

Do not expose coaster types lacking complete replacement visuals.

## Staff

```text
janitor
mechanic
security
entertainer if practical
```

## Guests

One modular original guest system with visual variation.

---

# 21. Guest/Peeps Asset Pipeline

This is a major workstream.

Create original simplified characters.

Possible modular model:

```text
base body
skin
hair
shirt
pants/skirt
hat/accessory
```

Generate sprite combinations from controlled variants.

Required initial animations should be determined by engine use, likely including:

```text
walking
standing
sitting
queueing
eating
drinking
carrying items
ride-specific poses where necessary
```

Do not manually produce thousands of unrelated guest images if a procedural pipeline can generate them.

---

# 22. Ride Vehicle Asset Pipeline

Vehicles need:

```text
orientation
pitch
bank
animation/state
passenger occupancy where required
```

Create automated rendering/export tooling.

Do not hard-code an art pipeline for one coaster.

The pipeline should accept:

```text
vehicle model
camera definitions
required rotations
animation definitions
materials
```

and produce game-ready sprites.

---

# 23. Coaster Track Asset Pipeline

Treat coaster tracks as a dedicated engineering/art subproject.

Do NOT manually draw every piece.

Goal:

```text
track-piece definition
        ↓
3D geometry generation/import
        ↓
materials/support system
        ↓
isometric renderer
        ↓
required sprite set
        ↓
atlas/object package
```

Cover:

```text
straight
turns
slopes
stations
lift hills
brakes
loops
corkscrews
helices
special pieces
```

Begin with only the pieces needed by the first supported coaster types.

If full compatibility requires far more pieces, explicitly scope them.

---

# 24. Original Branding

Do not call the finished game:

```text
RollerCoaster Tycoon
RCT
RCT2
OpenRCT2 Online
```

except when factually describing the upstream engine/source relationship where required.

Working project codename may be:

```text
Project Sunrise
```

Final brand will be selected separately.

Place branding strings behind configuration where practical.

---

# 25. Game UI Strategy

Do NOT replace all OpenRCT2 UI immediately.

Phases:

```text
Phase A:
existing UI running in browser

Phase B:
our fonts/colors/icons

Phase C:
larger navigation redesign

Phase D:
browser-first responsive/touch improvements
```

Target eventual layout:

```text
TOP
Money
Rating
Guests
Date/time
Speed controls

LEFT
Build
Rides
Paths
Scenery
Shops
Staff

BOTTOM
Contextual details
Alerts
Tips
Selected object
```

Do not sacrifice simulation functionality merely to redesign UI.

---

# 26. Browser-Native Product Features

Once standalone engine/content exists, add:

```text
accounts
cloud saves
public parks
park discovery
shared coaster designs
shared scenarios
weekly challenges
favorites
featured parks
park screenshots
```

Do NOT implement these before engine and standalone asset viability.

---

# 27. Public Park Model

Long-term:

```text
ourgame.com/parks/[slug]
```

Page contains:

```text
park name
creator
description
screenshot
guest count at publish/save time
rating
rides
coasters
created date
updated date

[Open Park]
```

Opening the park loads its save into WASM.

By default visitors should open published parks in:

```text
view/copy mode
```

Do not mutate the owner's canonical park.

---

# 28. Park Publishing

Workflow:

```text
player saves park
      ↓
Publish
      ↓
create screenshot
      ↓
upload save to R2
      ↓
store metadata
      ↓
public URL
```

Support updates/versioning later.

---

# 29. Coaster Sharing

Long-term:

```text
/blueprints/[slug]
```

Blueprint metadata:

```text
name
creator
ride type
cost
stats
preview
file
created_at
```

User action:

```text
Add to My Park
```

Loads blueprint into game.

Uploaded content must be validated before distribution.

---

# 30. Challenges

Eventually support deterministic community challenges.

Example:

```text
Tiny Island Challenge

Starting money: $10,000
Land: fixed
Scenario: fixed

Goal:
1,500 guests
90% rating

Deadline:
Sunday
```

Challenge submissions must include enough information to validate results.

Do not trust a client-provided score blindly.

Validation architecture can be designed later.

---

# 31. Security

WASM/browser engine processes potentially user-uploaded:

```text
save files
scenarios
object files
coaster blueprints
```

Treat all as untrusted input.

Before public file sharing:

* enforce size limits;
* validate file type/format;
* reject malformed files;
* sanitize metadata;
* avoid unsafe filesystem paths;
* test parser behavior;
* prevent directory traversal;
* prevent arbitrary file access.

Do not expose browser/server secrets to WASM.

---

# 32. Performance Targets

Initial desktop-browser target:

```text
60 FPS preferred
30 FPS minimum acceptable under heavy simulation
```

Test:

```text
small park
medium park
large park
5,000+ guests if supported
many rides
high zoom
low zoom
```

Measure separately:

```text
simulation CPU
render CPU/GPU
WASM memory
asset loading time
initial bundle size
save/load latency
```

Do not optimize blindly.

Profile.

---

# 33. Loading Strategy

A 250MB+ initial browser download is undesirable.

Eventually split assets into:

```text
core required assets
scenario content
optional asset packs
```

Investigate:

```text
HTTP caching
service worker
compressed bundles
lazy loading
CDN
```

Do not prematurely implement sophisticated streaming during M0.

First measure actual output size.

---

# 34. Offline Capability

Eventually desirable:

```text
first load online
↓
cache engine + core assets
↓
game can reopen offline
```

Not required for first proof-of-concept.

Architecture should not intentionally prevent it.

---

# 35. Mobile / Touch

Not part of early milestones.

Long-term investigate:

```text
touch camera controls
pinch zoom
touch-friendly build controls
larger UI
mobile memory limits
tablet mode
```

Desktop browser is first.

---

# 36. Testing Strategy

## Native engine tests

Preserve upstream tests.

## WASM smoke tests

Automate where possible:

```text
WASM initializes
filesystem mounts
game reaches ready state
test save loads
simulation advances
save succeeds
```

## Browser tests

Use Playwright for web/runtime integration where feasible.

Test:

```text
load /play
WASM downloads
game boots
canvas appears
browser storage mounts
reload preserves data
```

Visual/manual gameplay tests remain necessary.

---

# 37. Upstream Maintainability

Avoid enormous invasive patches where possible.

Maintain:

```text
upstream OpenRCT2 remote
our fork remote
```

Document every browser-specific patch.

Prefer:

```text
small focused commits
isolated platform abstractions
feature flags
Emscripten-specific implementations
```

over scattering:

```cpp
#ifdef __EMSCRIPTEN__
```

through hundreds of files.

Goal:

> Pulling upstream OpenRCT2 changes should remain possible.

---

# 38. Browser Platform Abstraction

Where desktop APIs are unavailable, introduce explicit abstractions.

Likely areas:

```text
filesystem
dialogs
clipboard
network
process/environment
file picker
browser storage
URL opening
audio initialization
window management
```

Create browser implementations rather than special-casing behavior everywhere.

---

# 39. Error Handling

Browser build must show understandable failures.

Examples:

```text
Game failed to initialize.

Required development assets were not found.

[Select Files]
```

or:

```text
Unable to access browser storage.

Your park can run, but saves may not persist.
```

Do not leave users with raw C++/Emscripten console errors.

---

# 40. Logging

Create logging levels:

```text
ERROR
WARN
INFO
DEBUG
```

For development expose useful logs in browser console.

Do not spam production console with every simulation tick.

---

# 41. Milestones

## M0 — Current Browser Build Feasibility

Goal:

Compile a current OpenRCT2 fork using Emscripten.

Tasks:

1. Fork current upstream OpenRCT2.
2. Clone ORCT2-web for reference.
3. Identify its exact upstream revision.
4. Enumerate every patch it applies.
5. Determine which patches are still necessary.
6. Install/pin Emscripten toolchain.
7. Produce reproducible build script/container.
8. Compile current OpenRCT2 to WASM.
9. Serve locally.
10. Reach game initialization in Chrome.

Deliverable:

```text
engine.wasm
JS runtime glue
HTML launcher
documented reproducible build
```

PASS if OpenRCT2 reaches usable runtime.

Do not continue automatically.

---

# 42. M1 — Playable Browser Proof

Goal:

Actually play a park.

Using developer-owned local RCT2 data only:

1. Implement/select development asset import.
2. Initialize asset filesystem.
3. Load existing test save.
4. Render park.
5. Run simulation.
6. Keyboard/mouse interaction.
7. Camera movement.
8. Open menus.
9. Build/remove something.
10. Run game speed controls.
11. Validate audio.

PASS requires genuine gameplay, not merely rendering the main menu.

---

# 43. M2 — Browser Persistence

Goal:

Browser-native save/load.

Implement:

```text
persistent virtual filesystem
save park
load park
reload browser
load saved park again
configuration persistence
```

Test browser refresh/restart.

Document storage technology chosen.

---

# 44. M3 — Browser Architecture Hardening

Goal:

Turn proof-of-concept patches into maintainable architecture.

Refactor:

```text
platform abstractions
filesystem
dialogs
runtime lifecycle
JS/WASM bridge
errors
logging
```

Add:

```text
automated browser smoke test
CI WASM build
```

At completion we should have a maintainable browser fork, not a hack.

---

# 45. M4 — Proprietary Dependency Audit

Goal:

Know exactly what blocks standalone distribution.

Create automated/manual complete inventory.

Produce:

```text
docs/asset-dependencies.md
```

Classify:

```text
already open
provided by OpenRCT2
proprietary RCT2
optional
required
```

Do NOT begin large-scale replacement before this report.

---

# 46. M5 — Original Audio + Basic Content

Replace easier categories first:

```text
music
sound effects
UI sounds
basic terrain
basic paths
basic scenery
shops/stalls
UI icons where appropriate
```

Introduce original asset pipeline.

Track remaining dependencies.

---

# 47. M6 — Original Guests + Staff

Build procedural/modular guest and staff pipeline.

Replace required sprites.

Verify:

```text
walking
queues
shops
benches
ride interactions
staff jobs
```

No original RCT2 peep artwork remains.

---

# 48. M7 — Original Flat Rides

Create first complete set of original flat rides.

The engine may derive behavior from existing ride implementations, but creative assets/names/content must be original.

Verify all required animation states.

---

# 49. M8 — Original Coaster System

Highest-risk content milestone.

Implement:

```text
coaster track sprite pipeline
ride vehicles
stations
supports
animations
```

Support only a small initial coaster subset if necessary.

Do not attempt full RCT2 content parity.

---

# 50. M9 — Standalone Gate

This is the critical product milestone.

Test on a clean environment with:

```text
NO RCT2 installation
NO RCT1 installation
NO proprietary asset bundle
```

The game must:

```text
boot
create new park
render all exposed assets
build rides
simulate guests
play audio
save
reload
```

Run dependency audit again.

PASS only if:

```text
proprietary runtime dependencies = 0
```

At this point the project becomes a standalone original game.

---

# 51. M10 — Brand/UI Overhaul

Only now invest significantly in branded product experience.

Implement:

```text
game name/logo
our UI theme
new icons
new menu layout
browser-focused controls
loading experience
homepage integration
```

Do not destabilize simulation.

---

# 52. M11 — Web Accounts + Cloud Saves

Implement web platform:

```text
Next.js
Better Auth
Neon
Drizzle
R2
```

Cloud save flow:

```text
browser local save
       ↓
JS/WASM bridge
       ↓
upload to R2
       ↓
metadata in Postgres
```

Users can have multiple parks.

---

# 53. M12 — Public Park URLs

Implement:

```text
publish park
public park page
screenshot
metadata
Open Park
Fork/Copy Park
```

Do not allow viewers to overwrite owner's save.

---

# 54. M13 — Coaster + Scenario Sharing

Implement:

```text
coaster library
scenario library
search
download/import
reporting
validation
```

---

# 55. M14 — Challenges + Community

Implement:

```text
weekly challenges
featured parks
likes/favorites
creator profiles
challenge results
```

Avoid turning it into generic social media.

The game remains primary.

---

# 56. M15 — Browser Multiplayer Research

Only after single-player platform succeeds.

Investigate:

```text
OpenRCT2 network protocol
browser limitations
WebSocket translation
server architecture
synchronization
anti-cheat concerns
```

Write ADR before implementation.

---

# 57. Explicit Non-Goals Before M9

Do NOT implement:

```text
multiplayer
mobile app
touch UI redesign
subscriptions
microtransactions
virtual currency
park marketplace
NFTs
real-world theme park branding
licensed coaster manufacturers
AI guests
AI-generated gameplay
3D engine rewrite
new simulation engine
persistent server-side simulation
```

---

# 58. Product Direction After Standalone Gate

Once M9 passes, the product should increasingly differentiate from RCT2 through web-native features.

Potential differentiators:

```text
instant browser play
cloud parks
public URLs
visit/copy parks
coaster blueprints
community scenarios
weekly challenges
creator profiles
shared parks
later multiplayer
```

Eventually:

```text
Player builds Sunrise Grove
        ↓
Publish
        ↓
ourgame.com/park/sunrise-grove
        ↓
another player opens actual park
        ↓
copies coaster
        ↓
adds it to their own park
        ↓
publishes improved version
```

This is the long-term distribution loop.

---

# 59. Important Product Principle

Do not attempt to beat modern 3D park simulators graphically.

Compete on:

```text
deep simulation
instant access
clarity
charm
speed
user-created content
sharing
community
low hardware requirements
```

The game should launch faster than a modern desktop game and still provide a deep park simulation.

---

# 60. First Agent Assignment

Implement **M0 only**.

Do NOT proceed to M1 automatically.

## Required work

### A. Repository investigation

Inspect:

```text
current OpenRCT2 upstream
ORCT2-web
```

Document:

```text
current upstream commit
ORCT2-web upstream/base revision
ORCT2-web patches
browser-specific dependencies
known blockers
```

### B. Reproducible toolchain

Pin:

```text
Emscripten version
CMake version if necessary
build dependencies
```

Prefer Docker/Podman or an equivalent reproducible environment.

Do not depend on undocumented global developer-machine packages.

### C. Current-engine port

Attempt to compile CURRENT OpenRCT2.

Do not downgrade to ORCT2-web's old OpenRCT2 revision merely to get a green build.

When a compile error occurs:

1. understand why;
2. determine whether upstream changed;
3. create smallest maintainable compatibility patch;
4. document it.

### D. Browser target

Produce local browser launcher.

Minimum:

```text
localhost
↓
load JavaScript runtime
↓
load WASM
↓
initialize engine
```

### E. Patch isolation

Store browser patches cleanly.

Prefer upstreamable/platform abstractions.

Do not make unrelated gameplay modifications.

### F. CI

If practical during M0, add:

```text
WASM compile check
```

If complete browser CI is premature, document exact next step.

---

# 61. M0 Acceptance Criteria

M0 is PASS only if:

1. A current OpenRCT2-derived commit compiles under Emscripten.
2. Build is reproducible from documented commands.
3. WASM loads in Chrome.
4. Engine enters runtime far enough to demonstrate browser viability.
5. Required missing assets/files result in understood/documented behavior rather than an unexplained crash.
6. Browser-specific patches are documented.
7. No proprietary RCT2 files are committed.
8. Upstream OpenRCT2 remains recognizable/mergeable rather than being heavily rewritten.
9. License notices remain intact.
10. `docs/status.md` clearly says PASS, PARTIAL, or FAIL with evidence.

If full runtime cannot be reached, do not fake success.

Report the exact blocker.

---

# 62. Required M0 Documentation

Create:

```text
docs/wasm.md
```

Include:

```text
toolchain
build commands
runtime architecture
filesystem notes
SDL/browser notes
audio notes
patch list
known limitations
```

Create:

```text
docs/asset-dependencies.md
```

For M0 this may be preliminary.

Create/update:

```text
docs/status.md
```

Include evidence.

---

# 63. M0 Tests

At minimum verify:

```text
clean build
incremental rebuild
WASM artifact generated
browser page loads
WASM initializes
console checked for fatal errors
```

If runtime reaches UI/game:

also verify:

```text
mouse input
keyboard input
resize
simulation
```

---

# 64. M0 Completion Report

Return:

```text
VERDICT
PASS / PARTIAL / FAIL

UPSTREAM
OpenRCT2 commit:
ORCT2-web reference commit:

TOOLCHAIN
Emscripten:
CMake:
Compiler/runtime:

FILES CHANGED

PATCHES REQUIRED

BUILD COMMANDS

WASM OUTPUT
size
compressed size if measured

BROWSER RESULT

WHAT WORKS

WHAT DOES NOT WORK

ASSET REQUIREMENTS

PERFORMANCE OBSERVATIONS

LEGAL/LICENSING OBSERVATIONS

TESTS RUN

KNOWN BLOCKERS

RECOMMENDED M1 PLAN
```

Do not start M1.

---

# 65. Decision Gate After M0

We proceed only if browser viability is credible.

Good outcome:

```text
current OpenRCT2
      ↓
small maintainable patch set
      ↓
Emscripten
      ↓
browser runtime works
```

Bad outcome:

```text
massive engine rewrite required
or
critical systems fundamentally incompatible
or
upstream updates effectively impossible
```

If outcome is bad, report it rather than forcing the architecture.

---

# 66. Definition of Ultimate Technical Success

The project eventually passes this test:

A new user on a computer with no RCT/RCT2 installation visits:

```text
ourgame.com/play
```

They click:

```text
PLAY
```

The browser loads:

```text
our OpenRCT2-derived engine
+
our assets
+
our scenarios
+
our sounds/music
```

They build a park, run it, save it, close the browser, return later, and continue playing.

No:

```text
installer
Steam
RCT2 purchase
asset import
desktop executable
```

is required.

That is the target.
