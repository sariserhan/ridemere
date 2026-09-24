"""Project Sunrise — original vegetation and park scenery.

    blender -b --python assets/source/blender/scenery.py -- --out <dir>

One visual language: a bright contemporary park, somewhere between a municipal
garden and a family amusement park. No themed lands; those are packs for later.

Everything here is assembled from a handful of components rather than modelled one
object at a time. A tree is a trunk plus a canopy form; a flower bed is a border plus
planting; a fence is a post pattern along a segment. That is what makes a second
season, a recolour or a fifteenth tree cheap, and it is the architecture the milestone
brief asks for.

**Every model is built on the world origin.** The render camera orbits the origin, so
a model placed anywhere else swings to a different place in each rotation and the four
packed sprites disagree with one another. That defect cost half of every stall in V1-3
and is checked for automatically now; see `check_rotation_origin.py`.
"""

from __future__ import annotations

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sunrise_rig as rig  # noqa: E402
import terrain  # noqa: E402

RENDER_SIZE = 96
TILE = terrain.TILE

# Hue tags, and what each one means for this file. Seven are available; these are the
# roles the whole scenery set is built from, so one colourway table in the packer can
# serve every object.
BARK = "skin"
FOLIAGE = "shirt"
FOLIAGE_LIGHT = "hair"
FOLIAGE_DEEP = "trousers"
FLOWER = "accessory"
STRUCTURE = "trim"
METAL = "shoes"


# --------------------------------------------------------------------------
# Components
# --------------------------------------------------------------------------

def trunk(height: float, radius: float, lean: float = 0.0, part: str = BARK):
    """A tapered trunk. `lean` tilts it, which is most of what makes two trees differ."""
    pieces = []
    segments = 3
    for index in range(segments):
        fraction = index / segments
        top = (index + 1) / segments
        piece = rig.cylinder(
            f"trunk{index}", part, radius * (1.0 - fraction * 0.45), height / segments + 0.02,
            vertices=8, origin=(lean * fraction * 0.6, 0.0, height * fraction), pivot="bottom")
        pieces.append(piece)
        _ = top
    return pieces


def canopy_round(centre_z: float, radius: float, parts=(FOLIAGE, FOLIAGE_LIGHT, FOLIAGE_DEEP)):
    """Three overlapping blobs. The classic broadleaf silhouette."""
    pieces = [
        rig.blob("canopy_main", parts[0], radius, scale=(1.0, 1.0, 0.86), origin=(0.0, 0.0, centre_z)),
        rig.blob("canopy_light", parts[1], radius * 0.62, scale=(1.0, 1.0, 0.9),
                 origin=(-radius * 0.34, -radius * 0.3, centre_z + radius * 0.34)),
        rig.blob("canopy_deep", parts[2], radius * 0.58, scale=(1.0, 1.0, 0.9),
                 origin=(radius * 0.38, radius * 0.28, centre_z - radius * 0.2)),
    ]
    return pieces


def canopy_spread(centre_z: float, radius: float):
    """Wide and flat: a shade tree, the widest silhouette in the set."""
    return [
        rig.blob("spread_main", FOLIAGE, radius, scale=(1.25, 1.25, 0.48), origin=(0.0, 0.0, centre_z)),
        rig.blob("spread_light", FOLIAGE_LIGHT, radius * 0.7, scale=(1.2, 1.2, 0.42),
                 origin=(-radius * 0.3, -radius * 0.25, centre_z + radius * 0.26)),
        rig.blob("spread_deep", FOLIAGE_DEEP, radius * 0.66, scale=(1.15, 1.15, 0.4),
                 origin=(radius * 0.36, radius * 0.3, centre_z - radius * 0.16)),
    ]


