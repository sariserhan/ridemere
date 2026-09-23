#!/usr/bin/env bash
# Build the engine with different Emscripten worker-pool sizes and measure each.
# Everything else is held constant. Results: docs/browser-memory.md.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine/openrct2"
IMAGE="ghcr.io/openrct2/openrct2-build:26-emscripten"
CCACHE="$ROOT/.cache/ccache-emscripten"
OUTROOT="$ROOT/.cache/bench"
SIZES="${*:-4 8 16 120}"

BASE_LD='-Wno-pthreads-mem-growth -s SAFE_HEAP=0 -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=4GB -s INITIAL_MEMORY=@MEM@ -s STACK_SIZE=8388608 -s DEFAULT_PTHREAD_STACK_SIZE=@STACK@ -s MIN_WEBGL_VERSION=2 -s MAX_WEBGL_VERSION=2 -s PTHREAD_POOL_SIZE=@POOL@ -pthread -s EXPORTED_RUNTIME_METHODS=ccall,FS,callMain,UTF8ToString,stringToNewUTF8 -lidbfs.js --use-preload-plugins -s MODULARIZE=1 -s EXPORT_NAME="OPENRCT2_WEB" -Wl,--export-if-defined=LoadGameCallback'

mkdir -p "$OUTROOT" "$CCACHE"
for pool in $SIZES; do
  if [[ "$pool" == "120" ]]; then mem=2GB; stack=8388608; else mem=512MB; stack=1048576; fi
  echo "== pool=$pool initial_memory=$mem pthread_stack=$stack"
  ld="${BASE_LD//@POOL@/$pool}"; ld="${ld//@MEM@/$mem}"; ld="${ld//@STACK@/$stack}"
  docker run --rm -v "$ENGINE:/src" -v "$CCACHE:/root/.ccache" -w /src/build \
    -e LDFLAGS_OVERRIDE="$ld" "$IMAGE" bash -c '
      git config --global --add safe.directory /src
      cmake -DEMSCRIPTEN_LDFLAGS="$LDFLAGS_OVERRIDE" . >/dev/null
      emmake ninja openrct2 2>&1 | tail -2
      chown -R '"$(id -u):$(id -g)"' /src/build /root/.ccache'
  dest="$OUTROOT/pool$pool"; rm -rf "$dest"; mkdir -p "$dest"
  cp "$ENGINE/build/openrct2.js" "$ENGINE/build/openrct2.wasm" "$dest/"
  for f in index.html index.js jszip.min.js assets.zip; do
    cp "$ENGINE/build/www-standalone/$f" "$dest/$f"
  done
  ( cd "$dest" && zip -q openrct2.zip openrct2.js openrct2.wasm )
  echo "   -> $dest ($(du -sh "$dest" | cut -f1))"
done
