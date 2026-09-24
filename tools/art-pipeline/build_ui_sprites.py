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


def _cloud(canvas: Canvas, x: float, y: float, colour: int, scale: float = 1.0) -> None:
    """The shared cloud body, so every weather icon is obviously the same weather."""
    canvas.disc(x - 2 * scale, y + 1 * scale, 3.4 * scale, colour)
    canvas.disc(x + 2 * scale, y + 1 * scale, 4.0 * scale, colour)
    canvas.disc(x, y - 1.5 * scale, 3.2 * scale, colour)
    canvas.rect(int(x - 5 * scale), int(y + 1 * scale), int(x + 5 * scale), int(y + 4 * scale), colour)


def icon_weather_sun_cloud() -> Canvas:
    """SPR_WEATHER_SUN_CLOUD. The toolbar draws whichever of the seven matches the sky.

    All seven are authored, not only the two a clear day happens to use: an icon that
    is missing only when it rains is a hole the sprite audit finds intermittently,
    which is the worst kind of hole to have.
    """
    canvas = Canvas(16, 16)
    canvas.disc(5, 6, 3.6, SUN)
    _cloud(canvas, 9, 9, PAPER)
    return canvas


def _rain(canvas: Canvas, drops, colour: int) -> None:
    for x, y in drops:
        canvas.line(x, y, x - 1, y + 3, colour, width=1)


def icon_weather_light_rain() -> Canvas:
    canvas = Canvas(16, 16)
    _cloud(canvas, 8, 6, PAPER)
    _rain(canvas, ((6, 11), (10, 11)), BLUE)
    return canvas


def icon_weather_heavy_rain() -> Canvas:
    canvas = Canvas(16, 16)
    _cloud(canvas, 8, 5, EDGE)
    _rain(canvas, ((4, 10), (7, 10), (10, 10), (13, 10)), BLUE)
    return canvas


def icon_weather_storm() -> Canvas:
    canvas = Canvas(16, 16)
    _cloud(canvas, 8, 5, EDGE)
    # A bolt, not more rain: a storm has to be distinguishable from heavy rain at a
    # glance, and at sixteen pixels the only reliable difference is the silhouette.
    canvas.line(9, 9, 6, 12, SUN, width=2)
    canvas.line(6, 12, 9, 12, SUN, width=2)
    canvas.line(9, 12, 6, 15, SUN, width=2)
    _rain(canvas, ((3, 10), (13, 10)), BLUE)
    return canvas


def icon_weather_snow() -> Canvas:
    canvas = Canvas(16, 16)
    _cloud(canvas, 8, 5, PAPER)
    for x, y in ((4, 11), (8, 12), (12, 11), (6, 14), (10, 14)):
        canvas.rect(x - 1, y - 1, x, y, PAPER)
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


def _dim(canvas: Canvas) -> Canvas:
    """Grey out an icon, for the disabled variant of a toolbar button."""
    faded = Canvas(canvas.pixels.shape[1], canvas.pixels.shape[0])
    grey = pal.ramp("grey")
    lookup = {colour: grey[min(len(grey) - 1, 5 + (index % 3))]
              for index, colour in enumerate(sorted(set(canvas.pixels.flatten().tolist())))
              if colour != 0}
    for colour, replacement in lookup.items():
        faded.pixels[canvas.pixels == colour] = replacement
    return faded


def icon_zoom_out_disabled() -> Canvas:
    return _dim(icon_zoom_out())


def icon_zoom_in_disabled() -> Canvas:
    return _dim(icon_zoom_in())


def scrolling_text_default() -> Canvas:
    """The plate a banner draws instead of scrolling text when zoomed out.

    ScrollingText.cpp returns this single sprite for any banner at a zoom level above
    zero, where per-character scrolling would be illegible, so it stands in for the
    whole sign.
    """
    canvas = Canvas(64, 8)
    canvas.rect(0, 1, 63, 6, INK)
    canvas.rect(1, 2, 62, 5, EDGE)
    canvas.rect(3, 3, 60, 4, PAPER)
    return canvas


