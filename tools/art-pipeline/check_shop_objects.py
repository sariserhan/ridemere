"""Assert the shipped shops and facilities carry real art in the layout the engine wants.

    .cache/venv/bin/python tools/art-pipeline/check_shop_objects.py [pack dir]

A stall object is three preview slots and four direction sprites. Counting seven
images proves nothing: seven transparent tiles count to seven, and so does one sprite
copied four times. So this checks four separate things, each of which has a way of
going wrong that the previous one would not catch:

    layout      seven images, the first three previews and the last four directions
    art         each direction sprite is filled and has more than one palette index
    rotation    the four directions differ from one another, so the render loop really
                turned the model rather than writing the same frame four times
    identity    no two shops ship the same artwork, because a park where every stall
                looks alike cannot be read at a glance and that is the whole reason
                the shops are colour-coded

Provenance is checked elsewhere; this is about whether a player can tell one stall
from another at the size it is drawn.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import sys
import zipfile
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: Three preview slots then one sprite per direction, the layout RideObject reads.
EXPECTED_IMAGES = 7
PREVIEW_SLOTS = 3
DIRECTIONS = 4

#: A stall is a building on one tile, so it fills much more of its canvas than a rail
#: does. Below this it is a placeholder rather than a model.
MIN_COVERAGE = 0.12
#: A flat silhouette has no form. A stall lit from one side should reach well past this.
MIN_SHADES = 4
#: Two direction sprites that agree this closely are the same picture.
MAX_SAME_FRACTION = 0.97

#: The stall categories V1 ships. Exactly one of each: the milestone is a small,
#: complete set rather than a catalogue.
EXPECTED_TYPES = {
    "food_stall": 1,
    "drink_stall": 1,
    "shop": 1,
    "toilets": 1,
    "information_kiosk": 1,
}

problems: List[str] = []


def sprite(archive: zipfile.ZipFile, path: str) -> np.ndarray:
    with archive.open(path) as handle:
        with Image.open(io.BytesIO(handle.read())) as image:
            return np.array(image)


def stats(indices: np.ndarray) -> Dict[str, float]:
    filled = indices != 0
    return {
        "coverage": float(filled.sum()) / max(1, indices.size),
        "shades": len(set(indices[filled].tolist())) if filled.any() else 0,
    }


def same_fraction(a: np.ndarray, b: np.ndarray) -> float:
    """How much of two sprites is identical, comparing them on a common canvas."""
    height = max(a.shape[0], b.shape[0])
    width = max(a.shape[1], b.shape[1])
    pa = np.zeros((height, width), dtype=a.dtype)
    pb = np.zeros((height, width), dtype=b.dtype)
    pa[: a.shape[0], : a.shape[1]] = a
    pb[: b.shape[0], : b.shape[1]] = b
    return float((pa == pb).sum()) / max(1, pa.size)


def check_object(path: str) -> Tuple[str, str, List[str]]:
    name = os.path.basename(path)
    with zipfile.ZipFile(path) as archive:
        root = json.loads(archive.read("object.json"))
        kind = root.get("properties", {}).get("type", "")
        images = root.get("images", [])
        if len(images) != EXPECTED_IMAGES:
            problems.append(f"{name}: {len(images)} images, the engine expects {EXPECTED_IMAGES}")
            return kind, name, []

        digests: List[str] = []
        frames: List[np.ndarray] = []
        for index in range(PREVIEW_SLOTS, PREVIEW_SLOTS + DIRECTIONS):
            indices = sprite(archive, images[index]["path"])
            frames.append(indices)
            digests.append(hashlib.sha256(indices.tobytes()).hexdigest())
            measured = stats(indices)
            if measured["coverage"] < MIN_COVERAGE:
                problems.append(
                    f"{name}: direction {index - PREVIEW_SLOTS} covers "
                    f"{measured['coverage']:.1%} of its canvas, which is a placeholder")
            elif measured["shades"] < MIN_SHADES:
                problems.append(
                    f"{name}: direction {index - PREVIEW_SLOTS} has {measured['shades']} "
                    f"palette indices, which is a silhouette rather than a model")

        for first in range(DIRECTIONS):
            for second in range(first + 1, DIRECTIONS):
                fraction = same_fraction(frames[first], frames[second])
                if fraction > MAX_SAME_FRACTION:
                    problems.append(
                        f"{name}: directions {first} and {second} are {fraction:.1%} "
                        f"identical, so the object was not rendered from four angles")

        # The preview slots must not be empty either: they are what the player sees in
        # the build menu, before anything is placed.
        preview = stats(sprite(archive, images[0]["path"]))
        if preview["coverage"] < MIN_COVERAGE:
            problems.append(f"{name}: the build-menu preview is empty")

    return kind, name, digests


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    directory = os.path.join(pack, "object")
    if not os.path.isdir(directory):
        raise SystemExit(f"no objects in {directory}")

    seen: Dict[str, int] = {}
    art: Dict[str, List[str]] = {}
    for entry in sorted(os.listdir(directory)):
        if not entry.endswith(".parkobj"):
            continue
        path = os.path.join(directory, entry)
        with zipfile.ZipFile(path) as archive:
            root = json.loads(archive.read("object.json"))
        if root.get("objectType") != "ride":
            continue
        if root.get("properties", {}).get("category") != "stall":
            continue
        kind, name, digests = check_object(path)
        seen[kind] = seen.get(kind, 0) + 1
        if digests:
            art[name] = digests

    print("shops and facilities:")
    for kind in sorted(set(list(EXPECTED_TYPES) + list(seen))):
        print(f"  {kind:20} {seen.get(kind, 0)}")

    for kind, count in EXPECTED_TYPES.items():
        if seen.get(kind, 0) != count:
            problems.append(f"{seen.get(kind, 0)} {kind} objects, V1 ships exactly {count}")

    # No two stalls may ship the same artwork.
    by_digest: Dict[str, str] = {}
    for name, digests in art.items():
        signature = ":".join(digests)
        if signature in by_digest:
            problems.append(f"{name} ships the same artwork as {by_digest[signature]}")
        by_digest[signature] = name

    if problems:
        print("FAIL: the shops and facilities are not complete:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print("every shop and facility has the expected layout, four real angles and its own art.")


if __name__ == "__main__":
    main()
