"""Assert every scenery model was built on the rotation origin.

    .cache/venv/bin/python tools/art-pipeline/check_rotation_origin.py [render dir]

The render camera orbits the world origin. A model placed anywhere else swings to a
different place in each rotation, the packed sprite offsets disagree with one another,
and the engine draws the object half off its own tile. That is exactly what happened
to the stalls in V1-3, where half of every one of them was missing, and it is invisible
in the renders themselves: each frame looks perfectly good on its own.

What gives it away is the horizontal centre of the content. A model on the origin
projects to the same screen x from every camera yaw; one that is not swings from side
to side. So this measures the content's horizontal centre in each rotation and insists
they agree.

Vertical position legitimately differs between rotations — a tree leaning away from
the camera is higher on screen than one leaning towards it — so only x is checked.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Dict, List

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: Pixels. A model on the origin should agree exactly; two pixels allows for the
#: rounding in an antialiased edge without letting a real swing through. The stall
#: defect showed up as twenty-seven.
MAX_CENTRE_SPREAD = 2.0

problems: List[str] = []


def content_centre(path: str) -> float:
    with Image.open(path) as handle:
        alpha = np.array(handle.convert("RGBA"))[:, :, 3]
    columns = np.nonzero((alpha > 8).any(axis=0))[0]
    if len(columns) == 0:
        return float("nan")
    return float(columns[0] + columns[-1]) / 2.0


def main() -> None:
    directory = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        REPO, "assets", "generated", "world", "scenery")
    manifest_path = os.path.join(directory, "frames.json")
    if not os.path.exists(manifest_path):
        raise SystemExit(f"no renders at {manifest_path}")
    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    checked = 0
    worst = ("", 0.0)
    for stem, entry in sorted(manifest.items()):
        if not isinstance(entry, list) or len(entry) < 2:
            continue
        centres = []
        for file_name in entry:
            path = os.path.join(directory, file_name)
            if not os.path.exists(path):
                problems.append(f"{stem}: missing render {file_name}")
                continue
            centre = content_centre(path)
            if centre != centre:  # NaN
                problems.append(f"{stem}: {file_name} is completely empty")
                continue
            centres.append(centre)
        if len(centres) < 2:
            continue
        checked += 1
        spread = max(centres) - min(centres)
        if spread > worst[1]:
            worst = (stem, spread)
        if spread > MAX_CENTRE_SPREAD:
            problems.append(
                f"{stem}: its content moves {spread:.1f} px across the rotations "
                f"({', '.join(f'{c:.1f}' for c in centres)}), so it was not modelled on the origin")

    print(f"rotation origin: {checked} objects checked in {os.path.relpath(directory, REPO)}")
    if worst[0]:
        print(f"  worst spread {worst[1]:.1f} px ({worst[0]}), limit {MAX_CENTRE_SPREAD:.1f} px")

    if problems:
        print("FAIL: models that are not on the rotation origin:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print("every model stays put when the camera goes round it.")


if __name__ == "__main__":
    main()
