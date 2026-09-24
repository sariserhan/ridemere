"""Project Sunrise — original path, park entrance and station art.

    blender -b --python assets/source/blender/world_props.py -- --out <dir>

Prototype-quality originals, sized and anchored to the engine's isometric grid the
same way terrain.py is. Nothing is derived from RollerCoaster Tycoon artwork.
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


def flat_tile(part: str, lift: float = 0.0):
    """A path tile: the same diamond as a terrain tile, a little above the ground."""
    mesh = bpy.data.meshes.new("path_tile")
    obj = bpy.data.objects.new("path_tile", mesh)
    bpy.context.collection.objects.link(obj)
    corners = [terrain.CORNERS[name] for name in terrain.CORNER_ORDER]
    verts = [(x, y, lift) for (x, y) in corners]
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.update()
    mesh.shade_flat()
    obj.data.materials.append(rig.tag_material(part))
    return obj


def booth(height: float, width: float, part: str, roof_part: str):
    """A small kiosk: box with a wider flat roof. Used for station and entrance."""
    objects = []
    body = rig.box("booth_body", part, (width, width, height),
                   origin=(TILE * 0.5, -TILE * 0.5, 0.0), pivot="bottom")
    objects.append(body)
    roof = rig.box("booth_roof", roof_part, (width * 1.35, width * 1.35, 0.18),
                   origin=(TILE * 0.5, -TILE * 0.5, height), pivot="bottom")
    objects.append(roof)
    return objects


def arch(part: str, trim_part: str):
    """Two posts and a lintel, spanning the tile: a park entrance."""
    objects = []
    span = TILE * 0.78
    post = 0.34
    height = 2.6
    for side in (-1.0, 1.0):
        objects.append(rig.box(
            f"post{side:+.0f}", part, (post, post, height),
            origin=(TILE * 0.5 + side * span * 0.5, -TILE * 0.5, 0.0), pivot="bottom"))
    objects.append(rig.box(
        "lintel", trim_part, (span + post, post * 0.9, 0.5),
        origin=(TILE * 0.5, -TILE * 0.5, height), pivot="bottom"))
    return objects


def stall(counter_part: str, awning_part: str, sign_part: str, prop_part: str,
          has_prop: bool = True):
    """A one tile shop: counter, canopy on posts, a sign board and a product prop.

    Every shop in V1 is the same silhouette so a player reads "stall" instantly, and is
    told apart by its awning colour and the shape on its sign. Colour coding does the
    work that text cannot do at sixty-four pixels.

    Built on the world origin, not on the tile centre. The camera orbits the origin, so
    a model standing anywhere else swings around it as the camera turns: the four
    rotations come out at four different places, the packed sprite offsets disagree
    with one another, and the engine draws the stall half off its own tile. That is
    what the first attempt did, and half of every stall was missing.
    """
    objects = []
    width = TILE * 0.66
    counter_h = 1.15
    post_h = 2.35

    # The counter the guest is served at.
    objects.append(rig.box(
        "stall_counter", counter_part, (width, width * 0.72, counter_h),
        origin=(0.0, 0.0, 0.0), pivot="bottom"))

    # Four slim posts carrying the canopy.
    post = 0.16
    for dx in (-1.0, 1.0):
        for dy in (-1.0, 1.0):
            objects.append(rig.box(
                f"stall_post{dx:+.0f}{dy:+.0f}", sign_part, (post, post, post_h),
                origin=(dx * width * 0.46, dy * width * 0.34, 0.0), pivot="bottom"))

    # A wide flat canopy, the largest shape and the one carrying the accent colour.
    objects.append(rig.box(
        "stall_awning", awning_part, (width * 1.34, width * 1.06, 0.22),
        origin=(0.0, 0.0, post_h), pivot="bottom"))

    # A sign board standing above the canopy, so the stall has a distinct outline.
    objects.append(rig.box(
        "stall_sign", sign_part, (width * 0.74, 0.12, 0.62),
        origin=(0.0, -width * 0.4, post_h + 0.22), pivot="bottom"))

    if has_prop:
        # The product on the counter: a small block that reads as goods rather than
        # as a specific item, because a specific item would not survive the size.
        objects.append(rig.box(
            "stall_prop", prop_part, (width * 0.34, width * 0.3, 0.3),
            origin=(0.0, width * 0.1, counter_h), pivot="bottom"))
    return objects


def cabin(body_part: str, roof_part: str, trim_part: str):
    """A one tile enclosed building: used for the restroom and the information kiosk.

    Taller and closed where a shop is open, so a facility reads as a building a guest
    goes into rather than a counter they are served at. Built on the world origin, for
    the reason given on `stall`.
    """
    objects = []
    width = TILE * 0.68
    height = 2.5
    objects.append(rig.box(
        "cabin_body", body_part, (width, width, height),
        origin=(0.0, 0.0, 0.0), pivot="bottom"))
    objects.append(rig.box(
        "cabin_roof", roof_part, (width * 1.2, width * 1.2, 0.3),
        origin=(0.0, 0.0, height), pivot="bottom"))
    # A doorway recess on the front face, which is what makes it read as enterable.
    objects.append(rig.box(
        "cabin_door", trim_part, (width * 0.38, 0.1, height * 0.62),
        origin=(0.0, -width * 0.5, 0.0), pivot="bottom"))
    objects.append(rig.box(
        "cabin_sign", trim_part, (width * 0.5, 0.1, 0.34),
        origin=(0.0, -width * 0.5, height * 0.68), pivot="bottom"))
    return objects


def render_four(out_dir: str, stem: str) -> list:
    return [os.path.basename(p) for p in rig.render_rotations(out_dir, stem)]


def main() -> None:
    args = rig.argv_after_double_dash()
    out_dir = "assets/generated/world/props"
    if "--out" in args:
        out_dir = args[args.index("--out") + 1]
    os.makedirs(out_dir, exist_ok=True)

    rig.reset_scene()
    rig.setup_world(strength=0.55)
    rig.setup_lights()
    rig.setup_camera(RENDER_SIZE, RENDER_SIZE, target_z=0.0)
    manifest = {"renderSize": RENDER_SIZE, "cameraTargetZ": 0.0}

    # Path surface: one tile, reused for every connection variant. The test park is
    # flat, so the slope and connection variants are never visually distinct.
    tile = flat_tile("structure2", lift=0.02)
    rig.aim_camera(bpy.context.scene.camera, 45.0)
    path_png = os.path.join(out_dir, "path_flat.png")
    rig.render_to(path_png)
    manifest["pathSurface"] = os.path.basename(path_png)
    bpy.data.objects.remove(tile, do_unlink=True)
    print("[sunrise] rendered path surface", flush=True)

    # Park entrance: an arch, from four directions.
    pieces = arch("structure", "accessory")
    manifest["entrance"] = render_four(out_dir, "entrance")
    for piece in pieces:
        bpy.data.objects.remove(piece, do_unlink=True)
    print("[sunrise] rendered park entrance: 4 rotations", flush=True)

    # Station: a kiosk, from four directions.
    pieces = booth(1.7, 1.5, "structure", "accessory")
    manifest["station"] = render_four(out_dir, "station")
    for piece in pieces:
        bpy.data.objects.remove(piece, do_unlink=True)
    print("[sunrise] rendered station: 4 rotations", flush=True)

    # Shops and facilities. Each is rendered from four directions. They share a
    # silhouette on purpose and are told apart by the accent colour on the awning or
    # roof, because a name on a sign does not survive sixty-four pixels.
    #
    # The hue tags map through the world colourway: "skin" is structure, "trousers" is
    # structure2, "shirt" is the accent, "hair" is a second accent, "accessory" is the
    # product prop and "trim" is detail.
    shops = {
        "shop_food": lambda: stall("skin", "shirt", "trousers", "accessory"),
        "shop_drink": lambda: stall("skin", "hair", "trousers", "accessory"),
        "shop_souvenir": lambda: stall("skin", "accessory", "trousers", "trim"),
        "facility_restroom": lambda: cabin("skin", "hair", "trim"),
        "facility_information": lambda: cabin("skin", "shirt", "accessory"),
    }
    for stem, make in shops.items():
        pieces = make()
        manifest[stem] = render_four(out_dir, stem)
        for piece in pieces:
            bpy.data.objects.remove(piece, do_unlink=True)
        print(f"[sunrise] rendered {stem}: 4 rotations", flush=True)

    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] props manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
