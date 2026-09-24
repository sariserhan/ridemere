"""Assert a window was drawn, not merely opened.

    .cache/venv/bin/python tools/art-pipeline/check_window_drawn.py <rects.json>

This exists because of a specific failure. The scenery window is a tool window: its
`onUpdate` closes it again unless the scenery tool is active, and opening it the direct
way did not activate the tool. So it existed for one frame and was gone by the next
capture. Every assertion the audit made was true — the window opened, the sprite audit
was clean — and the reason the audit was clean is that nothing had been drawn. Three of
that window's own buttons were unauthored for the whole of V1-5 and could not have been
found.

"It opened" and "it is on screen" are both answerable from the window manager and both
were answered yes while the screen showed grass. So this asks the picture instead:

    changed     most of the pixels inside the window's rectangle differ from the same
                frame taken before it opened
    contained   almost none of the pixels outside it do, so what changed is the window
                and not the park carrying on underneath. "Outside" excludes the other
                windows in the same scene: opening the footpath window closes the
                scenery window, and that is a large honest change somewhere else.
    furnished   the rectangle holds many distinct colours, so it is a window with
                content in it rather than a panel filled with one flat colour

`rects.json` is written by wasm/test/sceneryaudit.js: a list of
{scene, window, before, after, x, y, width, height, tabs}.
"""

from __future__ import annotations

import json
import os
import sys
from typing import List

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: Fraction of the window's own rectangle that has to change. A window is opaque
#: chrome over a park, so almost all of it changes; the floor is low enough that a
#: window which happens to open over a similarly coloured part of the map still passes.
MIN_CHANGED_INSIDE = 0.60
#: Fraction of the rest of the frame allowed to change. The park keeps simulating
#: between the two captures — guests walk, a coaster train moves, the clock advances —
#: so this is not zero. It is small enough that a frame which changed everywhere,
#: which is what a resize or a camera move looks like, is rejected.
MAX_CHANGED_OUTSIDE = 0.08
#: Distinct colours inside the rectangle. A flat panel, a window drawn entirely in its
#: background colour, or a rectangle of sky all come in far below this. Measured: the
#: scenery window holds 58 colours, the ride list 24, the footpath window 23.
MIN_COLOURS_INSIDE = 12

problems: List[str] = []


def load(path: str) -> np.ndarray:
    with Image.open(path) as handle:
        return np.array(handle.convert("RGB"))


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: check_window_drawn.py <rects.json>")
    with open(sys.argv[1], "r", encoding="utf-8") as handle:
        entries = json.load(handle)
    if not entries:
        raise SystemExit("no windows were recorded; the audit did not run")

    print("windows drawn:")
    for entry in entries:
        name = f"{entry['scene']}: the {entry['window']} window"
        before = load(entry["before"])
        after = load(entry["after"])
        if before.shape != after.shape:
            problems.append(f"{name}: the two captures are different sizes")
            continue

        differs = (before != after).any(axis=2)
        x, y = entry["x"], entry["y"]
        right = min(x + entry["width"], differs.shape[1])
        bottom = min(y + entry["height"], differs.shape[0])
        if right <= x or bottom <= y:
            problems.append(f"{name}: its rectangle is off the frame entirely")
            continue

        inside = differs[y:bottom, x:right]
        changed_inside = float(inside.mean())

        # Every window recorded for this scene, not just this one: opening one build
        # menu closes another, and that change is real and is not this window failing.
        outside_mask = np.ones(differs.shape, dtype=bool)
        for other in entries:
            if other["scene"] != entry["scene"]:
                continue
            ox, oy = max(0, other["x"]), max(0, other["y"])
            outside_mask[oy:oy + other["height"], ox:ox + other["width"]] = False
        changed_outside = float(differs[outside_mask].mean())

        patch = after[y:bottom, x:right].reshape(-1, 3)
        colours = len(np.unique(patch, axis=0))

        print(f"  {name}: {changed_inside:6.1%} of it changed, {changed_outside:5.1%} of the "
              f"rest did, {colours} colours, {entry.get('tabs', 0)} tabs")

        if changed_inside < MIN_CHANGED_INSIDE:
            problems.append(
                f"{name}: only {changed_inside:.1%} of its rectangle changed when it opened "
                f"(need {MIN_CHANGED_INSIDE:.0%}), so it did not draw")
        if changed_outside > MAX_CHANGED_OUTSIDE:
            problems.append(
                f"{name}: {changed_outside:.1%} of the rest of the frame changed too "
                f"(allowed {MAX_CHANGED_OUTSIDE:.0%}), so this is not measuring the window")
        if colours < MIN_COLOURS_INSIDE:
            problems.append(
                f"{name}: only {colours} colours inside it (need {MIN_COLOURS_INSIDE}), "
                f"so it drew a panel and no content")

    if problems:
        print("FAIL: a window did not draw:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print(f"{len(entries)} windows opened, stayed open and drew themselves.")


if __name__ == "__main__":
    main()
