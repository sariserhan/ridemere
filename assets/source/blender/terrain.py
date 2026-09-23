"""Project Sunrise — original terrain surface and edge tiles.

    blender -b --python assets/source/blender/terrain.py -- --out <dir>

A terrain surface object needs 1 icon plus 19 slope variants per entry
(TerrainSurfaceObject.cpp:23-36, kNumImagesInEntry = 19). We render the 19 slopes
once; the grid and underground entries are produced from those renders in the
palette step, so the object ships 58 images from 19 renders.

Geometry, derived from the documented sprite sizes in docs/object-formats.md:

  * A tile is 4 Blender units square and its far (screen-top) corner sits on the
    world origin, which is the anchor the engine draws the tile from. A flat tile
    then crops to 64x31 at offset (-32, 0), exactly as the engine expects.
  * With the camera at yaw 45 the corners read, on screen: S farthest (top),
    N nearest (bottom), E right, W left. Slope bits are N=1, E=2, S=4, W=8 and
    bit 16 marks a steep slope (Slope.h:19-24).
  * One height step is 16 screen pixels, which is 16 / (cos(30) * 11.3137) BU.
"""

from __future__ import annotations

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sunrise_rig as rig  # noqa: E402

# A tile of exactly 4 units rasterises to 62-63 px because its extreme corners fall
# on pixel boundaries and are dropped. A hair over compensates and yields a full 64.
TILE = rig.UNITS_PER_TILE * (63.0 / 62.0)
HEIGHT_STEP = 16.0 / (math.cos(math.radians(30.0)) * rig.PIXELS_PER_UNIT)
RENDER_SIZE = 96  # generous canvas; sprites are cropped to content

# Corner positions with the S (far) corner on the origin.
CORNERS = {
    "S": (0.0, 0.0),
    "E": (TILE, 0.0),
    "N": (TILE, -TILE),
    "W": (0.0, -TILE),
}
CORNER_ORDER = ["S", "E", "N", "W"]
OPPOSITE = {"N": "S", "S": "N", "E": "W", "W": "E"}

SLOPE_N, SLOPE_E, SLOPE_S, SLOPE_W, SLOPE_STEEP = 1, 2, 4, 8, 16

#: Byte97B444 inverted: render offset -> slope value (docs/object-formats.md).
# Offset 15 is reached in practice via slope 30 (Byte97B444[30] == 15); slope 15
# (all four corners up) never occurs on a real map, so rendering 30 here is what
# produces the steep tile the engine actually draws.
SLOPE_FOR_OFFSET = [0, 2, 1, 3, 8, 10, 9, 11, 4, 6, 5, 7, 12, 14, 13, 30, 27, 23, 29]


def corner_heights(slope: int) -> dict:
    """Height, in steps, of each corner for a slope value."""
    bits = {"N": SLOPE_N, "E": SLOPE_E, "S": SLOPE_S, "W": SLOPE_W}
    heights = {name: (1.0 if slope & bit else 0.0) for name, bit in bits.items()}
    if slope & SLOPE_STEEP:
        # A steep slope has three corners up; the one opposite the low corner is
        # raised a second step so the face keeps a constant gradient.
        low = [name for name, value in heights.items() if value == 0.0]
        if len(low) == 1:
            heights[OPPOSITE[low[0]]] += 1.0
    return heights


def build_tile(slope: int, part: str = "foliage"):
    heights = corner_heights(slope)
    mesh = bpy.data.meshes.new(f"tile_{slope}")
    obj = bpy.data.objects.new(f"tile_{slope}", mesh)
    bpy.context.collection.objects.link(obj)

    top = []
    for name in CORNER_ORDER:
        x, y = CORNERS[name]
        top.append((x, y, heights[name] * HEIGHT_STEP))
    # Only the top face: the engine draws the tile's sides separately from the
    # terrain_edge object, so a surface sprite that included a skirt would be far
    # too tall (a flat tile must crop to 64x31).
    mesh.from_pydata(top, [], [(0, 1, 2, 3)])
    mesh.update()
    mesh.shade_flat()
    obj.data.materials.append(rig.tag_material(part))
    return obj


def main() -> None:
    args = rig.argv_after_double_dash()
    out_dir = "assets/generated/world/terrain"
    if "--out" in args:
        out_dir = args[args.index("--out") + 1]
    os.makedirs(out_dir, exist_ok=True)

    rig.reset_scene()
    rig.setup_world(strength=0.55)
    rig.setup_lights()
    rig.setup_camera(RENDER_SIZE, RENDER_SIZE, target_z=0.0)
    rig.aim_camera(bpy.context.scene.camera, 45.0)

    manifest = {"renderSize": RENDER_SIZE, "cameraTargetZ": 0.0, "slopes": [], "surfaces": {}}

    for surface_name, part in (("grass", "foliage"), ("dirt", "structure")):
        files = []
        for offset, slope in enumerate(SLOPE_FOR_OFFSET):
            tile = build_tile(slope, part)
            path = os.path.join(out_dir, f"{surface_name}_s{offset:02d}.png")
            rig.render_to(path)
            files.append(os.path.basename(path))
            bpy.data.objects.remove(tile, do_unlink=True)
        manifest["surfaces"][surface_name] = files
        print(f"[sunrise] rendered terrain.{surface_name}: {len(files)} slope variants", flush=True)

    manifest["slopes"] = SLOPE_FOR_OFFSET
    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] terrain manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