def canopy_column(base_z: float, height: float, radius: float):
    """Tall and narrow: a poplar-like tree, the tallest thing in the set."""
    pieces = []
    steps = 4
    for index in range(steps):
        fraction = index / (steps - 1)
        width = radius * (1.0 - abs(fraction - 0.45) * 0.9)
        part = (FOLIAGE, FOLIAGE_LIGHT, FOLIAGE, FOLIAGE_DEEP)[index % 4]
        pieces.append(rig.blob(
            f"column{index}", part, width, scale=(1.0, 1.0, 1.15),
            origin=(0.0, 0.0, base_z + height * fraction)))
    return pieces


def canopy_cone(base_z: float, height: float, radius: float):
    """An evergreen: two stacked cones so the profile is not a plain triangle."""
    return [
        rig.cone("cone_lower", FOLIAGE_DEEP, radius, height * 0.62, origin=(0.0, 0.0, base_z)),
        rig.cone("cone_upper", FOLIAGE, radius * 0.72, height * 0.55,
                 origin=(0.0, 0.0, base_z + height * 0.42)),
    ]


def flower_heads(count: int, radius: float, spread: float, centre_z: float, part: str = FLOWER):
    """Small blobs scattered on a deterministic ring, so a bed is not a green mound."""
    pieces = []
    for index in range(count):
        angle = (index / count) * math.tau + 0.4
        distance = spread * (0.45 + 0.55 * ((index * 7) % 5) / 4.0)
        pieces.append(rig.blob(
            f"flower{index}", part, radius, scale=(1.0, 1.0, 0.8),
            origin=(math.cos(angle) * distance, math.sin(angle) * distance,
                    centre_z + 0.04 * ((index * 3) % 3))))
    return pieces


def post_row(count: int, spacing: float, height: float, thickness: float, part: str,
             axis: str = "y"):
    """Evenly spaced posts along one axis. Fences, railings and pergolas."""
    pieces = []
    for index in range(count):
        offset = (index - (count - 1) / 2.0) * spacing
        origin = (0.0, offset, 0.0) if axis == "y" else (offset, 0.0, 0.0)
        pieces.append(rig.box(
            f"post{index}", part, (thickness, thickness, height), origin=origin, pivot="bottom"))
    return pieces


def rail(length: float, height_z: float, thickness: float, part: str, axis: str = "y"):
    size = (thickness, length, thickness) if axis == "y" else (length, thickness, thickness)
    return [rig.box("rail", part, size, origin=(0.0, 0.0, height_z), pivot="bottom")]


# --------------------------------------------------------------------------
# Vegetation
# --------------------------------------------------------------------------

#: Trees were first built at about the height of a guest, which is the size a tree
#: looks in a modelling window and far too small in a park: a guest is four pixels and
#: a tree that is five reads as a bush. Everything below is scaled against the stalls,
#: which are a tile across, rather than against nothing.
TREE_SCALE = 1.55


def tree_broadleaf():
    k = TREE_SCALE
    return trunk(1.5 * k, 0.22 * k) + canopy_round(2.35 * k, 1.05 * k)


def tree_shade():
    k = TREE_SCALE
    return trunk(1.25 * k, 0.26 * k) + canopy_spread(1.85 * k, 1.15 * k)


def tree_column():
    k = TREE_SCALE
    return trunk(1.1 * k, 0.16 * k) + canopy_column(1.5 * k, 2.1 * k, 0.52 * k)


def tree_evergreen():
    k = TREE_SCALE
    return trunk(0.7 * k, 0.2 * k) + canopy_cone(0.6 * k, 2.9 * k, 0.92 * k)


def tree_ornamental():
    k = TREE_SCALE * 0.82
    return trunk(1.0 * k, 0.16 * k) + canopy_round(1.7 * k, 0.72 * k)


def tree_flowering():
    k = TREE_SCALE * 0.85
    pieces = trunk(1.05 * k, 0.16 * k) + canopy_round(1.8 * k, 0.78 * k,
                                                      parts=(FOLIAGE, FOLIAGE_LIGHT, FOLIAGE))
    return pieces + flower_heads(7, 0.2 * k, 0.62 * k, 2.1 * k)


