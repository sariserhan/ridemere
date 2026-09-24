"""Build the tile-selection highlights the build tools draw under the cursor.

    .cache/venv/bin/python tools/art-pipeline/build_selection_sprites.py

Three families of nineteen, one sprite per land slope, at fixed base indices the
engine hard-codes (`Paint.Surface.h`):

    3043..3061   corner     the whole tile, under a tool that places on a tile
    3062..3080   edge       one side of a tile, under the fence tool
    3081..3099   quarter    one quadrant, under a tool that places in a quadrant

Nothing asked for these until V1-5, because nothing in the game had a build tool
pointed at the ground. The first time the scenery window opened, the highlight under
the cursor was a magenta marker.

The engine draws them through a filter palette (`FilterPaletteID::paletteLandMarker0`
and friends), which remaps every index in the sprite, so what matters is the shape,
not the colour. They are derived from the terrain renders rather than drawn again, so
a selection highlight is exactly the silhouette of the ground it is highlighting: if
the terrain's slope geometry ever changes, these change with it.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, List

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TERRAIN = os.path.join(REPO, "assets", "generated", "world", "terrain")
OUT_DIR = os.path.join(REPO, "assets", "generated", "ui", "selection")

SLOPES = 19
CORNER_BASE = 3043
EDGE_BASE = 3062
QUARTER_BASE = 3081

#: The index every selection pixel carries. The filter palette replaces it, so this
#: only has to be a colour the packer will keep: one that is not zero.
MARK = 20


def silhouette(path: str) -> np.ndarray:
    with Image.open(path) as handle:
        return np.array(handle.convert("RGBA"))[:, :, 3] > 8


def outline(mask: np.ndarray) -> np.ndarray:
    """The one-pixel border of a filled shape."""
    inner = np.zeros_like(mask)
    inner[1:-1, 1:-1] = (mask[:-2, 1:-1] & mask[2:, 1:-1] & mask[1:-1, :-2] & mask[1:-1, 2:]
                         & mask[1:-1, 1:-1])
    return mask & ~inner


def half(mask: np.ndarray, keep_left: bool) -> np.ndarray:
    """Half the shape, split down the middle: one side of a tile."""
    out = mask.copy()
    middle = mask.shape[1] // 2
    if keep_left:
        out[:, middle:] = False
    else:
        out[:, :middle] = False
    return out


def quadrant(mask: np.ndarray) -> np.ndarray:
    """The near quadrant: the lower half of the left half, which is one quarter tile."""
    out = mask.copy()
    middle_x = mask.shape[1] // 2
    rows = np.nonzero(mask.any(axis=1))[0]
    middle_y = (rows[0] + rows[-1]) // 2 if len(rows) else mask.shape[0] // 2
    out[:middle_y, :] = False
    out[:, middle_x:] = False
    return out


def to_indices(mask: np.ndarray) -> np.ndarray:
    return np.where(mask, np.uint8(MARK), np.uint8(0))


def build() -> Dict[int, str]:
    sources = sorted(name for name in os.listdir(TERRAIN) if name.startswith("grass_s"))
    if len(sources) < SLOPES:
        raise SystemExit(f"expected {SLOPES} grass slope renders in {TERRAIN}, found {len(sources)}")
    os.makedirs(OUT_DIR, exist_ok=True)

    produced: Dict[int, str] = {}
    for slope in range(SLOPES):
        mask = silhouette(os.path.join(TERRAIN, sources[slope]))
        families = (
            (CORNER_BASE + slope, outline(mask)),
            (EDGE_BASE + slope, outline(half(mask, keep_left=True))),
            (QUARTER_BASE + slope, outline(quadrant(mask))),
        )
        for index, shape in families:
            path = os.path.join(OUT_DIR, f"{index:05d}.png")
            spritepack.write_indexed_png(path, to_indices(shape))
            produced[index] = path
    return produced


def main() -> None:
    produced = build()
    empty = [index for index, path in produced.items()
             if not np.array(Image.open(path)).any()]
    if empty:
        raise SystemExit(f"{len(empty)} selection sprites came out empty: {empty[:6]}")
    print(f"selection highlights: {len(produced)} sprites -> "
          f"{os.path.relpath(OUT_DIR, REPO)}")


if __name__ == "__main__":
    main()
