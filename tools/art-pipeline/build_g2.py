"""Build our own g2.dat, replacing the OpenRCT2 branding inside it.

    .cache/venv/bin/python tools/art-pipeline/build_g2.py

g2.dat is OpenRCT2's own interface sprite table, which we otherwise ship unchanged
because it is open content and it is not the identity of the product. Three entries in
it are: the OpenRCT2 logo, its wordmark, and the dithered monochrome variant used on
the title screen. A product called Ridemere cannot show them.

Everything else in the table is copied through byte for byte. Only the branding moves.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402
from build_ui_sprites import Canvas  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GXC = os.path.join(REPO, ".cache", "tools", "gxc")
G2_RESOURCES = os.path.join(REPO, "engine", "openrct2", "resources", "g2")
OUT_DIR = os.path.join(REPO, "assets", "generated", "base")

#: Entries whose file name contains any of these carry OpenRCT2 branding.
BRANDING = ("logo.png", "logo_text.png", "logo_mono_dithered.png")

INK = pal.ramp("grey")[1]
ACCENT = pal.ramp("orange")[8]
ACCENT_DARK = pal.ramp("orange")[4]
PAPER = pal.ramp("grey")[10]


def mark(width: int, height: int) -> np.ndarray:
    """A placeholder Ridemere mark: a stylised lift hill over a warm disc.

    Typographic branding is deliberately left to the web shell, where a real typeface
    can be used. This exists so the title screen shows something of ours rather than
    someone else's logo, and it is meant to be replaced when the name is cleared.
    """
    canvas = Canvas(width, height)
    cx, cy = width / 2, height / 2
    radius = min(width, height) * 0.42
    canvas.disc(cx, cy, radius, ACCENT_DARK)
    canvas.disc(cx, cy, radius - max(2, radius * 0.08), ACCENT)

    # A rising track with two supports, read as a lift hill at any size.
    left, right = int(cx - radius * 0.62), int(cx + radius * 0.62)
    bottom, top = int(cy + radius * 0.34), int(cy - radius * 0.40)
    thickness = max(2, int(radius * 0.11))
    canvas.line(left, bottom, right, top, INK, width=thickness)
    for fraction in (0.30, 0.62, 0.94):
        x = int(left + (right - left) * fraction)
        y = int(bottom + (top - bottom) * fraction)
        canvas.rect(x, y, x + thickness - 1, bottom + int(radius * 0.22), INK)
    canvas.rect(left, bottom + int(radius * 0.22), right, bottom + int(radius * 0.22) + thickness - 1, INK)
    return canvas.pixels


def build() -> dict:
    if not os.path.exists(GXC):
        raise SystemExit(f"gxc not found at {GXC}; see wasm/scripts/build-assets.sh")

    with open(os.path.join(G2_RESOURCES, "sprites.json"), "r", encoding="utf-8") as handle:
        entries = json.load(handle)

    work = tempfile.mkdtemp(prefix="ridemere-g2-")
    try:
        replaced = 0
        out_entries = []
        for index, entry in enumerate(entries):
            source_rel = entry["path"]
            source_abs = os.path.join(G2_RESOURCES, source_rel)
            staged = os.path.join(work, f"s{index:05d}.png")
            name = os.path.basename(source_rel)

            if name in BRANDING:
                with Image.open(source_abs) as handle:
                    width, height = handle.size
                spritepack.write_indexed_png(staged, mark(width, height))
                replaced += 1
            else:
                with Image.open(source_abs) as handle:
                    if handle.mode == "P":
                        shutil.copy(source_abs, staged)
                    else:
                        rgba = np.array(handle.convert("RGBA"))
                        indexed = np.zeros(rgba.shape[:2], dtype=np.uint8)
                        for y in range(rgba.shape[0]):
                            for x in range(rgba.shape[1]):
                                if rgba[y, x, 3] >= 128:
                                    indexed[y, x] = pal.nearest_index(tuple(rgba[y, x, :3]))
                        spritepack.write_indexed_png(staged, indexed)

            out = dict(entry)
            out["path"] = os.path.basename(staged)
            out_entries.append(out)

        spec = os.path.join(work, "sprites.json")
        with open(spec, "w", encoding="utf-8") as handle:
            json.dump(out_entries, handle)

        os.makedirs(OUT_DIR, exist_ok=True)
        archive = os.path.join(OUT_DIR, "g2.dat")
        result = subprocess.run([GXC, "-q", "build", archive, spec], capture_output=True, text=True)
        if result.returncode != 0:
            raise SystemExit(f"gxc failed: {result.stderr[-2000:]}")
        return {"entries": len(out_entries), "replaced": replaced,
                "bytes": os.path.getsize(archive), "path": archive}
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    info = build()
    print(f"g2: {info['entries']} entries, {info['replaced']} branding sprites replaced, "
          f"{info['bytes'] / 1e3:.1f} KB -> {os.path.relpath(info['path'], REPO)}")
