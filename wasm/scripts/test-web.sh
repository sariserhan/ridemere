#!/usr/bin/env bash
# Run the V1-0 web shell acceptance tests.
#
#   wasm/scripts/test-web.sh [chromium firefox webkit]
#
# Builds the shell, starts the production server, then runs the journey and the
# persistence tests in each engine. Firefox and WebKit run inside Microsoft's
# Playwright image because this machine lacks their system libraries; the image
# reaches the server over the host network.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT="${PORT:-3210}"
ENGINES="${*:-chromium firefox webkit}"
PW_VERSION="$(cd "$ROOT/wasm/test" && node -e 'console.log(require("playwright/package.json").version)')"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"

echo "== building the web shell"
( cd "$ROOT/web" && node scripts/sync-game.mjs && npm run build >/dev/null )

( cd "$ROOT/web" && npm run start -- --port "$PORT" >/tmp/sunrise-web-test.log 2>&1 ) &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; pkill -f "next-server" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://localhost:$PORT/parks" && break
  sleep 1
done
echo "== server on http://localhost:$PORT"

status=0
for engine in $ENGINES; do
  for suite in webshell webshell-restart webalerts; do
    echo
    echo "== $suite ($engine)"
    if [[ "$engine" == "chromium" ]]; then
      ( cd "$ROOT/wasm/test" && node "$suite.js" "http://localhost:$PORT" "$engine" ) || status=1
    else
      docker run --rm --network host -v "$ROOT:$ROOT" -w "$ROOT/wasm/test" \
        -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright "$IMAGE" \
        node "$suite.js" "http://localhost:$PORT" "$engine" || status=1
    fi
  done
done

# The park has to be on the screen, not merely loaded. Every other assertion in the
# suite passes on a park whose camera is pointing off the map, which is what the shell
# did from V1-0 until V1-3 and what nothing noticed.
#
# Chromium and WebKit only. Playwright cannot capture a WebGL canvas in Firefox: the
# screenshot comes back with the canvas transparent, showing the page background
# through it, whatever the engine actually drew. That is a property of how the
# screenshot is taken, not of the rendering, and the two engines that can be captured
# are independent of each other. Firefox still runs every functional check.
for engine in $ENGINES; do
  shot="$ROOT/wasm/test/results-web/play-park-$engine.png"
  echo
  if [[ "$engine" == "firefox" ]]; then
    echo "== the park is visible in the shell (firefox): not checked"
    echo "   Playwright cannot capture a WebGL canvas in Firefox; see the comment in this script"
    continue
  fi
  echo "== the park is visible in the shell ($engine)"
  if [[ ! -f "$shot" ]]; then
    echo "   no capture was taken"; status=1; continue
  fi
  "$ROOT/.cache/venv/bin/python" "$ROOT/tools/art-pipeline/check_visual_smoke.py" "$shot" || status=1
done

echo
if [[ $status -eq 0 ]]; then echo "== web shell: all engines passed"; else echo "== web shell: FAILURES"; fi
exit $status