def tree_young():
    k = TREE_SCALE * 0.72
    return trunk(0.8 * k, 0.12 * k) + canopy_round(1.25 * k, 0.46 * k)


def tree_dense():
    k = TREE_SCALE
    pieces = trunk(1.2 * k, 0.24 * k)
    pieces += canopy_round(1.95 * k, 0.88 * k)
    # Two extra lobes rather than one, on opposite sides. A single lobe makes the
    # canopy denser and also puts the object's bulk off the rotation origin, so the
    # whole tree slides across its tile as the camera turns.
    pieces += [rig.blob("dense_extra_a", FOLIAGE_DEEP, 0.6 * k, scale=(1.0, 1.0, 0.9),
                        origin=(-0.32 * k, 0.36 * k, 1.62 * k)),
               rig.blob("dense_extra_b", FOLIAGE_LIGHT, 0.52 * k, scale=(1.0, 1.0, 0.9),
                        origin=(0.32 * k, -0.36 * k, 1.72 * k))]
    return pieces


def shrub_round():
    return [
        rig.blob("shrub_main", FOLIAGE, 0.58, scale=(1.1, 1.1, 0.78), origin=(0.0, 0.0, 0.42)),
        rig.blob("shrub_light", FOLIAGE_LIGHT, 0.36, scale=(1.0, 1.0, 0.8), origin=(-0.2, -0.18, 0.6)),
    ]


