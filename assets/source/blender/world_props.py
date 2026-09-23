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

    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] props manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