def icon_resize_grip() -> Canvas:
    """SPR_RESIZE: the grip in the bottom right corner of a resizable window."""
    canvas = Canvas(12, 12)
    for step in range(3):
        offset = step * 3
        canvas.line(2 + offset, 10, 10, 2 + offset, EDGE)
        canvas.line(2 + offset, 9, 9, 2 + offset, PAPER)
    return canvas


def _menu_button(draw_glyph) -> Canvas:
    """A title-screen menu button: a soft plate with a symbol on it."""
    canvas = Canvas(48, 48)
    canvas.rect(2, 2, 45, 45, EDGE)
    canvas.rect(3, 3, 44, 42, PAPER)
    canvas.rect(3, 43, 44, 44, EDGE)
    draw_glyph(canvas)
    return canvas


def menu_new_game() -> Canvas:
    """A park gate: what starting a new park looks like."""
    def glyph(canvas: Canvas) -> None:
        canvas.rect(11, 20, 15, 38, ACCENT_DARK)
        canvas.rect(32, 20, 36, 38, ACCENT_DARK)
        canvas.rect(11, 14, 36, 20, ACCENT)
        canvas.triangle((23, 8), 8, 7, GREEN)
    return _menu_button(glyph)


def menu_load_game() -> Canvas:
    """A stack of saved parks."""
    def glyph(canvas: Canvas) -> None:
        for index, top in enumerate((14, 22, 30)):
            canvas.rect(10, top, 37, top + 6, BLUE if index == 2 else EDGE)
            canvas.rect(11, top + 1, 36, top + 5, PAPER)
    return _menu_button(glyph)


def menu_exit() -> Canvas:
    """A door with an arrow leaving it."""
    def glyph(canvas: Canvas) -> None:
        canvas.rect(12, 12, 26, 38, EDGE)
        canvas.rect(13, 13, 25, 37, PAPER)
        canvas.rect(29, 23, 38, 26, ACCENT)
        canvas.triangle((36, 19), 5, 9, ACCENT)
    return _menu_button(glyph)


def menu_toolbox() -> Canvas:
    """A wrench, for the editor and tools."""
    def glyph(canvas: Canvas) -> None:
        canvas.line(15, 34, 32, 16, EDGE, width=5)
        canvas.line(16, 34, 32, 17, ACCENT, width=3)
        canvas.disc(33, 15, 7, EDGE)
        canvas.disc(33, 15, 5, ACCENT)
        canvas.disc(35, 13, 3, INK)
    return _menu_button(glyph)


# ---------------------------------------------------------------------------
# Window chrome: tabs and buttons
# ---------------------------------------------------------------------------

TAB_W, TAB_H = 31, 27


def tab_shape(active: bool) -> Canvas:
    """SPR_TAB and SPR_TAB_ACTIVE: the plate every window tab is drawn on.

    An unselected tab sits lower and darker; the selected one is raised, brighter and
    joins the panel below it by leaving its bottom edge open. State is carried by
    shape and value together, never by colour alone.
    """
    canvas = Canvas(TAB_W, TAB_H)
    top = 2 if active else 5
    body = PAPER if active else EDGE
    canvas.rect(1, top + 1, TAB_W - 2, TAB_H - 1, INK)
    canvas.rect(2, top, TAB_W - 3, TAB_H - 1, body)
    canvas.rect(2, top, TAB_W - 3, top, PAPER if active else pal.ramp("grey")[6])
    if active:
        canvas.rect(3, TAB_H - 2, TAB_W - 4, TAB_H - 1, body)
    else:
        canvas.rect(2, TAB_H - 2, TAB_W - 3, TAB_H - 1, INK)
    return canvas


