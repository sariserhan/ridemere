#!/usr/bin/env bash
# Prove the world object check fails when terrain or path art goes blank.
#
# Builds a copy of a terrain surface and a path surface whose sprites are a single
# transparent pixel, and requires the check to reject them. A regression test that
# cannot fail protects nothing.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV="$ROOT/.cache/venv/bin/python"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/pack/object"
cp "$ROOT/assets/generated/pack/object/"*.parkobj "$WORK/pack/object/"

"$VENV" - "$WORK" <<'PY'
import io, json, os, sys, zipfile
work = sys.argv[1]
targets = ["sunrise.terrain_surface.grass.parkobj", "sunrise.footpath_surface.paved.parkobj"]
blank_png = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x03"
    b"\x00\x00\x00\x28\xcb\x34\xbb\x00\x00\x00\x03PLTE\x00\x00\x00\xa7\x7a\x3d\xda"
    b"\x00\x00\x00\x01tRNS\x00@\xe6\xd8f\x00\x00\x00\nIDAT\x08\x99c`\x00\x00\x00\x02"
    b"\x00\x01\xe2!\xbc\x33\x00\x00\x00\x00IEND\xaeB`\x82"
)
for name in targets:
    path = os.path.join(work, "pack", "object", name)
    with zipfile.ZipFile(path) as archive:
        root = json.loads(archive.read("object.json"))
        names = [i.filename for i in archive.infolist()]
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("object.json", json.dumps(root))
        for entry in names:
            if entry == "object.json":
                continue
            archive.writestr(entry, blank_png)
    print("blanked", name)
PY

status=0
"$VENV" "$ROOT/tools/art-pipeline/check_world_objects.py" "$WORK/pack" || status=$?
if [[ $status -eq 0 ]]; then
  echo "FAIL: the world object check passed objects with no art"
  exit 1
fi
echo "the world object check correctly rejects blank terrain and path art."
