# Ridemere

Browser-native theme-park management game built on an OpenRCT2-derived WebAssembly engine.
The standalone game runs without an RCT2 installation or proprietary game data.

Current stage: **V1 content integrated; release balancing and hardening remain.**
Three playable scenarios now offer five original flat rides, three open coasters,
36 guest appearances, shops, staff, scenery, sound effects, three music tracks and
local saves with a downloadable rescue copy if storage fails.

Choose First Park, Small Footprint or Growing Destination from **My parks**. Start a
new park for the expanded content; existing saves keep their original object set.
See [the latest status](docs/status.md), [ride content](docs/flat-rides.md), and
[the production plan](docs/v1-production-plan.md) for evidence and remaining work.

## Run the current game

With the standalone distribution already built:

```bash
cd web
npm install
npm run sync-game
npm run dev
```

Open http://localhost:3000/ and start First Park. Saves stay in this browser; no account
is required. Export a park from the parks screen to keep a separate copy.

Parks open in the smooth **3D view**. Drag to pan, scroll or pinch to zoom, and
right-drag to orbit. Click a ride or shop to open its controls. The camera buttons
also provide pan, zoom, rotation, and return-to-centre. Pause and sound controls are
in the header.

Choose **Build park** for the existing construction tools, then **View in 3D** to see
your changes. Both views use the same simulation and saves. Construction still uses
the original sprite renderer; this release adds a new presentation layer, not a
replacement construction editor.

In construction view, the **Camera** panel provides Move view for ordinary mouse or
touch dragging. Done moving or Escape restores building. Right-drag also pans.

## Rebuild

Requires Docker, Python, Node 22.18+, and the art pipeline dependencies described in
[the art pipeline](docs/art-pipeline.md). The engine is a Git submodule.

```bash
git submodule update --init
wasm/scripts/build.sh
wasm/scripts/build-standalone.sh
wasm/scripts/build-scenarios.sh
npm --prefix web run sync-game
npm --prefix web run build
```

Engine build details: [WASM](docs/wasm.md). Web hosting and isolation headers:
[browser hosting](docs/browser-hosting.md).

## Validation

```bash
bash wasm/test/run-m3-tests.sh
node wasm/test/webonboarding.js http://localhost:3000
node wasm/test/webmechanic.js http://localhost:3000
node wasm/test/webcamera.js http://localhost:3000
node wasm/test/web3d.js http://localhost:3000
```

The onboarding and mechanic browser tests also accept `firefox` or `webkit` as their second argument.
The camera check uses Chromium for desktop input and emulated touch gestures.

## Layout and licensing

`engine/openrct2/` contains the engine fork; `web/` the Next.js shell;
`assets/` the original content sources; `wasm/` build and browser tests;
`tools/art-pipeline/` content generators and validators; `docs/` design and evidence.

The engine and code linked into the WASM module are GPL-3.0. Asset provenance and
license obligations are documented in [licensing](docs/licensing.md).
No proprietary RCT2 data is committed or distributed.
