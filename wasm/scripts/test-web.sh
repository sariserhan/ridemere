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
  for suite in webshell webshell-restart; do
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

echo
if [[ $status -eq 0 ]]; then echo "== web shell: all engines passed"; else echo "== web shell: FAILURES"; fi
exit $status
