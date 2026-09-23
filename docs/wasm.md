# Browser (WebAssembly) build

Status: M0 characterization of **upstream OpenRCT2's official Emscripten target**. See `status.md` for the
verdict and evidence. Nothing in `engine/openrct2` is modified: the browser build is upstream's, unchanged.

## Toolchain (pinned)

| Item | Value |
|---|---|
| Engine | `OpenRCT2/OpenRCT2` `develop` @ `d99eb5dcf784b928f994ec178ea977bd7089408a` (`v0.5.5-98-gd99eb5dcf7`, 2026-09-22) |
| Build container | `ghcr.io/openrct2/openrct2-build:26-emscripten` (digest `sha256:0e1daa8e3f5a1c6951179aeab5c5de471ea705cb5f756bfb6e0ae5162b7e67be`, built 2026-02-20). Same image upstream CI uses. |
| Emscripten | 5.0.0 (`a7c5deabd7c88ba1c38ebe988112256775f944c6`) |
| CMake / Ninja | 3.31.6 / 1.12.1 (inside the container) |
| Node (emsdk) | 22.16.0 |
| Sprite tables | `gxc` from `OpenRCT2/libsawyer` v1.4.0 (`libsawyer-tools-linux-x64.tar.gz`), downloaded by `wasm/scripts/build-assets.sh` |
| Host | Docker 29.x. No host compiler, CMake or emsdk needed. |

Reference only, not a base: `Mstrodl/ORCT2-web` (last push 2024-05-16). Its work was upstreamed; upstream's
`emscripten/` directory supersedes it.

## Build commands

```bash
# 1. engine + JS glue  ->  engine/openrct2/build/www/{openrct2.wasm,openrct2.js,openrct2.zip,index.html,index.js}
wasm/scripts/build.sh          # runs upstream scripts/build-emscripten inside the pinned container

# 2. engine data  ->  engine/openrct2/build/www/assets.zip   (no RCT2 data involved)
wasm/scripts/build-assets.sh

# 3. serve with cross-origin isolation headers (required, see Threading)
python3 wasm/scripts/serve.py engine/openrct2/build/www 8080   # http://localhost:8080/

# 4. automated Chrome smoke test  ->  wasm/test/results/smoke.json + screenshots
cd wasm/test && npm install && node smoke.js
```

`build.sh` is a thin wrapper: it mounts the engine checkout, sources `scripts/setenv`, runs `build-emscripten`
and `chown`s the output. It uses a ccache directory under `.cache/` for incremental rebuilds.

What upstream's `build-emscripten` does (for reference, unchanged):

- `emcmake cmake -G Ninja` with `DISABLE_NETWORK DISABLE_OPENGL DISABLE_HTTP DISABLE_TTF DISABLE_FLAC DISABLE_DISCORD_RPC`
- Emscripten flags: `USE_SDL=2 USE_ZLIB USE_BZIP2 USE_LIBPNG -pthread -O3`
- Link flags: `ALLOW_MEMORY_GROWTH INITIAL_MEMORY=2GB MAXIMUM_MEMORY=4GB STACK_SIZE=8MB PTHREAD_POOL_SIZE=120
  MODULARIZE EXPORT_NAME=OPENRCT2_WEB -lidbfs.js`, exported: `_main`, `_GetVersion`, runtime `ccall FS callMain UTF8ToString stringToNewUTF8`
- JS library `emscripten/deps.js` provides the browser save/load/import/export functions
- copies `emscripten/static/{index.html,index.js}` and zips `openrct2.js`+`openrct2.wasm` into `openrct2.zip`

### assets.zip (the gap in upstream's build)

`index.js` fetches `assets.zip` and extracts it into `/OpenRCT2`, but nothing in upstream produces that file:
when cross-compiling, CMake skips generating `g2.dat`/`fonts.dat`/`palettes.dat`/`tracks.dat`, and the object,
title-sequence, sound and music packs are only downloaded at native `cmake --install` time.
`wasm/scripts/build-assets.sh` reproduces the native install layout:

