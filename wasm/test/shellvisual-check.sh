#!/usr/bin/env bash
# Prove the shell's visual check would have caught the defects it was added for.
#
#   wasm/test/shellvisual-check.sh
#
# Both fixtures are real captures of the game route as it shipped from V1-0 to V1-3.
# In each of them the park had loaded, the toolbar was drawn, the clock was running and
# every programmatic assertion in the suite passed:
#
#   shell-camera-off-map    the camera pointed off the map, so the player saw an empty
#                           screen with a working interface over it
#   shell-scroll-smear      the cursor sat at (0, 0), on the screen edge and on the
#                           first toolbar button, so the game scrolled continuously
#                           while showing a tooltip and dragged a trail of interface
#                           across the whole park
#
# Nothing noticed either one, because nothing looked at the screen. If this script ever
# stops failing on them, the check has stopped checking.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PY="$ROOT/.cache/venv/bin/python"

status=0
check_rejects() {
  local fixture="$ROOT/wasm/test/fixtures/$1.png"
  local description="$2"
  if [[ ! -f "$fixture" ]]; then
    echo "   missing fixture $fixture"; status=1; return
  fi
  if "$PY" "$ROOT/tools/art-pipeline/check_visual_smoke.py" "$fixture" >/dev/null 2>&1; then
    echo "   FAIL: the visual check accepted $description"
    status=1
  else
    echo "   the visual check rejects $description"
  fi
}

check_rejects shell-camera-off-map "a park whose camera points off the map"
check_rejects shell-scroll-smear "a park smeared across the screen by continuous scrolling"
exit $status
