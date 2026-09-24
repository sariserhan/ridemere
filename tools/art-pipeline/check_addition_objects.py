"""Assert the bench and the bin carry real art in the layout the engine indexes.

    .cache/venv/bin/python tools/art-pipeline/check_addition_objects.py [pack dir]

A path addition is drawn by arithmetic on one base index, so the image table has to be
exactly the right length and every slot in it has to be real: the engine will index a
broken sprite for an addition that cannot be broken, and a full bin for a bin nobody
has used, and it does not check whether those exist.

    bench   1 preview + 4 edges + 4 broken     =  9
    bin     1 preview + 4 edges + 4 broken
                      + 4 full                 = 13

Four separate things are checked, because each fails in a way the others miss:

    layout      the image count the engine's arithmetic assumes
    art         each sprite is filled and has more than one palette index
    rotation    the four edge sprites differ from one another, so the render loop
                really turned the model rather than writing one frame four times
    states      a bin's empty, full and broken sprites differ from one another, so a
                player can tell a bin that needs emptying from one that does not
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import sys
import zipfile
from typing import Dict, List

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: identifier -> (image count, number of four-sprite states after the preview)
EXPECTED = {
    "sunrise.footpath_item.bench": (9, 2),
    "sunrise.footpath_item.bin": (13, 3),
}

#: A bench or a bin is a small object against a tile edge, so it covers far less of
#: its canvas than a building does. Below this it is a placeholder.
MIN_COVERAGE = 0.10
#: Fewer palette indices than this is a silhouette, not a material.
MIN_SHADES = 3
#: Two sprites that agree this closely are the same picture.
MAX_SAME_FRACTION = 0.97

problems: List[str] = []


def sprite(archive: zipfile.ZipFile, path: str) -> np.ndarray:
    with archive.open(path) as handle:
        with Image.open(io.BytesIO(handle.read())) as image:
            return np.array(image)


def same_fraction(a: np.ndarray, b: np.ndarray) -> float:
    height = max(a.shape[0], b.shape[0])
    width = max(a.shape[1], b.shape[1])
    pa = np.zeros((height, width), dtype=a.dtype)
    pb = np.zeros((height, width), dtype=b.dtype)
    pa[: a.shape[0], : a.shape[1]] = a
    pb[: b.shape[0], : b.shape[1]] = b
    return float((pa == pb).sum()) / max(1, pa.size)


def check_object(path: str, identifier: str) -> None:
    expected_images, states = EXPECTED[identifier]
    with zipfile.ZipFile(path) as archive:
        root = json.loads(archive.read("object.json"))
        images = root.get("images", [])
        if len(images) != expected_images:
            problems.append(f"{identifier}: {len(images)} images, the engine indexes {expected_images}")
            return

        frames: List[np.ndarray] = []
        for index, entry in enumerate(images):
            indices = sprite(archive, entry["path"])
            frames.append(indices)
            filled = indices != 0
            coverage = float(filled.sum()) / max(1, indices.size)
            shades = len(set(indices[filled].tolist())) if filled.any() else 0
            if coverage < MIN_COVERAGE:
                problems.append(
                    f"{identifier}: image {index} covers {coverage:.1%} of its canvas, which is a placeholder")
            elif shades < MIN_SHADES:
                problems.append(
                    f"{identifier}: image {index} has {shades} palette indices, which is a silhouette")

        # Within each state, the four edges must differ.
        for state in range(states):
            base = 1 + state * 4
            for first in range(4):
                for second in range(first + 1, 4):
                    fraction = same_fraction(frames[base + first], frames[base + second])
                    if fraction > MAX_SAME_FRACTION:
                        problems.append(
                            f"{identifier}: state {state} edges {first} and {second} are "
                            f"{fraction:.1%} identical, so it was not rendered from four angles")

        # And the states must differ from one another, on the same edge.
        for state in range(1, states):
            fraction = same_fraction(frames[1], frames[1 + state * 4])
            if fraction > MAX_SAME_FRACTION:
                problems.append(
                    f"{identifier}: state {state} is {fraction:.1%} identical to the normal state, "
                    f"so a player cannot tell them apart")

        digest = hashlib.sha256(b"".join(f.tobytes() for f in frames)).hexdigest()
        return digest


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    directory = os.path.join(pack, "object")
    if not os.path.isdir(directory):
        raise SystemExit(f"no objects in {directory}")

    found: Dict[str, str] = {}
    for identifier in EXPECTED:
        path = os.path.join(directory, f"{identifier}.parkobj")
        if not os.path.exists(path):
            problems.append(f"{identifier} is not in the pack")
            continue
        found[identifier] = check_object(path, identifier)

    print("path additions:")
    for identifier, (count, states) in EXPECTED.items():
        print(f"  {identifier:36} {count} images, {states} states "
              f"{'present' if identifier in found else 'MISSING'}")

    if len(set(found.values())) != len(found):
        problems.append("two path additions ship the same artwork")

    if problems:
        print("FAIL: the path additions are not complete:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print("the bench and the bin have the layout the engine indexes and real art in every slot.")


if __name__ == "__main__":
    main()