def _tab_icon(draw) -> Canvas:
    """A 24x24 symbol drawn on top of a tab plate."""
    canvas = Canvas(24, 24)
    draw(canvas)
    return canvas


def tab_park() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(4, 10, 6, 20, ACCENT_DARK)
        c.rect(17, 10, 19, 20, ACCENT_DARK)
        c.rect(4, 6, 19, 10, ACCENT)
        c.triangle((11, 2), 5, 5, GREEN)
    return _tab_icon(glyph)


def tab_graph() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(3, 19, 20, 20, EDGE)
        for x, top in ((5, 12), (9, 8), (13, 14), (17, 5)):
            c.rect(x, top, x + 2, 18, ACCENT)
    return _tab_icon(glyph)


def tab_money() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.disc(11.5, 11.5, 8, ACCENT_DARK)
        c.disc(11.5, 11.5, 6.5, ACCENT)
        c.rect(11, 5, 12, 18, INK)
        c.rect(8, 7, 15, 8, INK)
        c.rect(8, 14, 15, 15, INK)
    return _tab_icon(glyph)


def tab_stats() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.ring(11.5, 11.5, 9, 5, EDGE)
        c.ring(11.5, 11.5, 9, 5, ACCENT)
        c.line(11, 11, 17, 6, INK, width=2)
    return _tab_icon(glyph)


def tab_shop() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(4, 9, 19, 20, PAPER)
        c.rect(4, 9, 19, 11, ACCENT)
        c.rect(3, 5, 20, 9, ACCENT_DARK)
        c.rect(9, 13, 14, 20, EDGE)
    return _tab_icon(glyph)


def tab_kiosk() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(5, 8, 18, 20, PAPER)
        c.rect(5, 8, 18, 10, BLUE)
        c.disc(11.5, 15, 3.5, BLUE)
    return _tab_icon(glyph)


def tab_ride() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.line(3, 18, 11, 5, ACCENT_DARK, width=3)
        c.line(11, 5, 20, 18, ACCENT_DARK, width=3)
        c.rect(3, 18, 20, 20, EDGE)
        c.rect(8, 8, 12, 11, RED)
    return _tab_icon(glyph)


def tab_objective() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.disc(11.5, 11.5, 9, EDGE)
        c.disc(11.5, 11.5, 7, PAPER)
        c.disc(11.5, 11.5, 4.5, ACCENT)
        c.disc(11.5, 11.5, 2, RED)
    return _tab_icon(glyph)


def tab_awards() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.disc(11.5, 9, 6, ACCENT)
        c.disc(11.5, 9, 4, ACCENT_DARK)
        c.triangle((8, 14), 2, 7, RED)
        c.triangle((15, 14), 2, 7, RED)
    return _tab_icon(glyph)


def tab_guests() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.disc(11.5, 7, 3.5, SKIN)
        c.rect(8, 11, 15, 18, BLUE)
        c.rect(8, 18, 10, 21, EDGE)
        c.rect(13, 18, 15, 21, EDGE)
    return _tab_icon(glyph)


def tab_marketing() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.triangle((6, 6), 0, 12, EDGE)
        c.rect(6, 6, 18, 12, ACCENT)
        c.rect(5, 6, 6, 19, EDGE)
    return _tab_icon(glyph)


def _symbol_button(draw, size: int = 24) -> Canvas:
    """A transparent square with a symbol drawn on it."""
    canvas = Canvas(size, size)
    draw(canvas)
    return canvas


def icon_ride() -> Canvas:
    """SPR_RIDE: the marker on a ride news item, in the ticker and the news window.

    Drawn into a 24x24 inset box that already has a one-pixel border, so the shape
    keeps clear of the outermost two pixels. The same coaster hill as the ride tab,
    without the tab plate under it, so a news item and a tab read as the same subject.
    """
    def glyph(c: Canvas) -> None:
        c.line(4, 18, 11, 6, ACCENT_DARK, width=3)
        c.line(11, 6, 19, 18, ACCENT_DARK, width=3)
        c.rect(4, 18, 19, 20, EDGE)
        c.rect(8, 9, 12, 12, RED)
    return _symbol_button(glyph)


