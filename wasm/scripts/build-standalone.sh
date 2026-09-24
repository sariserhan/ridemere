#!/usr/bin/env bash
# Assemble the standalone browser distribution into engine/openrct2/build/www-standalone.
# Contains no RollerCoaster Tycoon data and never asks for any.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine/openrct2"
BUILD="$ENGINE/build/www"
OUT="${1:-$ENGINE/build/www-standalone}"
PACK="$ROOT/assets/generated/pack"
VENV="$ROOT/.cache/venv/bin/python"

[[ -f "$BUILD/openrct2.wasm" ]] || { echo "run wasm/scripts/build.sh first" >&2; exit 1; }

echo "== regenerating content pack"
"$VENV" "$ROOT/tools/art-pipeline/build_fonts.py"
"$VENV" "$ROOT/tools/art-pipeline/build_ui_theme.py"
"$VENV" "$ROOT/tools/art-pipeline/build_g2.py"
"$VENV" "$ROOT/tools/art-pipeline/build_world.py"
"$VENV" "$ROOT/tools/art-pipeline/build_world_edges.py"
"$VENV" "$ROOT/tools/art-pipeline/build_paths.py"
"$VENV" "$ROOT/tools/art-pipeline/build_language.py"
"$VENV" "$ROOT/tools/art-pipeline/build_base_archive.py"
"$VENV" "$ROOT/tools/art-pipeline/build_pack.py"

rm -rf "$OUT"; mkdir -p "$OUT"
cp "$BUILD/openrct2.js" "$BUILD/openrct2.wasm" "$BUILD/openrct2.zip" "$OUT/"
cp "$ROOT/wasm/standalone/index.html" "$ROOT/wasm/standalone/index.js" "$OUT/"

# Vendor JSZip so the distribution has no third-party network dependency.
JSZIP="$ROOT/.cache/jszip.min.js"
[[ -f "$JSZIP" ]] || curl -sfL -o "$JSZIP" https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
cp "$JSZIP" "$OUT/jszip.min.js"

( cd "$PACK" && zip -qr "$OUT/assets.zip" . )

echo "== standalone distribution: $OUT"
du -sh "$OUT"
ls -la "$OUT" | awk 'NR>1 {printf "  %10d  %s\n", $5, $9}'
