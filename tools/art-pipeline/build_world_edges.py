"""Build the Ridemere terrain edge family.

    .cache/venv/bin/python tools/art-pipeline/build_world_edges.py

A terrain edge object supplies the vertical faces the engine draws wherever land is
cut: the map boundary, a raised plateau, a cliff between two heights. Without one the
map ends in a black void, which reads as missing art rather than as an edge.

The engine addresses these by position: an icon, then eighty-four sprites whose
meaning is fixed by offset (Paint.Surface.cpp). Four wall variants at offsets 0, 10,
20 and 30, then twelve tunnel types of four sprites each from offset 36. Their shapes
are not a choice: each is the silhouette of a tile side face under the isometric
projection, at a particular slope and height.

Rather than reinvent those eighty-four silhouettes, this reads them from the open
`official.terrain_edge.void` object, which contains no art at all: every sprite in it
is a single flat palette index, a pure mask. The geometry comes from there, with
attribution; every pixel we ship is drawn here.
"""

from __future__ import annotations

import io
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import world_palette  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GXC = os.path.join(REPO, ".cache", "tools", "gxc")
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")
REFERENCE = os.path.join(REPO, ".cache", "assets", "objects.zip")
REFERENCE_ENTRY = "official/terrain_edge/official.terrain_edge.void.parkobj"

OBJECT_ID = "sunrise.terrain_edge.rock"
OBJECT_NAME = "Rock"

#: The number of sprites after the icon, fixed by the engine's offset table.
EXPECTED_EDGE_SPRITES = 84


def read_reference(work: str) -> Tuple[List[Tuple[int, int, int, int]], str]:
    """Export the reference masks, returning per-sprite geometry and their directory."""
    with zipfile.ZipFile(REFERENCE) as outer:
        inner = zipfile.ZipFile(io.BytesIO(outer.read(REFERENCE_ENTRY)))
        blob = inner.read("images.dat")
    dat = os.path.join(work, "reference.dat")
    with open(dat, "wb") as handle:
        handle.write(blob)

    count, _ = struct.unpack_from("<II", blob, 0)
    geometry = []
    for index in range(count):
        _, width, height, x_off, y_off, _, _ = struct.unpack_from("<IHHhhHI", blob, 8 + index * 16)
        geometry.append((width, height, x_off, y_off))

    out = os.path.join(work, "reference")
    result = subprocess.run([GXC, "-q", "exportall", dat, out], capture_output=True, text=True)
    if result.returncode != 0:
        raise SystemExit(f"could not export the reference masks: {result.stderr[-500:]}")
    return geometry, out


def cliff_face(mask: np.ndarray, faces_right: bool, top_offset: int) -> np.ndarray:
    """Paint a cut earth face into a silhouette.

    Warm soil under a darker rock band, lit from the upper left so the two sides of a
    corner read as different planes. Understated on purpose: an edge is the frame
    around the park, and it appears wherever land is cut, so it must not attract the
    eye the way a ride does.
    """
    material = world_palette.MATERIALS["cliff"]
    ramp = material.colours
    height, width = mask.shape
    out = np.zeros_like(mask, dtype=np.uint8)

    # A face turned away from the light sits two steps darker.
    base = material.base + (2 if faces_right else 0)

    rows = np.arange(height).reshape(-1, 1) + top_offset
    # Soil lightens slightly towards the top where light catches the cut, and the
    # bottom darkens into shadow.
    gradient = np.where(rows < 4, -1, np.where(rows > height - 6, 1, 0))

    # Horizontal strata, so a tall cut does not read as one flat slab.
    strata = ((rows // 5) % 2) * 1

    breakup = world_palette.texture(material, height, width, seed=7)
    step = np.clip(base + gradient + strata + breakup, 0, len(ramp) - 1)
    painted = np.asarray(ramp, dtype=np.uint8)[step]

    filled = mask != 0
    out[filled] = painted[filled]

    # A one-pixel lip along the top of the cut, which is what makes an edge read as an
    # edge rather than as a wall.
    lip = filled & ~np.roll(filled, 1, axis=0)
    lip[0, :] = filled[0, :]
    out[lip] = ramp[max(0, base - 3)]
    return out


def build() -> dict:
    if not os.path.exists(GXC):
        raise SystemExit(f"gxc not found at {GXC}")
    if not os.path.exists(REFERENCE):
        raise SystemExit(f"reference objects not found at {REFERENCE}")

    work = tempfile.mkdtemp(prefix="ridemere-edges-")
    try:
        geometry, reference_dir = read_reference(work)
        if len(geometry) != EXPECTED_EDGE_SPRITES + 1:
            raise SystemExit(
                f"the reference edge object has {len(geometry)} sprites, expected "
                f"{EXPECTED_EDGE_SPRITES + 1}; the engine layout may have changed")

        stage = os.path.join(work, "images")
        os.makedirs(stage, exist_ok=True)
        images: List[dict] = []
        files: Dict[str, str] = {}

        for index, (width, height, x_off, y_off) in enumerate(geometry):
            source = os.path.join(reference_dir, f"{index:05d}.png")
            with Image.open(source) as handle:
                mask = np.array(handle)

            if index == 0:
                # The icon shown in the land tool: a small block of the material.
                icon = np.zeros((32, 32), dtype=np.uint8)
                icon[:, :] = 0
                block = cliff_face(np.ones((24, 24), dtype=np.uint8), False, 0)
                icon[4:28, 4:28] = block
                painted = icon
                x_off, y_off = 2, 2
            else:
                # Sprites drawn on the left of the tile centre face one way; those
                # drawn to the right face the other. The offset is what distinguishes
                # them, and it is the only signal available without reimplementing the
                # engine's slope tables.
                faces_right = x_off < -16
                painted = cliff_face(mask, faces_right, max(0, -y_off))

            name = f"edge{index:03d}.png"
            path = os.path.join(stage, name)
            spritepack.write_indexed_png(path, painted)
            images.append({"path": f"images/{name}", "x": int(x_off), "y": int(y_off),
                           "palette": "keep", "format": "rle"})
            files[f"images/{name}"] = path

        object_json = {
            "id": OBJECT_ID,
            "authors": ["Project Sunrise"],
            "version": "1.0",
            "sourceGame": "custom",
            "objectType": "terrain_edge",
            "properties": {"hasDoors": False},
            "strings": {"name": {"en-GB": OBJECT_NAME}},
            "images": images,
        }
        os.makedirs(OBJECTS, exist_ok=True)
        path = os.path.join(OBJECTS, f"{OBJECT_ID}.parkobj")
        size = spritepack.write_parkobj(path, object_json, files)
        return {"id": OBJECT_ID, "images": len(images), "bytes": size}
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    info = build()
    print(f"{info['id']}: {info['images']} images, {info['bytes'] / 1024:.1f} KiB")
