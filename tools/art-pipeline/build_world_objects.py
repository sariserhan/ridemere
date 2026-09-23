"""Build the remaining Project Sunrise world objects.

    .cache/venv/bin/python tools/art-pipeline/build_world_objects.py

Covers the minimum set a playable park needs beyond terrain and peeps: a footpath
surface and railings, a park entrance, a station, peep names and a climate.

Image counts come from the engine's own loaders, cross-checked against the open
reference objects that ship with OpenRCT2:

  footpath_surface   52  image 0 preview, 1.. surface variants
                         (Paint.Path.cpp:827-835: flat connection variants, then
                         +16..+19 for slopes)
  footpath_railings  74  image 0 preview, 1.. railings, +37 bridge
                         (FootpathRailingsObject.cpp Load)
  park_entrance      12  3 tile pieces x 4 directions
  station            17  odd count means image 0 is an icon, then entrance back,
                         entrance front, exit back, exit front, 4 each
                         (StationObject.cpp Load)

The test park is flat and at ground level, so the connection, slope, bridge and
support variants are never visually distinct; each object repeats its one piece of
art across those entries rather than pretending to more detail than was authored.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROPS = os.path.join(REPO, "assets", "generated", "world", "props")
STAGE = os.path.join(REPO, "assets", "generated", "staging", "worldobj")
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")

FOOTPATH_SURFACE_IMAGES = 52
FOOTPATH_RAILINGS_IMAGES = 74
PARK_ENTRANCE_IMAGES = 12
STATION_IMAGES = 17


def _blank_entry() -> str:
    """An empty image entry: the engine substitutes a blank placeholder."""
    return ""


def build_footpath_surface(manifest: dict, queue: bool) -> dict:
    name = "queue" if queue else "paved"
    stage_dir = os.path.join(STAGE, f"footpath_{name}")
    os.makedirs(stage_dir, exist_ok=True)
    ramp = pal.ramp("blue_grey" if queue else "grey")
    colourway = dict(spritepack.WORLD_COLOURWAY)
    colourway["trousers"] = ramp  # world_props tags the path as "structure2"

    source = os.path.join(PROPS, manifest["pathSurface"])
    staged = os.path.join(stage_dir, "tile.png")
    rect = spritepack.convert_render(
        source, staged, colourway, manifest["renderSize"], manifest["cameraTargetZ"]
    )
    entry = spritepack.image_entry("images/tile.png", rect)
    images = [entry for _ in range(FOOTPATH_SURFACE_IMAGES)]

    identifier = f"sunrise.footpath_surface.{name}"
    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "footpath_surface",
        "properties": {"flags": ["isQueue"] if queue else []},
        "strings": {"name": {"en-GB": "Queue Line" if queue else "Paved Path"}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, {"images/tile.png": staged})
    return {"id": identifier, "images": len(images), "bytes": size}


def build_footpath_railings() -> dict:
    identifier = "sunrise.footpath_railings.plain"
    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "footpath_railings",
        "properties": {
            "supportType": "box",
            "colour": "dark_brown",
            "scrollingMode": 0,
            "flags": [],
        },
        "strings": {"name": {"en-GB": "Plain Edging"}},
        # Ground-level paths draw no railings, supports or bridge pieces, so these
        # entries exist to satisfy the layout rather than to carry art.
        "images": [_blank_entry() for _ in range(FOOTPATH_RAILINGS_IMAGES)],
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, {})
    return {"id": identifier, "images": FOOTPATH_RAILINGS_IMAGES, "bytes": size}


def build_park_entrance(manifest: dict) -> dict:
    identifier = "sunrise.park_entrance.arch"
    stage_dir = os.path.join(STAGE, "park_entrance")
    os.makedirs(stage_dir, exist_ok=True)
    colourway = dict(spritepack.WORLD_COLOURWAY)
    colourway["skin"] = pal.ramp("beige")       # "structure" in world_props
    colourway["accessory"] = pal.ramp("orange")

    files = {}
    directions = []
    for index, file_name in enumerate(manifest["entrance"]):
        staged = os.path.join(stage_dir, f"d{index}.png")
        rect = spritepack.convert_render(
            os.path.join(PROPS, file_name), staged, colourway,
            manifest["renderSize"], manifest["cameraTargetZ"],
        )
        files[f"images/d{index}.png"] = staged
        directions.append(spritepack.image_entry(f"images/d{index}.png", rect))

    # Three tile pieces per direction; the centre carries the arch and the sides
    # are left empty until side art is authored.
    images = []
    for piece in range(3):
        for direction in range(4):
            images.append(directions[direction] if piece == 0 else _blank_entry())

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "park_entrance",
        "properties": {"scrollingMode": 0, "textHeight": 0},
        "strings": {"name": {"en-GB": "Sunrise Gate"}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size}


def build_station(manifest: dict) -> dict:
    identifier = "sunrise.station.plain"
    stage_dir = os.path.join(STAGE, "station")
    os.makedirs(stage_dir, exist_ok=True)
    colourway = dict(spritepack.WORLD_COLOURWAY)
    colourway["skin"] = pal.ramp("tan")         # "structure" in world_props
    colourway["accessory"] = pal.ramp("red")

    files = {}
    booths = []
    for index, file_name in enumerate(manifest["station"]):
        staged = os.path.join(stage_dir, f"d{index}.png")
        rect = spritepack.convert_render(
            os.path.join(PROPS, file_name), staged, colourway,
            manifest["renderSize"], manifest["cameraTargetZ"],
        )
        files[f"images/d{index}.png"] = staged
        booths.append(spritepack.image_entry(f"images/d{index}.png", rect))

    # Odd image count: index 0 is the icon. Then entrance back, entrance front,
    # exit back, exit front, four directions each. "Front" is the part drawn in
    # front of a guest, which this simple kiosk does not have.
    images = [booths[0]]
    images += booths                      # entrance back
    images += [_blank_entry()] * 4        # entrance front
    images += booths                      # exit back
    images += [_blank_entry()] * 4        # exit front

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "station",
        "properties": {"height": 16, "scrollingMode": 0, "flags": ["noPlatforms"]},
        "strings": {"name": {"en-GB": "Sunrise Platform"}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size}


GIVEN_NAMES = [
    "Ada", "Bay", "Cleo", "Dara", "Emory", "Faye", "Gale", "Hollis", "Ines", "Jules",
    "Kai", "Lark", "Mira", "Noor", "Orin", "Pell", "Quinn", "Rae", "Sol", "Tam",
    "Uma", "Vale", "Wren", "Xan", "Yuri", "Zane", "Auden", "Brisa", "Cove", "Dune",
    "Esme", "Flint", "Gray", "Haven", "Isla", "Juno", "Kit", "Linden", "Marlow", "Nova",
]
SURNAMES = [
    "Ashby", "Beacon", "Cinder", "Dell", "Everly", "Fairlight", "Garnet", "Holloway",
    "Ivory", "Juniper", "Kestrel", "Lantern", "Meadows", "Northway", "Oakes", "Pike",
    "Quill", "Rowan", "Sable", "Thorne", "Underhill", "Vesper", "Willow", "Yarrow",
]


def build_peep_names() -> dict:
    identifier = "sunrise.peep_names.visitors"
    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "peep_names",
        "strings": {"name": {"en-GB": "Sunrise Visitors"}},
        "given_names": GIVEN_NAMES,
        "surnames": SURNAMES,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, {})
    return {"id": identifier, "images": 0, "bytes": size}


MONTHS = ["march", "april", "may", "june", "july", "august", "september", "october"]


def build_climate() -> dict:
    identifier = "sunrise.climate.temperate"
    base = [12, 15, 18, 21, 23, 22, 19, 15]
    weather = {}
    for index, month in enumerate(MONTHS):
        weather[month] = {
            "baseTemperature": base[index],
            "randomBias": 20,
            "distribution": {"sunny": 8, "partiallyCloudy": 8, "cloudy": 5, "rain": 2},
            "distRotation": 2,
        }
    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "climate",
        "scriptName": "temperate",
        "strings": {"name": {"en-GB": "Temperate"}},
        "properties": {"coldItemTempThreshold": 11, "warmItemTempThreshold": 21},
        "weather": weather,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, {})
    return {"id": identifier, "images": 0, "bytes": size}


def main() -> None:
    with open(os.path.join(PROPS, "frames.json"), "r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    results = [
        build_footpath_surface(manifest, queue=False),
        build_footpath_surface(manifest, queue=True),
        build_footpath_railings(),
        build_park_entrance(manifest),
        build_station(manifest),
        build_peep_names(),
        build_climate(),
    ]
    for item in results:
        print(f"{item['id']}: {item['images']} images, {item['bytes'] / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
