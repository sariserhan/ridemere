"""Project Sunrise palette utilities.

The OpenRCT2 sprite palette is derived at import time from the engine's own open
palette resource (engine/openrct2/resources/palettes/sprites.json, entry index 10,
236 colours covering palette indices 10..245) so it can never drift from the engine.

Palette facts, from the engine (see docs/object-formats.md for citations):

  0            transparent
  1..9         font/effect slots, never used by artwork
  10..245      the ordinary colour table (236 entries)
  46..57       TERTIARY remap ramp   (PaletteIndex.h: tertiaryRemap0  = 46)
  202..213     SECONDARY remap ramp  (PaletteIndex.h: secondaryRemap0 = 202)
  243..254     PRIMARY remap ramp    (PaletteIndex.h: primaryRemap0   = 243)
  246..255     no defined RGB in the open palette; only meaningful under a remap

A sprite drawn as ImageId(idx, primary, secondary) has its 243..254 pixels replaced
by the primary colour's 12-shade ramp and its 202..213 pixels by the secondary's.
Guests are drawn that way (Paint.Guest.cpp), staff with primary only
(Paint.Staff.cpp), so one rendered peep yields every shirt/trouser colour for free.
"""

from __future__ import annotations

import json
import os
from typing import Dict, Iterable, List, Sequence, Tuple

RGB = Tuple[int, int, int]

TRANSPARENT = 0
PRIMARY_REMAP_START = 243
SECONDARY_REMAP_START = 202
TERTIARY_REMAP_START = 46
REMAP_LENGTH = 12

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(os.path.dirname(_HERE))
_PALETTE_JSON = os.path.join(
    _REPO, "engine", "openrct2", "resources", "palettes", "sprites.json"
)


def _load_engine_palette() -> List[RGB]:
    with open(_PALETTE_JSON, "r", encoding="utf-8") as fh:
        entries = json.load(fh)
    main = None
    for entry in entries:
        if isinstance(entry, dict) and entry.get("index") == 10 and len(entry.get("colours", [])) == 236:
            main = entry
            break
    if main is None:
        raise RuntimeError(f"main 236-colour palette entry not found in {_PALETTE_JSON}")

    palette: List[RGB] = [(0, 0, 0)] * 256
    for offset, value in enumerate(main["colours"]):
        text = value.lstrip("#")
        palette[10 + offset] = (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))
    return palette


#: Full 256-entry palette. Entries 0..9 and 246..255 have no meaningful RGB.
PALETTE: List[RGB] = _load_engine_palette()


def remap_range(start: int) -> range:
    return range(start, start + REMAP_LENGTH)


#: Indices that must never be produced by ordinary colour quantisation, because
#: they are replaced at draw time whenever the sprite is drawn with a colour.
REMAP_INDICES = set(remap_range(PRIMARY_REMAP_START)) | set(
    remap_range(SECONDARY_REMAP_START)
) | set(remap_range(TERTIARY_REMAP_START))

#: Safe indices for ordinary (never-recoloured) artwork.
SAFE_INDICES: List[int] = [i for i in range(10, 246) if i not in REMAP_INDICES]


# ---------------------------------------------------------------------------
# Named ramps
#
# A "ramp" is an ordered list of palette indices from darkest to lightest. The
# render pipeline classifies each pixel into a part (skin, shirt, hair, ...) and
# then picks a shade within that part's ramp from the rendered luminance. Swapping
# a ramp produces a new visual variant with no re-render, which is how guest
# variation is produced (see docs/art-pipeline.md).
# ---------------------------------------------------------------------------

#: The three runtime-recolourable ramps.
RAMP_PRIMARY: List[int] = list(remap_range(PRIMARY_REMAP_START))
RAMP_SECONDARY: List[int] = list(remap_range(SECONDARY_REMAP_START))
RAMP_TERTIARY: List[int] = list(remap_range(TERTIARY_REMAP_START))


def _contiguous(start: int, length: int) -> List[int]:
    return list(range(start, start + length))


# The engine palette is laid out as 12-entry colour ramps starting at index 10.
# Ramp n therefore occupies 10 + 12n .. 21 + 12n. These names are ours; the
# groupings were read off the palette values themselves.
RAMPS: Dict[str, List[int]] = {
    "grey": _contiguous(10, 12),
    "olive_dark": _contiguous(22, 12),
    "tan": _contiguous(34, 12),
    "brown": _contiguous(46, 12),          # == tertiary remap range
    "red_dark": _contiguous(58, 12),
    "green": _contiguous(70, 12),
    "olive": _contiguous(82, 12),
    "bright_green": _contiguous(94, 12),
    "skin": _contiguous(106, 12),
    "blue_grey": _contiguous(118, 12),
    "blue": _contiguous(130, 12),
    "sea_green": _contiguous(142, 12),
    "purple": _contiguous(154, 12),
    "red": _contiguous(166, 12),
    "orange": _contiguous(178, 12),
    "teal": _contiguous(190, 12),
    "pink": _contiguous(202, 12),          # == secondary remap range
    "beige": _contiguous(214, 12),
}


def ramp(name: str) -> List[int]:
    try:
        return RAMPS[name]
    except KeyError:
        raise KeyError(f"unknown ramp {name!r}; known: {sorted(RAMPS)}") from None


def shade(ramp_indices: Sequence[int], luminance: float) -> int:
    """Pick a palette index from a ramp for a 0..1 luminance."""
    if not ramp_indices:
        raise ValueError("empty ramp")
    position = int(round(max(0.0, min(1.0, luminance)) * (len(ramp_indices) - 1)))
    return ramp_indices[position]


def nearest_index(colour: RGB, allowed: Iterable[int] | None = None) -> int:
    """Nearest palette index to an RGB triple, restricted to `allowed`."""
    candidates = list(allowed) if allowed is not None else SAFE_INDICES
    red, green, blue = colour
    best = candidates[0]
    best_distance = None
    for index in candidates:
        pr, pg, pb = PALETTE[index]
        # Weighted to approximate perceptual distance; exact metric is not critical.
        distance = 2 * (pr - red) ** 2 + 4 * (pg - green) ** 2 + 3 * (pb - blue) ** 2
        if best_distance is None or distance < best_distance:
            best_distance = distance
            best = index
    return best


def luminance(colour: RGB) -> float:
    red, green, blue = colour
    return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255.0


if __name__ == "__main__":
    print(f"palette entries defined: 10..245 ({len(SAFE_INDICES)} safe indices)")
    for name, indices in RAMPS.items():
        first, last = PALETTE[indices[0]], PALETTE[indices[-1]]
        tag = ""
        if indices[0] == PRIMARY_REMAP_START:
            tag = " (PRIMARY REMAP)"
        elif indices[0] == SECONDARY_REMAP_START:
            tag = " (SECONDARY REMAP)"
        elif indices[0] == TERTIARY_REMAP_START:
            tag = " (TERTIARY REMAP)"
        print(f"  {name:14s} {indices[0]:3d}..{indices[-1]:3d}  {first} -> {last}{tag}")
