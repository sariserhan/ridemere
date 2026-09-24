"""Assert a captured interface actually contains an interface.

    .cache/venv/bin/python tools/art-pipeline/check_visual_ui.py <png> [--name label]

Structural, not a pixel comparison, for the same reason as the park smoke test: this
exists to catch the failure where every programmatic assertion passes and the screen is
wrong. It measures whether window chrome, readable text and coloured tab icons are all
present, and it is calibrated so that blanking the interface sprites fails it.
"""

from __future__ import annotations

import argparse
import sys

import numpy as np
from PIL import Image


#: The interface test opens the ride list first, and the engine places a window at a
#: fixed default position, so these rectangles are the window rather than the park.
#: Judging "is there an interface" across the whole screen mostly measures terrain,
#: which is present either way.
WINDOW_REGION = (32, 30, 368, 268)   # left, top, right, bottom
TAB_STRIP = (34, 46, 136, 82)        # the row of tabs under the title bar


def crop(rgb: np.ndarray, region: tuple[int, int, int, int]) -> np.ndarray:
    left, top, right, bottom = region
    return rgb[top:bottom, left:right]


def measure(rgb: np.ndarray) -> dict:
    window = crop(rgb, WINDOW_REGION)
    r = window[:, :, 0].astype(np.int16)
    g = window[:, :, 1].astype(np.int16)
    b = window[:, :, 2].astype(np.int16)
    total = window.shape[0] * window.shape[1]
    luma = 0.299 * r + 0.587 * g + 0.114 * b

    chrome = (r > 90) & (r > b + 25) & (g > b) & (luma > 60) & (luma < 215)
    vertical = np.abs(np.diff(luma, axis=0))
    horizontal = np.abs(np.diff(luma, axis=1))
    edges = int((vertical > 45).sum() + (horizontal > 45).sum())
    marker = (r > 180) & (b > 180) & (g < 120)

    # The tab strip is where the interface art actually lives. Window fills and text
    # are drawn by the engine from theme colours, so they survive even when every
    # interface sprite is blank; the tabs and their symbols do not.
    strip = crop(rgb, TAB_STRIP)
    strip_luma = 0.299 * strip[:, :, 0] + 0.587 * strip[:, :, 1] + 0.114 * strip[:, :, 2]
    strip_edges = int(
        (np.abs(np.diff(strip_luma, axis=0)) > 45).sum()
        + (np.abs(np.diff(strip_luma, axis=1)) > 45).sum())
    strip_colours = len({tuple(pixel) for pixel in strip.reshape(-1, 3).tolist()})

    return {
        "chrome": float(chrome.sum()) / total,
        "edgesPerKilopixel": edges / (total / 1000.0),
        "tabEdges": float(strip_edges),
        "tabColours": float(strip_colours),
        "marker": float(marker.sum()) / total,
    }


#: Calibrated against a real capture of four open windows, and against the same capture
#: from a build whose interface sprites were all blanked:
#:
#:     with interface art   tab edges 618   tab colours 13
#:     with blank art       tab edges 102   tab colours  5
EXPECTED = {
    "chrome": (0.35, "window chrome"),
    "edgesPerKilopixel": (25.0, "text and detail in the window"),
    "tabEdges": (300.0, "shape in the tab strip"),
    "tabColours": (9.0, "colour in the tab icons"),
}
MAX_MARKER = 0.004


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--name", default="interface")
    args = parser.parse_args()

    with Image.open(args.image) as handle:
        rgb = np.array(handle.convert("RGB"))
    found = measure(rgb)

    print(f"visual interface check: {args.name} ({rgb.shape[1]}x{rgb.shape[0]})")
    failures = []
    for key, (minimum, description) in EXPECTED.items():
        value = found[key]
        ok = value >= minimum
        print(f"  {'ok ' if ok else 'MISSING'} {description:<32} {value:9.2f} (need {minimum:.2f})")
        if not ok:
            failures.append(f"{description} ({value:.3f}, expected {minimum:.3f})")

    if found["marker"] > MAX_MARKER:
        failures.append(f"unauthored sprite markers cover {found['marker'] * 100:.2f}% of the screen")
        print(f"  MISSING no unauthored sprite markers       {found['marker']:8.3f} (max {MAX_MARKER:.3f})")

    if failures:
        print("FAIL: the interface did not render:")
        for failure in failures:
            print(f"  {failure}")
        sys.exit(1)
    print("the interface renders with chrome, text and icons.")


if __name__ == "__main__":
    main()
