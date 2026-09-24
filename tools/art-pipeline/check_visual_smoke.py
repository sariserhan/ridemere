"""Assert a rendered park contains the things a park must contain.

    .cache/venv/bin/python tools/art-pipeline/check_visual_smoke.py <png>

Deliberately coarse. This is not a pixel comparison and must not become one: it exists
to catch the class of failure where every programmatic assertion passes and the game is
visually broken, which has now happened three times on this project. It counts how much
of the picture falls into a few colour families and insists none of them has vanished.

The thresholds are loose enough to survive art changes and tight enough that a missing
sprite table cannot slip through.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image

#: The capture includes the void beyond the map edge, which is drawn with the base
#: archive's diagnostic markers because no terrain-edge object ships yet. Those markers
#: are a red and black checker, so they have to be kept out of the measurement or a park
#: with no track at all scores higher on "warm colours" than one with track.
CROP = (0.15, 0.90, 0.10, 0.85)  # top, bottom, left, right as fractions

#: Fractions of the cropped picture. Calibrated against two real renders of the same
#: park: one normal, one with every track sprite blanked. The rails threshold sits
#: between the two, which is the specific failure this test exists to catch.
#:
#:   with track artwork     rails 0.56%   structures 0.23%
#:   with blank track art   rails 0.16%   structures 0.12%
EXPECTATIONS = {
    "terrain": (0.25, "green ground"),
    "path": (0.010, "light footpaths"),
    "rails": (0.0035, "coaster track"),
    "structure": (0.0018, "dark structures such as supports and the train"),
    "detail": (0.28, "surface texture, proving the park is drawn rather than smeared"),
}

#: Why a texture floor exists at all.
#:
#: Counting colour families alone passes a picture that contains the right colours in
#: the wrong places. Two real failures proved it: a camera pointing off the map, which
#: drew almost nothing, and a park scrolled continuously by a cursor stuck in the
#: corner, which dragged wide diagonal bands of interface across everything. Both had
#: enough green to pass.
#:
#: Every material this game ships is textured, so a horizontal run of identical pixels
#: across a park is the signal that something is wrong. Measured on the park area:
#:
#:   a correct render, shell at 1280 and at 1024      0.404, 0.405
#:   a correct render, standalone capture             0.430
#:   a park smeared by continuous scrolling            0.193
#:   a camera pointing off the map                    0.009
#:
#: The floor sits between the two groups with room on both sides.


def classify(rgb: np.ndarray) -> dict[str, float]:
    height, width, _ = rgb.shape
    top, bottom, left, right = CROP
    crop = rgb[int(height * top) : int(height * bottom), int(width * left) : int(width * right)]

    r = crop[:, :, 0].astype(np.int16)
    g = crop[:, :, 1].astype(np.int16)
    b = crop[:, :, 2].astype(np.int16)
    total = crop.shape[0] * crop.shape[1]

    # Unauthored base sprites are drawn as a magenta checker; never count them as art.
    marker = (r > 180) & (b > 180) & (g < 120)

    terrain = (g > r + 20) & (g > b + 30) & (g > 90)
    spread = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    path = (r > 150) & (g > 150) & (b > 150) & (spread < 45)
    rails = (r > 110) & (r > g + 40) & (r > b + 50) & ~marker
    dark = (r < 90) & (g < 90) & (b < 90) & (r + g + b > 45)

    # How much of the picture changes from one pixel to the next, horizontally. Our
    # materials are all textured, so a correct park is busy at this scale and a smear
    # of flat colour is not.
    grey = crop.mean(axis=2)
    detail = float((np.abs(np.diff(grey, axis=1)) > 24).mean())

    return {
        "detail": detail,
        "terrain": float(terrain.sum()) / total,
        "path": float(path.sum()) / total,
        "rails": float(rails.sum()) / total,
        "structure": float(dark.sum()) / total,
        "marker": float(marker.sum()) / total,
    }


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: check_visual_smoke.py <png>")
    path = sys.argv[1]
    with Image.open(path) as handle:
        rgb = np.array(handle.convert("RGB"))

    found = classify(rgb)
    failures = []
    print(f"visual smoke: {path} ({rgb.shape[1]}x{rgb.shape[0]}, measured on the park area)")
    if found["marker"] > 0.02:
        failures.append(f"unauthored sprite markers cover {found['marker'] * 100:.2f}% of the park")
    for key, (minimum, description) in EXPECTATIONS.items():
        value = found[key]
        status = "ok " if value >= minimum else "MISSING"
        print(f"  {status} {description:<44} {value * 100:6.2f}% (need {minimum * 100:.2f}%)")
        if value < minimum:
            failures.append(f"{description} ({value * 100:.2f}% of the picture, expected {minimum * 100:.2f}%)")

    if failures:
        print("FAIL: the park rendered without:")
        for failure in failures:
            print(f"  {failure}")
        sys.exit(1)
    print("the park renders with terrain, paths, track and structures.")


if __name__ == "__main__":
    main()
