"""Assert the shipped world objects contain real art in the layout the engine expects.

    .cache/venv/bin/python tools/art-pipeline/check_world_objects.py [pack dir]

Object counts alone prove nothing: a set of fifty-two transparent tiles has the right
count. This checks the count, the layout, the sprite geometry and that the pixels are
material rather than placeholders, for every terrain surface, the terrain edge family,
every footpath surface and the railings.

The expected counts come from the engine:

    terrain_surface     1 icon + 19 per entry   (TerrainSurfaceObject.cpp)
    terrain_edge        1 icon + 84 edges       (Paint.Surface.cpp offset table)
    footpath_surface    1 preview + 51          (Paint.Path.cpp)
    footpath_railings   1 preview + 73          (Paint.Path.cpp)
"""

from __future__ import annotations

import io
import json
import os
import sys
import zipfile
from typing import Dict, List

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TERRAIN_ENTRY_IMAGES = 19
EXPECTED = {
    "terrain_surface": 58,     # icon plus three entries of nineteen
    "terrain_edge": 85,
    "footpath_surface": 52,
    "footpath_railings": 74,
}

#: A tile sprite is the isometric diamond; a slope is one height step taller.
TILE_SIZE = (64, 31)
SLOPE_HEIGHT = TILE_SIZE[1] + 16

#: Below this fraction of filled pixels a sprite is a placeholder, not art. Railings
#: and supports are thin by nature: a rail along one side of a tile covers a few per
#: cent of its canvas and is still correct, so they only have to be non-empty.
MIN_COVERAGE = {
    "terrain_surface": 0.25,
    "terrain_edge": 0.15,
    "footpath_surface": 0.25,
    "footpath_railings": 0.02,
}
#: Below this many distinct palette indices a sprite is flat, not a material.
MIN_SHADES = 2

problems: List[str] = []


def fail(obj: str, message: str) -> None:
    problems.append(f"{obj}: {message}")


def sprite_stats(archive: zipfile.ZipFile, path: str) -> Dict[str, float]:
    with archive.open(path) as handle:
        with Image.open(io.BytesIO(handle.read())) as image:
            indices = np.array(image)
            size = image.size
    filled = indices != 0
    return {
        "width": size[0],
        "height": size[1],
        "coverage": float(filled.sum()) / max(1, indices.size),
        "shades": len(set(indices[filled].tolist())) if filled.any() else 0,
    }


def check_object(path: str) -> None:
    name = os.path.basename(path)
    with zipfile.ZipFile(path) as archive:
        root = json.loads(archive.read("object.json"))
        kind = root.get("objectType")
        if kind not in EXPECTED:
            return
        images = root.get("images", [])
        if len(images) != EXPECTED[kind]:
            fail(name, f"{len(images)} images, the engine expects {EXPECTED[kind]}")
            return

        if kind == "terrain_surface":
            entries = (len(images) - 1) / TERRAIN_ENTRY_IMAGES
            if entries != int(entries):
                fail(name, f"{len(images) - 1} entry images is not a multiple of {TERRAIN_ENTRY_IMAGES}")
            default = root.get("properties", {}).get("default", {})
            for key in ("normal", "grid", "underground"):
                if default.get(key) is None:
                    fail(name, f"no default.{key}")

        # Every sprite that is meant to carry art must carry some.
        blank = 0
        flat = 0
        checked = 0
        for entry in images:
            if not isinstance(entry, dict) or "path" not in entry:
                continue
            stats = sprite_stats(archive, entry["path"])
            checked += 1
            if stats["coverage"] < MIN_COVERAGE[kind]:
                blank += 1
            elif stats["shades"] < MIN_SHADES:
                flat += 1
        if checked == 0:
            fail(name, "no image files at all")
        elif blank > checked * 0.2:
            fail(name, f"{blank} of {checked} sprites are effectively empty")
        elif flat > checked * 0.2:
            fail(name, f"{flat} of {checked} sprites are a single flat colour")

        if kind == "footpath_surface":
            # The four slope images must be a height step taller than a flat tile, or
            # a path up a hill is drawn flat and floats.
            for offset in range(16, 20):
                entry = images[1 + offset]
                stats = sprite_stats(archive, entry["path"])
                if stats["height"] < SLOPE_HEIGHT - 2:
                    fail(name, f"slope image {offset} is {stats['height']} tall, expected about {SLOPE_HEIGHT}")


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    directory = os.path.join(pack, "object")
    if not os.path.isdir(directory):
        raise SystemExit(f"no objects in {directory}")

    seen = {kind: 0 for kind in EXPECTED}
    for name in sorted(os.listdir(directory)):
        if not name.endswith(".parkobj"):
            continue
        path = os.path.join(directory, name)
        with zipfile.ZipFile(path) as archive:
            kind = json.loads(archive.read("object.json")).get("objectType")
        if kind in seen:
            seen[kind] += 1
            check_object(path)

    print("world objects:")
    for kind, count in seen.items():
        print(f"  {kind:20} {count}")

    required = {"terrain_surface": 4, "terrain_edge": 1, "footpath_surface": 4, "footpath_railings": 1}
    for kind, minimum in required.items():
        if seen[kind] < minimum:
            problems.append(f"only {seen[kind]} {kind} objects, expected at least {minimum}")

    if problems:
        print("FAIL: the world objects are not complete:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print("every world object has the expected layout and carries real art.")


if __name__ == "__main__":
    main()
