"""Assert benches and bins reach the screen in a real park, and are not the path.

    .cache/venv/bin/python tools/art-pipeline/check_visual_additions.py <png>

`check_addition_objects.py` proves the objects contain art. This proves the art
survives being placed: that a plaza with four benches and three bins on it looks like
one, and that the check would notice if it did not.

The difficulty is that a bench is small and a park is mostly path and grass, so a
whole-picture colour count would pass on a picture with no benches in it at all. So
this measures the plaza only, and measures the two things a bench and a bin are made
of and the path is not: dark painted metal, and warm timber above it.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image

#: The plaza, as `first-park-initial.png` frames it. Measuring the whole picture would
#: let grass and path swamp objects that cover a fraction of a per cent.
CROP = (0.40, 0.64, 0.44, 0.74)

#: Fractions of the cropped area, calibrated against two captures of the same park,
#: one with the benches and bins and one without:
#:
#:                     with     without
#:   painted metal    1.267%      0.003%
#:   timber seats     1.108%      0.298%
#:
#: The timber floor has to clear 0.298% because the paving is warm-toned too, which is
#: exactly the kind of near-miss a floor picked by eye would have let through.
EXPECTED = {
    "painted metal frames and bins": (0.0055, lambda r, g, b: (r < 130) & (abs(r - b) < 40) & (g >= r - 12) & (g <= b + 30) & (r > 40)),
    "timber bench seats": (0.0060, lambda r, g, b: (r > 130) & (r > b + 45) & (g > b + 20) & (g < r)),
}


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: check_visual_additions.py <png>")
    path = sys.argv[1]
    with Image.open(path) as handle:
        rgb = np.array(handle.convert("RGB"))

    height, width, _ = rgb.shape
    top, bottom, left, right = CROP
    crop = rgb[int(height * top) : int(height * bottom), int(width * left) : int(width * right)]
    r = crop[:, :, 0].astype(np.int16)
    g = crop[:, :, 1].astype(np.int16)
    b = crop[:, :, 2].astype(np.int16)
    total = crop.shape[0] * crop.shape[1]

    print(f"path additions on screen: {path} ({width}x{height}, measured on the plaza)")
    failures = []
    for name, (minimum, test) in EXPECTED.items():
        value = float(test(r, g, b).sum()) / total
        status = "ok " if value >= minimum else "MISSING"
        print(f"  {status} {name:<32} {value * 100:6.3f}% (need {minimum * 100:.3f}%)")
        if value < minimum:
            failures.append(f"{name} ({value * 100:.3f}% of the plaza, expected {minimum * 100:.3f}%)")

    if failures:
        print("FAIL: the benches and bins did not reach the screen:")
        for failure in failures:
            print(f"  {failure}")
        sys.exit(1)
    print("benches and bins are drawn on the plaza.")


if __name__ == "__main__":
    main()
