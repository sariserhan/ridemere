"""Project Sunrise — shared Blender authoring module (runs inside Blender's Python).

Everything here is original work; no RollerCoaster Tycoon data, geometry or artwork
is read, traced or derived.

Projection
----------
OpenRCT2 draws the world in a 2:1 isometric projection: a 1x1 map tile is a 64x32
pixel diamond. For an orthographic camera looking down at elevation E at a square
rotated 45 degrees, the diamond is (side * sqrt(2)) wide and that times sin(E) tall,
so 2:1 means sin(E) = 0.5, i.e. E = 30 degrees (camera pitched 60 degrees from
straight down). We adopt the same convention the OpenRCT2 Blender add-on uses:

    1 map tile      = 4.0 Blender units
    1 Blender unit  = 64 / (4 * sqrt(2)) = 11.3137 pixels horizontally
    ortho_scale     = render_width_px / 11.3137

A world-vertical edge of length h projects to h * cos(30deg) * 11.3137 pixels, so a
20-pixel-tall guest is about 2.04 units tall.

Tagged rendering
----------------
Sprites are rendered once, with every part assigned a flat, well-separated hue and
with light bounces disabled, so each pixel's hue identifies the part it came from
and its brightness gives the shading. The palette step (tools/art-pipeline) then maps
part -> palette ramp and brightness -> shade. Re-colouring a part is therefore a
palette-table edit, not a re-render, which is what makes guest variation cheap.

Anti-aliasing is switched off on purpose: these are hard-edged pixel sprites.
"""

from __future__ import annotations

import json
import math
import os
import sys

import bpy
from mathutils import Euler, Vector

# --------------------------------------------------------------------------
# Projection constants
# --------------------------------------------------------------------------

UNITS_PER_TILE = 4.0
PIXELS_PER_UNIT = 64.0 / (UNITS_PER_TILE * math.sqrt(2.0))  # 11.3137
CAMERA_ELEVATION_DEG = 30.0
CAMERA_PITCH_DEG = 90.0 - CAMERA_ELEVATION_DEG  # 60, measured from straight down

# Part tag hues. Chosen far apart in RGB so classification after rendering is exact.
# The name is what tools/art-pipeline/peep_parts.py maps onto a palette ramp.
PART_TAGS = {
    "skin": (1.0, 0.0, 0.0),
    "shirt": (0.0, 1.0, 0.0),
    "trousers": (0.0, 0.0, 1.0),
    "hair": (1.0, 1.0, 0.0),
    "shoes": (1.0, 0.0, 1.0),
    "accessory": (0.0, 1.0, 1.0),
    "structure": (1.0, 0.5, 0.0),
    "structure2": (0.5, 0.0, 1.0),
    "foliage": (0.0, 1.0, 0.5),
    "foliage2": (0.5, 1.0, 0.0),
    "trim": (1.0, 1.0, 1.0),
}


# --------------------------------------------------------------------------
# Scene setup
# --------------------------------------------------------------------------


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    # Direct light only: no colour bleeding between parts, so hues stay pure.
    scene.cycles.max_bounces = 0
    scene.cycles.diffuse_bounces = 0
    scene.cycles.glossy_bounces = 0
    scene.cycles.transmission_bounces = 0
    scene.cycles.transparent_max_bounces = 8
    scene.render.film_transparent = True
    scene.render.filter_size = 0.01  # effectively no anti-aliasing
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 0
    scene.view_settings.view_transform = "Standard"  # no filmic tone curve
    scene.view_settings.look = "None"


