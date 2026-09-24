#!/usr/bin/env bash
# Prove the interface visual check fails when the interface art is blank.
#
# Rebuilds the content pack with every authored interface sprite removed and every
# unfilled base entry transparent, serves it, captures the same windows, and requires
# the check to FAIL. A visual test that cannot fail protects nothing.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="$ROOT/.cache/venv/bin/python"
WORK="$(mktemp -d)"
PORT="${PORT:-3311}"
trap 'rm -rf "$WORK"; kill %1 2>/dev/null || true' EXIT

echo "== building a distribution with a blank interface"
BACKUP="$WORK/ui-sprites.json"
cp "$ROOT/assets/generated/ui/ui-sprites.json" "$BACKUP"
echo '{}' > "$ROOT/assets/generated/ui/ui-sprites.json"
SUNRISE_INVISIBLE_MARKERS=1 "$VENV" "$ROOT/tools/art-pipeline/build_base_archive.py" >/dev/null
"$VENV" "$ROOT/tools/art-pipeline/build_pack.py" >/dev/null
cp "$BACKUP" "$ROOT/assets/generated/ui/ui-sprites.json"

mkdir -p "$WORK/dist"
cp "$ROOT/engine/openrct2/build/www-standalone/openrct2.zip" "$WORK/dist/"
( cd "$ROOT/assets/generated/pack" && zip -qr "$WORK/dist/assets.zip" . )

# Restore the real content pack immediately; the blank one lives only in $WORK.
"$VENV" "$ROOT/tools/art-pipeline/build_base_archive.py" >/dev/null
"$VENV" "$ROOT/tools/art-pipeline/build_pack.py" >/dev/null

echo "== serving the blank build"
cp -r "$WORK/dist"/* "$ROOT/web/public/game/"
( cd "$ROOT/web" && npm run start -- --port "$PORT" >/dev/null 2>&1 ) &
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$PORT/parks" && break; sleep 1; done

( cd "$ROOT/wasm/test" && node uivisual.js "http://localhost:$PORT" >/dev/null )
status=0
"$VENV" "$ROOT/tools/art-pipeline/check_visual_ui.py" \
  "$ROOT/wasm/test/results-visual/ui-window-park.png" --name "blank interface" || status=$?

# Put the real game archives back whatever happened.
( cd "$ROOT/web" && node scripts/sync-game.mjs >/dev/null )

if [[ $status -eq 0 ]]; then
  echo "FAIL: the interface check passed a build with no interface art"
  exit 1
fi
echo "the interface visual check correctly rejects a blank interface."
