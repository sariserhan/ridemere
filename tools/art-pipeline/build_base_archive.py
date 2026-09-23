"""Build the Project Sunrise base sprite archive (Data/g1.dat).

    .cache/venv/bin/python tools/art-pipeline/build_base_archive.py

The engine refuses to start unless the base archive holds at least SPR_G1_END
(29,294) entries (Drawing.Sprite.cpp:502), and a great deal of engine code addresses
those entries by number. Our content supplies art for only the entries it needs; the
rest exist purely to satisfy the count and carry a loud diagnostic marker so that any
remaining dependency is impossible to miss on screen.

Markers are deliberately opaque. A transparent placeholder draws nothing, which in a
software renderer leaves whatever was in the framebuffer before and makes a missing
sprite look like working art (see tools/asset-audit/experiment-blank-g1/README.md).

Populated entries are declared in SPRITE_SOURCES; everything else is a marker. The
resulting populated ranges are written to base-archive.json for the content manifest,
which is what arms the in-game sprite audit.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from typing import Dict, List, Tuple

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GXC = os.path.join(REPO, ".cache", "tools", "gxc")
OUT_DIR = os.path.join(REPO, "assets", "generated", "base")

#: Must equal SPR_G1_END in src/openrct2/SpriteIds.h.
G1_ENTRY_COUNT = 29294

MARKER_SIZE = 8

#: index -> PNG path, for entries we supply real art for. Filled in as the sprite
#: audit identifies what the exposed content actually asks for.
SPRITE_SOURCES: Dict[int, str] = {}


def _engine_entry_count() -> int:
    """Read SPR_G1_END from the engine so this file cannot silently drift."""
    header = os.path.join(REPO, "engine", "openrct2", "src", "openrct2", "SpriteIds.h")
    with open(header, "r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if stripped.startswith("SPR_G1_END"):
                return int(stripped.split("=")[1].strip().rstrip(","))
    raise RuntimeError("SPR_G1_END not found in SpriteIds.h")


def make_marker_png(path: str) -> None:
    """An opaque magenta/black checker: unmistakable, and never mistaken for art."""
    magenta = pal.nearest_index((255, 0, 255))
    black = pal.nearest_index((16, 16, 16))
    grid = np.zeros((MARKER_SIZE, MARKER_SIZE), dtype=np.uint8)
    for y in range(MARKER_SIZE):
        for x in range(MARKER_SIZE):
            grid[y, x] = magenta if ((x // 2) + (y // 2)) % 2 == 0 else black
    spritepack.write_indexed_png(path, grid)


def ranges_from_indices(indices: List[int]) -> List[Tuple[int, int]]:
    if not indices:
        return []
    ordered = sorted(set(indices))
    ranges: List[Tuple[int, int]] = []
    start = previous = ordered[0]
    for value in ordered[1:]:
        if value == previous + 1:
            previous = value
            continue
        ranges.append((start, previous))
        start = previous = value
    ranges.append((start, previous))
    return ranges


def build() -> dict:
    expected = _engine_entry_count()
    if expected != G1_ENTRY_COUNT:
        raise SystemExit(
            f"engine expects {expected} base entries but this script is set to {G1_ENTRY_COUNT}"
        )
    if not os.path.exists(GXC):
        raise SystemExit(f"gxc not found at {GXC}; see wasm/scripts/build-assets.sh")

    os.makedirs(OUT_DIR, exist_ok=True)
    work = tempfile.mkdtemp(prefix="sunrise-base-")
    try:
        marker = os.path.join(work, "marker.png")
        make_marker_png(marker)

        entries = []
        for index in range(G1_ENTRY_COUNT):
            source = SPRITE_SOURCES.get(index)
            if source is None:
                # Centre the marker on the anchor so it is visible wherever it lands.
                entries.append({
                    "path": "marker.png",
                    "x": -MARKER_SIZE // 2,
                    "y": -MARKER_SIZE // 2,
                    "palette": "keep",
                })
            else:
                staged = os.path.join(work, f"s{index:05d}.png")
                shutil.copy(source, staged)
                entries.append({"path": os.path.basename(staged), "palette": "keep"})

        manifest_path = os.path.join(work, "sprites.json")
        with open(manifest_path, "w", encoding="utf-8") as handle:
            json.dump(entries, handle)

        archive = os.path.join(OUT_DIR, "g1.dat")
        result = subprocess.run(
            [GXC, "-q", "build", archive, manifest_path],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise SystemExit(f"gxc failed: {result.stderr[-2000:]}")

        populated = ranges_from_indices(list(SPRITE_SOURCES))
        summary = {
            "entries": G1_ENTRY_COUNT,
            "populated": [list(pair) for pair in populated],
            "populatedCount": len(SPRITE_SOURCES),
            "markerSize": MARKER_SIZE,
            "bytes": os.path.getsize(archive),
        }
        with open(os.path.join(OUT_DIR, "base-archive.json"), "w", encoding="utf-8") as handle:
            json.dump(summary, handle, indent=2)
        return summary
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    info = build()
    print(
        f"base archive: {info['entries']} entries, {info['populatedCount']} with art, "
        f"{info['bytes'] / 1e6:.2f} MB -> {os.path.relpath(OUT_DIR, REPO)}/g1.dat"
    )
