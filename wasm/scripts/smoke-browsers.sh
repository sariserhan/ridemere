#!/usr/bin/env bash
# Smoke-test the standalone build in several browser engines.
#
#   wasm/scripts/smoke-browsers.sh [dist dir]
#
# Chromium runs on the host. Firefox and WebKit run inside Microsoft's Playwright
# image, because this machine lacks the system libraries those two need and installing
# them is a change to the developer's machine rather than to this project. The image
# carries matching browser builds and the libraries, so the result is a real run of
# those engines without touching the host.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIST="${1:-$ROOT/.cache/bench-workers/pool8}"
PORT="${PORT:-8642}"
PW_VERSION="$(cd "$ROOT/wasm/test" && node -e 'console.log(require("playwright/package.json").version)')"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"
OUT="$ROOT/wasm/test/results-workers/crossbrowser.json"

python3 "$ROOT/wasm/scripts/serve.py" "$DIST" "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 2

echo "[" > "$OUT"
first=1
for engine in chromium firefox webkit; do
  echo "== $engine"
  if [[ "$engine" == "chromium" ]]; then
    out="$(cd "$ROOT/wasm/test" && node crossbrowser.js chromium "http://localhost:$PORT/" 2>&1 | tail -1)"
  else
    out="$(docker run --rm --network host -v "$ROOT:$ROOT" -w "$ROOT/wasm/test" \
      -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright "$IMAGE" \
      node crossbrowser.js "$engine" "http://localhost:$PORT/" 2>&1 | tail -1)"
  fi
  echo "$out" | head -c 600; echo
  [[ $first -eq 1 ]] || echo "," >> "$OUT"
  first=0
  echo "$out" >> "$OUT"
done
echo "]" >> "$OUT"
echo "results -> $OUT"
