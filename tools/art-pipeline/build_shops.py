"""Build the Ridemere shops and facilities.

    .cache/venv/bin/python tools/art-pipeline/build_shops.py

A stall is a ride object whose category is "stall". Its image table, read from
RideObject.cpp, is three preview images followed by the car sprites, and a stall's car
is drawn once per direction:

    0..2    preview, one slot per ride type the entry may declare
    3..6    the stall itself, from the four directions

The paint code draws `firstCarEntry->baseImageId + direction` for a shop and
`+ ((direction + 2) & 3)` for a facility, so four sprites is the whole of it. Seven
images per object.

What a shop sells is a ShopItem, and that choice has consequences beyond revenue: an
item may put a guest into a different animation group. Those are chosen deliberately
here; see docs/world-art-system.md and the V1-3 report.
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
STAGE = os.path.join(REPO, "assets", "generated", "staging", "shops")
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")

PREVIEW_SLOTS = 3
DIRECTIONS = 4

#: The five objects, each with the accent that tells it apart at a glance.
#:
#: `sells` was chosen with the guest animation groups in mind. Burger and drink put a
#: guest into groups 14 and 15, which our guest object covers by falling back to its
#: walking animation. Chicken and lemonade are groups 33 and 34, past the end of that
#: object, and are deliberately not used.
SHOPS = [
    {
        "key": "shop_food",
        "id": "sunrise.ride.grill_stand",
        "name": "Grill Stand",
        "type": "food_stall",
        "sells": "burger",
        "accent": "orange",
        "second": "red",
    },
    {
        "key": "shop_drink",
        "id": "sunrise.ride.refreshment_stand",
        "name": "Refreshment Stand",
        "type": "drink_stall",
        "sells": "drink",
        "accent": "teal",
        "second": "blue",
    },
    {
        "key": "shop_souvenir",
        "id": "sunrise.ride.gift_stand",
        "name": "Gift Stand",
        "type": "shop",
        "sells": "toy",
        "accent": "purple",
        "second": "orange",
    },
    {
        "key": "facility_restroom",
        "id": "sunrise.ride.restroom",
        "name": "Restroom",
        "type": "toilets",
        "sells": None,
        "accent": "sea_green",
        "second": "teal",
    },
    {
        "key": "facility_information",
        "id": "sunrise.ride.information_point",
        "name": "Information Point",
        "type": "information_kiosk",
        "sells": None,
        "accent": "orange",
        "second": "tan",
    },
]


def colourway(spec: dict) -> Dict[str, List[int]]:
    """Map the render's hue tags onto this object's materials."""
    scheme = dict(spritepack.WORLD_COLOURWAY)
    scheme["skin"] = pal.ramp("beige")        # structure: the counter or cabin body
    scheme["trousers"] = pal.ramp("grey")     # structure2: posts and frame
    scheme["shirt"] = pal.ramp(spec["accent"])
    scheme["hair"] = pal.ramp(spec["second"])
    scheme["accessory"] = pal.ramp(spec["second"])
    scheme["trim"] = pal.ramp("grey")
    return scheme


def build(spec: dict, manifest: dict) -> dict:
    stage_dir = os.path.join(STAGE, spec["key"])
    os.makedirs(stage_dir, exist_ok=True)
    scheme = colourway(spec)
    render_size = manifest["renderSize"]
    target_z = manifest["cameraTargetZ"]

    images: List[dict] = []
    files: Dict[str, str] = {}

    def add(name: str, rect: dict) -> None:
        images.append(spritepack.image_entry(f"images/{name}", rect))

    directions = []
    for index, file_name in enumerate(manifest[spec["key"]]):
        source = os.path.join(PROPS, file_name)
        staged = os.path.join(stage_dir, f"d{index}.png")
        rect = spritepack.convert_render(source, staged, scheme, render_size, target_z)
        directions.append((f"d{index}.png", staged, rect))

    # The preview slots. A ride entry may declare up to three ride types, and each gets
    # a preview; ours declares one, so the same picture serves all three rather than
    # leaving two entries the engine would index into as if they were art.
    preview_name, preview_path, preview_rect = directions[0]
    for slot in range(PREVIEW_SLOTS):
        files[f"images/preview{slot}.png"] = preview_path
        add(f"preview{slot}.png", preview_rect)

    for name, path, rect in directions:
        files[f"images/{name}"] = path
        add(name, rect)

    properties = {
        "type": spec["type"],
        "category": "stall",
        "clearance": 56,
        "carsPerFlatRide": 1,
    }
    if spec["sells"] is not None:
        properties["sells"] = spec["sells"]

    object_json = {
        "id": spec["id"],
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "ride",
        "properties": properties,
        "strings": {"name": {"en-GB": spec["name"]}},
        "images": images,
    }
    os.makedirs(OBJECTS, exist_ok=True)
    path = os.path.join(OBJECTS, f"{spec['id']}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": spec["id"], "images": len(images), "bytes": size}


def main() -> None:
    with open(os.path.join(PROPS, "frames.json"), "r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    for spec in SHOPS:
        if spec["key"] not in manifest:
            raise SystemExit(f"no renders for {spec['key']}; run the Blender props script first")
        info = build(spec, manifest)
        expected = PREVIEW_SLOTS + DIRECTIONS
        if info["images"] != expected:
            raise SystemExit(f"{info['id']}: {info['images']} images, expected {expected}")
        print(f"{info['id']}: {info['images']} images, {info['bytes'] / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
