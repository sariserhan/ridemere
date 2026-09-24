"""Draw original replacements for the base interface sprites the game asks for.

    .cache/venv/bin/python tools/art-pipeline/build_ui_sprites.py

The base sprite archive is mostly diagnostic markers. The in-game sprite audit named
the entries the supported gameplay path actually requests, and nearly all of them are
interface chrome: toolbar buttons, window tabs, the weather icon and the park rating
gauge. This draws simple original icons for those entries so the game is legible and
the audit is quiet.

These are prototype icons: flat, geometric, readable at 24 px, and drawn from shapes
in code. Nothing is traced from or modelled on another game's artwork.

Output: assets/generated/ui/*.png plus ui-sprites.json mapping base index -> file,
which build_base_archive.py reads.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Callable, Dict, List, Tuple

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(REPO, "assets", "generated", "ui")

SIZE = 24

# A small, consistent palette for the icon set.
INK = pal.ramp("grey")[1]
EDGE = pal.ramp("grey")[4]
PAPER = pal.ramp("grey")[10]
ACCENT = pal.ramp("orange")[7]
ACCENT_DARK = pal.ramp("orange")[3]
GREEN = pal.ramp("green")[7]
GREEN_DARK = pal.ramp("green")[3]
BLUE = pal.ramp("blue")[7]
SKIN = pal.ramp("skin")[8]
SUN = pal.ramp("orange")[9]
RED = pal.ramp("red")[7]
BROWN = pal.ramp("tan")[4]


class Canvas:
    """A tiny indexed drawing surface; index 0 is transparent."""

    def __init__(self, width: int = SIZE, height: int = SIZE):
        self.pixels = np.zeros((height, width), dtype=np.uint8)

    def rect(self, x0: int, y0: int, x1: int, y1: int, colour: int) -> None:
        self.pixels[max(y0, 0): y1 + 1, max(x0, 0): x1 + 1] = colour

    def outline(self, x0: int, y0: int, x1: int, y1: int, colour: int) -> None:
        self.rect(x0, y0, x1, y0, colour)
        self.rect(x0, y1, x1, y1, colour)
        self.rect(x0, y0, x0, y1, colour)
        self.rect(x1, y0, x1, y1, colour)

    def disc(self, cx: float, cy: float, radius: float, colour: int) -> None:
        ys, xs = np.ogrid[: self.pixels.shape[0], : self.pixels.shape[1]]
        mask = (xs - cx) ** 2 + (ys - cy) ** 2 <= radius * radius
        self.pixels[mask] = colour

    def ring(self, cx: float, cy: float, outer: float, inner: float, colour: int) -> None:
        ys, xs = np.ogrid[: self.pixels.shape[0], : self.pixels.shape[1]]
        distance = (xs - cx) ** 2 + (ys - cy) ** 2
        mask = (distance <= outer * outer) & (distance >= inner * inner)
        self.pixels[mask] = colour

    def triangle(self, apex: Tuple[int, int], half_width: int, height: int, colour: int) -> None:
        for step in range(height):
            span = int(half_width * step / max(height - 1, 1))
            y = apex[1] + step
            self.rect(apex[0] - span, y, apex[0] + span, y, colour)

    def line(self, x0: int, y0: int, x1: int, y1: int, colour: int, width: int = 1) -> None:
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for step in range(steps + 1):
            x = round(x0 + (x1 - x0) * step / steps)
            y = round(y0 + (y1 - y0) * step / steps)
            self.rect(x, y, x + width - 1, y + width - 1, colour)


def _button(fill: int = PAPER) -> Canvas:
    canvas = Canvas()
    canvas.rect(2, 2, 21, 21, fill)
    canvas.outline(2, 2, 21, 21, EDGE)
    return canvas


def icon_pause() -> Canvas:
    canvas = _button()
    canvas.rect(8, 7, 10, 16, INK)
    canvas.rect(13, 7, 15, 16, INK)
    return canvas


def icon_file() -> Canvas:
    canvas = _button()
    canvas.rect(7, 5, 16, 18, pal.ramp("grey")[11])
    canvas.outline(7, 5, 16, 18, INK)
    for row in (8, 11, 14):
        canvas.rect(9, row, 14, row, EDGE)
    return canvas


def _magnifier(sign: int) -> Canvas:
    canvas = _button()
    canvas.ring(10, 10, 6, 4, INK)
    canvas.line(14, 14, 18, 18, INK, 2)
    canvas.rect(7, 9, 13, 10, INK)
    if sign > 0:
        canvas.rect(9, 7, 10, 13, INK)
    return canvas


def icon_zoom_in() -> Canvas:
    return _magnifier(1)


def icon_zoom_out() -> Canvas:
    return _magnifier(-1)


def icon_rotate() -> Canvas:
    canvas = _button()
    canvas.ring(12, 12, 7, 5, ACCENT)
    canvas.rect(12, 3, 21, 9, PAPER)
    canvas.triangle((14, 4), 4, 6, ACCENT_DARK)
    return canvas


def icon_land() -> Canvas:
    canvas = _button()
    canvas.rect(3, 14, 20, 19, BROWN)
    canvas.triangle((11, 6), 8, 9, GREEN)
    return canvas


def icon_water() -> Canvas:
    canvas = _button()
    for index, row in enumerate((9, 13, 17)):
        offset = 2 if index % 2 else 0
        canvas.rect(4 + offset, row, 13 + offset, row + 1, BLUE)
        canvas.rect(14 + offset, row + 1, 19, row + 2, BLUE)
    return canvas


def _tree(canvas: Canvas) -> Canvas:
    canvas.rect(11, 14, 13, 19, BROWN)
    canvas.disc(12, 10, 6, GREEN)
    canvas.disc(10, 9, 3, pal.ramp("green")[9])
    return canvas


def icon_scenery() -> Canvas:
    return _tree(_button())


def icon_clear_scenery() -> Canvas:
    canvas = _tree(_button())
    canvas.line(5, 5, 19, 19, RED, 2)
    canvas.line(19, 5, 5, 19, RED, 2)
    return canvas


def icon_footpath() -> Canvas:
    canvas = _button()
    for step in range(5):
        y = 17 - step * 3
        x = 5 + step * 2
        canvas.rect(x, y, x + 8, y + 2, pal.ramp("grey")[8])
        canvas.outline(x, y, x + 8, y + 2, EDGE)
    return canvas


def _coaster(canvas: Canvas) -> Canvas:
    canvas.line(4, 18, 8, 9, ACCENT, 2)
    canvas.line(8, 9, 13, 8, ACCENT, 2)
    canvas.line(13, 8, 19, 17, ACCENT, 2)
    canvas.rect(4, 19, 19, 20, EDGE)
    return canvas


def icon_rides() -> Canvas:
    return _coaster(_button())


def icon_construct_ride() -> Canvas:
    canvas = _coaster(_button())
    canvas.rect(14, 4, 20, 6, ACCENT_DARK)
    canvas.rect(18, 4, 20, 12, ACCENT_DARK)
    return canvas


def _person(canvas: Canvas, x: int, shirt: int) -> Canvas:
    canvas.disc(x, 8, 2.6, SKIN)
    canvas.rect(x - 3, 11, x + 3, 16, shirt)
    canvas.rect(x - 3, 17, x - 1, 20, INK)
    canvas.rect(x + 1, 17, x + 3, 20, INK)
    return canvas


def icon_guests() -> Canvas:
    canvas = _button()
    _person(canvas, 8, GREEN)
    _person(canvas, 16, BLUE)
    return canvas


def icon_staff() -> Canvas:
    canvas = _button()
    _person(canvas, 12, ACCENT)
    canvas.rect(8, 5, 16, 6, ACCENT_DARK)
    canvas.rect(8, 6, 12, 7, ACCENT_DARK)
    return canvas


def icon_park() -> Canvas:
    canvas = _button()
    canvas.rect(4, 8, 6, 20, ACCENT_DARK)
    canvas.rect(17, 8, 19, 20, ACCENT_DARK)
    canvas.rect(4, 5, 19, 8, ACCENT)
    canvas.rect(9, 12, 14, 20, GREEN_DARK)
    return canvas


def icon_view() -> Canvas:
    canvas = _button()
    canvas.ring(12, 12, 8, 6, INK)
    canvas.disc(12, 12, 4, pal.ramp("grey")[11])
    canvas.disc(12, 12, 2.2, BLUE)
    return canvas


def icon_tab() -> Canvas:
    canvas = Canvas()
    canvas.rect(2, 6, 21, 21, PAPER)
    canvas.outline(2, 6, 21, 21, EDGE)
    canvas.rect(4, 3, 13, 6, pal.ramp("grey")[11])
    canvas.outline(4, 3, 13, 6, EDGE)
    return canvas


def icon_finances_tab() -> Canvas:
    canvas = icon_tab()
    canvas.rect(6, 16, 8, 19, GREEN)
    canvas.rect(10, 12, 12, 19, GREEN)
    canvas.rect(14, 9, 16, 19, GREEN)
    return canvas


def icon_weather_sun() -> Canvas:
    canvas = Canvas(16, 16)
    canvas.disc(8, 8, 4.5, SUN)
    for dx, dy in ((0, -7), (0, 7), (-7, 0), (7, 0), (5, 5), (-5, 5), (5, -5), (-5, -5)):
        canvas.rect(8 + dx - 1, 8 + dy - 1, 8 + dx, 8 + dy, SUN)
    return canvas


def _gauge(colour: int) -> Canvas:
    canvas = Canvas(12, 12)
    canvas.rect(2, 3, 9, 8, colour)
    canvas.outline(2, 3, 9, 8, INK)
    return canvas


def icon_rating_low() -> Canvas:
    return _gauge(RED)


def icon_rating_high() -> Canvas:
    return _gauge(GREEN)


def icon_weather_cloud() -> Canvas:
    canvas = Canvas(16, 16)
    canvas.disc(6, 9, 3.4, PAPER)
    canvas.disc(10, 9, 4.0, PAPER)
    canvas.disc(8, 6.5, 3.2, PAPER)
    canvas.rect(3, 9, 13, 12, PAPER)
    return canvas


def icon_next_weather() -> Canvas:
    canvas = Canvas(16, 16)
    canvas.disc(6, 8, 3.6, SUN)
    canvas.disc(10, 9, 3.6, PAPER)
    canvas.rect(7, 9, 13, 12, PAPER)
    return canvas


def icon_balloon() -> Canvas:
    canvas = Canvas(16, 16)
    canvas.disc(8, 6, 4.5, RED)
    canvas.line(8, 11, 8, 15, EDGE)
    return canvas


#: base sprite index -> (name, drawing function). Indices and symbol names come from
#: the in-game sprite audit cross-referenced with tools/asset-audit/out/sprite_refs.json.
def _small_face(brow: int, mouth: int, tint: int = SKIN) -> Canvas:
    """A 12 px mood face for the guest counter and peep lists.

    `mouth` runs from -3 (deeply downturned) to +3 (broadly upturned) and `brow`
    raises or lowers the eyes, which is all the expression a 12 px circle affords.
    """
    canvas = Canvas(12, 12)
    canvas.disc(5.5, 5.5, 5.2, INK)
    canvas.disc(5.5, 5.5, 4.4, tint)
    eye_y = 4 + brow
    canvas.rect(3, eye_y, 3, eye_y + 1, INK)
    canvas.rect(8, eye_y, 8, eye_y + 1, INK)
    for step in range(5):
        x = 3 + step
        bend = abs(step - 2)
        y = 8 - round(mouth * (2 - bend) / 2)
        canvas.rect(x, y, x, y, INK)
    return canvas


def face_very_very_unhappy() -> Canvas:
    return _small_face(1, -3)


def face_very_unhappy() -> Canvas:
    return _small_face(1, -2)


def face_unhappy() -> Canvas:
    return _small_face(0, -1)


def face_normal() -> Canvas:
    return _small_face(0, 0)


def face_happy() -> Canvas:
    return _small_face(0, 1)


def face_very_happy() -> Canvas:
    return _small_face(-1, 2)


def face_very_very_happy() -> Canvas:
    return _small_face(-1, 3)


def face_tired() -> Canvas:
    canvas = _small_face(1, -1)
    canvas.rect(3, 3, 4, 3, INK)
    canvas.rect(7, 3, 8, 3, INK)
    return canvas


def face_very_tired() -> Canvas:
    canvas = _small_face(2, -2)
    canvas.rect(2, 3, 4, 3, INK)
    canvas.rect(7, 3, 9, 3, INK)
    return canvas


def face_sick() -> Canvas:
    return _small_face(0, -2, GREEN)


def face_very_sick() -> Canvas:
    return _small_face(1, -3, GREEN)


def face_very_very_sick() -> Canvas:
    canvas = _small_face(1, -3, GREEN_DARK)
    canvas.rect(4, 9, 7, 10, GREEN)
    return canvas


def face_angry() -> Canvas:
    canvas = _small_face(0, -2, RED)
    canvas.line(2, 2, 4, 4, INK)
    canvas.line(9, 2, 7, 4, INK)
    return canvas


UI_SPRITES: Dict[int, Tuple[str, Callable[[], Canvas]]] = {
    # 5130 is unnamed in SpriteIds.h, sitting in the gap between the staff costume
    # icons (..5128) and the ride construction icons (5137..). It is requested a
    # handful of times while a ride window is open, so it is treated as a window tab.
    5130: ("window_tab_generic", icon_tab),
    5327: ("tab_finances_research", icon_finances_tab),
    # SPR_PEEP_SMALL_FACE_* — the mood face beside the guest counter and in peep
    # lists. The counter draws one every frame, so this is the most requested base
    # sprite the supported path touches.
    5486: ("face_very_very_unhappy", face_very_very_unhappy),
    5487: ("face_very_unhappy", face_very_unhappy),
    5488: ("face_unhappy", face_unhappy),
    5489: ("face_normal", face_normal),
    5490: ("face_happy", face_happy),
    5491: ("face_very_happy", face_very_happy),
    5492: ("face_very_very_happy", face_very_very_happy),
    5493: ("face_tired", face_tired),
    5494: ("face_very_tired", face_very_tired),
    5495: ("face_sick", face_sick),
    5496: ("face_very_sick", face_very_sick),
    5497: ("face_very_very_sick", face_very_very_sick),
    5498: ("face_angry", face_angry),
    5597: ("toolbar_pause", icon_pause),
    5599: ("toolbar_file", icon_file),
    5601: ("toolbar_zoom_out", icon_zoom_out),
    5604: ("toolbar_zoom_in", icon_zoom_in),
    5607: ("toolbar_rotate", icon_rotate),
    5609: ("toolbar_land", icon_land),
    5613: ("toolbar_guests", icon_guests),
    5615: ("toolbar_scenery", icon_scenery),
    5617: ("toolbar_water", icon_water),
    5619: ("toolbar_rides", icon_rides),
    5621: ("toolbar_view", icon_view),
    5623: ("toolbar_footpath", icon_footpath),
    5625: ("tab_toolbar", icon_tab),
    5627: ("toolbar_staff", icon_staff),
    5629: ("toolbar_park", icon_park),
    5631: ("toolbar_construct_ride", icon_construct_ride),
    5633: ("toolbar_clear_scenery", icon_clear_scenery),
    22872: ("balloon", icon_balloon),
    23189: ("next_weather", icon_next_weather),
    23190: ("weather_sun", icon_weather_sun),
    23192: ("weather_cloud", icon_weather_cloud),
    23197: ("rating_low", icon_rating_low),
    23198: ("rating_high", icon_rating_high),
}


def build() -> dict:
    os.makedirs(OUT_DIR, exist_ok=True)
    mapping: Dict[str, str] = {}
    for index, (name, draw) in sorted(UI_SPRITES.items()):
        canvas = draw()
        path = os.path.join(OUT_DIR, f"{index:05d}_{name}.png")
        spritepack.write_indexed_png(path, canvas.pixels)
        mapping[str(index)] = os.path.relpath(path, REPO)

    manifest = os.path.join(OUT_DIR, "ui-sprites.json")
    with open(manifest, "w", encoding="utf-8") as handle:
        json.dump(mapping, handle, indent=2)
    return {"count": len(mapping), "manifest": manifest}


if __name__ == "__main__":
    info = build()
    print(f"ui sprites: {info['count']} -> {os.path.relpath(info['manifest'], REPO)}")
