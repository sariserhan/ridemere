"""Assert the shops and facilities are visible and distinguishable in a rendered park.

    .cache/venv/bin/python tools/art-pipeline/check_visual_shops.py <png>

`check_shop_objects.py` proves the objects contain art. This proves the art survives
being drawn: that five one-tile buildings placed beside a path are actually on the
screen, and that they can be told apart.

Telling them apart is the whole design. Every stall in V1 is the same silhouette on
purpose, because a name on a sign does not survive sixty-four pixels, and the
difference a player reads is the accent colour on the awning or roof. So this counts
the accent colours: if the stalls were drawn but all came out the same hue, the art
would be pointless and nothing else would notice.

Deliberately coarse, like the other visual checks. It is not a pixel comparison and
must not become one.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image

#: The stalls sit beside the central path. Measuring the middle of the frame keeps the
#: toolbar, the status bar and the empty grass at the edges out of the count.
CROP = (0.20, 0.85, 0.15, 0.85)

#: The two accent families the five stalls carry. A stall reads as its canopy, and the
#: five split into warm ones (the grill stand, the gift stand, the information point)
#: and cool ones (the refreshment stand, the restroom). Both must be on the screen: if
#: only one family survives, the colour coding that tells a stall from a facility has
#: stopped working, and nothing else in the suite would notice.
FAMILIES = {
    "warm canopies": lambda r, g, b: (r > 140) & (r > g + 35) & (g > b + 10),
    "cool canopies": lambda r, g, b: (b > 110) & (b > r + 25) & (g > r),
}

#: Fractions of the cropped picture. A one-tile building is small, and five of them in
#: a 1280x800 frame is around one per cent, so these are floors rather than targets.
#: Measured on a capture of sunrise-test with all five stalls placed and open:
#: warm 1.13%, cool 0.40%. The floor is under a third of the smaller of the two.
MINIMUM = 0.0015

#: Unauthored base sprites draw as a magenta checker. A stall drawn as markers is worse
#: than a stall not drawn at all, because it looks deliberate.
MARKER_LIMIT = 0.002


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: check_visual_shops.py <png>")
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

    marker = float((((r > 180) & (b > 180) & (g < 120)).sum())) / total

    print(f"shops on screen: {path} ({width}x{height}, measured on the park area)")
    failures = []
    if marker > MARKER_LIMIT:
        failures.append(f"unauthored sprite markers cover {marker * 100:.2f}% of the park")

    for name, test in FAMILIES.items():
        value = float(test(r, g, b).sum()) / total
        status = "ok " if value >= MINIMUM else "MISSING"
        print(f"  {status} {name:<20} {value * 100:6.3f}% (need {MINIMUM * 100:.3f}%)")
        if value < MINIMUM:
            failures.append(f"{name} ({value * 100:.3f}% of the park, expected {MINIMUM * 100:.3f}%)")

    if failures:
        print("FAIL: the shops did not reach the screen:")
        for failure in failures:
            print(f"  {failure}")
        sys.exit(1)
    print("the shops and facilities are drawn, and their accent colours are distinct.")


if __name__ == "__main__":
    main()
