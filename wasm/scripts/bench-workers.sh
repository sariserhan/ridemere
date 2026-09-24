#!/usr/bin/env bash
# Build one standalone distribution per pthread worker-pool configuration.
#
#   wasm/scripts/bench-workers.sh 120 32 16 8 4 2
#   wasm/scripts/bench-workers.sh --strict 2 -- 8
#
# The initial heap (512 MB) and pthread stack (1 MB) are held at the values the M3e
# ADR selected, so the only variable is the worker pool. Each variant is staged as a
# complete distribution under .cache/bench-workers/ with a build-config.json recording
# what it was built with, so a measurement cannot be attributed to the wrong build.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine/openrct2"
IMAGE="${OPENRCT2_BUILD_IMAGE:-ghcr.io/openrct2/openrct2-build:26-emscripten}"
CCACHE="$ROOT/.cache/ccache-emscripten"
OUTROOT="$ROOT/.cache/bench-workers"
EXPORTS="_GetVersion,_main,_SunriseBuildPark,_SunriseParkStatsJson,_SunriseSavePark,_SunriseLoadPark,_SunriseObjectDebugJson,_SunriseTileDebugJson,_SunriseGuestListJson,_SunriseRideListJson,_SunriseHireHandyman,_SunriseCentreView,_SunriseGuestDebugJson,_SunriseSpriteAuditJson,_SunriseSpriteAuditClear,_SunriseGenerateGuests,_SunriseSetZoom,_SunriseParkMetadataJson,_SunriseCaptureThumbnail,_SunriseOpenWindow"

STRICT=""
if [[ "${1:-}" == "--strict" ]]; then STRICT="$2"; shift 2; [[ "${1:-}" == "--" ]] && shift; fi
POOLS="${*:-120 32 16 8 4 2}"

COMMON='-Wno-pthreads-mem-growth -s SAFE_HEAP=0 -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=4GB -s INITIAL_MEMORY=512MB -s STACK_SIZE=8388608 -s DEFAULT_PTHREAD_STACK_SIZE=1048576 -s MIN_WEBGL_VERSION=2 -s MAX_WEBGL_VERSION=2 -pthread -s EXPORTED_RUNTIME_METHODS=ccall,FS,callMain,UTF8ToString,stringToNewUTF8 -lidbfs.js --use-preload-plugins -s MODULARIZE=1 -s EXPORT_NAME="OPENRCT2_WEB" -Wl,--export-if-defined=LoadGameCallback'

mkdir -p "$OUTROOT" "$CCACHE"
for pool in $POOLS; do
  extra="-s PTHREAD_POOL_SIZE=$pool"
  name="pool$pool"
  if [[ -n "$STRICT" ]]; then extra="$extra -s PTHREAD_POOL_SIZE_STRICT=$STRICT"; name="$name-strict$STRICT"; fi
  echo "== $name"
  docker run --rm -v "$ENGINE:/src" -v "$CCACHE:/root/.ccache" -w /src/build \
    -e LDFLAGS_OVERRIDE="$COMMON $extra" -e EXPORTS="$EXPORTS" "$IMAGE" bash -c '
      set -eo pipefail
      git config --global --add safe.directory /src
      cmake -DEMSCRIPTEN_LDFLAGS="$LDFLAGS_OVERRIDE" -DEMSCRIPTEN_EXPORTED_FUNCTIONS="$EXPORTS" . >/dev/null
      emmake ninja openrct2 2>&1 | tail -20
      chown -R '"$(id -u):$(id -g)"' /src/build /root/.ccache'

  dest="$OUTROOT/$name"; rm -rf "$dest"; mkdir -p "$dest"
  cp "$ENGINE/build/openrct2.js" "$ENGINE/build/openrct2.wasm" "$dest/"
  cp "$ROOT/wasm/standalone/index.html" "$ROOT/wasm/standalone/index.js" "$dest/"
  cp "$ROOT/.cache/jszip.min.js" "$dest/jszip.min.js"
  ( cd "$ROOT/assets/generated/pack" && zip -qr "$dest/assets.zip" . )
  ( cd "$dest" && zip -q openrct2.zip openrct2.js openrct2.wasm )
  cat > "$dest/build-config.json" <<JSON
{
  "label": "$name",
  "pthreadPoolSize": $pool,
  "pthreadPoolSizeStrict": ${STRICT:-1},
  "strictExplicit": $( [[ -n "$STRICT" ]] && echo true || echo false ),
  "initialMemoryBytes": 536870912,
  "pthreadStackBytes": 1048576
}
JSON
  printf '%s\n' "$COMMON $extra" > "$dest/ldflags.txt"
  # A release build has ASSERTIONS off, so the pool-exhaustion warning is compiled out.
  # Record whether this binary can report exhaustion at all.
  if grep -q "thread pool is exhausted" "$dest/openrct2.js"; then warn=true; else warn=false; fi
  python3 - "$dest/build-config.json" "$warn" <<'PY'
import json, sys
path, warn = sys.argv[1], sys.argv[2] == "true"
doc = json.load(open(path)); doc["exhaustionWarningCompiledIn"] = warn
json.dump(doc, open(path, "w"), indent=1)
PY
  echo "   -> $dest ($(du -sh "$dest" | cut -f1)), exhaustion warning compiled in: $warn"
done
