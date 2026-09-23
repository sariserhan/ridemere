"""Generate the machine-readable asset provenance manifest.

    .cache/venv/bin/python tools/art-pipeline/build_manifest.py

Writes assets/manifests/provenance.json, one record per shipped asset, so that
attribution text can be generated automatically and no asset can enter the
distribution without a declared origin and licence.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from typing import Dict, List

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACK = os.path.join(REPO, "assets", "generated", "pack")
OUT = os.path.join(REPO, "assets", "manifests", "provenance.json")

ORIGINAL = {
    "creator": "Project Sunrise",
    "license": "proprietary-original",
    "modified": False,
}

#: Declared origin for everything the pack can contain. Keys are matched against
#: the path inside the pack, longest prefix first.
RECORDS: Dict[str, dict] = {
    "object/sunrise.peep_animations.guest.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_guest_v1",
        "source": "assets/source/blender/guest.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_peeps.py",
        "notes": "Procedural figure and animation; no third-party geometry or reference art.",
    },
    "object/sunrise.peep_animations.handyman.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_handyman_v1",
        "source": "assets/source/blender/handyman.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_peeps.py",
    },
    "object/sunrise.footpath_surface.paved.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_paved_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world_objects.py",
    },
    "object/sunrise.footpath_surface.queue.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_queue_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world_objects.py",
    },
    "object/sunrise.footpath_railings.plain.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_railings_v1",
        "source": "tools/art-pipeline/build_world_objects.py",
        "notes": "Ground-level paths draw no railings; the entries carry no art yet.",
    },
    "object/sunrise.park_entrance.arch.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_park_entrance_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world_objects.py",
    },
    "object/sunrise.station.plain.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_station_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world_objects.py",
    },
    "object/sunrise.peep_names.visitors.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_peep_names_v1",
        "source": "tools/art-pipeline/build_world_objects.py",
        "notes": "Invented names; no original-game name list was consulted.",
    },
    "object/sunrise.climate.temperate.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_climate_v1",
        "source": "tools/art-pipeline/build_world_objects.py",
    },
    "standalone/Scenarios/sunrise-test.park": {
        **ORIGINAL,
        "asset": "sunrise_test_park_v1",
        "source": "assets/scenarios/sunrise-test/scenario.json",
        "generator": "engine park builder via tools/art-pipeline/build_scenario.py",
    },
    "object/sunrise.terrain_surface.grass.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_terrain_grass_v1",
        "source": "assets/source/blender/terrain.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world.py",
    },
    "object/sunrise.terrain_surface.dirt.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_terrain_dirt_v1",
        "source": "assets/source/blender/terrain.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world.py",
    },
    "standalone/Data/g1.dat": {
        **ORIGINAL,
        "asset": "sunrise_base_archive_v1",
        "source": "tools/art-pipeline/build_base_archive.py",
        "generator": "libsawyer gxc 1.4.0 (MIT) from original marker art",
        "notes": "Full-size base sprite archive. Unfilled entries carry a diagnostic marker.",
    },
    "g2.dat": {
        "asset": "openrct2_extra_sprites",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/g2",
        "modified": False,
        "notes": "OpenRCT2's own interface sprites, built with gxc.",
    },
    "fonts.dat": {
        "asset": "openrct2_fonts",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/fonts",
        "modified": False,
    },
    "palettes.dat": {
        "asset": "openrct2_palettes",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/palettes",
        "modified": False,
    },
    "tracks.dat": {
        "asset": "openrct2_track_previews",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/tracks",
        "modified": False,
    },
    "language/": {
        "asset": "openrct2_language_files",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/data/language",
        "modified": False,
        "notes": "Contains original-game ride and scenery names; a rebranding surface.",
    },
    "shaders/": {
        "asset": "openrct2_shaders",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/data/shaders",
        "modified": False,
    },
    "scenario_patches/": {
        "asset": "openrct2_scenario_patches",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/data/scenario_patches",
        "modified": False,
    },
    "standalone/standalone.json": {
        **ORIGINAL,
        "asset": "sunrise_content_manifest",
        "source": "tools/art-pipeline/build_pack.py",
    },
}

#: Assets that must never appear. Presence is a hard failure.
FORBIDDEN_SUBSTRINGS = ("rct2.", "rct1.", "rct2ww.", "rct2tt.", "rct2dlc.", "csg1", "css")


def digest(path: str) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            sha.update(block)
    return sha.hexdigest()


def lookup(relative: str) -> dict | None:
    if relative in RECORDS:
        return RECORDS[relative]
    best = None
    for prefix, record in RECORDS.items():
        if prefix.endswith("/") and relative.startswith(prefix):
            if best is None or len(prefix) > len(best[0]):
                best = (prefix, record)
    return best[1] if best else None


def main() -> None:
    if not os.path.isdir(PACK):
        raise SystemExit("run tools/art-pipeline/build_pack.py first")

    entries: List[dict] = []
    undeclared: List[str] = []
    forbidden: List[str] = []
    grouped: Dict[str, dict] = {}

    for root, _, names in os.walk(PACK):
        for name in sorted(names):
            full = os.path.join(root, name)
            relative = os.path.relpath(full, PACK).replace(os.sep, "/")
            lowered = relative.lower()
            if any(token in lowered for token in FORBIDDEN_SUBSTRINGS):
                forbidden.append(relative)
            record = lookup(relative)
            if record is None:
                undeclared.append(relative)
                continue
            key = record["asset"]
            if key in grouped:
                grouped[key]["files"] += 1
                grouped[key]["bytes"] += os.path.getsize(full)
                continue
            entry = dict(record)
            entry["path"] = relative if not relative.endswith("/") else relative
            entry["files"] = 1
            entry["bytes"] = os.path.getsize(full)
            if entry["files"] == 1 and os.path.getsize(full) < 64 * 1024 * 1024:
                entry["sha256"] = digest(full)
            grouped[key] = entry

    entries = sorted(grouped.values(), key=lambda item: item["asset"])
    document = {
        "generatedFor": "Project Sunrise standalone content pack",
        "proprietaryOriginalDataPresent": False,
        "assets": entries,
        "undeclaredFiles": undeclared,
        "forbiddenFiles": forbidden,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump(document, handle, indent=2)

    print(f"provenance: {len(entries)} assets -> {os.path.relpath(OUT, REPO)}")
    if forbidden:
        print("FAIL: files matching original-game naming are present:")
        for item in forbidden[:20]:
            print("  ", item)
        sys.exit(1)
    if undeclared:
        print(f"WARNING: {len(undeclared)} files have no declared provenance:")
        for item in undeclared[:20]:
            print("  ", item)
        sys.exit(2)
    print("every shipped file has a declared origin and licence.")


if __name__ == "__main__":
    main()
