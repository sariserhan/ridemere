#!/usr/bin/env bash
# The scenery works in every browser engine we support.
#
#   wasm/scripts/scenery-browsers.sh [dist dir]
#
# Chromium runs on the host. Firefox and WebKit run inside Microsoft's Playwright
# image, because this machine lacks the system libraries those two need and installing
# them would be a change to the developer's machine rather than to this project.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIST="${1:-$ROOT/engine/openrct2/build/www-standalone}"
PORT="${PORT:-8643}"
PW_VERSION="$(cd "$ROOT/wasm/test" && node -e 'console.log(require("playwright/package.json").version)')"
IMAGE="mcr.microsoft.com/playwright:v${PW_VERSION}-noble"
OUT="$ROOT/wasm/test/results-web/scenery-browsers.json"

mkdir -p "$(dirname "$OUT")"
python3 "$ROOT/wasm/scripts/serve.py" "$DIST" "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 2

status=0
echo "[" > "$OUT"
first=1
for engine in chromium firefox webkit; do
  echo
  echo "== $engine"
  if [[ "$engine" == "chromium" ]]; then
    out="$(cd "$ROOT/wasm/test" && node scenerybrowsers.js chromium "http://localhost:$PORT/" 2>&1 | tail -1)" || status=1
  else
    out="$(docker run --rm --network host -v "$ROOT:$ROOT" -w "$ROOT/wasm/test" \
      -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright "$IMAGE" \
      node scenerybrowsers.js "$engine" "http://localhost:$PORT/" 2>&1 | tail -1)" || status=1
  fi
  # One line per check, so a failure says which one rather than only which engine.
  echo "$out" | node -e '
    let input = "";
    process.stdin.on("data", d => input += d);
    process.stdin.on("end", () => {
      let result;
      try { result = JSON.parse(input); }
      catch { console.log("   no result: " + input.slice(0, 300)); process.exit(0); }
      for (const c of result.checks ?? [])
        console.log(`   ${c.ok ? "ok  " : "FAIL"} ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
      for (const f of result.failures ?? []) if (!(result.checks ?? []).some(c => c.label === f))
        console.log(`   FAIL ${f}`);
    });'
  [[ $first -eq 1 ]] || echo "," >> "$OUT"
  first=0
  echo "$out" >> "$OUT"
done
echo "]" >> "$OUT"

echo
echo "results -> $OUT"
if [[ $status -eq 0 ]]; then echo "== scenery: all engines passed"; else echo "== scenery: FAILURES"; fi
exit $status