| Path in `/OpenRCT2` | Source | Size |
|---|---|---|
| `g2.dat fonts.dat palettes.dat tracks.dat` | `gxc build` from `engine/openrct2/resources/*/sprites.json` (upstream `scripts/build-graphics-dat`) | 6.9 MB |
| `language/ shaders/ scenario_patches/` | `engine/openrct2/data/` | 5.1 MB |
| `object/` | `OpenRCT2/objects` v1.7.11 (`assets.json`, sha256 verified) | 51 MB (19.6 MB is one fairground-music object) |
| `sequence/` | `OpenRCT2/title-sequences` v0.4.26 | 8.4 MB |
| `assetpack/openrct2.sound.parkap` | `OpenRCT2/OpenSoundEffects` v1.0.6 | 3.9 MB |
| `assetpack/openrct2.music.{alternative,cover}.parkap` | `OpenRCT2/OpenMusic` v1.6.1 | 10.7 MB |
| `changelog.txt contributors.md licence.txt` | engine repo | 0.3 MB |

Result: 82.4 MB uncompressed, 2785 files, **71.7 MB zipped**.

## Runtime architecture

```
index.html
  └─ index.js                      (upstream launcher, ~250 lines)
       ├─ requires window.SharedArrayBuffer  (else shows an error: page needs COOP/COEP)
       ├─ fetch openrct2.zip  → JSZip → blob URLs for openrct2.js / openrct2.wasm  (falls back to plain files)
       ├─ OPENRCT2_WEB({canvas, noInitialRun:true})   → Module
       ├─ mount IDBFS (autoPersist) at /persistent  /RCT  /OpenRCT2 ; FS.syncfs(true)
       ├─ if /OpenRCT2/version != Module.ccall("GetVersion"): wipe /OpenRCT2, fetch assets.zip, extract
       ├─ if /RCT/Data/ch.dat missing: show "select your RCT2 assets (zip)" file input, extract into /RCT
       └─ Module.callMain(["--user-data-path=/persistent/", "--openrct2-data-path=/OpenRCT2/"])
              └─ Context.cpp: emscripten_set_main_loop_arg(RunFrame)   (no blocking game loop)
```

There is no explicit web↔game bridge yet. The surface is what Emscripten exports (`callMain`, `ccall`, `FS`)
plus five JS-library functions in `deps.js` that C++ calls: `EmscriptenSaveGame`, `EmscriptenLoadGame`,
`EmscriptenResetAutosave`, `ExportPersistentData`, `ImportPersistentData`, `SelectFilesToUpload`,
`GetLocaleCurrencyCode`; and one C export the JS calls back: `LoadGameCallback`.

`Platform.Emscripten.cpp` maps user cache/config/data/home → `/persistent`, install path → `/OpenRCT2`,
RCT1/RCT2 search paths → `/RCT`, and reads locale/currency/measurement from `Intl`.

## Filesystem notes

- Three IDBFS mounts, all `autoPersist: true` (Emscripten syncs to IndexedDB after writes).
  - `/OpenRCT2` engine data (versioned by `GetVersion()`; re-downloaded when the build changes)
  - `/RCT` imported RCT2 data (M0/M1 development only)
  - `/persistent` user data: `config.ini`, `save/`, `screenshot/`, etc.
- Verified: after a reload, `assets.zip` is **not** re-requested and `/OpenRCT2` is intact (smoke test step 2).
- **In-game Save** does not write to `/persistent`. `Game.cpp`/`FileBrowser.cpp` write `/save.park`, then
  `EmscriptenSaveGame` hands it to the File System Access API (`showSaveFilePicker`, remembered handle so
  autosave overwrites the same file) or falls back to a `download.park` download. **Load** uses
  `showOpenFilePicker`/`<input type=file>`, copies into MEMFS, calls `LoadGameCallback`, deletes the copy.
- Extra browser-only Options entries (`windows/Options.cpp`): export/import all of `/persistent` as a zip,
  and "upload" `.park/.sv4/.sv6` files into `/persistent/save/uploads/` so the in-game browser can see them.
