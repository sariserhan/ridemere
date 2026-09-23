"""Assemble the Project Sunrise standalone content pack.

    .cache/venv/bin/python tools/art-pipeline/build_pack.py

Produces assets/generated/pack/, laid out the way the engine's standalone mode
expects (src/openrct2/standalone/StandaloneContent.h):

    standalone/Data/g1.dat        base sprite archive (full size, mostly markers)
    standalone/Scenarios/*.park   bundled scenarios
    standalone/standalone.json    manifest: required objects, defaults, audit ranges
    object/*.parkobj              our objects
    <engine data>                 language, shaders, palettes, fonts, track previews

Nothing here reads or contains RollerCoaster Tycoon data.
"""

from __future__ import annotations

import json
import os
import shutil
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENGINE = os.path.join(REPO, "engine", "openrct2")
GENERATED = os.path.join(REPO, "assets", "generated")
PACK = os.path.join(GENERATED, "pack")

#: Objects the editor must have loaded to produce a valid park
#: (EditorController.cpp:84 via Standalone::GetRequiredObjects).
REQUIRED_OBJECTS = [
    "sunrise.terrain_surface.grass",
    "sunrise.terrain_edge.rock",
    "sunrise.station.plain",
]

DEFAULT_OBJECTS = [
    "sunrise.terrain_surface.grass",
    "sunrise.terrain_surface.dirt",
    "sunrise.terrain_edge.rock",
    "sunrise.station.plain",
    "sunrise.footpath_surface.paved",
    "sunrise.footpath_surface.queue",
    "sunrise.footpath_railings.wood",
    "sunrise.park_entrance.arch",
    "sunrise.water.clear",
    "sunrise.peep_animations.guest",
    "sunrise.peep_animations.handyman",
]


def clean(path: str) -> None:
    if os.path.exists(path):
        shutil.rmtree(path)
    os.makedirs(path, exist_ok=True)


def copy_tree(source: str, dest: str) -> None:
    if os.path.isdir(source):
        shutil.copytree(source, dest, dirs_exist_ok=True)


def build() -> dict:
    base_archive = os.path.join(GENERATED, "base", "g1.dat")
    base_summary_path = os.path.join(GENERATED, "base", "base-archive.json")
    if not os.path.exists(base_archive):
        raise SystemExit("run tools/art-pipeline/build_base_archive.py first")
    with open(base_summary_path, "r", encoding="utf-8") as handle:
        base_summary = json.load(handle)

    clean(PACK)
    standalone_dir = os.path.join(PACK, "standalone")
    os.makedirs(os.path.join(standalone_dir, "Data"), exist_ok=True)
    os.makedirs(os.path.join(standalone_dir, "Scenarios"), exist_ok=True)
    os.makedirs(os.path.join(PACK, "object"), exist_ok=True)

    shutil.copy(base_archive, os.path.join(standalone_dir, "Data", "g1.dat"))

    # Engine data that is already open content and is not part of the base archive.
    for name in ("language", "shaders", "scenario_patches"):
        copy_tree(os.path.join(ENGINE, "data", name), os.path.join(PACK, name))
    for name in ("g2.dat", "fonts.dat", "palettes.dat", "tracks.dat"):
        source = os.path.join(ENGINE, "build", "www", "_engine_data", name)
        if not os.path.exists(source):
            source = os.path.join(GENERATED, "engine-data", name)
        if os.path.exists(source):
            shutil.copy(source, os.path.join(PACK, name))

    # Our objects.
    object_count = 0
    objects_dir = os.path.join(GENERATED, "objects")
    if os.path.isdir(objects_dir):
        for entry in sorted(os.listdir(objects_dir)):
            if entry.endswith(".parkobj"):
                shutil.copy(os.path.join(objects_dir, entry), os.path.join(PACK, "object", entry))
                object_count += 1

    # Bundled scenarios, if any have been generated yet.
    scenario_source = os.path.join(GENERATED, "scenarios")
    scenario_count = 0
    if os.path.isdir(scenario_source):
        for entry in sorted(os.listdir(scenario_source)):
            if entry.endswith(".park"):
                shutil.copy(
                    os.path.join(scenario_source, entry),
                    os.path.join(standalone_dir, "Scenarios", entry),
                )
                scenario_count += 1

    manifest = {
        "name": "Project Sunrise standalone content",
        "requiredObjects": REQUIRED_OBJECTS,
        "defaultObjects": DEFAULT_OBJECTS,
        "defaultStation": "sunrise.station.plain",
        "audioBaseObject": "sunrise.audio.base",
        "spriteAudit": {"populated": base_summary["populated"]},
    }
    with open(os.path.join(standalone_dir, "standalone.json"), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)

    total = sum(
        os.path.getsize(os.path.join(root, name))
        for root, _, names in os.walk(PACK)
        for name in names
    )
    return {
        "path": PACK,
        "objects": object_count,
        "scenarios": scenario_count,
        "bytes": total,
    }


if __name__ == "__main__":
    info = build()
    print(
        f"content pack: {info['objects']} objects, {info['scenarios']} scenarios, "
        f"{info['bytes'] / 1e6:.1f} MB -> {os.path.relpath(info['path'], REPO)}"
    )
