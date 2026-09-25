"""Assert a staff window reports what the member of staff is actually doing.

    .cache/venv/bin/python tools/art-pipeline/check_staff_status.py <states.json>

The risk this covers is not blank artwork, which the sprite audit already catches. It
is a mechanic repairing a ride correctly while the window tells the player something
generic — the loop working and the interface not saying so.

The engine has the strings for this already (`PeepActionFormat.cpp`:
STR_RESPONDING_TO_RIDE_BREAKDOWN_CALL, STR_FIXING_RIDE and the rest, with the ride name
appended by `formatPeepActionTo`), so nothing here builds a display model. It checks
that they arrive on screen and that they change:

    inked       the status line has text in it, not an empty strip
    distinct    the line differs between patrolling, responding and fixing, so the
                window is reporting rather than showing one line for every state

`states.json` is written by wasm/test/mechanicui.js: the window rectangle and one
capture per state.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Dict, List

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: The status line sits along the bottom of a peep window, under the viewport.
STATUS_STRIP_HEIGHT = 16
#: Fraction of the strip that is not the window's background. Measured on the shipped
#: window: "Walking" inks 28.9%, "Responding to Hybrid Coaste..." 34.4% and "Fixing
#: Hybrid Coaster 1" 35.1%. An empty strip is 0%, so the floor is well clear of the
#: real values and well clear of nothing.
MIN_INK = 0.05
#: Fraction of the strip that has to change between two states. Measured: the smallest
#: real difference between two of these three lines is 18.7%.
MIN_DIFFERENCE = 0.08

problems: List[str] = []


def strip(path: str, rect: Dict[str, int]) -> np.ndarray:
    with Image.open(path) as handle:
        frame = np.array(handle.convert("RGB"))
    bottom = min(rect["y"] + rect["height"], frame.shape[0])
    top = max(rect["y"], bottom - STATUS_STRIP_HEIGHT)
    left = max(rect["x"], 0)
    right = min(rect["x"] + rect["width"], frame.shape[1])
    return frame[top:bottom, left:right]


def ink(patch: np.ndarray) -> float:
    """Share of the strip that is not the window's own background colour."""
    flat = patch.reshape(-1, 3)
    colours, counts = np.unique(flat, axis=0, return_counts=True)
    background = colours[counts.argmax()]
    return float((flat != background).any(axis=1).mean())


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: check_staff_status.py <states.json>")
    with open(sys.argv[1], "r", encoding="utf-8") as handle:
        record = json.load(handle)

    rect = record["rect"]
    states = record["states"]
    if len(states) < 2:
        raise SystemExit("fewer than two states were captured; the window was never watched")

    print("staff window status line:")
    patches = {}
    for name, path in states.items():
        patch = strip(path, rect)
        patches[name] = patch
        share = ink(patch)
        print(f"  {name:14} {share:6.1%} of the status line is text")
        if share < MIN_INK:
            problems.append(
                f"{name}: the status line is {share:.1%} text, so the window is reporting "
                f"nothing while the mechanic is {name}")

    names = list(patches)
    for first in range(len(names)):
        for second in range(first + 1, len(names)):
            a, b = patches[names[first]], patches[names[second]]
            if a.shape != b.shape:
                problems.append(f"{names[first]} and {names[second]} captured different sizes")
                continue
            difference = float((a != b).any(axis=2).mean())
            print(f"  {names[first]} vs {names[second]}: {difference:6.1%} of the line differs")
            if difference < MIN_DIFFERENCE:
                problems.append(
                    f"{names[first]} and {names[second]} show the same status line "
                    f"({difference:.1%} different), so the window is not reporting the state")

    if problems:
        print("FAIL: the staff window does not report what the mechanic is doing:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print(f"{len(states)} states, each reported differently.")


if __name__ == "__main__":
    main()