- Autosave cleanup (`LimitAutosaveCount`) is compiled out under Emscripten.
- Implication for the revised M3: refresh-safe *in-browser* save slots are not there yet, but every building
  block is (IDBFS at `/persistent/save`, the upload path, syncfs). OPFS is not used anywhere upstream.

## SDL / browser notes

- SDL2 via Emscripten ports, software rendering only (`DISABLE_OPENGL=ON`; `OpenGLAPIProc.h` stubbed).
- `UiContext.cpp` under Emscripten: canvas is sized to `window.innerWidth/Height` at window creation,
  fullscreen uses `emscripten_request/exit_fullscreen`, clipboard uses `navigator.clipboard`.
- Config `game_path` is irrelevant in the browser; the engine finds RCT2 data through `/RCT`.
- Not verified in M0: resize behaviour, high-DPI, mouse/keyboard (needs RCT2 data to reach the UI).

## Audio notes

- SDL2 audio via Emscripten (Web Audio). OpenSoundEffects and OpenMusic asset packs are in `assets.zip`, so
  once `/RCT` exists the engine has open sound/music available.
- Autoplay: the user clicks the file input before `callMain`, so the AudioContext is created after a user
  gesture on first run. On later visits `callMain` runs with no gesture; whether audio starts muted until the
  first click is **not yet verified** (needs the gameplay test).

## Threading (important correction to the spec's assumption)

Upstream's browser build is **multi-threaded**: `-pthread`, `PTHREAD_POOL_SIZE=120`, 2 GB `SharedArrayBuffer`
allocated at start. Consequences measured in M0:

- The page must be served cross-origin isolated (`Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Embedder-Policy: require-corp`) or `index.js` refuses to start. `serve.py` sets them.
  Any CDN script (upstream loads JSZip from jsdelivr) must be CORS-enabled; jsdelivr is.
- 120 Web Workers are spawned at module load (observed via Playwright `page.workers()`).
- Chrome resident memory rises by ~0.94 GB just reaching the asset prompt (2 GB reserved, not all committed).
- `performance.measureUserAgentSpecificMemory()` is useless here: it reports ~260 GB because the shared heap is
  counted once per thread.

A single-threaded variant is a build-flag change (drop `-pthread`, `PTHREAD_POOL_SIZE`, use `emscripten_set_main_loop`
which is already the loop model), but upstream chose threads; switching is a decision for the ADR called for in
the revised plan, not something M0 changed.

## Patch list

**None.** `git -C engine/openrct2 status --porcelain` is empty. Upstream's own browser-specific code amounts to
48 `#ifdef __EMSCRIPTEN__` sites in 17 files plus `Platform.Emscripten.cpp`, `emscripten/deps.js` and
`emscripten/static/`. Fork-specific additions live outside the engine tree (`wasm/`, `docs/`).

Upstreamable cleanup candidates noticed (not done):

1. `Platform.Posix.cpp` probes `zenity --version` / `kdialog --version` under Emscripten (two warnings per start).
2. `build-emscripten` could produce `assets.zip` (the `prepare-android-assets` script already does the equivalent for Android).

## Known limitations (upstream browser target, as of this commit)

- Requires RCT2 data supplied by the user as a zip containing `Data/ch.dat`; without it the engine logs
  `An RCT2 install directory must be specified!` and returns from `main` (no crash, no UI).
- No in-browser save slots (see Filesystem notes). No OPFS.
- Launcher UI is a bare `<p>` and `<input type=file>`; errors are raw strings.
- Depends on `cdn.jsdelivr.net` for JSZip (offline use would need it vendored).
- `openrct2.zip` (4 MB) is re-fetched on every page load; only HTTP caching applies (server sends `no-store` in dev).
- No touch input work; no multiplayer/HTTP (`DISABLE_NETWORK`, `DISABLE_HTTP`); no TrueType fonts (`DISABLE_TTF`); no OpenGL.
- Test-harness note: under Playwright `launchPersistentContext` the 71 MB `assets.zip` fetch fails with
  `net::ERR_FAILED` and the page reloads; it does not happen in a normal context (`chromium.launch`) or with curl.
  Treated as a harness artefact; not reproduced in a headed browser yet.
