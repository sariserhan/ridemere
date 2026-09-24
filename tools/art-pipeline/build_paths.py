"""Build the Ridemere footpath surfaces, queue and railings.

    .cache/venv/bin/python tools/art-pipeline/build_paths.py

A footpath surface object is fifty-two images whose meaning is fixed by position, read
from the engine rather than guessed (Paint.Path.cpp):

    0            the preview shown in the build menu
    1 + 0..15    the sixteen ways a tile connects to its neighbours
    1 + 16..19   the four slope directions
    1 + 20..50   the thirty-one variants where a corner between two connected
                 neighbours is filled in

The mapping from a tile's connections to an image is a 256-entry table in the engine.
This reads that table and inverts it, so every one of the fifty-one images is drawn for
the connections it will actually be used for. Repeating a single tile across all of
them, as the prototype did, draws paving where a corner should be open ground.

Railings are seventy-four images: the edging drawn along open sides of a path, the
supports under an elevated one, and the bridge deck it sits on.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import tempfile
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import world_palette  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")
PAINT_SOURCE = os.path.join(
    REPO, "engine", "openrct2", "src", "openrct2", "paint", "tile_element", "Paint.Path.cpp")

SURFACE_IMAGES = 52
RAILINGS_IMAGES = 74

#: A path tile is the same diamond as a terrain tile: 64 wide, 31 tall, anchored so the
#: sprite is drawn at (-32, 0) from the tile origin.
TILE_W, TILE_H = 64, 31
SLOPE_RISE = 16

#: Screen-space direction of each tile edge, in the engine's rotated order.
#: 0 is the edge towards the top right of the screen, then clockwise.
EDGE_ORDER = (0, 1, 2, 3)


def connection_table() -> Dict[int, int]:
    """Invert the engine's connections-to-image table.

    Returns image offset -> a representative connections byte, so each image can be
    drawn for the shape it is actually used for.
    """
    with open(PAINT_SOURCE, "r", encoding="utf-8") as handle:
        source = handle.read()
    start = source.index("kPathEdgesAndCornersToSurfaceImageIndexOffset")
    segment = source[start : start + 4000]
    body = segment[segment.index("{") + 1 : segment.index("};")]
    values = [int(token) for token in re.findall(r"\b(\d+)\b", body)]
    if len(values) != 256:
        raise SystemExit(f"expected a 256 entry table, found {len(values)}")
    inverted: Dict[int, int] = {}
    for connections, offset in enumerate(values):
        inverted.setdefault(offset, connections)
    return inverted


def diamond_mask(width: int = TILE_W, height: int = TILE_H) -> np.ndarray:
    """The isometric tile diamond."""
    ys, xs = np.mgrid[0:height, 0:width]
    # Normalised distance from the centre along the two diagonal axes.
    cx, cy = (width - 1) / 2.0, (height - 1) / 2.0
    return (np.abs(xs - cx) / cx + np.abs(ys - cy) / cy) <= 1.0


def edge_band(mask: np.ndarray, edge: int, thickness: int = 3) -> np.ndarray:
    """A band along one side of the diamond, used for kerbs and railings."""
    height, width = mask.shape
    ys, xs = np.mgrid[0:height, 0:width]
    cx, cy = (width - 1) / 2.0, (height - 1) / 2.0
    u = (xs - cx) / cx
    v = (ys - cy) / cy
    # Each side of the diamond is where one of these sums reaches one.
    # Bit 0 is the side towards the lower right of the screen, then anticlockwise.
    # Getting this wrong puts a kerb across a straight path instead of along it, which
    # is how it was found.
    sides = {
        0: (u + v),    # towards the lower right
        1: (v - u),    # towards the lower left
        2: -(u + v),   # towards the upper left
        3: (u - v),    # towards the upper right
    }
    distance = sides[edge]
    limit = 1.0 - (thickness * 2.0 / width)
    return mask & (distance >= limit)


def corner_wedge(mask: np.ndarray, corner: int) -> np.ndarray:
    """The quarter of the tile nearest one corner of the diamond."""
    height, width = mask.shape
    ys, xs = np.mgrid[0:height, 0:width]
    cx, cy = (width - 1) / 2.0, (height - 1) / 2.0
    u = (xs - cx) / cx
    v = (ys - cy) / cy
    wedges = {
        0: (u >= 0) & (v <= 0),
        1: (u >= 0) & (v >= 0),
        2: (u <= 0) & (v >= 0),
        3: (u <= 0) & (v <= 0),
    }
    return mask & wedges[corner]


def paint_surface(material: world_palette.Material, mask: np.ndarray, stripe: bool) -> np.ndarray:
    """Fill a shape with a path material."""
    ramp = material.colours
    height, width = mask.shape
    breakup = world_palette.texture(material, height, width, seed=3)
    step = np.clip(material.base + breakup, 0, len(ramp) - 1)
    out = np.zeros((height, width), dtype=np.uint8)
    painted = np.asarray(ramp, dtype=np.uint8)[step]
    out[mask] = painted[mask]
    if stripe:
        # A queue reads as queue space from a quiet centre stripe, not from a louder
        # colour: a player should recognise it without it shouting across the park.
        ys, xs = np.mgrid[0:height, 0:width]
        cx, cy = (width - 1) / 2.0, (height - 1) / 2.0
        u = (xs - cx) / cx
        v = (ys - cy) / cy
        band = mask & (np.abs(u + v) < 0.18)
        out[band] = ramp[max(0, material.base - 2)]
    return out


def surface_tile(material: world_palette.Material, connections: int, stripe: bool) -> np.ndarray:
    """One connection variant: paving, with a kerb wherever nothing connects."""
    edges = connections & 0x0F
    corners = (connections >> 4) & 0x0F
    mask = diamond_mask()

    # An unconnected side keeps its corner wedges open, which is what makes a corner
    # read as a corner instead of as a full tile.
    shape = mask.copy()
    for corner in range(4):
        if corners & (1 << corner):
            continue
        adjacent = ((corner) % 4, (corner + 3) % 4)
        if all(edges & (1 << side) for side in adjacent):
            continue
        if not any(edges & (1 << side) for side in adjacent):
            shape &= ~corner_wedge(mask, corner)

    out = paint_surface(material, shape, stripe)
    ramp = material.colours
    for edge in range(4):
        if edges & (1 << edge):
            continue
        band = edge_band(shape, edge, thickness=2)
        out[band] = ramp[max(0, material.base - 2)]
    return out


def slope_tile(material: world_palette.Material, direction: int, stripe: bool) -> np.ndarray:
    """A path rising one height step across the tile.

    Built by displacing the flat tile along the slope axis rather than by rendering new
    geometry: at this size the ramp is a shear, and generating it keeps the whole set
    reproducible from one definition.
    """
    flat = surface_tile(material, 0x0F, stripe)
    height, width = flat.shape
    out = np.zeros((height + SLOPE_RISE, width), dtype=np.uint8)
    ys, xs = np.mgrid[0:height, 0:width]
    cx, cy = (width - 1) / 2.0, (height - 1) / 2.0
    u = (xs - cx) / cx
    v = (ys - cy) / cy
    axis = {0: (u - v), 1: (u + v), 2: (v - u), 3: -(u + v)}[direction]
    rise = ((axis + 1.0) / 2.0 * SLOPE_RISE).astype(np.int32)
    target = ys + SLOPE_RISE - rise
    filled = flat != 0
    out[target[filled], xs[filled]] = flat[filled]
    # The shear leaves single-pixel gaps where it stretches; close them downwards.
    for _ in range(2):
        gaps = (out == 0)
        gaps[0, :] = False
        above = np.roll(out, 1, axis=0)
        fill = gaps & (above != 0) & (np.roll(out, -1, axis=0) != 0)
        out[fill] = above[fill]
    return out


def build_surface(key: str, identifier: str, name: str, material_name: str,
                  queue: bool, table: Dict[int, int], work: str) -> dict:
    material = world_palette.MATERIALS[material_name]
    stage = os.path.join(work, key)
    os.makedirs(stage, exist_ok=True)
    images: List[dict] = []
    files: Dict[str, str] = {}

    def add(name: str, indices: np.ndarray, x: int, y: int) -> None:
        path = os.path.join(stage, name)
        spritepack.write_indexed_png(path, indices)
        images.append(spritepack.image_entry(f"images/{name}", {"x": x, "y": y}))
        files[f"images/{name}"] = path

    # 0: preview.
    add("preview.png", surface_tile(material, 0x0F, queue), -32, 0)

    for offset in range(51):
        if 16 <= offset <= 19:
            indices = slope_tile(material, offset - 16, queue)
            add(f"s{offset:02d}.png", indices, -32, -SLOPE_RISE)
        else:
            connections = table.get(offset, 0x0F)
            add(f"s{offset:02d}.png", surface_tile(material, connections, queue), -32, 0)

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "footpath_surface",
        "properties": {"flags": ["isQueue"] if queue else []},
        "strings": {"name": {"en-GB": name}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size}


def build_railings(work: str) -> dict:
    """Edging, supports and bridge deck for every path."""
    identifier = "sunrise.footpath_railings.metal"
    rail = world_palette.MATERIALS["railing"]
    support = world_palette.MATERIALS["support"]
    stage = os.path.join(work, "railings")
    os.makedirs(stage, exist_ok=True)
    images: List[dict] = []
    files: Dict[str, str] = {}

    def add(name: str, indices: np.ndarray, x: int, y: int) -> None:
        path = os.path.join(stage, name)
        spritepack.write_indexed_png(path, indices)
        images.append(spritepack.image_entry(f"images/{name}", {"x": x, "y": y}))
        files[f"images/{name}"] = path

    mask = diamond_mask()
    rail_ramp = rail.colours
    support_ramp = support.colours

    def railing_for(edges: int) -> np.ndarray:
        """A low rail along each open side, with a post at each end."""
        canvas = np.zeros((TILE_H + 10, TILE_W), dtype=np.uint8)
        for edge in range(4):
            if edges & (1 << edge):
                continue
            band = edge_band(mask, edge, thickness=2)
            ys, xs = np.nonzero(band)
            if len(ys) == 0:
                continue
            for dy, shade in ((8, 2), (5, 0), (4, 4)):
                canvas[np.clip(ys + 10 - dy, 0, canvas.shape[0] - 1), xs] = rail_ramp[
                    max(0, min(len(rail_ramp) - 1, rail.base + shade))]
        return canvas

    def support_column(height_steps: int) -> np.ndarray:
        canvas = np.zeros((16 * height_steps + 8, 12), dtype=np.uint8)
        canvas[:, 3:9] = support_ramp[support.base]
        canvas[:, 3:5] = support_ramp[max(0, support.base - 2)]
        canvas[:, 7:9] = support_ramp[min(len(support_ramp) - 1, support.base + 2)]
        return canvas

    # 0: preview.
    add("preview.png", railing_for(0x00), -32, -10)
    # 1..27: edging for each connection combination, repeated to fill the block the
    # engine indexes with an offset of up to 27.
    for offset in range(27):
        add(f"r{offset:02d}.png", railing_for(offset & 0x0F), -32, -10)
    # 28..35: the eight pieces drawn at the corners of an elevated path.
    for offset in range(27, 35):
        add(f"r{offset:02d}.png", support_column(1), -6, -24)
    # 36..73: the bridge deck a path sits on when elevated, then its slopes.
    for offset in range(35, RAILINGS_IMAGES - 1):
        if 51 <= offset <= 54:
            deck = slope_tile(support, offset - 51, False)
            add(f"r{offset:02d}.png", deck, -32, -SLOPE_RISE)
        else:
            # The deck a path sits on when elevated. Planked across its short axis so
            # it reads as a structure rather than as a slab of the path colour.
            deck = paint_surface(support, mask, False)
            height, width = deck.shape
            ys, xs = np.mgrid[0:height, 0:width]
            cx, cy = (width - 1) / 2.0, (height - 1) / 2.0
            u = (xs - cx) / cx
            v = (ys - cy) / cy
            planks = mask & ((((u - v) * 6).astype(np.int32) % 2) == 0)
            deck[planks] = support_ramp[max(0, support.base - 2)]
            add(f"r{offset:02d}.png", deck, -32, 0)

    object_json = {
        "id": identifier,
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "footpath_railings",
        "properties": {
            "supportType": "box",
            "colour": "grey",
            "scrollingMode": 0,
            "flags": [],
        },
        "strings": {"name": {"en-GB": "Painted Metal"}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{identifier}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": identifier, "images": len(images), "bytes": size}


SURFACES = [
    ("paved", "sunrise.footpath_surface.paved", "Paved Path", "path_paved", False),
    ("stone", "sunrise.footpath_surface.stone", "Stone Path", "path_stone", False),
    ("wood", "sunrise.footpath_surface.wood", "Wooden Path", "path_wood", False),
    ("queue", "sunrise.footpath_surface.queue", "Queue Line", "path_queue", True),
]


def main() -> None:
    table = connection_table()
    os.makedirs(OBJECTS, exist_ok=True)
    work = tempfile.mkdtemp(prefix="ridemere-paths-")
    try:
        for key, identifier, name, material, queue in SURFACES:
            info = build_surface(key, identifier, name, material, queue, table, work)
            if info["images"] != SURFACE_IMAGES:
                raise SystemExit(f"{identifier}: {info['images']} images, expected {SURFACE_IMAGES}")
            print(f"{info['id']}: {info['images']} images, {info['bytes'] / 1024:.1f} KiB")
        info = build_railings(work)
        if info["images"] != RAILINGS_IMAGES:
            raise SystemExit(f"{info['id']}: {info['images']} images, expected {RAILINGS_IMAGES}")
        print(f"{info['id']}: {info['images']} images, {info['bytes'] / 1024:.1f} KiB")
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
