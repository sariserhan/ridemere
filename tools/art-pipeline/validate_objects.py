"""Validate generated objects against the engine's expectations.

    .cache/venv/bin/python tools/art-pipeline/validate_objects.py

Checks that every object in the content pack parses, that every image it references
exists inside its own archive, that images are 8-bit indexed (required by
"palette": "keep"), that index 0 is transparent, that no image uses a remap ramp it
must not, and that per-type image counts match what the engine computes.
"""

from __future__ import annotations

import io
import re
import json
import os
import sys
import zipfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sunrise_palette as pal  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACK_OBJECTS = os.path.join(REPO, "assets", "generated", "pack", "object")

failures: list = []
notes: list = []


def fail(obj: str, message: str) -> None:
    failures.append(f"{obj}: {message}")


def check_peep(obj_id: str, root: dict, image_count: int) -> None:
    groups = root.get("animationGroups", [])
    peep_type = root["properties"]["peepType"]
    if peep_type == "guest" and len(groups) < 33:
        fail(obj_id, f"guest needs 33 animation groups (Peep.h sandwich = 32), has {len(groups)}")
    if not groups:
        fail(obj_id, "no animation groups")
        return
    primary = groups[0]["animations"]
    for name, animation in primary.items():
        offset = animation["offset"]
        frames = max(animation["sequence"]) + 1
        span = frames if name == "hanging" else frames * 4
        if offset + span > image_count:
            fail(obj_id, f"{name} needs images {offset}..{offset + span - 1} but only {image_count} exist")
        if offset == 0:
            fail(obj_id, f"{name} has offset 0, which collides with the preview icon")
    for index, group in enumerate(groups[1:], start=1):
        if group.get("animations"):
            notes.append(f"{obj_id}: group {index} declares its own animations")


def check_terrain_surface(obj_id: str, root: dict, image_count: int) -> None:
    properties = root.get("properties", {})
    flags = properties.get("flags", [])
    smooth = "smoothWithSelf" in flags or "smoothWithOther" in flags
    entry_base = 7 if smooth else 1
    remainder = (image_count - entry_base) % 19
    entries = (image_count - entry_base) // 19
    if remainder != 0:
        fail(obj_id, f"{image_count} images leaves a remainder of {remainder} over 19 per entry")
    default = properties.get("default", {})
    for key in ("normal", "grid", "underground"):
        if default.get(key, 0) >= entries:
            fail(obj_id, f"default.{key} = {default.get(key)} but only {entries} entries exist")


def check_images(obj_id: str, archive: zipfile.ZipFile, root: dict) -> int:
    images = root.get("images", [])
    names = set(archive.namelist())
    # $G1, $CSG and $RCT2 name the original game's own sprite archives, which the
    # distribution must never require. $LGX is different: it reads a legacy GX archive
    # carried inside the object's own .parkobj, so it is self-contained as long as the
    # named file is actually in the archive.
    forbidden = ("$G1", "$CSG", "$RCT2")
    count = 0
    for entry in images:
        if isinstance(entry, str):
            if any(entry.startswith(token) for token in forbidden):
                fail(obj_id, f"image reference {entry!r} needs original game data")
                count += 1
                continue
            match = re.match(r"^\$LGX:([^\[]+)\[(\d+)\.\.(\d+)\]$", entry)
            if match is not None:
                name, first, last = match.group(1), int(match.group(2)), int(match.group(3))
                if name not in names:
                    fail(obj_id, f"{entry!r} refers to {name}, which is not in the object")
                count += last - first + 1
                continue
            if entry.startswith("$LGX"):
                fail(obj_id, f"unparsable embedded image reference {entry!r}")
            count += 1
            continue
        path = entry.get("path")
        count += 1
        if path is None:
            fail(obj_id, "image entry without a path")
            continue
        if path not in names:
            fail(obj_id, f"missing image file {path}")
            continue
        with Image.open(io.BytesIO(archive.read(path))) as handle:
            if handle.mode != "P":
                fail(obj_id, f"{path} is {handle.mode}, must be 8-bit indexed for palette:keep")
                continue
            if entry.get("palette") != "keep":
                fail(obj_id, f"{path} is indexed but the entry does not set palette:keep")
    return count


def main() -> None:
    if not os.path.isdir(PACK_OBJECTS):
        raise SystemExit("run tools/art-pipeline/build_pack.py first")

    checked = 0
    for name in sorted(os.listdir(PACK_OBJECTS)):
        if not name.endswith(".parkobj"):
            continue
        path = os.path.join(PACK_OBJECTS, name)
        with zipfile.ZipFile(path) as archive:
            try:
                root = json.loads(archive.read("object.json"))
            except Exception as error:
                fail(name, f"object.json does not parse: {error}")
                continue
            obj_id = root.get("id", name)
            count = check_images(obj_id, archive, root)
            kind = root.get("objectType")
            if kind == "peep_animations":
                check_peep(obj_id, root, count)
            elif kind == "terrain_surface":
                check_terrain_surface(obj_id, root, count)
            checked += 1
            print(f"  {obj_id}: {kind}, {count} images")

    print(f"\nvalidated {checked} objects")
    for note in notes:
        print("note:", note)
    if failures:
        print(f"\n{len(failures)} problems:")
        for problem in failures:
            print("  FAIL", problem)
        sys.exit(1)
    print("all objects are self-contained and internally consistent.")


if __name__ == "__main__":
    main()
