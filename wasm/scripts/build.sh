#!/usr/bin/env bash
# Reproducible WASM build of engine/openrct2 using upstream's pinned Emscripten container.
# Runs upstream's own scripts/build-emscripten unchanged. Output: engine/openrct2/build/www
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine/openrct2"
IMAGE="${OPENRCT2_BUILD_IMAGE:-ghcr.io/openrct2/openrct2-build:26-emscripten}"
CCACHE_DIR="${CCACHE_DIR:-$ROOT/.cache/ccache-emscripten}"
mkdir -p "$CCACHE_DIR"
# upstream's build-emscripten recreates build/www, which would delete assets.zip (made by build-assets.sh)
ASSETS="$ENGINE/build/www/assets.zip"; KEEP=""
if [[ -f "$ASSETS" ]]; then KEEP="$(mktemp)"; cp "$ASSETS" "$KEEP"; fi
docker run --rm \
  -v "$ENGINE:/src" -v "$CCACHE_DIR:/root/.ccache" -w /src \
  -e GITHUB_ACTIONS=true -e GITHUB_SHA="$(git -C "$ENGINE" rev-parse HEAD)" \
  -e GITHUB_REF="$(git -C "$ENGINE" rev-parse --symbolic-full-name HEAD)" \
  "$IMAGE" bash -c '
    set -eo pipefail
    git config --global --add safe.directory /src
    . scripts/setenv -q
    time build-emscripten

    # Two changes to the upstream link line, then relink; nothing is recompiled.
    #
    # 1. The export list. Upstream sets one explicitly, which strips our development
    #    entry points even though they are marked EMSCRIPTEN_KEEPALIVE.
    # 2. Memory and worker pool. Upstream reserves a 2 GB heap, gives every thread an
    #    8 MB stack and prewarms 120 Web Workers, none of which was measured. The
    #    values below are measured, on a running park at up to a thousand guests: they save
    #    about 410 MB of committed memory per tab and 400 ms of startup at identical
    #    frame and simulation rates. PTHREAD_POOL_SIZE must stay at or above the peak
    #    concurrent thread demand of the engine, which is about 12 now that browser
    #    job pools are capped; below that the page deadlocks while loading a park and
    #    cannot recover. See docs/adr-browser-memory.md.
    cd build
    cmake -DEMSCRIPTEN_LDFLAGS="-Wno-pthreads-mem-growth -s SAFE_HEAP=0 -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=4GB -s INITIAL_MEMORY=512MB -s STACK_SIZE=8388608 -s DEFAULT_PTHREAD_STACK_SIZE=1048576 -s MIN_WEBGL_VERSION=2 -s MAX_WEBGL_VERSION=2 -s PTHREAD_POOL_SIZE=16 -pthread -s EXPORTED_RUNTIME_METHODS=ccall,FS,callMain,UTF8ToString,stringToNewUTF8 -lidbfs.js --use-preload-plugins -s MODULARIZE=1 -s EXPORT_NAME=\"OPENRCT2_WEB\" -Wl,--export-if-defined=LoadGameCallback" \
          -DEMSCRIPTEN_EXPORTED_FUNCTIONS=_GetVersion,_main,_SunriseBuildPark,_SunriseParkStatsJson,_SunriseSavePark,_SunriseLoadPark,_SunriseObjectDebugJson,_SunriseTileDebugJson,_SunriseGuestListJson,_SunriseRideListJson,_SunriseGuestAlertsJson,_SunriseSetRideStatus,_SunriseSetGuestNeeds,_SunriseHireHandyman,_SunriseCentreView,_SunriseGuestDebugJson,_SunriseSpriteAuditJson,_SunriseSpriteAuditClear,_SunriseGenerateGuests,_SunriseSetZoom,_SunriseParkMetadataJson,_SunriseCaptureThumbnail,_SunriseOpenWindow . >/dev/null
    emmake ninja openrct2 2>&1 | tail -30
    rm -rf www/ && mkdir -p www/ && cd www/
    cp -r ../openrct2.* ./
    cp -r ../../emscripten/static/* ./
    zip -qr openrct2.zip ../openrct2.js ../openrct2.wasm
    cd /src

    chown -R '"$(id -u):$(id -g)"' /src/build /root/.ccache'
if [[ -n "$KEEP" ]]; then mv "$KEEP" "$ASSETS"; echo "restored assets.zip"; fi
echo "Build output: $ENGINE/build/www"
ls -la "$ENGINE/build/www"