def setup_world(strength: float = 0.45) -> None:
    """Uniform ambient so faces pointing away from the sun keep their hue."""
    world = bpy.data.worlds.new("SunriseWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (1.0, 1.0, 1.0, 1.0)
    background.inputs[1].default_value = strength


def setup_lights() -> None:
    """One key sun plus a weaker fill, fixed in world space.

    The lights do not rotate with the camera, so a sprite's lit side depends on
    the direction the subject faces. That is what gives the four rotations their
    readable shading.
    """
    key = bpy.data.lights.new("Key", type="SUN")
    key.energy = 3.0
    key.angle = 0.0  # hard shadows, no penumbra
    key_object = bpy.data.objects.new("Key", key)
    key_object.rotation_euler = Euler(
        (math.radians(50.0), 0.0, math.radians(-135.0)), "XYZ"
    )
    bpy.context.collection.objects.link(key_object)

    fill = bpy.data.lights.new("Fill", type="SUN")
    fill.energy = 1.1
    fill.angle = 0.0
    fill_object = bpy.data.objects.new("Fill", fill)
    fill_object.rotation_euler = Euler(
        (math.radians(65.0), 0.0, math.radians(60.0)), "XYZ"
    )
    bpy.context.collection.objects.link(fill_object)


def setup_camera(render_width: int, render_height: int, target_z: float = 0.0):
    """Orthographic isometric camera. Returns the camera object.

    The camera is placed far away along the view axis and centred on
    (0, 0, target_z); the world origin therefore projects to a known pixel, which
    is how sprite offsets are computed later.
    """
    camera_data = bpy.data.cameras.new("Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = render_width / PIXELS_PER_UNIT
    camera_data.clip_start = 1.0
    camera_data.clip_end = 400.0
    camera = bpy.data.objects.new("Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.resolution_x = render_width
    scene.render.resolution_y = render_height
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = 1.0
    scene.render.pixel_aspect_y = 1.0

    camera["sunrise_target_z"] = target_z
    aim_camera(camera, yaw_deg=45.0)
    return camera


def aim_camera(camera, yaw_deg: float) -> None:
    """Point the camera at the origin from `yaw_deg` around the Z axis."""
    target_z = camera.get("sunrise_target_z", 0.0)
    pitch = math.radians(CAMERA_PITCH_DEG)
    yaw = math.radians(yaw_deg)
    camera.rotation_euler = Euler((pitch, 0.0, yaw), "XYZ")
    distance = 100.0
    direction = Vector(
        (
            math.sin(pitch) * math.sin(yaw),
            -math.sin(pitch) * math.cos(yaw),
            math.cos(pitch),
        )
    )
    camera.location = Vector((0.0, 0.0, target_z)) + direction * distance


# --------------------------------------------------------------------------
# Materials and geometry
# --------------------------------------------------------------------------

AMBIENT_FLOOR = 0.20

_material_cache = {}


def tag_material(part: str):
    """Flat diffuse material whose hue identifies `part`."""
    if part in _material_cache:
        return _material_cache[part]
    if part not in PART_TAGS:
        raise KeyError(f"unknown part tag {part!r}; known: {sorted(PART_TAGS)}")

    material = bpy.data.materials.new(f"tag_{part}")
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    red, green, blue = PART_TAGS[part]

    diffuse = tree.nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (red, green, blue, 1.0)
    diffuse.inputs["Roughness"].default_value = 1.0

    # A small self-emission of the same hue guarantees that no lit surface is ever
    # pure black. Crevices (an armpit, the gap between the legs) occlude the world
    # light entirely, and a black pixel carries no hue, so the palette step could
    # not tell which part it belonged to. This floor keeps every pixel classifiable.
    emission = tree.nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (red, green, blue, 1.0)
    emission.inputs["Strength"].default_value = AMBIENT_FLOOR

    add = tree.nodes.new("ShaderNodeAddShader")
    tree.links.new(diffuse.outputs["BSDF"], add.inputs[0])
    tree.links.new(emission.outputs["Emission"], add.inputs[1])

    output = tree.nodes.new("ShaderNodeOutputMaterial")
    tree.links.new(add.outputs["Shader"], output.inputs["Surface"])
    _material_cache[part] = material
    return material


def box(name: str, part: str, size, origin=(0.0, 0.0, 0.0), pivot="center", parent=None):
    """Axis-aligned box.

    `size` is (x, y, z) extent in Blender units. `origin` places the pivot in world
    (or parent-relative) space. `pivot` says where the pivot sits inside the box:
    "center", "top" (pivot at the top face, box hangs down) or "bottom".
    """
    width, depth, height = size
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if pivot == "center":
        z_low, z_high = -height / 2.0, height / 2.0
    elif pivot == "top":
        z_low, z_high = -height, 0.0
    elif pivot == "bottom":
        z_low, z_high = 0.0, height
    else:
        raise ValueError(f"bad pivot {pivot!r}")

    x_half, y_half = width / 2.0, depth / 2.0
    verts = [
        (-x_half, -y_half, z_low), (x_half, -y_half, z_low),
        (x_half, y_half, z_low), (-x_half, y_half, z_low),
        (-x_half, -y_half, z_high), (x_half, -y_half, z_high),
        (x_half, y_half, z_high), (-x_half, y_half, z_high),
    ]
    faces = [
        (0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
        (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0),
    ]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    mesh.shade_flat()

    obj.data.materials.append(tag_material(part))
    obj.location = Vector(origin)
    if parent is not None:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def cylinder(name: str, part: str, radius: float, height: float, vertices: int = 12,
             origin=(0.0, 0.0, 0.0), pivot="bottom", parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=height,
                                        location=(0.0, 0.0, 0.0))
    obj = bpy.context.active_object
    obj.name = name
    if pivot == "bottom":
        for vertex in obj.data.vertices:
            vertex.co.z += height / 2.0
    elif pivot == "top":
        for vertex in obj.data.vertices:
            vertex.co.z -= height / 2.0
    obj.data.shade_flat()
    obj.data.materials.clear()
    obj.data.materials.append(tag_material(part))
    obj.location = Vector(origin)
    if parent is not None:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def empty(name: str, origin=(0.0, 0.0, 0.0), parent=None):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_size = 0.1
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(origin)
    if parent is not None:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


# --------------------------------------------------------------------------
# Posing and rendering
# --------------------------------------------------------------------------


def apply_pose(rig: dict, pose: dict) -> None:
    """Apply a pose: {part_name: (rx_deg, ry_deg, rz_deg)} or
    {part_name: {"rot": (...), "loc": (...)}}. Parts absent from the pose are reset.
    """
    for name, obj in rig.items():
        if obj is None:
            continue
        base = obj.get("sunrise_rest_location")
        if base is not None:
            obj.location = Vector(tuple(base))
        obj.rotation_euler = Euler((0.0, 0.0, 0.0), "XYZ")

    for name, value in pose.items():
        obj = rig.get(name)
        if obj is None:
            raise KeyError(f"pose references unknown part {name!r}")
        if isinstance(value, dict):
            rotation = value.get("rot", (0.0, 0.0, 0.0))
            offset = value.get("loc")
            if offset is not None:
                base = obj.get("sunrise_rest_location") or (0.0, 0.0, 0.0)
                obj.location = Vector(tuple(base)) + Vector(offset)
        else:
            rotation = value
        obj.rotation_euler = Euler([math.radians(a) for a in rotation], "XYZ")


def remember_rest(rig: dict) -> None:
    for obj in rig.values():
        if obj is not None:
            obj["sunrise_rest_location"] = tuple(obj.location)


def render_to(path: str) -> None:
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def render_rotations(out_dir: str, stem: str, yaws=(45.0, 135.0, 225.0, 315.0)) -> list:
    """Render the current scene once per camera yaw. Returns the written paths."""
    camera = bpy.context.scene.camera
    written = []
    for index, yaw in enumerate(yaws):
        aim_camera(camera, yaw)
        path = os.path.join(out_dir, f"{stem}_d{index}.png")
        render_to(path)
        written.append(path)
    return written


def write_manifest(path: str, data: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)


def argv_after_double_dash() -> list:
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1:]
    return []
