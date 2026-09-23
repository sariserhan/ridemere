#!/usr/bin/env bash
# Assemble build/www/assets.zip: the OpenRCT2 engine data the browser launcher (emscripten/static/index.js)
# fetches and extracts into the /OpenRCT2 virtual filesystem. Mirrors the native `cmake --install` data layout.
# Upstream's build-emscripten does NOT produce this file: sprite tables are skipped when cross-compiling,
# and the object/sequence/sound/music packs are downloaded only at native install time.
# Contains NO proprietary RCT2 data. Sources: engine repo (GPL), OpenRCT2/objects, title-sequences,
# OpenSoundEffects, OpenMusic (see docs/licensing.md) pinned via engine/openrct2/assets.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine/openrct2"
CACHE="$ROOT/.cache"
GXC_VERSION="${GXC_VERSION:-v1.4.0}"
OUT="${1:-$ENGINE/build/www/assets.zip}"
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT

# 1. gxc (libsawyer sprite archive tool) builds g2/fonts/palettes/tracks .dat from resources/*/sprites.json
mkdir -p "$CACHE/tools" "$CACHE/assets"
if [[ ! -x "$CACHE/tools/gxc" ]]; then
  curl -sfL "https://github.com/OpenRCT2/libsawyer/releases/download/$GXC_VERSION/libsawyer-tools-linux-x64.tar.gz" \
    | tar xz -C "$CACHE/tools"
fi
PATH="$CACHE/tools:$PATH" "$ENGINE/scripts/build-graphics-dat" "$STAGE"

# 2. Engine data shipped in the repo
cp -r "$ENGINE/data/language" "$ENGINE/data/shaders" "$ENGINE/data/scenario_patches" "$STAGE/"
cp "$ENGINE/distribution/changelog.txt" "$ENGINE/contributors.md" "$ENGINE/licence.txt" "$STAGE/"

# 3. Packs pinned by upstream assets.json (sha256 verified), extracted where native install puts them
python3 - "$ENGINE/assets.json" "$CACHE/assets" "$STAGE" <<'PY'
import json, hashlib, os, sys, urllib.request, zipfile
manifest, cache, stage = sys.argv[1:]
a = json.load(open(manifest))
dest = {'objects': 'object', 'title-sequences': 'sequence', 'opensfx': '.', 'openmusic': '.'}
for key, sub in dest.items():
    url, sha = a[key]['url'], a[key]['sha256']
    path = os.path.join(cache, key + '.zip')
    if not os.path.exists(path):
        print('downloading', url); urllib.request.urlretrieve(url, path)
    got = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    if got != sha: sys.exit(f'sha256 mismatch for {key}: {got}')
    zipfile.ZipFile(path).extractall(os.path.join(stage, sub))
    print(f'{key}: ok ({url.rsplit("/",3)[-3]})')
PY

# 4. Zip (store-only for large already-compressed packs is fine; deflate keeps it simple)
rm -f "$OUT"; mkdir -p "$(dirname "$OUT")"
( cd "$STAGE" && zip -qr "$OUT" . )
echo "assets.zip -> $OUT ($(du -h "$OUT" | cut -f1)); contents:"
( cd "$STAGE" && du -sh -- * | sort -rh )