def icon_finance() -> Canvas:
    """SPR_FINANCE: the marker beside the money on the toolbar and on a finance
    news item. Coins rather than a currency symbol, because the game is played in
    more than one currency and a symbol would be wrong in most of them."""
    def glyph(c: Canvas) -> None:
        c.disc(9, 15, 5.5, ACCENT_DARK)
        c.disc(9, 13, 5.5, ACCENT)
        c.disc(14, 11, 5.5, ACCENT_DARK)
        c.disc(14, 9, 5.5, ACCENT)
        c.rect(12, 7, 16, 8, PAPER)
    return _symbol_button(glyph)


def button_palette() -> Canvas:
    """SPR_PALETTE_BTN: the colour swatch button."""
    def glyph(c: Canvas) -> None:
        c.rect(2, 2, 21, 21, INK)
        c.rect(3, 3, 20, 20, ACCENT)
        c.rect(3, 12, 20, 20, ACCENT_DARK)
    return _symbol_button(glyph)


def button_demolish() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.line(4, 4, 19, 19, INK, width=4)
        c.line(19, 4, 4, 19, INK, width=4)
        c.line(5, 5, 18, 18, RED, width=2)
        c.line(18, 5, 5, 18, RED, width=2)
    return _symbol_button(glyph)


def button_demolish_section() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(3, 15, 20, 18, EDGE)
        c.line(6, 4, 17, 13, RED, width=3)
        c.line(17, 4, 6, 13, RED, width=3)
    return _symbol_button(glyph)


def button_locate() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.ring(11, 10, 7, 4, EDGE)
        c.ring(11, 10, 7, 4, BLUE)
        c.line(15, 15, 20, 20, EDGE, width=3)
    return _symbol_button(glyph)


def button_rename() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.line(4, 18, 16, 5, EDGE, width=4)
        c.line(5, 18, 16, 6, ACCENT, width=2)
        c.triangle((18, 3), 2, 4, PAPER)
        c.rect(3, 19, 9, 20, EDGE)
    return _symbol_button(glyph)


def button_patrol() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.ring(11.5, 11.5, 9, 6, GREEN_DARK)
        c.ring(11.5, 11.5, 9, 6, GREEN)
        c.disc(11.5, 3, 3, ACCENT)
    return _symbol_button(glyph)


def button_rotate_arrow() -> Canvas:
    """SPR_ROTATE_ARROW: turn the held object a quarter turn.

    Every scenery object has four directions and the window opens on one of them, so
    this is the button a player reaches for first. A three-quarter ring with a head on
    the end, rather than the toolbar's camera-rotate glyph, because it turns the thing
    being placed and not the view.
    """
    def glyph(c: Canvas) -> None:
        c.ring(12, 13, 8, 5, EDGE)
        c.ring(12, 13, 7, 5, ACCENT)
        c.rect(12, 4, 22, 11, PAPER)
        c.triangle((13, 3), 5, 6, ACCENT_DARK)
    return _symbol_button(glyph)


def button_scenery_cluster() -> Canvas:
    """SPR_SCENERY_CLUSTER: place a scattered group rather than one object.

    Three trees at different sizes and offsets, which is what the tool does: the same
    object repeated across a patch with its position and size varied.
    """
    def glyph(c: Canvas) -> None:
        c.rect(5, 15, 6, 19, BROWN)
        c.disc(5.5, 12, 4, GREEN_DARK)
        c.rect(17, 16, 18, 20, BROWN)
        c.disc(17.5, 13, 3.5, GREEN_DARK)
        c.rect(11, 13, 12, 20, BROWN)
        c.disc(11.5, 9, 5.5, GREEN)
        c.disc(10, 8, 2.5, pal.ramp("green")[9])
    return _symbol_button(glyph)


