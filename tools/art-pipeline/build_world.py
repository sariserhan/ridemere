"""Build Project Sunrise world objects (terrain surfaces) from Blender renders.

    .cache/venv/bin/python tools/art-pipeline/build_world.py

A terrain_surface object's image table is (TerrainSurfaceObject.cpp:23-36):

    0                icon
    1 + 19*n + s     entry n, slope variant s (s = 0..18)

with no smoothing patterns when smoothWithSelf/Other are off. Three entries are
needed: normal, grid and underground. We render the 19 slopes once and derive the
grid and underground entries from them here, so 19 renders produce 58 images.
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402
import world_palette  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RENDER_DIR = os.path.join(REPO, "assets", "generated", "world", "terrain")
STAGE = os.path.join(REPO, "assets", "generated", "staging", "world")
OBJECTS = os.path.join(REPO, "assets", "generated", "objects")

#: The four ground materials. Their colour and texture come from the shared world
#: palette, so a material cannot drift between the generator that draws the ground and
#: the one that draws what sits on it.
#:
#: `render` names which set of slope renders to read. The renders are geometry: the
#: same nineteen shapes serve every material, and what distinguishes sand from stone is
#: the ramp and the breakup applied here, not another few hundred renders.
SURFACES = {
    "grass": {
        "id": "sunrise.terrain_surface.grass",
        "name": "Grass",
        "colour": "SATURATED_GREEN",
        "material": "grass",
        "render": "grass",
    },
    "dirt": {
        "id": "sunrise.terrain_surface.dirt",
        "name": "Dirt",
        "colour": "DARK_BROWN",
        "material": "dirt",
        "render": "dirt",
    },
    "sand": {
        "id": "sunrise.terrain_surface.sand",
        "name": "Sand",
        "colour": "LIGHT_BROWN",
        "material": "sand",
        "render": "dirt",
    },
    "stone": {
        "id": "sunrise.terrain_surface.stone",
        "name": "Stone",
        "colour": "GREY",
        "material": "stone",
        "render": "dirt",
    },
}


def _load_indexed(path: str) -> np.ndarray:
    with Image.open(path) as handle:
        return np.array(handle.convert("P"))


def _darken(indices: np.ndarray, ramp: list) -> np.ndarray:
    """Underground view: same shape, pushed to the dark end of its ramp."""
    out = indices.copy()
    lookup = {value: ramp[max(0, position - 2)] for position, value in enumerate(ramp)}
    for source, target in lookup.items():
        out[indices == source] = target
    return out


def _add_grid(indices: np.ndarray, ramp: list) -> np.ndarray:
    """Grid view: outline the tile edges so the land tool's grid is visible."""
    out = indices.copy()
    filled = indices != 0
    edge = np.zeros_like(filled)
    edge[:-1, :] |= filled[:-1, :] & ~filled[1:, :]
    edge[1:, :] |= filled[1:, :] & ~filled[:-1, :]
    edge[:, :-1] |= filled[:, :-1] & ~filled[:, 1:]
    edge[:, 1:] |= filled[:, 1:] & ~filled[:, :-1]
    out[edge & filled] = ramp[-2]
    return out


def _apply_texture(indices: np.ndarray, material: world_palette.Material, reference_base: float) -> np.ndarray:
    """Give a shaded tile its material character.

    The render supplies form: which parts of the tile face the light. This supplies
    material: the breakup that makes grass read as grass and sand as sand. It moves a
    pixel along its own ramp rather than recolouring it, so the lighting the render
    established survives.
    """
    ramp = material.colours
    filled = indices != 0
    positions = np.zeros(indices.shape, dtype=np.float32)
    for step, value in enumerate(ramp):
        positions[indices == value] = step
    # Geometry renders contain Monte Carlo noise, not a terrain material. Smooth the
    # lighting with an alpha-weighted kernel before quantising it; transparent pixels
    # must not create dark seams around the tile diamond.
    def blurred(values):
        return np.asarray(Image.fromarray(np.uint8(np.clip(values, 0, 255))).filter(ImageFilter.GaussianBlur(1.5)), dtype=np.float32)
    weight = blurred(filled.astype(np.float32) * 255)
    lighting = blurred(positions * 20) / np.maximum(weight / 255, .001) / 20
    # Calibrate against the rendered flat tile rather than assuming its exposure.
    # Keep slope shading in a narrow range so terrain recedes behind park objects.
    variation = np.clip(np.round((lighting - reference_base) * .65), -2, 1)
    steps = np.clip(material.base + variation + world_palette.texture(material, *indices.shape), 0, len(ramp) - 1).astype(np.int32)
    out = np.zeros_like(indices)
    out[filled] = np.asarray(ramp, dtype=np.uint8)[steps[filled]]
    return out


def build_surface(key: str, spec: dict, manifest: dict) -> dict:
    stage_dir = os.path.join(STAGE, key)
    os.makedirs(stage_dir, exist_ok=True)
    render_size = manifest["renderSize"]
    material = world_palette.MATERIALS[spec["material"]]
    ramp = material.colours
    # terrain.py tags grass as "foliage" and dirt as "structure"; those directions
    # are read back by the classifier as "shirt" and "skin" respectively.
    colourway = dict(spritepack.WORLD_COLOURWAY)
    colourway["shirt"] = ramp
    colourway["skin"] = ramp

    images: list = []
    files: dict = {}
    slope_files = manifest["surfaces"][spec["render"]]

    # The icon: reuse the flat tile.
    def stage(name: str, indices: np.ndarray, x: int, y: int) -> None:
        path = os.path.join(stage_dir, name)
        spritepack.write_indexed_png(path, indices)
        images.append(spritepack.image_entry(f"images/{name}", {"x": x, "y": y}))
        files[f"images/{name}"] = path

    base_entries = []
    for offset, file_name in enumerate(slope_files):
        source = os.path.join(RENDER_DIR, file_name)
        staged = os.path.join(stage_dir, f"n{offset:02d}.png")
        rect = spritepack.convert_render(source, staged, colourway, render_size, 0.0)
        base_entries.append((staged, rect))

    flat = _load_indexed(base_entries[0][0])
    positions = {value: index for index, value in enumerate(ramp)}
    reference_base = float(np.median([positions[int(value)] for value in flat[flat != 0]]))
    icon_indices = _apply_texture(flat, material, reference_base)
    stage("icon.png", icon_indices, 2, 2)

    for variant in ("normal", "grid", "underground"):
        for offset, (staged, rect) in enumerate(base_entries):
            indices = _apply_texture(_load_indexed(staged), material, reference_base)
            if variant == "grid":
                indices = _add_grid(indices, ramp)
            elif variant == "underground":
                indices = _darken(indices, ramp)
            stage(f"{variant}{offset:02d}.png", indices, rect["x"], rect["y"])

    object_json = {
        "id": spec["id"],
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "terrain_surface",
        "properties": {
            "colour": spec["colour"],
            "price": 0,
            "flags": [],
            "default": {"normal": 0, "grid": 1, "underground": 2},
        },
        "strings": {"name": {"en-GB": spec["name"]}},
        "images": images,
    }
    path = os.path.join(OBJECTS, f"{spec['id']}.parkobj")
    size = spritepack.write_parkobj(path, object_json, files)
    return {"id": spec["id"], "images": len(images), "bytes": size}


def main() -> None:
    with open(os.path.join(RENDER_DIR, "frames.json"), "r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    for key, spec in SURFACES.items():
        result = build_surface(key, spec, manifest)
        print(f"{result['id']}: {result['images']} images, {result['bytes'] / 1024:.1f} KiB")


if __name__ == "__main__":
    main()
