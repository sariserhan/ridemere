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

#: Station styles this pack declares. Upstream restricts station identifiers to a
#: fixed list so a planned split of the station object can migrate every style in
#: the wild; a standalone distribution migrates its own, so it declares them here
#: (see src/openrct2/object/StationObject.cpp).
STATION_OBJECTS = ["sunrise.station.plain"]

#: Open third-party objects bundled alongside our own, taken from the official
#: OpenRCT2 object collection (CC-BY-4.0). Each must be declared in
#: assets/manifests/provenance.json.
#: Languages carried in the standalone download. English is the engine's fallback
#: locale and the only one whose strings the prototype has been read against.
BUNDLED_LANGUAGES = ("en-GB.txt",)

#: Declared in the content manifest so the engine asks for a locale the pack contains
#: rather than whatever the host system reports.
BUNDLED_LOCALES = tuple(name.removesuffix(".txt") for name in BUNDLED_LANGUAGES)

BUNDLED_OPEN_OBJECTS = {
    "openrct2.ride.hybrid_coaster": "official/ride/openrct2.ride.hybrid_coaster.parkobj",
}

DEFAULT_OBJECTS = [
    "sunrise.terrain_surface.grass",
    "sunrise.terrain_surface.dirt",
    "sunrise.terrain_surface.sand",
    "sunrise.terrain_surface.stone",
    "sunrise.terrain_edge.rock",
    "sunrise.station.plain",
    "sunrise.footpath_surface.paved",
    "sunrise.footpath_surface.stone",
    "sunrise.footpath_surface.wood",
    "sunrise.footpath_surface.queue",
    "sunrise.footpath_railings.metal",
    "sunrise.park_entrance.arch",
    "sunrise.peep_names.visitors",
    "sunrise.climate.temperate",
    "sunrise.peep_animations.guest",
    "sunrise.peep_animations.handyman",
    "openrct2.ride.hybrid_coaster",
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
    for name in ("shaders", "scenario_patches"):
        copy_tree(os.path.join(ENGINE, "data", name), os.path.join(PACK, name))

    # Languages. Upstream ships 28 translations, 1.25 MB of the download, and the
    # prototype has one locale of text worth reading. The directory and the loading
    # path are unchanged, so adding a language later is a matter of copying its file.
    # Strings come from our rebranded copies, built by build_language.py: the engine's
    # own files name the upstream project in thirty-five places, including the status
    # bar a player looks at constantly.
    language_source = os.path.join(GENERATED, "language")
    language_dest = os.path.join(PACK, "language")
    os.makedirs(language_dest, exist_ok=True)
    for name in BUNDLED_LANGUAGES:
        candidate = os.path.join(language_source, name)
        if not os.path.exists(candidate):
            raise SystemExit("run tools/art-pipeline/build_language.py first")
        shutil.copy(candidate, os.path.join(language_dest, name))

    # tracks.dat carries the track artwork itself, not design previews: OpenRCT2
    # authored complete open sprite sets for the coaster types it added (hybrid,
    # single rail, alpine, lattice triangle and others) and split them out of g2.dat.
    # Without it those rides draw no track at all. It is the largest item in the
    # download and it is not optional.
    # The window colour theme, installed into the player's theme directory by the
    # product shell at start-up. Shipped inside the content pack so it versions with
    # the rest of the interface.
    theme_source = os.path.join(GENERATED, "ui", "Ridemere.json")
    if not os.path.exists(theme_source):
        raise SystemExit("run tools/art-pipeline/build_ui_theme.py first")
    os.makedirs(os.path.join(PACK, "themes"), exist_ok=True)
    shutil.copy(theme_source, os.path.join(PACK, "themes", "Ridemere.json"))

    # Our own sprite font, built by build_fonts.py.
    ridemere_font = os.path.join(GENERATED, "base", "fonts.dat")
    if not os.path.exists(ridemere_font):
        raise SystemExit("run tools/art-pipeline/build_fonts.py first")
    shutil.copy(ridemere_font, os.path.join(PACK, "fonts.dat"))

    # Our g2.dat: OpenRCT2's interface sprites with its branding replaced by ours.
    ridemere_g2 = os.path.join(GENERATED, "base", "g2.dat")
    if not os.path.exists(ridemere_g2):
        raise SystemExit("run tools/art-pipeline/build_g2.py first")
    shutil.copy(ridemere_g2, os.path.join(PACK, "g2.dat"))

    for name in ("palettes.dat", "tracks.dat"):
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

    # Open third-party objects, copied out of the official collection.
    import zipfile
    objects_zip = os.path.join(REPO, ".cache", "assets", "objects.zip")
    if BUNDLED_OPEN_OBJECTS and os.path.exists(objects_zip):
        with zipfile.ZipFile(objects_zip) as archive:
            for identifier, member in BUNDLED_OPEN_OBJECTS.items():
                target = os.path.join(PACK, "object", f"{identifier}.parkobj")
                with archive.open(member) as source, open(target, "wb") as handle:
                    shutil.copyfileobj(source, handle)
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
        "stationObjects": STATION_OBJECTS,
        "languages": list(BUNDLED_LOCALES),
        "defaultTheme": "Ridemere",
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
