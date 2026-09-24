#!/usr/bin/env bash
# Regenerate every bundled scenario from its description, then repack.
#
# Scenarios are built by the engine itself: the descriptions in assets/scenarios are
# fed to SunriseBuildPark in a browser, so a scenario is always produced by the same
# code that will later load it. That means this needs an already-built standalone
# distribution, and that changing the park builder means rebuilding scenarios.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="$ROOT/.cache/venv/bin/python"
DIST="$ROOT/engine/openrct2/build/www-standalone"

[[ -f "$DIST/openrct2.wasm" ]] || { echo "run wasm/scripts/build-standalone.sh first" >&2; exit 1; }

for description in "$ROOT"/assets/scenarios/*/scenario.json; do
  name="$(basename "$(dirname "$description")")"
  echo "== $name"
  "$VENV" "$ROOT/tools/art-pipeline/build_scenario.py" "$name"
done

"$VENV" "$ROOT/tools/art-pipeline/build_pack.py"
( cd "$ROOT/assets/generated/pack" && rm -f "$DIST/assets.zip" && zip -qr "$DIST/assets.zip" . )
echo "== scenarios repacked into $DIST/assets.zip"
