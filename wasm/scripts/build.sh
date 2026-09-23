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
    git config --global --add safe.directory /src
    . scripts/setenv -q
    time build-emscripten
    chown -R '"$(id -u):$(id -g)"' /src/build /root/.ccache'
if [[ -n "$KEEP" ]]; then mv "$KEEP" "$ASSETS"; echo "restored assets.zip"; fi
echo "Build output: $ENGINE/build/www"
ls -la "$ENGINE/build/www"
