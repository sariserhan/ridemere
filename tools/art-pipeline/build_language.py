"""Build the shipped language file with product branding replaced.

    .cache/venv/bin/python tools/art-pipeline/build_language.py

The engine's language files are open content, and they carry the upstream project's
name in thirty-five places: window titles, file type descriptions, the status bar and
the about box. A product called Ridemere cannot show them, and the strings are the only
place in the running game where that name still appears.

Only the product name is rewritten. Ride names, scenery names, guest thoughts and every
other string are left exactly as they are: this is a rebranding pass, not a rewrite,
and the file stays GPL-3.0 OpenRCT2 content with our substitutions noted in provenance.
"""

from __future__ import annotations

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SOURCE_DIR = os.path.join(REPO, "engine", "openrct2", "data", "language")
OUT_DIR = os.path.join(REPO, "assets", "generated", "language")

PRODUCT_NAME = "Ridemere"

#: Replacements applied in order. The longer descriptive lines go first so the bare
#: name does not rewrite half of them.
REPLACEMENTS = [
    (
        "OpenRCT2, a free and open source recreation of and expansion to Roller Coaster Tycoon 2.",
        f"{PRODUCT_NAME}, a theme park management game you can play in your browser.",
    ),
    ("‘OpenRCT2’", f"‘{PRODUCT_NAME}’"),
    ("OpenRCT2", PRODUCT_NAME),
]

FILES = ("en-GB.txt",)


def convert(text: str) -> tuple[str, int]:
    count = 0
    for needle, replacement in REPLACEMENTS:
        count += text.count(needle)
        text = text.replace(needle, replacement)
    return text, count


def build() -> dict:
    os.makedirs(OUT_DIR, exist_ok=True)
    written = {}
    for name in FILES:
        source = os.path.join(SOURCE_DIR, name)
        if not os.path.exists(source):
            raise SystemExit(f"language file not found: {source}")
        with open(source, "r", encoding="utf-8") as handle:
            text = handle.read()
        converted, replacements = convert(text)
        remaining = len(re.findall(r"OpenRCT2", converted))
        target = os.path.join(OUT_DIR, name)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(converted)
        written[name] = {"replacements": replacements, "remaining": remaining,
                         "bytes": os.path.getsize(target)}
    return written


if __name__ == "__main__":
    info = build()
    for name, stats in info.items():
        print(f"language {name}: {stats['replacements']} product names replaced, "
              f"{stats['remaining']} remaining, {stats['bytes'] / 1e3:.1f} KB")
        if stats["remaining"]:
            raise SystemExit("the product name still appears in a shipped string")
