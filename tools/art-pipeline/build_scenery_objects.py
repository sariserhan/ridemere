"""Build the Ridemere vegetation and park scenery.

    .cache/venv/bin/python tools/art-pipeline/build_scenery_objects.py [--only NAME ...]

Three engine object types, each with its own image arithmetic, all read out of the
engine rather than guessed:

**small scenery** (`scenery_small`) draws `image + direction`, and
`SmallSceneryObject::DrawPreview` draws `image` itself. So four images, no separate
preview slot, and all four must exist even for an object that looks the same from
every side, because `direction` there is the *view* rotation.

**walls** (`scenery_wall`) draw `image + offset` where offset is 0 or 1 for the two
flat orientations and 2..5 for the sloped ones (`Paint.Wall.cpp`). Six images. The
slopes are produced by shearing the flat sprite along its length rather than by
rendering new geometry, which is the same trick the path slopes use: at this size a
wall on a hill is a shear.

**scenery groups** (`scenery_group`) are the build-menu tabs. `DrawPreview` draws
`image + 1`, so a group is two images: a spacer and the tab icon.

Every model is rendered from the world origin by `assets/source/blender/scenery.py`
and checked by `check_rotation_origin.py` before it gets here.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import build_ui_sprites as ui  # noqa: E402
import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402
import world_palette  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RENDERS = os.path.join(REPO, "assets", "generated", "world", "scenery")
STAGE = os.path.join(REPO, "assets", "generated", "staging", "scenery-objects")
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")

#: The hue tags `scenery.py` paints with, and the role each one plays.
BARK, FOLIAGE, FOLIAGE_LIGHT, FOLIAGE_DEEP = "skin", "shirt", "hair", "trousers"
FLOWER, STRUCTURE, METAL = "accessory", "trim", "shoes"


def scheme(**roles: str) -> Dict[str, List[int]]:
    """Map hue tags onto vegetation-palette materials, by name."""
    out = dict(spritepack.WORLD_COLOURWAY)
    for tag, material in roles.items():
        ramp_name, low, high = world_palette.vegetation_ramp(material)
        out[tag] = pal.ramp(ramp_name)[low:high]
    return out


#: A green tree, a warm-green tree and a blue-green tree are three trees. Varying the
#: colourway over shared geometry is what makes the set feel planted rather than
#: stamped, and it costs nothing.
LEAFY = dict(skin="bark", shirt="foliage", hair="foliage_light", trousers="foliage_deep",
             accessory="flower_warm", trim="timber", shoes="metal")
LEAFY_WARM = dict(LEAFY, shirt="foliage_accent", hair="foliage_light", trousers="foliage")
LEAFY_DEEP = dict(LEAFY, shirt="foliage_deep", hair="foliage", trousers="foliage_deep")
BUILT = dict(skin="timber", shirt="foliage", hair="foliage_light", trousers="foliage_deep",
             accessory="flower_hot", trim="stone_wall", shoes="metal")
BUILT_WARM = dict(BUILT, trim="timber", accessory="paint_warm")

#: identifier -> how to build it.
#:
#: `height` is the clearance the object claims, in the same units its sprite is drawn
#: in: `SmallSceneryPlaceAction` reserves `ceil2(height, 8)` above the ground and the
#: placed element's clearance is `height + 7`. Art that rises higher than that draws
#: outside its own bounding box, sorts wrongly against what is behind it and can be
#: built over. Six of these claimed less than they stood — a flower bed claimed 8 and
#: was 17 tall — which is why `check_scenery_objects.py` now measures it.
#:
#: `shape` is the tile footprint. Trees claim a quarter tile so several can share one,
#: which is how a planted area is made; beds and hedges claim the whole tile because
#: they are the ground.
SMALL_SCENERY = [
    # Large trees.
    ("sunrise.scenery_small.tree_broadleaf", "Broadleaf Tree", "tree_broadleaf", LEAFY, 48, "1/4", True),
    ("sunrise.scenery_small.tree_shade", "Shade Tree", "tree_shade", LEAFY_WARM, 48, "1/4", True),
    ("sunrise.scenery_small.tree_column", "Column Tree", "tree_column", LEAFY_DEEP, 56, "1/4", True),
    ("sunrise.scenery_small.tree_evergreen", "Evergreen", "tree_evergreen", LEAFY_DEEP, 56, "1/4", True),
    # Medium trees.
    ("sunrise.scenery_small.tree_ornamental", "Ornamental Tree", "tree_ornamental", LEAFY, 32, "1/4", True),
    ("sunrise.scenery_small.tree_flowering", "Flowering Tree", "tree_flowering", LEAFY_WARM, 40, "1/4", True),
    ("sunrise.scenery_small.tree_young", "Young Tree", "tree_young", LEAFY, 24, "1/4", True),
    ("sunrise.scenery_small.tree_dense", "Park Tree", "tree_dense", LEAFY_DEEP, 48, "1/4", True),
    # Shrubs and planting.
    ("sunrise.scenery_small.shrub_round", "Round Shrub", "shrub_round", LEAFY, 16, "1/4", True),
    ("sunrise.scenery_small.shrub_hedge", "Hedge", "shrub_hedge", LEAFY_DEEP, 24, "4/4", True),
    ("sunrise.scenery_small.shrub_tall", "Tall Shrub", "shrub_tall", LEAFY, 24, "1/4", True),
    ("sunrise.scenery_small.shrub_topiary", "Topiary", "shrub_topiary", LEAFY_WARM, 24, "1/4", True),
    ("sunrise.scenery_small.flowers_warm", "Warm Flowers", "flowers_warm",
     dict(LEAFY, accessory="flower_hot"), 8, "1/4", True),
    ("sunrise.scenery_small.flowers_cool", "Cool Flowers", "flowers_cool",
     dict(LEAFY, accessory="flower_cool"), 8, "1/4", True),
    ("sunrise.scenery_small.ornamental_grass", "Ornamental Grass", "ornamental_grass", LEAFY_WARM, 12, "1/4", True),
    ("sunrise.scenery_small.ground_planting", "Ground Planting", "ground_planting", LEAFY_DEEP, 8, "4/4", True),
    # Park scenery.
    ("sunrise.scenery_small.lamp_tall", "Park Lamp", "lamp_tall", BUILT, 48, "1/4", True),
    ("sunrise.scenery_small.lamp_garden", "Garden Lamp", "lamp_garden", BUILT, 24, "1/4", True),
    ("sunrise.scenery_small.sign_direction", "Direction Sign", "sign_direction", BUILT_WARM, 32, "1/4", True),
    ("sunrise.scenery_small.sign_board", "Park Sign", "sign_board", BUILT_WARM, 24, "1/4", True),
    ("sunrise.scenery_small.planter_square", "Square Planter", "planter_square", BUILT, 16, "1/4", True),
    ("sunrise.scenery_small.planter_round", "Round Planter", "planter_round",
     dict(BUILT, accessory="flower_sun"), 16, "1/4", True),
    ("sunrise.scenery_small.bed_rectangular", "Flower Bed", "bed_rectangular",
     dict(BUILT, accessory="flower_warm"), 24, "4/4", True),
    ("sunrise.scenery_small.bed_corner", "Garden Border", "bed_corner",
     dict(BUILT, accessory="flower_cool"), 16, "4/4", True),
    ("sunrise.scenery_small.prop_bollard", "Bollard", "prop_bollard", BUILT, 12, "1/4", True),
    ("sunrise.scenery_small.prop_banner", "Park Banner", "prop_banner", BUILT_WARM, 48, "1/4", True),
    ("sunrise.scenery_small.prop_sculpture", "Sculpture", "prop_sculpture", BUILT, 24, "1/4", True),
    ("sunrise.scenery_small.prop_clock", "Park Clock", "prop_clock", BUILT_WARM, 48, "1/4", True),
    ("sunrise.scenery_small.prop_fountain", "Ornamental Basin", "prop_fountain",
     dict(BUILT, accessory="flower_cool"), 20, "4/4", True),
    ("sunrise.scenery_small.prop_picnic_table", "Picnic Table", "prop_picnic_table", BUILT_WARM, 16, "2/4", True),
    ("sunrise.scenery_small.accent_pillar", "Stone Pillar", "accent_pillar", BUILT, 40, "1/4", True),
    ("sunrise.scenery_small.accent_arch", "Garden Arch", "accent_arch", BUILT, 48, "2/4", True),
]

#: identifier -> (name, render stem, colourway, height in eighths, price)
WALLS = [
    ("sunrise.scenery_wall.fence_metal", "Metal Railing", "fence_metal", BUILT, 4, 30),
    ("sunrise.scenery_wall.fence_timber", "Timber Fence", "fence_timber", BUILT_WARM, 4, 25),
    ("sunrise.scenery_wall.wall_stone", "Low Stone Wall", "wall_stone",
     dict(BUILT, trim="stone_wall", shoes="stone_wall"), 3, 35),
]

#: The build-menu tabs, and which objects each one holds. A flat list of thirty-five
#: objects in one tab is a list nobody reads.
#: Scenery.cpp kTabWidth / kTabHeight: the box a build-menu tab icon has to fit.
TAB_WIDTH = 31
TAB_HEIGHT = 28

GROUPS = [
    ("sunrise.scenery_group.nature", "Nature", "tree_broadleaf", 10, [
        name for name, *_ in SMALL_SCENERY if ".tree_" in name or ".shrub_" in name
        or ".flowers_" in name or ".ornamental_grass" in name or ".ground_planting" in name]),
    ("sunrise.scenery_group.garden", "Garden", "planter_round", 11, [
        name for name, *_ in SMALL_SCENERY if ".planter_" in name or ".bed_" in name]),
    ("sunrise.scenery_group.park", "Park", "lamp_tall", 12, [
        name for name, *_ in SMALL_SCENERY
        if ".lamp_" in name or ".sign_" in name or ".prop_" in name or ".accent_" in name]
        + ["sunrise.footpath_item.bench", "sunrise.footpath_item.bin"]),
    ("sunrise.scenery_group.fences", "Fences and Walls", "fence_metal", 13,
     [name for name, *_ in WALLS]),
]

DIRECTIONS = 4
#: A wall ships six sprites: two orientations, flat and on each of the two slopes.
WALL_IMAGES = 6


def build_small(spec, manifest) -> dict:
    identifier, name, stem, roles, height, shape, rotatable = spec
    stage_dir = os.path.join(STAGE, stem)
    os.makedirs(stage_dir, exist_ok=True)
    colourway = scheme(**roles)

    images, files = [], {}
    for index, file_name in enumerate(manifest[stem][:DIRECTIONS]):
        source = os.path.join(RENDERS, file_name)
        staged = os.path.join(stage_dir, f"d{index}.png")
        rect = spritepack.convert_render(
            source, staged, colourway, manifest["renderSize"], manifest["cameraTargetZ"])
        files[f"images/d{index}.png"] = staged
        images.append(spritepack.image_entry(f"images/d{index}.png", rect))

    properties = {
        "height": height,
        "cursor": "CURSOR_TREE_DOWN" if ".tree_" in identifier or ".shrub_" in identifier
                  else "CURSOR_STATUE_DOWN",
        "price": max(4, height // 2),
        "removalPrice": max(2, height // 4),
        "shape": shape,
        "isRotatable": rotatable,
        "sceneryGroup": next(group for group, _, _, _, members in GROUPS if identifier in members),
    }
    if ".tree_" in identifier:
        properties["isTree"] = True

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "scenery_small",
        "properties": properties,
        "strings": {"name": {"en-GB": name}},
        "images": images,
    }
    os.makedirs(OBJECTS, exist_ok=True)
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size}


def build_wall(spec, manifest) -> dict:
    identifier, name, stem, roles, height, price = spec
    stage_dir = os.path.join(STAGE, stem)
    os.makedirs(stage_dir, exist_ok=True)
    colourway = scheme(**roles)
    # Thin rails and masonry need enough tonal separation to read at native size.
    for part, shades in colourway.items():
        for ramp in pal.RAMPS.values():
            if set(shades).issubset(ramp):
                colourway[part] = ramp[1:11]
                break


    # All six come from Blender, already in the order the engine indexes them: flat for
    # each orientation, then the model tilted each way for each orientation.
    images, files = [], {}
    for index, file_name in enumerate(manifest[stem][:WALL_IMAGES]):
        source = os.path.join(RENDERS, file_name)
        staged = os.path.join(stage_dir, f"w{index}.png")
        rect = spritepack.convert_render(
            source, staged, colourway, manifest["renderSize"], manifest["cameraTargetZ"])
        files[f"images/w{index}.png"] = staged
        images.append(spritepack.image_entry(f"images/w{index}.png", rect))

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "scenery_wall",
        "properties": {
            "height": height,
            "price": price,
            "cursor": "CURSOR_FENCE_DOWN",
            "isAllowedOnSlope": True,
            "sceneryGroup": "sunrise.scenery_group.fences",
        },
        "strings": {"name": {"en-GB": name}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size}


def _tab_plate(icon: np.ndarray, active: bool) -> np.ndarray:
    """Draw a group icon on the tab plate the rest of the interface uses.

    A tab widget draws one sprite and nothing else (Widget.cpp WidgetDrawImage), and
    when the tab is pressed it draws that sprite's index plus one. So a scenery group
    ships two images: the tab as it sits, and the tab as it sits when it is selected.
    RCT2 put the plate in those sprites too. Ours comes from `build_ui_sprites`, the
    same shape the window's own "all" tab draws, so the five tabs in the row match.
    """
    plate = ui.tab_shape(active).pixels.copy()
    top = 2 if active else 5
    left, right = 3, ui.TAB_W - 4
    upper, lower = top + 1, ui.TAB_H - 3
    height, width = icon.shape
    x = left + (right - left + 1 - width) // 2
    y = upper + (lower - upper + 1 - height) // 2
    region = plate[y: y + height, x: x + width]
    np.copyto(region, icon, where=icon != 0)
    return plate


def build_group(spec, manifest) -> dict:
    identifier, name, icon_stem, priority, members = spec
    stage_dir = os.path.join(STAGE, identifier)
    os.makedirs(stage_dir, exist_ok=True)

    # Two images: the tab, and the tab pressed. The build menu draws image 0 for a
    # tab and image 0 + 1 when that tab is selected; the object-selection window
    # draws image 0 + 1 as the group's preview (SceneryGroupObject::DrawPreview).
    #
    # The icon is shrunk to fit inside the plate. Its own offsets are world offsets:
    # a tree is anchored at the foot of its trunk with its canopy forty-eight pixels
    # above it, so the Nature tab drew its tree off the top of the screen and read as
    # a tab with no icon at all.
    source = os.path.join(RENDERS, manifest[icon_stem][0])
    staged = os.path.join(stage_dir, "raw.png")
    rect = spritepack.convert_render(
        source, staged, scheme(**LEAFY), manifest["renderSize"], manifest["cameraTargetZ"])
    # The unpressed plate has the shallower opening, so fit to that one and the icon
    # is the same bitmap in both states.
    box_width, box_height = ui.TAB_W - 6, ui.TAB_H - 8
    fit = min(1.0, box_width / rect["width"], box_height / rect["height"])
    if fit < 1.0:
        rect = spritepack.convert_render(
            source, staged, scheme(**LEAFY), manifest["renderSize"], manifest["cameraTargetZ"],
            scale=fit)
    with Image.open(staged) as handle:
        icon = np.array(handle)

    files = {}
    images = []
    for suffix, active in (("tab", False), ("tab_selected", True)):
        path = os.path.join(stage_dir, f"{suffix}.png")
        spritepack.write_indexed_png(path, _tab_plate(icon, active))
        files[f"images/{suffix}.png"] = path
        images.append(spritepack.image_entry(
            f"images/{suffix}.png", {"x": 0, "y": 0, "width": ui.TAB_W, "height": ui.TAB_H}))

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "scenery_group",
        "properties": {"priority": priority, "entries": members},
        "strings": {"name": {"en-GB": name}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size, "entries": len(members)}


def main() -> None:
    frames_path = os.path.join(RENDERS, "frames.json")
    if not os.path.exists(frames_path):
        raise SystemExit(f"no renders at {frames_path}; run scenery.py in Blender first")
    with open(frames_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    only = set(sys.argv[2:]) if len(sys.argv) > 1 and sys.argv[1] == "--only" else None
    total = 0
    for spec in SMALL_SCENERY:
        if only and spec[0] not in only:
            continue
        info = build_small(spec, manifest)
        total += info["bytes"]
        print(f"{info['id']:48} {info['images']} images, {info['bytes'] / 1024:6.1f} KiB")
    for spec in WALLS:
        if only and spec[0] not in only:
            continue
        info = build_wall(spec, manifest)
        total += info["bytes"]
        print(f"{info['id']:48} {info['images']} images, {info['bytes'] / 1024:6.1f} KiB")
    for spec in GROUPS:
        if only and spec[0] not in only:
            continue
        info = build_group(spec, manifest)
        total += info["bytes"]
        print(f"{info['id']:48} {info['entries']} entries, {info['bytes'] / 1024:6.1f} KiB")
    print(f"scenery objects: {total / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
