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
    # High ventilation windows keep the side/rear cabin views readable as a
    # building, rather than an unbroken block after noise-free rendering.
    objects.append(rig.box("cabin_rear_vent", trim_part, (width * .48, .08, .22),
                           origin=(0, width * .5, height * .67), pivot="bottom"))
    for side in (-1, 1):
        objects.append(rig.box(f"cabin_side_vent_{side}", trim_part, (.08, width * .48, .22),
                               origin=(side * width * .5, 0, height * .67), pivot="bottom"))
    return objects


# --------------------------------------------------------------------------
# Path additions: things that sit on the edge of a path tile.
#
# The engine draws these once per tile edge, at a world offset it chooses itself
# (Paint.PathAddition.cpp: {7,16}, {16,25}, {25,16}, {16,7} for NE, SE, SW, NW).
# So the model is built on the world origin and the four rotations come from the
# camera, exactly as the stalls do; the engine puts each one against its edge.
#
# The long axis runs along Y, with the back at low X, which is the orientation that
# lands along the NE edge in the first render. Get that wrong and every bench in the
# park stands across the path instead of beside it.
# --------------------------------------------------------------------------

BENCH_LENGTH = 1.55
BENCH_DEPTH = 0.52
BENCH_SEAT_H = 0.62
BENCH_BACK_H = 1.12


def bench(frame_part: str, seat_part: str, broken: bool = False):
    """One bench: two end frames, a slatted seat and a back.

    The broken variant is the same bench with its back gone and one end frame
    collapsed. It exists because the engine indexes a broken sprite for every
    addition whether or not the object can be broken, so the table has to be
    complete; shipping real art for it means switching vandalism on later costs
    nothing.
    """
    objects = []
    slat = 0.12

    # Two end frames.
    for side in (-1.0, 1.0):
        height = BENCH_SEAT_H
        if broken and side > 0.0:
            height *= 0.45
        objects.append(rig.box(
            f"bench_frame{side:+.0f}", frame_part, (BENCH_DEPTH, 0.12, height),
            origin=(0.0, side * (BENCH_LENGTH * 0.5 - 0.06), 0.0), pivot="bottom"))

    # The seat: three slats with a gap, which is what makes it read as a bench
    # rather than as a block at this size.
    for index in range(3):
        offset = (index - 1) * (slat + 0.05)
        z = BENCH_SEAT_H
        if broken and index == 2:
            continue
        objects.append(rig.box(
            f"bench_slat{index}", seat_part, (slat, BENCH_LENGTH, 0.07),
            origin=(offset, 0.0, z), pivot="bottom"))

    if not broken:
        # The back, set at the low-x side so the bench faces along +x.
        objects.append(rig.box(
            "bench_back", seat_part, (0.1, BENCH_LENGTH, BENCH_BACK_H - BENCH_SEAT_H),
            origin=(-BENCH_DEPTH * 0.45, 0.0, BENCH_SEAT_H), pivot="bottom"))
        objects.append(rig.box(
            "bench_back_rail", frame_part, (0.12, BENCH_LENGTH, 0.09),
            origin=(-BENCH_DEPTH * 0.45, 0.0, BENCH_BACK_H - 0.09), pivot="bottom"))
    return objects


BIN_RADIUS = 0.34
BIN_HEIGHT = 0.86


def litter_bin(body_part: str, trim_part: str, state: str = "empty"):
    """One bin. `state` is "empty", "full" or "broken".

    Full and broken are separate sprites the engine indexes by itself, so both are
    real art rather than a recolour: a full bin has rubbish above the rim, a broken
    one is on its side with the rubbish out.
    """
    objects = []
    if state == "broken":
        body = rig.cylinder("bin_body", body_part, BIN_RADIUS, BIN_HEIGHT * 0.8,
                            vertices=10, origin=(0.0, 0.0, BIN_RADIUS), pivot="bottom")
        body.rotation_euler = (math.radians(90.0), 0.0, 0.0)
        objects.append(body)
        # Rubbish spilled out beside it.
        for index, (dx, dy) in enumerate(((0.3, 0.42), (0.1, 0.55), (-0.2, 0.38))):
            objects.append(rig.box(
                f"bin_spill{index}", trim_part, (0.16, 0.16, 0.1),
                origin=(dx, dy, 0.0), pivot="bottom"))
        return objects

    objects.append(rig.cylinder(
        "bin_body", body_part, BIN_RADIUS, BIN_HEIGHT, vertices=10,
        origin=(0.0, 0.0, 0.0), pivot="bottom"))
    objects.append(rig.cylinder(
        "bin_rim", trim_part, BIN_RADIUS * 1.08, 0.1, vertices=10,
        origin=(0.0, 0.0, BIN_HEIGHT - 0.1), pivot="bottom"))
    # A post, so a bin reads as fixed to the ground rather than as a loose barrel.
    objects.append(rig.box(
        "bin_post", trim_part, (0.1, 0.1, BIN_HEIGHT * 0.5),
        origin=(0.0, 0.0, 0.0), pivot="bottom"))

    if state == "full":
        for index, (dx, dy, dz) in enumerate(((0.1, 0.06, 0.0), (-0.09, 0.1, 0.06), (0.04, -0.11, 0.03))):
            objects.append(rig.box(
                f"bin_rubbish{index}", trim_part, (0.2, 0.2, 0.16),
                origin=(dx, dy, BIN_HEIGHT + dz), pivot="bottom"))
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

    # Path additions. Each state is rendered from four camera yaws, which is what the
    # engine wants: one sprite per tile edge.
    additions = {
        "bench": lambda: bench("structure2", "skin"),
        "bench_broken": lambda: bench("structure2", "skin", broken=True),
        "bin": lambda: litter_bin("structure2", "accessory", "empty"),
        "bin_full": lambda: litter_bin("structure2", "accessory", "full"),
        "bin_broken": lambda: litter_bin("structure2", "accessory", "broken"),
    }
    for stem, make in additions.items():
        pieces = make()
        manifest[stem] = render_four(out_dir, stem)
        for piece in pieces:
            bpy.data.objects.remove(piece, do_unlink=True)
        print(f"[sunrise] rendered {stem}: 4 rotations", flush=True)

    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] props manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
