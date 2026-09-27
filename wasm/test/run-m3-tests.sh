#!/usr/bin/env bash
# M3 acceptance checks. Requires a built standalone distribution
# (wasm/scripts/build.sh && wasm/scripts/build-standalone.sh).
# Optional TEST_FILTER is an extended regex matching check names, for focused reruns.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PY="$ROOT/.cache/venv/bin/python"
DIST="$ROOT/engine/openrct2/build/www-standalone"
pass=0; fail=0
run() {
  local name="$1"; shift
  if [[ -n "${TEST_FILTER:-}" && ! "$name" =~ $TEST_FILTER ]]; then return; fi
  printf '\n== %s\n' "$name"
  if "$@"; then printf '   PASS %s\n' "$name"; pass=$((pass+1));
  else printf '   FAIL %s\n' "$name"; fail=$((fail+1)); fi
}

run "maintenance guidance does not skip lessons or mistake hiring for repair" \
  node "$ROOT/wasm/test/onboardinglogic.js"

run "flat rides have complete original animation and preview artwork" \
  "$PY" "$ROOT/tools/art-pipeline/check_flat_rides.py"

ride_sessions() {
  for kind in carousel dodgems drop-tower swinging-ship ferris-wheel alpine single-rail; do
    node "$ROOT/wasm/test/flatrides.js" "$kind" || return 1
  done
}
run "all seven added rides carry guests, save and render in four directions" ride_sessions

flat_construction() {
  for kind in carousel dodgems drop-tower swinging-ship ferris-wheel alpine single-rail; do
    node "$ROOT/wasm/test/rideconstruction.js" "$kind" || return 1
  done
}
run "players can construct each of the seven added rides" flat_construction

run "V1 guest appearances and every sound slot contain real content" \
  "$PY" "$ROOT/tools/art-pipeline/check_v1_content.py"

v1_scenarios() {
  for kind in first-park small-footprint growing-destination; do
    node "$ROOT/wasm/test/v1scenarios.js" "$kind" || return 1
  done
}
run "three release scenarios serve guests and retain their economies" v1_scenarios
run "largest release park simulates and saves at one thousand guests" \
  node "$ROOT/wasm/test/v1scale.js"

run "zoom clears old terrain without erasing the toolbar" \
  node "$ROOT/wasm/test/zoomredraw.js"

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

# The handyman lesson as a permanent rule. The engine reads specific frame numbers out
# of staff animations and does the work there; an animation too short to reach the
# frame plays to its end and reports success with nothing having happened. The frame
# numbers are read out of entity/Staff.cpp rather than kept by hand here.
run "staff animations are long enough for the frames the engine reads from them" \
  "$PY" "$ROOT/tools/art-pipeline/check_staff_animations.py"

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

# The builder's refusal contract. A refusal used to be a message attached to a
# successful build: the guard printed the right sentence and the .park was written
# anyway, so a scenario shipped with its setting silently ignored. These two check the
# builder state and the file on disk together, because either alone passed while the
# other was broken.
run "a description the engine will not honour produces no scenario" bash -c '
  cd "'"$ROOT"'/wasm/test" && node builderrefusal.js'

run "every scenario setting survives being written to a park file" bash -c '
  cd "'"$ROOT"'/wasm/test" && node scenariosettings.js'

# Surviving the save is not surviving being played: a shipped reliability was read back
# correctly at load and reset to 100% two game-minutes later by ride upkeep.
run "a shipped starting reliability holds, and ages only once the ride opens" bash -c '
  cd "'"$ROOT"'/wasm/test" && node reliabilitylever.js'

# The mechanic loop, which is the whole of V1-6. Each of these proves something the
# others cannot, and they are slow because they watch real simulation rather than
# poking at state.
run "every repair animation reaches its engine event, and actually repairs" bash -c '
  cd "'"$ROOT"'/wasm/test" && node mechaniccheck.js'

run "guests survive a breakdown and use the ride again afterwards" bash -c '
  cd "'"$ROOT"'/wasm/test" && node mechanicguests.js'

run "an employed mechanic is dispatched, and two of them do not collide" bash -c '
  cd "'"$ROOT"'/wasm/test" && node mechanicstaff.js'

run "a mechanic and a broken ride survive a save, and the alert re-derives" bash -c '
  cd "'"$ROOT"'/wasm/test" && node mechanicsave.js'

# The staff windows have to draw, and have to say what the mechanic is doing: a
# mechanic can be repairing correctly while the window reports something generic.
staff_windows() {
  ( cd "$ROOT/wasm/test" && node mechanicui.js ) \
    && "$PY" "$ROOT/tools/art-pipeline/check_window_drawn.py" \
      "$ROOT/wasm/test/results-visual/mechanic-window-rects.json" \
    && "$PY" "$ROOT/tools/art-pipeline/check_staff_status.py" \
      "$ROOT/wasm/test/results-visual/mechanic-states.json"
}
run "the staff windows draw, and report what the mechanic is doing" staff_windows

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
