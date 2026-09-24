"""Assert the scenery reaches the screen in a real park.

    .cache/venv/bin/python tools/art-pipeline/check_visual_scenery.py <png> [--dense|--park]

`check_scenery_objects.py` proves the objects contain art. This proves the art
survives being placed, which is a different failure: an object can be perfectly formed
and still draw nothing, at the wrong size, or behind the ground.

**Measured by palette index, not by colour family.** The first attempt classified
pixels by hue and could not tell a canopy from the grass it stood on: an art scene
with every object in it measured 5.19% "foliage" and the same scene with all the
scenery deleted measured 4.97%. A test that cannot fail is worse than no test.

The game draws from a fixed 236-colour palette and a screenshot carries those exact
colours, so a pixel can be mapped back to the index that produced it. That makes the
question exact: how much of the frame is drawn in palette entries that only the
vegetation and scenery materials use, and that no terrain, path or ride does.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, Set

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sunrise_palette as pal  # noqa: E402
import world_palette as world  # noqa: E402

#: Leave out the toolbars: they are drawn from the same palette and would be counted.
CROP = (0.06, 0.94, 0.02, 0.98)


def indices_for(*materials: str) -> Set[int]:
    out: Set[int] = set()
    for material in materials:
        ramp_name, low, high = world.vegetation_ramp(material)
        out |= set(pal.ramp(ramp_name)[low:high])
    return out


def terrain_indices() -> Set[int]:
    """Every index the ground, the paths and the built world already use."""
    out: Set[int] = set()
    for material in world.MATERIALS.values():
        ramp = pal.ramp(material.ramp)
        out |= set(ramp)
    return out


#: What each group is allowed to be counted from: its own palette entries, minus
#: anything the terrain and paths already draw with. Foliage shares the green family
#: with grass, so what is left after the subtraction is the part of the canopy that
#: could not have come from the ground.
GROUND = terrain_indices()
GROUPS: Dict[str, Set[int]] = {
    "foliage": indices_for("foliage_deep", "foliage", "foliage_light", "foliage_accent") - GROUND,
    "flowers": indices_for("flower_warm", "flower_hot", "flower_cool", "flower_sun") - GROUND,
    "bark": indices_for("bark") - GROUND,
}

#: Fractions of the cropped frame. Calibrated against the same two scenes with every
#: piece of scenery deleted, which is the only honest way to pick these:
#:
#:                       art scene   bare    density    bare
#:   foliage               0.801%   0.004%   13.979%   0.000%
#:   flowers               0.118%   0.000%    0.916%   0.000%
#:   bark                  0.124%   0.000%    1.320%   0.000%
#:
#: Every group goes to approximately zero without scenery, because these indices
#: belong to materials nothing else in the world is drawn with. The floors are well
#: under the measurements, which is "some of it is there" rather than "all of it":
#: they are meant to catch scenery that never arrived, not to pin a scene's exact
#: composition, which would break every time a test scene is rearranged.
SPARSE = {"foliage": 0.0030, "flowers": 0.00020, "bark": 0.00030}
DENSE = {"foliage": 0.0350, "flowers": 0.00400, "bark": 0.00250}

#: First Park is a third case and needs its own floors, for two reasons. It is
#: decorated lightly on purpose — the player is meant to have somewhere to put things
#: — so its numbers are a tenth of the art scene's. And it ships the stalls, whose
#: warm roof colours land in the same palette entries as the flowers, which makes the
#: flower reading useless there. Measured against the same park with every piece of
#: scenery removed:
#:
#:                      First Park    bare
#:   foliage               0.136%    0.020%
#:   flowers               0.471%    0.461%   <- the stalls, not the flower beds
#:   bark                  0.045%    0.0001%
#:
#: So the park profile asks about foliage and bark, which nothing else in that park
#: is drawn with, and does not pretend to measure the flowers.
PARK = {"foliage": 0.00070, "bark": 0.00020}


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: check_visual_scenery.py <png> [--dense|--park]")
    path = sys.argv[1]
    if "--dense" in sys.argv:
        expectations = DENSE
    elif "--park" in sys.argv:
        expectations = PARK
    else:
        expectations = SPARSE

    with Image.open(path) as handle:
        rgb = np.array(handle.convert("RGB"))
    height, width, _ = rgb.shape
    top, bottom, left, right = CROP
    crop = rgb[int(height * top): int(height * bottom), int(width * left): int(width * right)]
    total = crop.shape[0] * crop.shape[1]

    palette = np.array(pal.PALETTE, dtype=np.int16)
    flat = crop.reshape(-1, 3).astype(np.int16)

    print(f"scenery on screen: {path} ({width}x{height}, measured by palette index)")
    failures = []
    for name, minimum in expectations.items():
        wanted = np.array(sorted(GROUPS[name]), dtype=np.int32)
        if len(wanted) == 0:
            continue
        colours = palette[wanted]
        # One pass per index: the palette is small and this stays exact.
        hits = np.zeros(len(flat), dtype=bool)
        for colour in colours:
            hits |= (flat == colour).all(axis=1)
        value = float(hits.sum()) / total
        status = "ok " if value >= minimum else "MISSING"
        print(f"  {status} {name:<10} {value * 100:7.4f}% (need {minimum * 100:.4f}%) "
              f"from {len(wanted)} palette entries")
        if value < minimum:
            failures.append(f"{name} ({value * 100:.4f}%, expected {minimum * 100:.4f}%)")

    if failures:
        print("FAIL: the scenery did not reach the screen:")
        for failure in failures:
            print(f"  {failure}")
        sys.exit(1)
    print("the scenery is drawn.")


if __name__ == "__main__":
    main()
