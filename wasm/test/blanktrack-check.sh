#!/usr/bin/env bash
# Prove the visual smoke test catches a deliberately blanked track sprite table.
#
# Builds a throwaway distribution whose tracks.dat is all one-pixel transparent
# entries, renders the reference park from it, and requires the smoke test to FAIL.
# A smoke test that cannot fail is not protecting anything.
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cp -r "$ROOT/engine/openrct2/build/www-standalone" "$WORK/dist"
"$ROOT/.cache/venv/bin/python" - "$WORK" <<'PY'
import os, struct, sys, zipfile, shutil
work = sys.argv[1]
src = os.path.join(work, 'dist', 'assets.zip')
with zipfile.ZipFile(src) as z:
    entries = {i.filename: z.read(i.filename) for i in z.infolist() if not i.is_dir()}
count, _ = struct.unpack_from('<II', entries['tracks.dat'], 0)
blank = bytearray(struct.pack('<II', count, count))
for i in range(count):
    blank += struct.pack('<IHHhhHI', i, 1, 1, 0, 0, 0, 0)
blank += bytes(count)
entries['tracks.dat'] = bytes(blank)
with zipfile.ZipFile(src, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, data in entries.items():
        z.writestr(name, data)
print(f'blanked tracks.dat: {count} one-pixel entries')
PY

node "$ROOT/wasm/test/visualsmoke.js" "$WORK/dist" "$WORK/blank.png" >/dev/null
if "$ROOT/.cache/venv/bin/python" "$ROOT/tools/art-pipeline/check_visual_smoke.py" "$WORK/blank.png"; then
  echo "FAIL: the visual smoke test passed a park with no track artwork"
  exit 1
fi
echo "the visual smoke test correctly rejects a park rendered with blank track artwork."