def button_paintbrush() -> Canvas:
    """SPR_PAINTBRUSH: repaint scenery already on the map in the window's colours.

    A brush held at the angle the rename pencil uses, so the two read as the same
    family of tools, with a loaded head rather than a point.
    """
    def glyph(c: Canvas) -> None:
        c.line(6, 19, 15, 8, EDGE, width=5)
        c.line(7, 18, 15, 9, pal.ramp("tan")[6], width=3)
        c.line(15, 8, 19, 4, EDGE, width=6)
        c.line(15, 8, 19, 4, ACCENT, width=4)
        c.rect(4, 18, 8, 21, ACCENT_DARK)
    return _symbol_button(glyph)


def button_map() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(3, 5, 20, 19, GREEN_DARK)
        c.rect(4, 6, 19, 18, GREEN)
        c.line(4, 14, 19, 9, PAPER, width=2)
        c.disc(15, 8, 2, RED)
    return _symbol_button(glyph)


def _slope(direction: int) -> Canvas:
    """Ride construction slope buttons: down, level, up."""
    canvas = Canvas(24, 24)
    canvas.rect(3, 18, 20, 20, EDGE)
    if direction == 0:
        canvas.line(4, 7, 19, 16, ACCENT, width=3)
    elif direction == 1:
        canvas.rect(4, 11, 19, 13, ACCENT)
    else:
        canvas.line(4, 16, 19, 7, ACCENT, width=3)
    return canvas


def slope_down() -> Canvas:
    return _slope(0)


def slope_level() -> Canvas:
    return _slope(1)


def slope_up() -> Canvas:
    return _slope(2)


def _direction(dx: int, dy: int) -> Canvas:
    """Construction direction buttons: an isometric arrow."""
    canvas = Canvas(24, 24)
    canvas.rect(2, 2, 21, 21, EDGE)
    canvas.rect(3, 3, 20, 20, PAPER)
    cx, cy = 11, 11
    canvas.line(cx - dx * 6, cy - dy * 4, cx + dx * 6, cy + dy * 4, ACCENT_DARK, width=3)
    canvas.disc(cx + dx * 6, cy + dy * 4, 3, ACCENT)
    return canvas


def direction_ne() -> Canvas:
    return _direction(1, -1)


def direction_se() -> Canvas:
    return _direction(1, 1)


def direction_sw() -> Canvas:
    return _direction(-1, 1)


def direction_nw() -> Canvas:
    return _direction(-1, -1)


def footpath_land() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(2, 13, 21, 20, GREEN_DARK)
        c.rect(2, 10, 21, 13, PAPER)
    return _symbol_button(glyph)


def footpath_bridge() -> Canvas:
    def glyph(c: Canvas) -> None:
        c.rect(2, 8, 21, 11, PAPER)
        for x in (5, 11, 17):
            c.rect(x, 11, x + 2, 20, EDGE)
    return _symbol_button(glyph)


