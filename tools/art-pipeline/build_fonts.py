"""Build the Ridemere sprite font (fonts.dat).

    .cache/venv/bin/python tools/art-pipeline/build_fonts.py

The browser build compiles TrueType support out (`DISABLE_TTF`), so every character
the game draws is a sprite. The engine addresses those sprites by position in a fixed
table of 1,053 entries across three styles, and measures string widths from the sprite
dimensions, so the table's ordering and each glyph's box are part of the engine's
layout maths rather than ours to choose freely.

This renders our own glyphs into **exactly the boxes upstream uses**, reading the
ordering and the per-entry offsets from the engine's own `resources/fonts/sprites.json`.
Keeping the metrics identical means no window in the game can overflow or reflow: only
the letterforms change.

Glyph pixels are palette indices with fixed meanings, which upstream uses for a
three-tone bevel:

    1  the letter itself
    2  a light bevel on the upper left
    3  a shadow on the lower right

Ridemere draws flat letters with a shadow and no bevel: index 1 for the body and
index 3 offset down and right. That is the single biggest change in how the game reads,
it costs nothing, and the shadow is what keeps text legible over bright terrain.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Dict, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GXC = os.path.join(REPO, ".cache", "tools", "gxc")
FONT_RESOURCES = os.path.join(REPO, "engine", "openrct2", "resources", "fonts")
OUT_DIR = os.path.join(REPO, "assets", "generated", "base")

#: The typeface. Liberation Sans is licensed under the SIL Open Font License 1.1, which
#: permits rendering it into a bitmap font and shipping that commercially. It was chosen
#: for legibility at these sizes rather than for character: at nine to eleven pixels,
#: unambiguous numerals and open counters matter far more than personality.
FACE_REGULAR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FACE_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

#: Per style: the face, the pixel size, and where the baseline sits in the glyph box.
#: Tuned so the rendered cap height matches the box upstream reserved for it.
STYLES: Dict[str, Tuple[str, int, int]] = {
    "tiny": (FACE_REGULAR, 8, 6),
    "small": (FACE_REGULAR, 11, 8),
    "bold": (FACE_BOLD, 11, 8),
}

BODY = 1
SHADOW = 3

GLYPH_NAME = re.compile(r"U\+([0-9A-Fa-f]{4,6})-(tiny|small|bold)\.png$")


def render_glyph(codepoint: int, style: str, box: Tuple[int, int], box_offset_y: int = 0) -> np.ndarray:
    """Draw one character into a box of exactly the upstream size and position.

    `box_offset_y` is the entry's own vertical offset from the text origin. Glyphs such
    as the comma are stored in a short box pushed down the line, so the baseline inside
    the box is that much higher. Ignoring it silently renders those glyphs outside their
    box, which is how the comma disappeared on the first attempt.
    """
    face, size, baseline = STYLES[style]
    width, height = box
    font = ImageFont.truetype(face, size)

    # Render large enough to measure, with antialiasing off: a grey pixel is useless
    # when the output has three colours.
    canvas = Image.new("1", (width * 4 + 16, height * 4 + 16), 0)
    draw = ImageDraw.Draw(canvas)
    draw.fontmode = "1"
    draw.text((4, 4), chr(codepoint), font=font, fill=1)
    pixels = np.array(canvas, dtype=bool)

    # Pillow draws from the top of the ascender box, so the baseline of what was just
    # drawn sits at 4 + ascent. Anchors are not relied on here because they are not
    # honoured for every face and a silent fallback clips every glyph in half.
    ascent, _ = font.getmetrics()
    origin_y = 4 + ascent
    baseline = baseline - box_offset_y
    out = np.zeros((height, width), dtype=np.uint8)
    ys, xs = np.nonzero(pixels)
    if len(ys) == 0:
        return out  # space and other blank glyphs

    for y, x in zip(ys, xs):
        ty = y - origin_y + baseline
        tx = x - 4
        if 0 <= ty < height and 0 <= tx < width:
            out[ty, tx] = BODY

    # A one-pixel shadow down and to the right, only where the body is not.
    shadow = np.zeros_like(out)
    shadow[1:, 1:] = out[:-1, :-1]
    out[(shadow == BODY) & (out == 0)] = SHADOW
    return out


def build() -> dict:
    if not os.path.exists(GXC):
        raise SystemExit(f"gxc not found at {GXC}; see wasm/scripts/build-assets.sh")
    for face in {FACE_REGULAR, FACE_BOLD}:
        if not os.path.exists(face):
            raise SystemExit(f"font not found: {face}")

    manifest_path = os.path.join(FONT_RESOURCES, "sprites.json")
    with open(manifest_path, "r", encoding="utf-8") as handle:
        entries = json.load(handle)

    work = tempfile.mkdtemp(prefix="ridemere-fonts-")
    try:
        produced = 0
        reused = 0
        out_entries = []
        for index, entry in enumerate(entries):
            source_rel = entry["path"]
            source_abs = os.path.join(FONT_RESOURCES, source_rel)
            with Image.open(source_abs) as handle:
                box = handle.size

            match = GLYPH_NAME.search(source_rel)
            staged = os.path.join(work, f"g{index:05d}.png")
            if match is not None:
                codepoint = int(match.group(1), 16)
                style = match.group(2)
                spritepack.write_indexed_png(
                    staged, render_glyph(codepoint, style, box, int(entry.get("y", 0))))
                produced += 1
            else:
                # Entries that are not a codepoint: the empty placeholder, and symbols
                # upstream ships as hand-made art such as the ellipsis and the eye.
                # Keep those; they are open content and redrawing them buys nothing.
                # Normalise to an indexed image, because some are stored as RGBA and
                # the packer only accepts eight-bit depth.
                with Image.open(source_abs) as handle:
                    if handle.mode == "P":
                        indexed = np.array(handle, dtype=np.uint8)
                    else:
                        rgba = np.array(handle.convert("RGBA"))
                        indexed = np.where(rgba[:, :, 3] >= 128, BODY, 0).astype(np.uint8)
                spritepack.write_indexed_png(staged, indexed)
                reused += 1

            out = {"path": os.path.basename(staged), "palette": "keep", "format": "raw"}
            for key in ("x", "y"):
                if key in entry:
                    out[key] = entry[key]
            out_entries.append(out)

        spec = os.path.join(work, "sprites.json")
        with open(spec, "w", encoding="utf-8") as handle:
            json.dump(out_entries, handle)

        os.makedirs(OUT_DIR, exist_ok=True)
        archive = os.path.join(OUT_DIR, "fonts.dat")
        result = subprocess.run([GXC, "-q", "build", archive, spec], capture_output=True, text=True)
        if result.returncode != 0:
            raise SystemExit(f"gxc failed: {result.stderr[-2000:]}")

        return {
            "entries": len(out_entries),
            "rendered": produced,
            "reusedOpenArt": reused,
            "bytes": os.path.getsize(archive),
            "path": archive,
        }
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    info = build()
    print(
        f"fonts: {info['entries']} entries, {info['rendered']} rendered, "
        f"{info['reusedOpenArt']} kept from open art, {info['bytes'] / 1e3:.1f} KB "
        f"-> {os.path.relpath(info['path'], REPO)}"
    )