def shrub_hedge():
    return [
        rig.box("hedge", FOLIAGE_DEEP, (TILE * 0.78, TILE * 0.5, 0.72), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("hedge_top", FOLIAGE, (TILE * 0.72, TILE * 0.44, 0.12), origin=(0.0, 0.0, 0.68), pivot="bottom"),
    ]


def shrub_tall():
    return [
        rig.blob("tall_low", FOLIAGE_DEEP, 0.5, scale=(1.0, 1.0, 1.0), origin=(0.0, 0.0, 0.45)),
        rig.blob("tall_mid", FOLIAGE, 0.44, scale=(1.0, 1.0, 1.1), origin=(0.06, -0.05, 1.0)),
        rig.blob("tall_top", FOLIAGE_LIGHT, 0.3, scale=(1.0, 1.0, 1.1), origin=(-0.05, 0.05, 1.42)),
    ]


def shrub_topiary():
    return [rig.cone("topiary", FOLIAGE, 0.46, 1.35, origin=(0.0, 0.0, 0.0)),
            rig.blob("topiary_tip", FOLIAGE_LIGHT, 0.2, scale=(1.0, 1.0, 0.9), origin=(0.0, 0.0, 1.3))]


def flowers_warm():
    return [rig.blob("mound", FOLIAGE_DEEP, 0.44, scale=(1.2, 1.2, 0.45), origin=(0.0, 0.0, 0.1))] \
        + flower_heads(9, 0.17, 0.46, 0.34)


def flowers_cool():
    return [rig.blob("mound", FOLIAGE, 0.42, scale=(1.2, 1.2, 0.42), origin=(0.0, 0.0, 0.1))] \
        + flower_heads(7, 0.2, 0.42, 0.32)


def ornamental_grass():
    pieces = [rig.blob("tussock", FOLIAGE_DEEP, 0.34, scale=(1.1, 1.1, 0.6), origin=(0.0, 0.0, 0.12))]
    for index in range(6):
        angle = (index / 6) * math.tau
        blade = rig.box(f"blade{index}", FOLIAGE_LIGHT, (0.07, 0.07, 0.78),
                        origin=(math.cos(angle) * 0.2, math.sin(angle) * 0.2, 0.1), pivot="bottom")
        blade.rotation_euler = (math.radians(14.0) * math.cos(angle),
                                math.radians(14.0) * math.sin(angle), 0.0)
        pieces.append(blade)
    return pieces


def ground_planting():
    pieces = []
    for index in range(5):
        angle = (index / 5) * math.tau + 0.3
        pieces.append(rig.blob(
            f"patch{index}", FOLIAGE if index % 2 else FOLIAGE_DEEP, 0.33,
            scale=(1.3, 1.3, 0.3),
            origin=(math.cos(angle) * 0.42, math.sin(angle) * 0.42, 0.06)))
    return pieces


# --------------------------------------------------------------------------
# Park scenery
# --------------------------------------------------------------------------

def lamp_tall():
    return [
        rig.box("lamp_base", METAL, (0.34, 0.34, 0.18), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.cylinder("lamp_post", METAL, 0.09, 2.5, vertices=8, origin=(0.0, 0.0, 0.14), pivot="bottom"),
        rig.blob("lamp_head", STRUCTURE, 0.26, scale=(1.0, 1.0, 0.8), origin=(0.0, 0.0, 2.7)),
        rig.box("lamp_cap", METAL, (0.34, 0.34, 0.1), origin=(0.0, 0.0, 2.86), pivot="bottom"),
    ]


def lamp_garden():
    return [
        rig.cylinder("garden_post", METAL, 0.07, 1.15, vertices=8, origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.cone("garden_shade", METAL, 0.26, 0.3, origin=(0.0, 0.0, 1.42)),
        rig.blob("garden_glow", STRUCTURE, 0.17, scale=(1.0, 1.0, 0.7), origin=(0.0, 0.0, 1.22)),
    ]


def fence_metal():
    """A railing segment running along Y, the orientation the wall format draws first."""
    pieces = post_row(4, TILE * 0.3, 1.0, 0.1, METAL)
    pieces += rail(TILE * 0.98, 0.9, 0.08, METAL)
    pieces += rail(TILE * 0.98, 0.5, 0.06, METAL)
    return pieces


def fence_timber():
    pieces = post_row(3, TILE * 0.44, 0.82, 0.16, STRUCTURE)
    pieces += rail(TILE * 0.98, 0.66, 0.12, STRUCTURE)
    pieces += rail(TILE * 0.98, 0.34, 0.12, STRUCTURE)
    return pieces


def wall_stone():
    return [
        rig.box("wall_body", STRUCTURE, (0.34, TILE * 0.98, 0.82), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("wall_cap", METAL, (0.46, TILE * 0.98, 0.12), origin=(0.0, 0.0, 0.8), pivot="bottom"),
    ]


def sign_direction():
    return [
        rig.cylinder("sign_post", METAL, 0.08, 1.7, vertices=8, origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("sign_arm_a", STRUCTURE, (0.9, 0.1, 0.3), origin=(0.35, 0.0, 1.32), pivot="bottom"),
        rig.box("sign_arm_b", FLOWER, (0.7, 0.1, 0.26), origin=(-0.3, 0.0, 0.94), pivot="bottom"),
    ]


def sign_board():
    return [
        rig.box("board_post_l", METAL, (0.1, 0.1, 0.9), origin=(-0.42, 0.0, 0.0), pivot="bottom"),
        rig.box("board_post_r", METAL, (0.1, 0.1, 0.9), origin=(0.42, 0.0, 0.0), pivot="bottom"),
        rig.box("board_face", STRUCTURE, (1.05, 0.12, 0.78), origin=(0.0, 0.0, 0.84), pivot="bottom"),
        rig.box("board_band", FLOWER, (1.05, 0.14, 0.16), origin=(0.0, 0.0, 1.38), pivot="bottom"),
    ]


def planter_square():
    return [
        rig.box("planter_body", STRUCTURE, (1.0, 1.0, 0.5), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("planter_rim", METAL, (1.12, 1.12, 0.1), origin=(0.0, 0.0, 0.46), pivot="bottom"),
    ] + shrub_round()


def planter_round():
    return [
        rig.cylinder("bowl", STRUCTURE, 0.56, 0.46, vertices=10, origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.cylinder("bowl_rim", METAL, 0.62, 0.09, vertices=10, origin=(0.0, 0.0, 0.42), pivot="bottom"),
        rig.blob("bowl_soil", FOLIAGE_DEEP, 0.5, scale=(1.0, 1.0, 0.25), origin=(0.0, 0.0, 0.52)),
    ] + flower_heads(8, 0.16, 0.38, 0.6)


def bed_rectangular():
    pieces = [
        rig.box("bed_border", STRUCTURE, (TILE * 0.9, TILE * 0.9, 0.22), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("bed_soil", FOLIAGE_DEEP, (TILE * 0.76, TILE * 0.76, 0.18), origin=(0.0, 0.0, 0.08), pivot="bottom"),
    ]
    return pieces + flower_heads(11, 0.18, 0.72, 0.3)


def bed_corner():
    """A band of planting running corner to corner across the tile.

    Diagonal rather than L-shaped, because an L sits in two quadrants and its bulk is
    therefore off the rotation origin: the whole object would swing sideways as the
    camera went round it. A diagonal band is just as distinct from the rectangular bed
    and is centred, which is the rule every model here follows.
    """
    pieces = [
        rig.box("corner_border", METAL, (TILE * 1.08, TILE * 0.42, 0.2), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("corner_soil", FOLIAGE_DEEP, (TILE * 0.96, TILE * 0.3, 0.16), origin=(0.0, 0.0, 0.06), pivot="bottom"),
    ]
    for piece in pieces:
        piece.rotation_euler = (0.0, 0.0, math.radians(45.0))
    pieces += flower_heads(8, 0.17, 0.62, 0.26, part=FLOWER)
    pieces += [rig.blob("corner_shrub_a", FOLIAGE, 0.32, scale=(1.0, 1.0, 0.8), origin=(0.42, 0.42, 0.3)),
               rig.blob("corner_shrub_b", FOLIAGE_LIGHT, 0.28, scale=(1.0, 1.0, 0.8), origin=(-0.42, -0.42, 0.28))]
    return pieces


def prop_bollard():
    return [
        rig.cylinder("bollard", METAL, 0.16, 0.86, vertices=8, origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.blob("bollard_cap", FLOWER, 0.17, scale=(1.0, 1.0, 0.6), origin=(0.0, 0.0, 0.86)),
    ]


def prop_banner():
    """A pennant hung from a crossbar, with the cloth centred on the pole.

    Hanging it off one side would put the object's bulk beside the rotation origin
    instead of on it, and the whole banner would slide across its tile as the camera
    turned. Centred on the bar it reads the same and stays put.
    """
    return [
        rig.cylinder("banner_pole", METAL, 0.08, 2.6, vertices=8, origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("banner_bar", STRUCTURE, (0.12, 0.96, 0.12), origin=(0.0, 0.0, 2.42), pivot="bottom"),
        rig.box("banner_cloth", FLOWER, (0.1, 0.84, 1.1), origin=(0.0, 0.0, 1.3), pivot="bottom"),
        rig.box("banner_band", STRUCTURE, (0.12, 0.84, 0.14), origin=(0.0, 0.0, 2.28), pivot="bottom"),
    ]


def prop_sculpture():
    return [
        rig.box("plinth", STRUCTURE, (0.72, 0.72, 0.42), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.blob("form_low", METAL, 0.36, scale=(1.0, 0.7, 1.2), origin=(0.0, 0.0, 0.82)),
        rig.blob("form_high", FLOWER, 0.26, scale=(0.8, 1.2, 1.1), origin=(0.1, -0.06, 1.34)),
    ]


def prop_clock():
    return [
        rig.box("clock_base", STRUCTURE, (0.6, 0.6, 0.3), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.cylinder("clock_column", METAL, 0.14, 2.1, vertices=8, origin=(0.0, 0.0, 0.28), pivot="bottom"),
        rig.blob("clock_face", STRUCTURE, 0.36, scale=(1.0, 0.5, 1.0), origin=(0.0, 0.0, 2.55)),
        rig.blob("clock_top", FLOWER, 0.14, scale=(1.0, 1.0, 1.1), origin=(0.0, 0.0, 2.92)),
    ]


def prop_fountain():
    """A still basin. No water simulation, and none implied: it reads as stone and a
    flat surface, which is what a fountain looks like when it is switched off."""
    return [
        rig.cylinder("basin", STRUCTURE, 0.92, 0.4, vertices=12, origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.cylinder("basin_rim", METAL, 1.0, 0.12, vertices=12, origin=(0.0, 0.0, 0.34), pivot="bottom"),
        rig.cylinder("basin_water", FLOWER, 0.82, 0.06, vertices=12, origin=(0.0, 0.0, 0.34), pivot="bottom"),
        rig.cylinder("basin_stem", STRUCTURE, 0.18, 0.62, vertices=8, origin=(0.0, 0.0, 0.38), pivot="bottom"),
        rig.blob("basin_top", METAL, 0.3, scale=(1.0, 1.0, 0.4), origin=(0.0, 0.0, 1.02)),
    ]


def prop_picnic_table():
    pieces = [
        rig.box("table_top", STRUCTURE, (1.15, 0.62, 0.1), origin=(0.0, 0.0, 0.66), pivot="bottom"),
    ]
    for side in (-1.0, 1.0):
        pieces.append(rig.box(f"table_seat{side:+.0f}", STRUCTURE, (1.15, 0.22, 0.08),
                              origin=(0.0, side * 0.52, 0.38), pivot="bottom"))
        pieces.append(rig.box(f"table_leg{side:+.0f}", METAL, (0.1, 1.1, 0.66),
                              origin=(side * 0.44, 0.0, 0.0), pivot="bottom"))
    return pieces


def accent_pillar():
    return [
        rig.box("pillar_base", STRUCTURE, (0.72, 0.72, 0.22), origin=(0.0, 0.0, 0.0), pivot="bottom"),
        rig.box("pillar_shaft", STRUCTURE, (0.52, 0.52, 1.9), origin=(0.0, 0.0, 0.2), pivot="bottom"),
        rig.box("pillar_cap", METAL, (0.76, 0.76, 0.2), origin=(0.0, 0.0, 2.08), pivot="bottom"),
        rig.blob("pillar_orb", FLOWER, 0.24, scale=(1.0, 1.0, 0.9), origin=(0.0, 0.0, 2.4)),
    ]


def accent_arch():
    pieces = []
    span = TILE * 0.62
    for side in (-1.0, 1.0):
        pieces.append(rig.box(f"arch_post{side:+.0f}", STRUCTURE, (0.2, 0.2, 2.25),
                              origin=(0.0, side * span * 0.5, 0.0), pivot="bottom"))
    pieces.append(rig.box("arch_beam", STRUCTURE, (0.24, span + 0.36, 0.2),
                          origin=(0.0, 0.0, 2.22), pivot="bottom"))
    for index in range(3):
        pieces.append(rig.box(f"arch_slat{index}", METAL, (0.5, 0.1, 0.1),
                              origin=(0.0, (index - 1) * span * 0.3, 2.4), pivot="bottom"))
    pieces.append(rig.blob("arch_vine", FOLIAGE, 0.3, scale=(0.8, 1.4, 0.6), origin=(0.0, -span * 0.2, 2.3)))
    return pieces


# --------------------------------------------------------------------------
# The set
# --------------------------------------------------------------------------

VEGETATION = {
    "tree_broadleaf": tree_broadleaf,
    "tree_shade": tree_shade,
    "tree_column": tree_column,
    "tree_evergreen": tree_evergreen,
    "tree_ornamental": tree_ornamental,
    "tree_flowering": tree_flowering,
    "tree_young": tree_young,
    "tree_dense": tree_dense,
    "shrub_round": shrub_round,
    "shrub_hedge": shrub_hedge,
    "shrub_tall": shrub_tall,
    "shrub_topiary": shrub_topiary,
    "flowers_warm": flowers_warm,
    "flowers_cool": flowers_cool,
    "ornamental_grass": ornamental_grass,
    "ground_planting": ground_planting,
}

SCENERY = {
    "lamp_tall": lamp_tall,
    "lamp_garden": lamp_garden,
    "sign_direction": sign_direction,
    "sign_board": sign_board,
    "planter_square": planter_square,
    "planter_round": planter_round,
    "bed_rectangular": bed_rectangular,
    "bed_corner": bed_corner,
    "prop_bollard": prop_bollard,
    "prop_banner": prop_banner,
    "prop_sculpture": prop_sculpture,
    "prop_clock": prop_clock,
    "prop_fountain": prop_fountain,
    "prop_picnic_table": prop_picnic_table,
    "accent_pillar": accent_pillar,
    "accent_arch": accent_arch,
}

#: Wall-type objects.
#:
#: The wall format wants six sprites: two orientations, each flat and on each of the
#: two slopes (`Paint.Wall.cpp`). The two remaining tile sides reuse the same two
#: pictures, so two orientations is the whole of it.
#:
#: The sloped pairs are rendered with the model tilted, not sheared out of the flat
#: sprite. Shearing is right for a path, which is a flat plane, and wrong for a wall:
#: displacing whole columns of an isometric wall either doubles its apparent height or
#: collapses it into a line, depending which way the slope runs. The first attempt did
#: exactly that and one variant came out a fifth of its proper height.
WALLS = {
    "fence_metal": fence_metal,
    "fence_timber": fence_timber,
    "wall_stone": wall_stone,
}

#: One height step over one tile: the engine's slope is 8 units of rise over 32 of
#: run, so a wall on it leans by just over fourteen degrees.
SLOPE_DEGREES = math.degrees(math.atan2(8.0, 32.0))


def main() -> None:
    args = rig.argv_after_double_dash()
    out_dir = "assets/generated/world/scenery"
    if "--out" in args:
        out_dir = args[args.index("--out") + 1]
    os.makedirs(out_dir, exist_ok=True)

    rig.reset_scene()
    rig.setup_world(strength=0.55)
    rig.setup_lights()
    rig.setup_camera(RENDER_SIZE, RENDER_SIZE, target_z=0.0)
    manifest = {"renderSize": RENDER_SIZE, "cameraTargetZ": 0.0}

    def render_set(name: str, makers: dict, yaws) -> None:
        for stem, make in makers.items():
            pieces = make()
            written = []
            for index, yaw in enumerate(yaws):
                rig.aim_camera(bpy.context.scene.camera, yaw)
                path = os.path.join(out_dir, f"{stem}_d{index}.png")
                rig.render_to(path)
                written.append(os.path.basename(path))
            manifest[stem] = written
            for piece in pieces:
                bpy.data.objects.remove(piece, do_unlink=True)
            print(f"[sunrise] rendered {stem}: {len(written)} rotations", flush=True)
        _ = name

    render_set("vegetation", VEGETATION, (45.0, 135.0, 225.0, 315.0))
    render_set("scenery", SCENERY, (45.0, 135.0, 225.0, 315.0))

    # Walls: flat, then tilted each way, for each of the two orientations. The order
    # written here is the order the engine indexes: 0 and 1 flat, 2 and 3 one slope,
    # 4 and 5 the other.
    for stem, make in WALLS.items():
        written = []
        for tilt in (0.0, SLOPE_DEGREES, -SLOPE_DEGREES):
            for index, yaw in enumerate((45.0, 135.0)):
                pieces = make()
                if tilt != 0.0:
                    for piece in pieces:
                        piece.rotation_euler = (0.0, math.radians(tilt), 0.0)
                rig.aim_camera(bpy.context.scene.camera, yaw)
                path = os.path.join(out_dir, f"{stem}_s{len(written)}.png")
                rig.render_to(path)
                written.append(os.path.basename(path))
                for piece in pieces:
                    bpy.data.objects.remove(piece, do_unlink=True)
        manifest[stem] = written
        print(f"[sunrise] rendered {stem}: {len(written)} wall sprites", flush=True)

    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] scenery manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
