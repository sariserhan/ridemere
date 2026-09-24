#!/usr/bin/env bash
# Build two variants that differ only in browser memory reservation, and stage each
# as a complete standalone distribution so they can be measured under identical load.
#
#   A  upstream link line:      INITIAL_MEMORY=2GB,   default pthread stack
#   B  reduced reservation:     INITIAL_MEMORY=512MB, DEFAULT_PTHREAD_STACK_SIZE=1MB
#
# Worker pool size is held at upstream's 120 in both, so the only variable is how much
# address space the module reserves up front. Results: docs/adr-browser-memory.md.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine/openrct2"
IMAGE="${OPENRCT2_BUILD_IMAGE:-ghcr.io/openrct2/openrct2-build:26-emscripten}"
CCACHE="$ROOT/.cache/ccache-emscripten"
OUTROOT="$ROOT/.cache/bench-mem"
EXPORTS="_GetVersion,_main,_SunriseBuildPark,_SunriseParkStatsJson,_SunriseSavePark,_SunriseLoadPark,_SunriseObjectDebugJson,_SunriseTileDebugJson,_SunriseGuestListJson,_SunriseRideListJson,_SunriseHireHandyman,_SunriseCentreView,_SunriseGuestDebugJson,_SunriseSpriteAuditJson,_SunriseSpriteAuditClear,_SunriseGenerateGuests"

COMMON='-Wno-pthreads-mem-growth -s SAFE_HEAP=0 -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=4GB -s STACK_SIZE=8388608 -s MIN_WEBGL_VERSION=2 -s MAX_WEBGL_VERSION=2 -s PTHREAD_POOL_SIZE=120 -pthread -s EXPORTED_RUNTIME_METHODS=ccall,FS,callMain,UTF8ToString,stringToNewUTF8 -lidbfs.js --use-preload-plugins -s MODULARIZE=1 -s EXPORT_NAME="OPENRCT2_WEB" -Wl,--export-if-defined=LoadGameCallback'

mkdir -p "$OUTROOT" "$CCACHE"
for variant in "${@:-A B}"; do
  case "$variant" in
    A) extra='-s INITIAL_MEMORY=2GB' ;;
    B) extra='-s INITIAL_MEMORY=512MB -s DEFAULT_PTHREAD_STACK_SIZE=1048576' ;;
    *) echo "unknown variant $variant" >&2; exit 1 ;;
  esac
  echo "== variant $variant: $extra"
  docker run --rm -v "$ENGINE:/src" -v "$CCACHE:/root/.ccache" -w /src/build \
    -e LDFLAGS_OVERRIDE="$COMMON $extra" -e EXPORTS="$EXPORTS" "$IMAGE" bash -c '
      set -eo pipefail
      git config --global --add safe.directory /src
      cmake -DEMSCRIPTEN_LDFLAGS="$LDFLAGS_OVERRIDE" -DEMSCRIPTEN_EXPORTED_FUNCTIONS="$EXPORTS" . >/dev/null
      emmake ninja openrct2 2>&1 | tail -30
      chown -R '"$(id -u):$(id -g)"' /src/build /root/.ccache'

  dest="$OUTROOT/$variant"; rm -rf "$dest"; mkdir -p "$dest"
  cp "$ENGINE/build/openrct2.js" "$ENGINE/build/openrct2.wasm" "$dest/"
  cp "$ROOT/wasm/standalone/index.html" "$ROOT/wasm/standalone/index.js" "$dest/"
  cp "$ROOT/.cache/jszip.min.js" "$dest/jszip.min.js"
  ( cd "$ROOT/assets/generated/pack" && zip -qr "$dest/assets.zip" . )
  ( cd "$dest" && zip -q openrct2.zip openrct2.js openrct2.wasm )
  echo "   -> $dest ($(du -sh "$dest" | cut -f1))"
done
