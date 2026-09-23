# Licensing

Intent (decided 2026-09-22): the OpenRCT2-derived engine, and everything compiled or linked into the distributed
WASM module, is **GPL-3.0**. The product's differentiation is brand, original art/audio, scenarios, the web
platform and community, not a proprietary engine.

## Boundaries

| Tree | Contents | License posture |
|---|---|---|
| `engine/openrct2/` | Upstream OpenRCT2 (git submodule of our fork). | GPL-3.0. Keep `licence.txt`, `contributors.md`, copyright headers intact. Source stays public. |
| `wasm/` | Build wrappers, dev server, tests. Anything here that is compiled or linked into `openrct2.wasm`/`openrct2.js` (none yet) is GPL-3.0 as a derivative. Scripts that only drive the build are not derivatives, but are published under the repo license anyway. | GPL-3.0 (repo default until decided otherwise) |
| `assets/` (future) | Independently created assets. Data files loaded at runtime are not linked into the engine. | Ours; may be proprietary. Must not be derived from RCT2 or from GPL/CC-BY-SA assets unless we accept those terms for that asset. |
| `web/` (future) | Next.js platform. Communicates with the engine only through the JS bridge over `postMessage`/function calls. | Ours. Keep bridge glue that ships *inside* the Emscripten module on the GPL side. |

## Third-party components used by the M0 browser build

| Component | Version | License | Where | Obligations |
|---|---|---|---|---|
| OpenRCT2 engine | d99eb5dcf7 | GPL-3.0 | `engine/openrct2`, `openrct2.wasm/js` | source availability, notices, GPL for derivatives |
| Emscripten toolchain + ports (SDL2, zlib, bzip2, libpng) | 5.0.0 | MIT/zlib/BSD-style | linked into `openrct2.wasm` | attribution in NOTICE |
| ICU, libzip, zstd (from the build container) | container `26-emscripten` | ICU/BSD-3/BSD | linked into `openrct2.wasm` | attribution |
| nlohmann/json, duktape, other upstream deps | per upstream | MIT | linked | attribution |
| OpenRCT2/objects | v1.7.11 | CC-BY-4.0 | `assets.zip: object/` | attribution |
| OpenRCT2/title-sequences | v0.4.26 | CC-BY-4.0 | `assets.zip: sequence/` | attribution |
| OpenRCT2/OpenSoundEffects | v1.0.6 | code MIT; sounds CC-BY-4.0 | `assets.zip: assetpack/openrct2.sound.parkap` | attribution |
| OpenRCT2/OpenMusic | v1.6.1 | CC-BY-SA-4.0 (some tracks public domain) | `assets.zip: assetpack/openrct2.music.*.parkap` | attribution; **share-alike** for derivatives of these tracks; do not present as our original music |
| OpenRCT2/libsawyer `gxc` | v1.4.0 | MIT | build tool only, not shipped | none for output |
| JSZip | 3.10.1 | MIT | loaded from jsdelivr by `index.html` | attribution if vendored |
| OpenRCT2/OpenGraphics | 930b014 (2026-01) | **GPL-3.0** (art under GPL) | not used: 19 objects / 82 sprites, no g1 replacement, and the engine ignores its graphics asset pack (see `open-graphics-coverage.md`) | if any of it is ever adopted, those sprites are GPL and bind derivatives; keep separate from our packs |
| OpenRCT2/Blender-RCT-Graphics add-on | v0.6.1 | GPL-3.0 | reference for our own render pipeline (camera, lighting, palette settings) | using its *settings* is fine; copying its code makes our tooling GPL (acceptable for tools, but keep tools and assets separate) |
| X7123M3-256/TrackRender | 2023 | **no licence file** | reference only | not reusable; do not copy |
| `openrct2.ride.{hybrid_coaster,single_rail_coaster,modern_twister,alpine_coaster}` | objects v1.7.11 | CC-BY-4.0 (authors incl. Edward Calver) | complete open coaster track + train sprites, candidate V1 coasters | attribution in credits |
| `rct2dlc.ride.zpanda` (junior RC trains) | objects v1.7.11 | in the CC-BY repo but authored by Chris Sawyer / Simon Foster (RCT2 DLC) | **do not ship**: provenance is original-game art | |
| Custom objects embedded in the title-sequence parks | title-sequences v0.4.26 | per-object, mostly unstated | not shipped in our title sequence | |

## Consequence for the "two victories" plan

Stage A ("standalone open-content game") cannot lean on OpenGraphics: nearly all open art usable today is the
four coasters above plus sounds and music. Everything else in Stage A is already **our** art, so the Stage A /
Stage B split is about *when* we replace the four CC-BY coasters and the CC-BY-SA music, not about a large
GPL/CC layer underneath our game. That keeps the licensing surface small: engine GPL, four CC-BY ride objects,
CC-BY sounds, CC-BY-SA music, everything else ours.

## Proprietary data

No RCT / RCT2 files are committed, downloaded, or bundled. The M0/M1 browser build reads a developer's own
RCT2 installation from a zip they select locally; it stays in that browser's IndexedDB (`/RCT`).
`.gitignore` excludes `engine/openrct2/build/` and `.cache/`.

## Naming

"OpenRCT2" and "RollerCoaster Tycoon" appear in this repo only to describe the upstream engine and the data
it expects. Product branding is a separate, later decision (working codename per spec: Project Sunrise).
