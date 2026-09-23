"""Project Sunrise — turn tagged Blender renders into engine-ready sprites.

The Blender step (assets/source/blender) renders every sprite once with each part
painted a flat, well-separated hue. This module:

  1. classifies each pixel by hue into a part ("shirt", "skin", ...),
  2. maps that part to a palette ramp and the pixel's brightness to a shade,
  3. crops to the sprite's content and computes the signed draw offsets,
  4. writes an 8-bit indexed PNG whose indices ARE OpenRCT2 palette indices.

Objects reference those PNGs with {"path": ..., "palette": "keep", "x":, "y":},
which makes the engine take the indices verbatim (docs/object-formats.md §11), so
no external sprite tool is needed for object art.

Because the part -> ramp table is applied here and not in Blender, a new colourway
(different skin, hair or uniform) is a table edit and costs no re-render. Shirts and
trousers additionally use the runtime remap ramps, so the engine recolours them per
peep with no extra sprites at all.

Requires Pillow and numpy (see .cache/venv).
"""

from __future__ import annotations

import json
import math
import os
import sys
from typing import Dict, List, Sequence, Tuple

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sunrise_palette as pal  # noqa: E402

# Must match assets/source/blender/sunrise_rig.py
PART_TAGS: Dict[str, Tuple[float, float, float]] = {
    "skin": (1.0, 0.0, 0.0),
    "shirt": (0.0, 1.0, 0.0),
    "trousers": (0.0, 0.0, 1.0),
    "hair": (1.0, 1.0, 0.0),
    "shoes": (1.0, 0.0, 1.0),
    "accessory": (0.0, 1.0, 1.0),
    "trim": (1.0, 1.0, 1.0),
}

PIXELS_PER_UNIT = 64.0 / (4.0 * math.sqrt(2.0))
COS_ELEVATION = math.cos(math.radians(30.0))

ALPHA_THRESHOLD = 128

#: Brightness window mapped across a ramp. Below `SHADE_FLOOR` everything is the
#: darkest shade, above `SHADE_CEIL` the lightest. The floor matches the emission
#: floor in the Blender materials.
SHADE_FLOOR = 0.18
SHADE_CEIL = 0.98


# ---------------------------------------------------------------------------
# Colourways: part -> palette ramp
# ---------------------------------------------------------------------------

#: Guests are drawn ImageId(base, tShirtColour, trousersColour) (Paint.Guest.cpp:33),
#: so "shirt" must land in the primary remap ramp and "trousers" in the secondary.
GUEST_COLOURWAY: Dict[str, List[int]] = {
    "shirt": pal.RAMP_PRIMARY,
    "trousers": pal.RAMP_SECONDARY,
    "skin": pal.ramp("skin"),
    "hair": pal.ramp("tan"),
    "shoes": pal.ramp("grey"),
    "accessory": pal.ramp("teal"),
}

#: Staff are drawn ImageId(base, tShirtColour) (Paint.Staff.cpp:37) — primary only.
#: Trousers must therefore NOT use the secondary ramp, which would pass through
#: unremapped as pink.
STAFF_COLOURWAY: Dict[str, List[int]] = {
    "shirt": pal.RAMP_PRIMARY,
    "trousers": pal.ramp("blue_grey"),
    "skin": pal.ramp("skin"),
    "hair": pal.ramp("brown"),
    "shoes": pal.ramp("grey"),
    "accessory": pal.ramp("orange"),
}

#: Ordinary scenery and structures: never recoloured, so any safe ramp will do.
#: World props are rendered in their own scenes, where the shared tag directions
#: mean: skin -> structure, trousers -> structure2, shirt -> foliage,
#: hair -> foliage2, accessory -> accessory, trim -> trim.
WORLD_COLOURWAY: Dict[str, List[int]] = {
    "skin": pal.ramp("beige"),         # structure
    "trousers": pal.ramp("grey"),      # structure2
    "shirt": pal.ramp("green"),        # foliage
    "hair": pal.ramp("bright_green"),  # foliage2
    "accessory": pal.ramp("red"),
    "trim": pal.ramp("tan"),
    "shoes": pal.ramp("grey"),
}


# ---------------------------------------------------------------------------
# Classification and quantisation
# ---------------------------------------------------------------------------

_TAG_NAMES = list(PART_TAGS)
_TAG_VECTORS = np.array([PART_TAGS[name] for name in _TAG_NAMES], dtype=np.float32)
_TAG_UNIT = _TAG_VECTORS / np.maximum(
    np.linalg.norm(_TAG_VECTORS, axis=1, keepdims=True), 1e-6
)


