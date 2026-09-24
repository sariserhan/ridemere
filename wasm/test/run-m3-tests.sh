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

run "shops and facilities have four real angles and their own art" \
  "$PY" "$ROOT/tools/art-pipeline/check_shop_objects.py"

run "the bench and the bin have real art in every slot the engine indexes" \
  "$PY" "$ROOT/tools/art-pipeline/check_addition_objects.py"

run "development scenes cannot reach the scenario selector" \
  "$PY" "$ROOT/tools/art-pipeline/check_scenario_visibility.py"

run "scenery models sit on the rotation origin" \
  "$PY" "$ROOT/tools/art-pipeline/check_rotation_origin.py"

run "the scenery objects have the layout the engine indexes, and no two share artwork" \
  "$PY" "$ROOT/tools/art-pipeline/check_scenery_objects.py"

# A check that has never rejected anything is not evidence. This builds broken copies
# of the shipped content and asserts each check rejects the one it exists to catch.
run "the content checks reject the artefacts they exist to catch" \
  "$PY" "$ROOT/tools/art-pipeline/demo_check_failures.py"

run "the shell visual check rejects a park that was never drawn" \
  bash "$ROOT/wasm/test/shellvisual-check.sh"

# The shops have to reach the screen, not merely exist as objects. This runs on the
# capture shopcheck.js takes of a park with all five placed and open.
shops_visible() {
  ( cd "$ROOT/wasm/test" && node shopcheck.js >/dev/null ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_shops.py" "$ROOT/wasm/test/results-visual/shops.png"
}
run "the shops and facilities are drawn in a park, and colour-coded" shops_visible

# The scenario a player actually starts, asserted end to end: the opening camera, the
# canvas size, the five-minute rule, the needs loops, the litter loop and maintenance.
run "First Park plays: opening, needs, litter and maintenance" bash -c '
  cd "'"$ROOT"'/wasm/test" && node firstparkcheck.js'

# Benches and bins have to reach the screen, not just exist as objects. Proven to
# reject a capture of the same park with them removed.
first_park_visible() {
  ( cd "$ROOT/wasm/test" && node parkshot.js first-park.park first-park-initial 20 >/dev/null ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_smoke.py" "$ROOT/wasm/test/results-visual/first-park-initial.png" \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_additions.py" "$ROOT/wasm/test/results-visual/first-park-initial.png"
}
run "First Park renders, with its benches and bins" first_park_visible

# Scenery has to reach the screen, in a park with a handful of pieces and in one
# packed with them. Measured by palette index, and proven to reject the same three
# captures with every piece of scenery removed.
scenery_visible() {
  ( cd "$ROOT/wasm/test" && node parkshot.js first-park.park first-park-scenery 20 >/dev/null ) \
    && ( cd "$ROOT/wasm/test" && node parkshot.js DevScenarios/world-art-test.park art-scenery 20 >/dev/null ) \
    && ( cd "$ROOT/wasm/test" && node parkshot.js DevScenarios/scenery-density-test.park scenery-density 20 >/dev/null ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_scenery.py" "$ROOT/wasm/test/results-visual/first-park-scenery.png" --park \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_scenery.py" "$ROOT/wasm/test/results-visual/art-scenery.png" \
    && "$PY" "$ROOT/tools/art-pipeline/check_visual_scenery.py" "$ROOT/wasm/test/results-visual/scenery-density.png" --dense
}
run "the scenery and vegetation are drawn, in First Park and in the test scenes" scenery_visible

run "the scenery check rejects the same scenes with every piece of scenery removed" bash -c '
  for fixture in first-park-no-scenery:--park art-scene-no-scenery: dense-scene-no-scenery:--dense; do
    name="${fixture%%:*}"; profile="${fixture##*:}"
    if "'"$PY"'" "'"$ROOT"'/tools/art-pipeline/check_visual_scenery.py" \
         "'"$ROOT"'/wasm/test/fixtures/$name.png" $profile >/dev/null 2>&1; then
      echo "   FAIL: accepted $name, which has no scenery in it"; exit 1
    fi
    echo "   rejects $name"
  done'

# What decoration does to the simulation, measured against the same scenario with the
# decoration removed rather than against a different park.
run "decorating a park changes nothing the player can measure, and says so" bash -c '
  cd "'"$ROOT"'/wasm/test" && node scenerygameplay.js'

# A park file that kept the objects but lost their orientation would look almost
# right, because a tree is a tree from any angle. Read the direction back instead.
run "scenery survives a save and a reload, in place and facing the same way" bash -c '
  cd "'"$ROOT"'/wasm/test" && node scenerysave.js'

# Every scenery sprite the engine can ask for, including the build-menu tab icons the
# map never draws, and the window chrome that only appears once a menu is open. Also
# asserts the windows are still open, on screen and carrying their tabs when the audit
# is taken, and then the picture asserts they actually drew: a window that closes
# itself draws nothing and passes a sprite audit perfectly, which is what the scenery
# window did for a whole milestone.
build_menus() {
  ( cd "$ROOT/wasm/test" && node sceneryaudit.js ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_window_drawn.py" \
      "$ROOT/wasm/test/results-visual/menu-rects.json"
}
run "the build menus open, stay open, draw themselves, and ask for no missing sprite" build_menus

run "the addition check rejects a park with the benches and bins removed" bash -c '
  if "'"$PY"'" "'"$ROOT"'/tools/art-pipeline/check_visual_additions.py" \
       "'"$ROOT"'/wasm/test/fixtures/first-park-no-additions.png" >/dev/null 2>&1; then
    echo "   FAIL: accepted a park with no benches or bins"; exit 1
  fi
  echo "   rejects a park with no benches or bins"'

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

# The guest-need loop, end to end: a need appears, an alert raises and says what to
# build, the stall opens, guests use it, and the alert clears.
run "guest needs raise alerts, and the alerts clear when the park is fixed" bash -c '
  cd "'"$ROOT"'/wasm/test" && node alertcheck.js'

printf '\n== %d passed, %d failed\n' "$pass" "$fail"
[[ $fail -eq 0 ]]