UI_SPRITES: Dict[int, Tuple[str, Callable[[], Canvas]]] = {
    # 5130 is unnamed in SpriteIds.h, sitting in the gap between the staff costume
    # icons (..5128) and the ride construction icons (5137..). It is requested a
    # handful of times while a ride window is open, so it is treated as a window tab.
    5130: ("window_tab_generic", icon_tab),
    # Drawn in place of scrolling banner text whenever the view is zoomed out.
    1574: ("scrolling_text_default", scrolling_text_default),
    # SPR_RESIZE, drawn in the corner of every resizable window.
    5058: ("window_resize_grip", icon_resize_grip),
    # Window chrome: the tab plate and its selected state.
    # SPR_RIDE: drawn on every ride news item and in the ticker.
    5187: ("news_ride", icon_ride),
    # SPR_FINANCE: drawn beside the money on the toolbar, every frame.
    5190: ("finance", icon_finance),
    5198: ("tab_plate", lambda: tab_shape(False)),
    5199: ("tab_plate_active", lambda: tab_shape(True)),
    # Window buttons.
    5059: ("button_palette", button_palette),
    5145: ("construction_slope_down", slope_down),
    5146: ("construction_slope_level", slope_level),
    5147: ("construction_slope_up", slope_up),
    5162: ("button_demolish_section", button_demolish_section),
    5165: ("button_demolish", button_demolish),
    5167: ("button_locate", button_locate),
    5168: ("button_rename", button_rename),
    # The scenery window's own buttons, down its right-hand edge. They are the first
    # thing a player uses after the window opens, and they went unauthored for as long
    # as the window closed itself before it could ask for them.
    5169: ("button_rotate_arrow", button_rotate_arrow),
    5172: ("button_scenery_cluster", button_scenery_cluster),
    5173: ("button_paintbrush", button_paintbrush),
    5175: ("button_patrol", button_patrol),
    5192: ("button_map", button_map),
    5624: ("toolbar_footpath_pressed", icon_footpath),
    5635: ("construction_direction_ne", direction_ne),
    5636: ("construction_direction_se", direction_se),
    5637: ("construction_direction_sw", direction_sw),
    5638: ("construction_direction_nw", direction_nw),
    5639: ("construction_footpath_land", footpath_land),
    5640: ("construction_footpath_bridge", footpath_bridge),
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
    5603: ("toolbar_zoom_out_disabled", icon_zoom_out_disabled),
    5606: ("toolbar_zoom_in_disabled", icon_zoom_in_disabled),
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
    # SPR_MENU_*: the title screen buttons, which a player sees for a moment while the
    # game starts even though the shell opens a park straight afterwards.
    23207: ("menu_new_game", menu_new_game),
    23208: ("menu_load_game", menu_load_game),
    23210: ("menu_exit", menu_exit),
    23211: ("menu_toolbox", menu_toolbox),
    23189: ("next_weather", icon_next_weather),
    # All seven weather icons: the toolbar draws whichever matches the sky, so shipping
    # only the fair-weather two leaves a hole that appears the first time it rains.
    23190: ("weather_sun", icon_weather_sun),
    23191: ("weather_sun_cloud", icon_weather_sun_cloud),
    23192: ("weather_cloud", icon_weather_cloud),
    23193: ("weather_light_rain", icon_weather_light_rain),
    23194: ("weather_heavy_rain", icon_weather_heavy_rain),
    23195: ("weather_storm", icon_weather_storm),
    23196: ("weather_snow", icon_weather_snow),
    23197: ("rating_low", icon_rating_low),
    23198: ("rating_high", icon_rating_high),
}


def _run(start: int, count: int, name: str, draw) -> None:
    """Register an animated tab's frames as the same still symbol.

    The engine cycles these while a window is open. A still icon is calmer than a
    spinning one in a row of tabs, and it costs nothing to change later.
    """
    for frame in range(count):
        UI_SPRITES[start + frame] = (f"{name}_{frame}", draw)


_run(5200, 1, "tab_park_entrance", tab_park)
_run(5245, 1, "tab_graph", tab_graph)
_run(5261, 8, "tab_finances_summary", tab_money)
_run(5277, 1, "tab_stats", tab_stats)
_run(5351, 1, "tab_shops", tab_shop)
_run(5367, 1, "tab_kiosks", tab_kiosk)
_run(5375, 1, "tab_financial_graph", tab_graph)
_run(5391, 1, "tab_profit_graph", tab_graph)
_run(5407, 1, "tab_value_graph", tab_graph)
_run(5423, 1, "tab_marketing", tab_marketing)
_run(5442, 16, "tab_ride", tab_ride)
_run(5511, 1, "tab_objective", tab_objective)
_run(5527, 1, "tab_awards", tab_awards)
_run(5568, 8, "tab_guests", tab_guests)


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
