"""Build the Ridemere window colour theme.

    .cache/venv/bin/python tools/art-pipeline/build_ui_theme.py

The engine's window system is kept exactly as it is; only its colours change. Each
window class picks its colours from the engine's own named colour table, so a theme is
data rather than code, and any window added later inherits the identity for free.

The window classes are read from the engine's own descriptor table rather than typed
out here, so a class added upstream cannot silently keep the stock colours.

The semantic roles come from docs/ui-design-system.md. The engine cannot use our hex
values, because it draws from a fixed palette, so each role is expressed as the nearest
member of the engine's colour table. What carries across is the role, not the colour.
"""

from __future__ import annotations

import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THEME_SOURCE = os.path.join(
    REPO, "engine", "openrct2", "src", "openrct2-ui", "interface", "Theme.cpp")
OUT_DIR = os.path.join(REPO, "assets", "generated", "ui")

THEME_NAME = "Ridemere"

#: Roles, mapped to the engine's colour names.
#:
#: Warm and dark, so the chrome recedes behind a bright park. `umber` is the warm
#: near-neutral the whole interface is built on; `light_orange` is the one accent a
#: player will associate with the product.
ROLE = {
    "chrome": "dull_brown_dark",      # window bodies and title bars
    "panel": "saturated_brown_light",  # content areas inside a window
    "accent": "light_orange",          # the primary accent
    "toolbar": "dull_brown_dark",      # the top toolbar
    "status": "dull_brown_dark",       # the bottom status bar
    "alert": "bordeaux_red_dark",      # errors and demolition
    "money": "dark_olive_green",       # finance
}

#: Window classes that should not take the default three. Everything else does.
OVERRIDES = {
    "WC_TOP_TOOLBAR": ["toolbar", "toolbar", "toolbar", "toolbar", "toolbar", "toolbar"],
    "WC_BOTTOM_TOOLBAR": ["status", "status", "accent", "accent"],
    "WC_TITLE_MENU": ["chrome", "chrome", "chrome"],
    "WC_TITLE_EXIT": ["chrome", "chrome", "chrome"],
    "WC_TITLE_OPTIONS": ["chrome", "chrome", "chrome"],
    "WC_TITLE_LOGO": ["chrome", "chrome", "chrome"],
    "WC_ERROR": ["alert", "alert", "alert"],
    "WC_DEMOLISH_RIDE_PROMPT": ["alert", "alert", "alert"],
    "WC_FINANCES": ["money", "panel", "panel"],
    "WC_PARK_INFORMATION": ["chrome", "panel", "accent"],
    "WC_RIDE": ["chrome", "panel", "accent"],
    "WC_PEEP": ["chrome", "panel", "accent"],
    "WC_STAFF": ["chrome", "panel", "accent"],
    "WC_STAFF_LIST": ["chrome", "panel", "accent"],
    "WC_GUEST_LIST": ["chrome", "panel", "accent"],
    "WC_RIDE_LIST": ["chrome", "panel", "accent"],
}

DEFAULT_ROLES = ["chrome", "panel", "accent", "panel", "panel", "panel"]

ENTRY = re.compile(
    r"\{\s*WindowClass::\w+\s*,\s*\"(WC_[A-Z0-9_]+)\"\s*,\s*[A-Z0-9_]+\s*,\s*\{(.*?)\}\s*\}", re.S)


def window_classes() -> list[tuple[str, int]]:
    """Every window class in the engine's descriptor table, with its colour count."""
    with open(THEME_SOURCE, "r", encoding="utf-8") as handle:
        text = handle.read()
    found = []
    for match in ENTRY.finditer(text):
        name = match.group(1)
        count = match.group(2).count("Drawing::Colour::")
        if count:
            found.append((name, count))
    return found


def build() -> dict:
    classes = window_classes()
    if not classes:
        raise SystemExit(f"no window classes found in {THEME_SOURCE}; the table format changed")

    entries = {}
    for name, count in classes:
        roles = OVERRIDES.get(name, DEFAULT_ROLES)
        colours = []
        for index in range(count):
            role = roles[index] if index < len(roles) else roles[-1]
            colours.append({"colour": ROLE[role], "translucent": False})
        entries[name] = {"colours": colours}

    theme = {
        "name": THEME_NAME,
        "version": 1,
        "entries": entries,
        "useLightsRide": True,
        "useLightsPark": True,
        "useAltScenarioSelectFont": False,
        "useFullBottomToolbar": True,
        "use3dImageButtons": False,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    # The engine names an available theme after its file, not after the "name" field,
    # and matches it case-sensitively, so the file name is what the manifest must
    # declare.
    path = os.path.join(OUT_DIR, f"{THEME_NAME}.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(theme, handle, indent=1)
    return {"classes": len(classes), "path": path, "bytes": os.path.getsize(path)}


if __name__ == "__main__":
    info = build()
    print(f"theme: {info['classes']} window classes, {info['bytes'] / 1e3:.1f} KB "
          f"-> {os.path.relpath(info['path'], REPO)}")
