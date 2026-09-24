"""The shared world material palette.

Every generator that puts something on the ground reads its colours from here, so
grass in a terrain tile and grass beside a path cannot drift apart, and so the
saturation hierarchy in docs/world-art-system.md is enforced in one place rather than
remembered in five.

A material is a ramp plus a texture rule. The texture rule is deliberately part of the
material: what makes sand read as sand at 64 by 31 pixels is the scale and amount of
its breakup, far more than its hue.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Dict, List

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sunrise_palette as pal  # noqa: E402


@dataclass(frozen=True)
class Material:
    """One world material.

    `ramp` is the palette ramp. `base` is where on that ramp an unshaded surface sits.
    `texture_amount` is how many ramp steps the breakup may move a pixel, and
    `texture_scale` is how large its features are in pixels. `density` is the fraction
    of pixels the breakup touches at all.
    """

    ramp: str
    base: int
    texture_amount: int
    texture_scale: int
    density: float
    description: str

    @property
    def colours(self) -> List[int]:
        return pal.ramp(self.ramp)

    def shade(self, step: int) -> int:
        """A palette index this material's given ramp step, clamped to the ramp."""
        colours = self.colours
        return colours[max(0, min(len(colours) - 1, step))]


#: The four ground materials, plus the materials built things are made of.
#:
#: Terrain is the least saturated thing on screen because it is the largest: a ride has
#: to win the eye against thousands of tiles of it. Paths are lighter than terrain so
#: guests and queues read against them.
MATERIALS: Dict[str, Material] = {
    "grass": Material("green", 7, 1, 4, 0.22, "soft variation with a slight tuft character"),
    "dirt": Material("tan", 5, 1, 3, 0.26, "warm earth with sparse granular breakup"),
    "sand": Material("beige", 8, 1, 5, 0.16, "light warm surface, minimal patterning"),
    "stone": Material("grey", 4, 1, 6, 0.26, "cool neutral with a subtle slab treatment"),

    # Built materials. Paths sit lighter than the ground they cross.
    # Paths sit lighter than the ground they cross, so guests, queues and litter read
    # against them. A path darker than its terrain looks like mud, which is how the
    # first attempt looked.
    "path_paved": Material("beige", 9, 1, 6, 0.16, "neutral default paving"),
    "path_stone": Material("grey", 9, 1, 5, 0.22, "decorative stone slabs"),
    "path_wood": Material("tan", 8, 1, 4, 0.22, "warm timber decking"),
    "path_queue": Material("blue_grey", 9, 1, 6, 0.16, "queue space, cooler with a centre stripe"),
    "cliff": Material("tan", 4, 2, 5, 0.40, "warm soil and rock beneath every surface"),
    "railing": Material("grey", 8, 1, 3, 0.18, "clean painted metal"),
    "support": Material("grey", 5, 1, 4, 0.22, "structure beneath a path"),
}

#: The vegetation palette.
#:
#: Ramp slices rather than whole ramps, for the reason the bench learned in V1-4: the
#: quantiser spreads a render's brightness across whatever ramp it is given, so a full
#: twelve-step ramp puts every lit surface at the top of it and the object arrives
#: bleached. Five or six steps is a material.
#:
#: The rule these are chosen against is that **a tree must separate from the grass it
#: stands on**, and the grass is `green` around step 7. So the foliage tones are either
#: a different hue family (olive, bright green) or a long way from step 7 in value, and
#: usually both. The one that needs the most care is `foliage`, which is the same ramp
#: as the grass: it sits at 3..8, darker than the ground, so a canopy reads as a shape
#: rather than as a patch of lawn on a stick.
VEGETATION: Dict[str, tuple] = {
    "foliage_deep": ("olive_dark", 2, 7),
    "foliage": ("green", 3, 8),
    "foliage_light": ("bright_green", 4, 9),
    "foliage_accent": ("olive", 4, 9),
    "flower_warm": ("pink", 4, 10),
    "flower_hot": ("red", 5, 10),
    "flower_cool": ("purple", 4, 9),
    "flower_sun": ("orange", 5, 10),
    # Low on the ramp: the first attempt sat at 2..7 and every trunk came out a
    # bright orange-tan, which fought the foliage instead of holding it up.
    "bark": ("brown", 0, 5),
    "bark_light": ("tan", 3, 8),
    "stone_wall": ("grey", 3, 8),
    "metal": ("grey", 2, 7),
    "timber": ("tan", 3, 8),
    "paint_warm": ("orange", 4, 9),
}


def vegetation_ramp(name: str) -> tuple:
    """(ramp name, low, high) for a vegetation or scenery material."""
    try:
        return VEGETATION[name]
    except KeyError:
        raise KeyError(f"unknown vegetation material {name!r}; known: {sorted(VEGETATION)}") from None


def texture(material: Material, height: int, width: int, seed: int = 0) -> np.ndarray:
    """A deterministic value offset per pixel, in ramp steps.

    Deterministic because terrain must look the same every build: a texture that moved
    between builds would make every visual regression test meaningless. Computed from
    the pixel position so the same tile sprite tiles against itself without a seam.
    """
    ys, xs = np.mgrid[0:height, 0:width]
    scale = max(1, material.texture_scale)
    # A cheap integer hash: stable, no dependency on a random implementation.
    # Rows are offset by half a cell so the pattern does not form vertical runs, which
    # at this size read as corduroy rather than as ground.
    row = ys // scale
    col = (xs + (row % 2) * (scale // 2)) // scale
    cell = col * 73856093 ^ row * 19349663 ^ (seed * 83492791)
    noise = ((cell >> 5) & 0xFF) / 255.0

    offsets = np.zeros((height, width), dtype=np.int16)
    if material.texture_amount <= 0 or material.density <= 0:
        return offsets
    touched = noise < material.density
    # Half the touched pixels lighten and half darken, so the mean value is unchanged
    # and the material does not drift lighter as density rises.
    sign = np.where(((cell >> 13) & 1) == 1, 1, -1)
    offsets[touched] = (sign[touched] * material.texture_amount).astype(np.int16)
    return offsets


def describe() -> str:
    lines = [f"{'material':12} {'ramp':10} {'base':>4} {'amount':>6} {'scale':>5} {'density':>7}  description"]
    for name, material in MATERIALS.items():
        lines.append(
            f"{name:12} {material.ramp:10} {material.base:4d} {material.texture_amount:6d} "
            f"{material.texture_scale:5d} {material.density:7.2f}  {material.description}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(describe())
