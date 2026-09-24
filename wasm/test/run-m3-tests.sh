#!/usr/bin/env bash
# M3 acceptance checks. Requires a built standalone distribution
# (wasm/scripts/build.sh && wasm/scripts/build-standalone.sh).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PY="$ROOT/.cache/venv/bin/python"
DIST="$ROOT/engine/openrct2/build/www-standalone"
pass=0; fail=0
run() {
  local name="$1"; shift
  printf '\n== %s\n' "$name"
  if "$@"; then printf '   PASS %s\n' "$name"; pass=$((pass+1));
  else printf '   FAIL %s\n' "$name"; fail=$((fail+1)); fi
}

run "objects are self-contained and consistent" \
  "$PY" "$ROOT/tools/art-pipeline/validate_objects.py"

run "every shipped file has declared provenance" \
  "$PY" "$ROOT/tools/art-pipeline/build_manifest.py"

run "distribution contains no original-game data" bash -c '
  bad=$(find "'"$DIST"'" -iname "g1.dat" -o -iname "csg*.dat" -o -iname "css*.dat" \
        -o -iname "*.sc6" -o -iname "*.sv6" -o -iname "ch.dat" | grep -v "standalone/Data/g1.dat" || true)
  if [[ -n "$bad" ]]; then echo "unexpected files: $bad"; exit 1; fi
  echo "   no original-game filenames present"'

run "world objects have the expected layout and carry real art" \
  "$PY" "$ROOT/tools/art-pipeline/check_world_objects.py"

run "shipped track artwork is real, not placeholders" \
  "$PY" "$ROOT/tools/art-pipeline/check_track_art.py"

# Render a known park and check the picture contains the things a park must contain.
# This is the guard against a whole sprite table being blank while every programmatic
# assertion still passes, which has happened.
visual_smoke() {
  ( cd "$ROOT/wasm/test" && node visualsmoke.js >/dev/null ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_smoke.py" "$ROOT/wasm/test/results-visual/park.png"
}
run "a known park renders with terrain, paths, track and structures" visual_smoke

# The interface renders with chrome, text and icons, in a build whose window colours,
# font and icons are all ours. Proven to fail on a blank interface by blankui-check.sh.
interface_smoke() {
  ( cd "$ROOT/wasm/test" && node uivisual.js >/dev/null ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_ui.py" \
      "$ROOT/wasm/test/results-visual/ui-window-park.png" --name "game interface"
}
run "the game interface renders with chrome, text and icons" interface_smoke

run "standalone boots in a clean browser with no prompt" bash -c '
  cd "'"$ROOT"'/wasm/test" && node standalone.js >/dev/null && \
  "'"$PY"'" "'"$ROOT"'/wasm/test/check_boot.py"'

run "park loads and simulates in a clean browser" bash -c '
  cd "'"$ROOT"'/wasm/test" && node gameplay.js >/dev/null && \
  "'"$PY"'" "'"$ROOT"'/wasm/test/check_gameplay.py"'

printf '\n== %d passed, %d failed\n' "$pass" "$fail"
[[ $fail -eq 0 ]]
