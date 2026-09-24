"""Build the park boundary fence, the low fence the engine draws around owned land.

    .cache/venv/bin/python tools/art-pipeline/build_boundary_fences.py

Six sprites at fixed indices, 22872 to 22877 (`Paint.Surface.h`). The engine draws them
itself, from `_tileSurfaceBoundaries` in `Paint.Surface.cpp`, wherever a tile's park
ownership differs from its neighbour's:

    22872, 22873   flat, one for each of the two tile-edge orientations
    22874, 22875   the same edge on one slope
    22876, 22877   the same edge on the other slope

That is exactly the layout a `scenery_wall` object ships, for the same reason: it is the
same shape drawn on the same two edges of the same tile. So these are the timber fence's
own six renders, reused rather than modelled again — the park boundary and a fence a
player builds should not be two different fences.

The sprite audit found this. Six engine-drawn sprites had never been authored, and they
went unnoticed because the boundary fence is only drawn where owned land has an exposed
edge that is actually on screen, which none of the earlier test scenes had.
"""

from __future__ import annotations

import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_scenery_objects as objects  # noqa: E402
import spritepack  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RENDERS = os.path.join(REPO, "assets", "generated", "world", "scenery")
OUT = os.path.join(REPO, "assets", "generated", "ui", "boundary")

#: Paint.Surface.h. The order is the same as a wall object's six images.
FIRST_INDEX = 22872
COUNT = 6

#: Which fence the park boundary is. The timber fence rather than the metal railing:
#: a boundary is the edge of the land, not a barrier inside the park.
SOURCE_STEM = "fence_timber"
COLOURWAY = objects.BUILT_WARM


def main() -> None:
    manifest_path = os.path.join(RENDERS, "frames.json")
    if not os.path.exists(manifest_path):
        raise SystemExit(f"no renders at {manifest_path}; run scenery.py in Blender first")
    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    frames = manifest.get(SOURCE_STEM)
    if not frames or len(frames) < COUNT:
        raise SystemExit(f"{SOURCE_STEM} has no wall renders")

    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)

    offsets = {}
    for step in range(COUNT):
        index = FIRST_INDEX + step
        source = os.path.join(RENDERS, frames[step])
        destination = os.path.join(OUT, f"{index}.png")
        rect = spritepack.convert_render(
            source, destination, objects.scheme(**COLOURWAY),
            manifest["renderSize"], manifest["cameraTargetZ"])
        offsets[str(index)] = {"x": rect["x"], "y": rect["y"]}

    with open(os.path.join(OUT, "offsets.json"), "w", encoding="utf-8") as handle:
        json.dump(offsets, handle, indent=1)
    print(f"boundary fences: {COUNT} sprites {FIRST_INDEX}..{FIRST_INDEX + COUNT - 1} "
          f"-> {os.path.relpath(OUT, REPO)}")


if __name__ == "__main__":
    main()