def classify(rgb: np.ndarray) -> np.ndarray:
    """Map an (H, W, 3) float array in 0..1 to tag indices, by hue direction."""
    flat = rgb.reshape(-1, 3)
    norms = np.maximum(np.linalg.norm(flat, axis=1, keepdims=True), 1e-6)
    unit = flat / norms
    # Cosine similarity against each tag direction; the closest wins.
    similarity = unit @ _TAG_UNIT.T
    return np.argmax(similarity, axis=1).reshape(rgb.shape[:2])


def quantise(
    rgba: np.ndarray, colourway: Dict[str, Sequence[int]]
) -> Tuple[np.ndarray, np.ndarray]:
    """Return (palette index array, opacity mask) for an (H, W, 4) uint8 image."""
    rgb = rgba[:, :, :3].astype(np.float32) / 255.0
    alpha = rgba[:, :, 3]
    opaque = alpha >= ALPHA_THRESHOLD

    tags = classify(rgb)
    brightness = rgb.max(axis=2)
    normalised = np.clip(
        (brightness - SHADE_FLOOR) / max(SHADE_CEIL - SHADE_FLOOR, 1e-6), 0.0, 1.0
    )

    indices = np.zeros(rgba.shape[:2], dtype=np.uint8)  # 0 == transparent
    for tag_index, tag_name in enumerate(_TAG_NAMES):
        ramp = colourway.get(tag_name)
        if ramp is None:
            continue
        selected = opaque & (tags == tag_index)
        if not selected.any():
            continue
        steps = (np.round(normalised[selected] * (len(ramp) - 1))).astype(np.int32)
        indices[selected] = np.asarray(ramp, dtype=np.uint8)[steps]

    # Any opaque pixel whose tag has no ramp would stay 0 (invisible); make that loud.
    unmapped = opaque & (indices == 0)
    return indices, opaque & ~unmapped if unmapped.any() else opaque


def crop_to_content(indices: np.ndarray) -> Tuple[np.ndarray, int, int]:
    """Crop away fully transparent rows/columns. Returns (cropped, left, top)."""
    filled = indices != 0
    if not filled.any():
        return np.zeros((1, 1), dtype=np.uint8), 0, 0
    rows = np.where(filled.any(axis=1))[0]
    cols = np.where(filled.any(axis=0))[0]
    top, bottom = int(rows[0]), int(rows[-1])
    left, right = int(cols[0]), int(cols[-1])
    return indices[top: bottom + 1, left: right + 1], left, top


def write_indexed_png(path: str, indices: np.ndarray) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image = Image.fromarray(indices, mode="P")
    flat_palette: List[int] = []
    for entry in pal.PALETTE:
        flat_palette.extend(entry)
    image.putpalette(flat_palette)
    image.save(path, optimize=False)


def anchor_pixel(render_size: int, camera_target_z: float) -> Tuple[float, float]:
    """Where the world origin (0,0,0) lands in a render canvas.

    The camera is centred on (0, 0, camera_target_z); a world-vertical unit projects
    to cos(30deg) * PIXELS_PER_UNIT pixels, so the ground plane sits below the canvas
    centre by that much times the target height.
    """
    centre_x = render_size / 2.0
    centre_y = render_size / 2.0 + camera_target_z * COS_ELEVATION * PIXELS_PER_UNIT
    return centre_x, centre_y


def convert_render(
    source_png: str,
    dest_png: str,
    colourway: Dict[str, Sequence[int]],
    render_size: int,
    camera_target_z: float,
    extra_x: int = 0,
    extra_y: int = 0,
) -> Dict[str, int]:
    """Convert one rendered PNG. Returns the object.json image entry."""
    with Image.open(source_png) as handle:
        rgba = np.array(handle.convert("RGBA"))

    indices, _ = quantise(rgba, colourway)
    cropped, left, top = crop_to_content(indices)
    write_indexed_png(dest_png, cropped)

    origin_x, origin_y = anchor_pixel(render_size, camera_target_z)
    return {
        "x": int(round(left - origin_x)) + extra_x,
        "y": int(round(top - origin_y)) + extra_y,
        "width": int(cropped.shape[1]),
        "height": int(cropped.shape[0]),
    }


def image_entry(rel_path: str, offsets: Dict[str, int]) -> Dict[str, object]:
    return {
        "path": rel_path,
        "x": offsets["x"],
        "y": offsets["y"],
        "palette": "keep",
        "format": "rle",
    }


def write_parkobj(path: str, object_json: dict, files: Dict[str, str]) -> int:
    """Zip an object. `files` maps in-archive path -> source path on disk."""
    import zipfile

    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        os.remove(path)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("object.json", json.dumps(object_json, indent=1))
        for archive_path, disk_path in sorted(files.items()):
            archive.write(disk_path, archive_path)
    return os.path.getsize(path)
