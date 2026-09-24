"""Build the Ridemere path additions: the bench and the bin.

    .cache/venv/bin/python tools/art-pipeline/build_scenery.py

A path addition is drawn once per tile edge, and the engine picks the sprite by
arithmetic on a single base index (Paint.PathAddition.cpp):

    bench   image + edge            normal      edge is 1..4 for NE, SE, SW, NW
            image + edge + 4        broken
    bin     image + edge            empty
            image + edge + 4        broken
            image + edge + 8        full

Index 0 is the menu preview, which `PathAdditionObject::DrawPreview` draws directly
from `image`. So a bench is nine images and a bin is thirteen, and every one of them
has to exist whether or not the game can reach it: the engine indexes a broken sprite
for an addition that cannot be broken, and would read whatever happened to be there.

The models are built on the world origin and rotated by the camera, exactly as the
stalls are; the engine applies its own per-edge world offset. See
`assets/source/blender/world_props.py`.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROPS = os.path.join(REPO, "assets", "generated", "world", "props")
STAGE = os.path.join(REPO, "assets", "generated", "staging", "scenery")
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")

EDGES = 4

#: Both additions cost the same as their real-world equivalents cost a park: little,
#: but not nothing. A free bin would make the litter lesson meaningless.
ADDITIONS = [
    {
        "key": "bench",
        "id": "sunrise.footpath_item.bench",
        "name": "Bench",
        "renderAs": "bench",
        "cursor": "CURSOR_BENCH_DOWN",
        "price": 50,
        "states": ["bench", "bench_broken"],
        "flags": {"isBench": True},
        "colourway": {
            # The frame is the same painted metal as the railings, the seat the same
            # warm timber as the wooden path. A bench should look like it came with
            # the park, not like it was dropped on it.
            "trousers": ("grey", 2, 7),
            "skin": ("tan", 3, 9),
            "accessory": ("tan", 3, 9),
        },
    },
    {
        "key": "bin",
        "id": "sunrise.footpath_item.bin",
        "name": "Litter Bin",
        "renderAs": "bin",
        "cursor": "CURSOR_BIN_DOWN",
        "price": 40,
        "states": ["bin", "bin_broken", "bin_full"],
        "flags": {"isBin": True},
        "colourway": {
            "trousers": ("grey", 2, 7),
            "accessory": ("olive", 3, 8),
            "skin": ("grey", 2, 7),
        },
    },
]


def colourway(spec: dict) -> Dict[str, List[int]]:
    """Map the render's hue tags onto this object's materials.

    Each entry names a ramp and a slice of it. The slice is the important part: the
    quantiser spreads a render's brightness across the whole of whatever ramp it is
    given, so a full twelve-step ramp puts every lit surface at the top of it and the
    object comes out washed out and nearly white. Handing it five or six steps from
    the middle keeps a painted metal frame looking like painted metal, and matches the
    three-to-five value steps per material that docs/world-art-system.md asks for.
    """
    scheme = dict(spritepack.WORLD_COLOURWAY)
    for part, (ramp_name, low, high) in spec["colourway"].items():
        scheme[part] = pal.ramp(ramp_name)[low:high]
    return scheme


def build(spec: dict, manifest: dict) -> dict:
    stage_dir = os.path.join(STAGE, spec["key"])
    os.makedirs(stage_dir, exist_ok=True)
    scheme = colourway(spec)
    render_size = manifest["renderSize"]
    target_z = manifest["cameraTargetZ"]

    images: List[dict] = []
    files: Dict[str, str] = {}
    staged: List[tuple] = []

    for state in spec["states"]:
        for index, file_name in enumerate(manifest[state]):
            source = os.path.join(PROPS, file_name)
            out_name = f"{state}_e{index}.png"
            out_path = os.path.join(stage_dir, out_name)
            rect = spritepack.convert_render(source, out_path, scheme, render_size, target_z)
            staged.append((out_name, out_path, rect))

    # Index 0 is the preview. It is the first edge sprite, which is the one a player
    # sees in the build menu and the one they will then place.
    preview_name, preview_path, preview_rect = staged[0]
    files["images/preview.png"] = preview_path
    images.append(spritepack.image_entry("images/preview.png", preview_rect))

    for name, path, rect in staged:
        files[f"images/{name}"] = path
        images.append(spritepack.image_entry(f"images/{name}", rect))

    properties = {
        "renderAs": spec["renderAs"],
        "cursor": spec["cursor"],
        "price": spec["price"],
        "isAllowedOnSlope": False,
        "isAllowedOnQueue": False,
    }
    properties.update(spec["flags"])

    object_json = {
        "id": spec["id"],
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "footpath_item",
        "properties": properties,
        "strings": {"name": {"en-GB": spec["name"]}},
        "images": images,
    }
    os.makedirs(OBJECTS, exist_ok=True)
    path = os.path.join(OBJECTS, f"{spec['id']}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": spec["id"], "images": len(images), "bytes": size}


def main() -> None:
    frames_path = os.path.join(PROPS, "frames.json")
    if not os.path.exists(frames_path):
        raise SystemExit(f"no prop renders at {frames_path}; run world_props.py in Blender first")
    with open(frames_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    for spec in ADDITIONS:
        for state in spec["states"]:
            if state not in manifest:
                raise SystemExit(f"{spec['id']}: no renders for state '{state}'")
        info = build(spec, manifest)
        print(f"{info['id']}: {info['images']} images, {info['bytes'] / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
