"""Assert the scenery objects carry real art in the layouts the engine indexes.

    .cache/venv/bin/python tools/art-pipeline/check_scenery_objects.py [pack dir]

Thirty-five objects is too many to look at, which is exactly why they need checking by
number. Four failures are worth catching and none of them shows up in a count:

    layout      the image count each engine type indexes by arithmetic
    art         every sprite is filled and has more than one palette index
    rotation    the four directions of a small scenery object differ from one another,
                so the render loop really turned the model
    identity    no two objects ship the same artwork, so the set is not one tree
                fifteen times

Walls are held to a gentler rotation rule than small scenery: their two sloped pairs
are the same model tilted by fourteen degrees, which at this size is a handful of
pixels. The check is that they differ at all, not that they differ a lot.
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_scenery_objects as tables  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SMALL_IMAGES = 4
WALL_IMAGES = 6
GROUP_IMAGES = 2

#: A tree fills a good part of its canvas; a bollard does not. The floor is what
#: separates art from a placeholder, not what separates large from small.
MIN_COVERAGE = 0.02
#: Per image: more than one palette index, so a sprite is never one flat colour.
MIN_SHADES_PER_IMAGE = 2
#: Per object, across all its sprites.
#:
#: Measured across the shipped set: the median object has seven tones and the richest
#: fifteen, while the simplest — a metal railing, a hedge, a ground planting — sit at
#: exactly three, which is what a single material lit from one side gives and is not a
#: defect. So the floor is three: it catches a blank or a flat cut-out, and does not
#: pretend that a fence should look like a tree.
#:
#: The per-image bar has to stay lower still, because one genuine view of a bollard is
#: two tones: it is a cylinder seen end on.
MIN_SHADES_PER_OBJECT = 3
#: Two sprites agreeing this closely are the same picture. Small scenery is rendered
#: from four genuinely different angles and should be well clear of it.
MAX_SAME_SMALL = 0.97
#: A wall tilted by fourteen degrees moves by a few pixels, so its bar is higher.
MAX_SAME_WALL = 0.995

#: How much taller a small scenery object may *claim* to be than it actually is.
#:
#: `SmallSceneryPlaceAction` reserves `ceil2(height, 8)` above the ground and the placed
#: element's clearance becomes `height + 7`, in the same units the sprite is drawn in.
#: Art that rises above that draws outside its own bounding box: it sorts wrongly
#: against what is behind it and a player can build straight through it. Six objects
#: did this — a flower bed claimed 8 units and stood 17 — so the floor is exact: art
#: may never exceed the declared height.
#:
#: The ceiling is the softer half of the pair. Claiming far more than the object
#: occupies blocks building above it for no reason. Measured across the shipped set the
#: widest honest gap is twenty-one units (a banner on a pole, which is mostly pole), so
#: twenty-four is the allowance. That is calibrated to the set rather than derived, and
#: it is the looser of the two rules on purpose.
MAX_UNUSED_CLEARANCE = 24

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


def check_images(identifier: str, archive: zipfile.ZipFile, images: List[dict],
                 expected: int, max_same: float) -> str:
    if len(images) != expected:
        problems.append(f"{identifier}: {len(images)} images, the engine indexes {expected}")
        return ""
    frames = []
    everything = set()
    for index, entry in enumerate(images):
        indices = sprite(archive, entry["path"])
        frames.append(indices)
        filled = indices != 0
        coverage = float(filled.sum()) / max(1, indices.size)
        shades = set(indices[filled].tolist()) if filled.any() else set()
        everything |= shades
        if coverage < MIN_COVERAGE:
            problems.append(
                f"{identifier}: image {index} covers {coverage:.2%} of its canvas, which is blank")
        elif len(shades) < MIN_SHADES_PER_IMAGE:
            problems.append(
                f"{identifier}: image {index} is a single flat colour")
    if len(everything) < MIN_SHADES_PER_OBJECT:
        problems.append(
            f"{identifier}: {len(everything)} palette indices across all its sprites, "
            f"which is a cut-out rather than a model")
    for first in range(len(frames)):
        for second in range(first + 1, len(frames)):
            fraction = same_fraction(frames[first], frames[second])
            if fraction > max_same:
                problems.append(
                    f"{identifier}: images {first} and {second} are {fraction:.1%} identical")
    return hashlib.sha256(b"".join(f.tobytes() for f in frames)).hexdigest()


def check_bounding_box(identifier: str, root: dict) -> None:
    """The art has to fit inside the clearance the object claims."""
    height = root.get("properties", {}).get("height")
    images = root.get("images", [])
    if height is None or not images:
        return
    # A sprite's y offset is how far above the anchor its top row sits, as a negative
    # number, and the anchor is the tile at ground level.
    above = max(-entry.get("y", 0) for entry in images)
    if above > height:
        problems.append(
            f"{identifier}: stands {above} units but claims {height}, so it draws "
            f"outside its own bounding box")
    elif height - above > MAX_UNUSED_CLEARANCE:
        problems.append(
            f"{identifier}: claims {height} units and stands {above}, blocking "
            f"{height - above} units of nothing")


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    directory = os.path.join(pack, "object")
    if not os.path.isdir(directory):
        raise SystemExit(f"no objects in {directory}")

    art: Dict[str, str] = {}
    counts = {"scenery_small": 0, "scenery_wall": 0, "scenery_group": 0}
    present = set()

    expectations = (
        [(spec[0], "scenery_small", SMALL_IMAGES, MAX_SAME_SMALL) for spec in tables.SMALL_SCENERY]
        + [(spec[0], "scenery_wall", WALL_IMAGES, MAX_SAME_WALL) for spec in tables.WALLS]
        + [(spec[0], "scenery_group", GROUP_IMAGES, 1.1) for spec in tables.GROUPS]
    )

    for identifier, kind, expected, max_same in expectations:
        path = os.path.join(directory, f"{identifier}.parkobj")
        if not os.path.exists(path):
            problems.append(f"{identifier} is not in the pack")
            continue
        present.add(identifier)
        counts[kind] += 1
        with zipfile.ZipFile(path) as archive:
            root = json.loads(archive.read("object.json"))
            digest = check_images(identifier, archive, root.get("images", []), expected, max_same)
            if kind == "scenery_group":
                # Every entry has to resolve, or a build-menu tab has holes in it.
                for entry in root.get("properties", {}).get("entries", []):
                    if not os.path.exists(os.path.join(directory, f"{entry}.parkobj")):
                        problems.append(f"{identifier}: names a missing object, {entry}")
            else:
                if digest:
                    art[identifier] = digest
                if kind == "scenery_small":
                    check_bounding_box(identifier, root)

    print("scenery objects:")
    for kind, count in counts.items():
        print(f"  {kind:16} {count}")

    by_digest: Dict[str, str] = {}
    for identifier, digest in art.items():
        if digest in by_digest:
            problems.append(f"{identifier} ships the same artwork as {by_digest[digest]}")
        by_digest[digest] = identifier

    vegetation = [name for name in present if any(
        key in name for key in (".tree_", ".shrub_", ".flowers_", ".ornamental_grass", ".ground_planting"))]
    if len(vegetation) < 15:
        problems.append(f"only {len(vegetation)} vegetation objects, V1-5 ships at least 15")

    if problems:
        print("FAIL: the scenery set is not complete:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print(f"{len(present)} scenery objects, every slot the engine indexes filled with its own art.")


if __name__ == "__main__":
    main()
