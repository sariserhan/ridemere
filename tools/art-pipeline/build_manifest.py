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
        "source": "tools/art-pipeline/build_paths.py",
    },
    "object/sunrise.footpath_surface.queue.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_queue_v1",
        "source": "tools/art-pipeline/build_paths.py",
    },
    "object/sunrise.footpath_railings.plain.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_railings_v1",
        "source": "tools/art-pipeline/build_paths.py",
    },
    "object/sunrise.terrain_surface.sand.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_terrain_sand_v1",
        "source": "assets/source/blender/terrain.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world.py",
    },
    "object/sunrise.terrain_surface.stone.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_terrain_stone_v1",
        "source": "assets/source/blender/terrain.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_world.py",
    },
    "object/sunrise.terrain_edge.rock.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_terrain_edge_rock_v1",
        "source": "tools/art-pipeline/build_world_edges.py",
        "generator": "tools/art-pipeline/build_world_edges.py",
        "notes": "Every pixel is ours. The eighty-four sprite silhouettes are the tile "
                 "side faces under the isometric projection, taken from the shapes in "
                 "openrct2.terrain_edge.void (CC-BY-4.0, OpenRCT2), an object that "
                 "contains no art: each of its sprites is one flat palette index.",
    },
    "object/sunrise.footpath_surface.stone.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_stone_v1",
        "source": "tools/art-pipeline/build_paths.py",
    },
    "object/sunrise.footpath_surface.wood.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_wood_v1",
        "source": "tools/art-pipeline/build_paths.py",
    },
    "object/sunrise.footpath_railings.metal.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_path_railings_metal_v1",
        "source": "tools/art-pipeline/build_paths.py",
        "notes": "Edging, supports and bridge deck for every path style.",
    },
    "object/sunrise.ride.grill_stand.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_shop_food_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_shops.py",
        "notes": "Original food stall; shares the V1 stall silhouette and is told apart by "
                 "its accent colour.",
    },
    "object/sunrise.ride.refreshment_stand.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_shop_drink_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_shops.py",
        "notes": "Original drink stall; shares the V1 stall silhouette and is told apart by "
                 "its accent colour.",
    },
    "object/sunrise.ride.gift_stand.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_shop_souvenir_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_shops.py",
        "notes": "Original souvenir stall; shares the V1 stall silhouette and is told apart by "
                 "its accent colour.",
    },
    # Vegetation and park scenery. Recorded per object, and by component rather than
    # by picture: the source of a tree is a trunk form, a canopy form and a material
    # preset, not the PNG that fell out of the renderer.
    "object/sunrise.scenery_small.": {
        **ORIGINAL,
        "asset": "sunrise_scenery_v1",
        "source": "assets/source/blender/scenery.py",
        "generator": "tools/art-pipeline/build_scenery_objects.py",
        "notes": "Original vegetation and park scenery, assembled in Blender from "
                 "shared components (trunk, canopy form, flower heads, post rows) and "
                 "coloured through the vegetation palette in world_palette.py. Every "
                 "model is built on the world origin; check_rotation_origin.py "
                 "enforces it. No RollerCoaster Tycoon material of any kind.",
    },
    "object/sunrise.scenery_wall.": {
        **ORIGINAL,
        "asset": "sunrise_scenery_walls_v1",
        "source": "assets/source/blender/scenery.py",
        "generator": "tools/art-pipeline/build_scenery_objects.py",
        "notes": "Original fences and a low stone wall. Six sprites each: two "
                 "orientations, flat and tilted onto each slope, all rendered rather "
                 "than derived from the flat one.",
    },
    "object/sunrise.scenery_group.": {
        **ORIGINAL,
        "asset": "sunrise_scenery_groups_v1",
        "source": "tools/art-pipeline/build_scenery_objects.py",
        "generator": "tools/art-pipeline/build_scenery_objects.py",
        "notes": "The build-menu tabs. Each carries one icon, rendered from a member "
                 "object, so no separate icon art exists to go stale.",
    },
    "object/sunrise.footpath_item.bench.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_bench_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "tools/art-pipeline/build_scenery.py",
        "notes": "Original bench. Painted metal frame and timber seat, taking their "
                 "ramps from the same world palette as the railings and the wooden "
                 "path so it looks like it came with the park.",
    },
    "object/sunrise.footpath_item.bin.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_litter_bin_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "tools/art-pipeline/build_scenery.py",
        "notes": "Original litter bin, with real empty, full and knocked-over art "
                 "rather than a recolour, because the engine indexes a sprite for "
                 "each of those states whether or not the game can reach it.",
    },
    "object/sunrise.ride.restroom.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_facility_restroom_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_shops.py",
        "notes": "Original restroom; shares the V1 stall silhouette and is told apart by "
                 "its accent colour.",
    },
    "object/sunrise.ride.information_point.parkobj": {
        **ORIGINAL,
        "asset": "sunrise_facility_information_v1",
        "source": "assets/source/blender/world_props.py",
        "generator": "blender 4.2 + tools/art-pipeline/build_shops.py",
        "notes": "Original information kiosk; shares the V1 stall silhouette and is told apart by "
                 "its accent colour.",
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
    "standalone/DevScenarios/world-art-test.park": {
        **ORIGINAL,
        "asset": "sunrise_world_art_test_v1",
        "source": "assets/scenarios/world-art-test/scenario.json",
        "generator": "engine park builder via tools/art-pipeline/build_scenario.py",
        "notes": "A development scene that shows every world material, slope, edge and "
                 "path combination in one view. Shipped in DevScenarios, which the "
                 "engine's scenario repository never scans, so it cannot reach the "
                 "player-facing selector.",
    },
    "standalone/DevScenarios/scenery-density-test.park": {
        **ORIGINAL,
        "asset": "sunrise_scenery_density_test_v1",
        "source": "assets/scenarios/scenery-density-test/scenario.json",
        "generator": "engine park builder via tools/art-pipeline/build_scenario.py, "
                     "written by tools/art-pipeline/build_art_scenes.py",
        "notes": "A development scene packed with far more scenery than a park would "
                 "carry, for measuring readability and rendering cost.",
    },
    "standalone/DevScenarios/needs-test.park": {
        **ORIGINAL,
        "asset": "sunrise_needs_test_v1",
        "source": "assets/scenarios/needs-test/scenario.json",
        "generator": "engine park builder via tools/art-pipeline/build_scenario.py",
        "notes": "A development scene for the guest-need loop. Every stall ships "
                 "closed so an alert has to raise before it can clear. Shipped in "
                 "DevScenarios and stripped from the player build entirely.",
    },
    "standalone/DevScenarios/sunrise-test.park": {
        **ORIGINAL,
        "asset": "sunrise_test_park_v1",
        "source": "assets/scenarios/sunrise-test/scenario.json",
        "generator": "engine park builder via tools/art-pipeline/build_scenario.py",
        "notes": "A development park that exercises the runtime end to end. Moved to "
                 "DevScenarios in V1-4 when First Park replaced it as the scenario a "
                 "player starts.",
    },
    "standalone/Scenarios/first-park.park": {
        **ORIGINAL,
        "asset": "sunrise_first_park_v1",
        "source": "assets/scenarios/first-park/scenario.json",
        "generator": "engine park builder via tools/art-pipeline/build_scenario.py",
        "notes": "The first release scenario. Built from its description by the "
                 "engine's own game actions, so the generated park is output and the "
                 "description is the source.",
    },
    "ui/": {
        **ORIGINAL,
        "asset": "sunrise_ui_sprites_v1",
        "source": "tools/art-pipeline/build_ui_sprites.py",
        "notes": "Interface icons drawn from shapes in code.",
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
    "object/openrct2.ride.hybrid_coaster.parkobj": {
        "asset": "openrct2_hybrid_coaster",
        "creator": "Edward Calver",
        "license": "CC-BY-4.0",
        "source": "https://github.com/OpenRCT2/objects (official collection v1.7.11)",
        "modified": False,
        "notes": "Track art comes from the open tracks.dat; the object supplies the "
                 "train sprites. No original-game material; attribution required.",
    },
    "standalone/Data/g1.dat": {
        **ORIGINAL,
        "asset": "sunrise_base_archive_v1",
        "source": "tools/art-pipeline/build_base_archive.py",
        "generator": "libsawyer gxc 1.4.0 (MIT) from original marker art",
        "notes": "Full-size base sprite archive. Unfilled entries carry a diagnostic marker.",
    },
    "g2.dat": {
        "asset": "openrct2_extra_sprites_rebranded",
        "creator": "OpenRCT2 contributors, with Project Sunrise replacements",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/g2",
        "modified": True,
        "notes": "OpenRCT2's own interface sprites, rebuilt with its three branding "
                 "sprites replaced by our own mark. Everything else is unchanged "
                 "GPL-3.0 OpenRCT2 art.",
    },
    "fonts.dat": {
        **ORIGINAL,
        "asset": "ridemere_sprite_font_v1",
        "source": "tools/art-pipeline/build_fonts.py",
        "generator": "Pillow rendering of Liberation Sans, packed with libsawyer gxc",
        "notes": "Our own sprite font. Glyphs are rendered from Liberation Sans "
                 "(SIL Open Font License 1.1) into the boxes the engine reserves, flat "
                 "with a shadow rather than bevelled. The few non-codepoint symbols "
                 "upstream draws by hand are kept, and are GPL-3.0 OpenRCT2 art.",
    },
    "palettes.dat": {
        "asset": "openrct2_palettes",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/palettes",
        "modified": False,
    },
    "tracks.dat": {
        "asset": "openrct2_track_artwork",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/resources/tracks (8,685 sprites)",
        "modified": False,
        "notes": "The track artwork itself, not design previews. Complete open sprite "
                 "sets for the coaster types OpenRCT2 added, plus pieces added to "
                 "older types. Rides that use it draw no track without it.",
    },
    "language/": {
        "asset": "openrct2_language_files",
        "creator": "OpenRCT2 contributors",
        "license": "GPL-3.0",
        "source": "engine/openrct2/data/language",
        "modified": False,
        "modified": True,
        "notes": "English only in the prototype, with the upstream product name "
                 "replaced by ours in 41 places by build_language.py. Ride and scenery "
                 "names are untouched and remain a rebranding surface.",
    },
    "themes/": {
        **ORIGINAL,
        "asset": "ridemere_window_theme_v1",
        "source": "tools/art-pipeline/build_ui_theme.py",
        "notes": "Window colours for every class in the engine's descriptor table.",
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

#: Object identifier namespaces that denote original-game content. Matched against
#: the START of a file's name, so that "openrct2.ride.hybrid_coaster" (an open object
#: from the OpenRCT2 collection) is not mistaken for "rct2.ride.something".
FORBIDDEN_OBJECT_PREFIXES = (
    "rct1.", "rct1aa.", "rct1ll.", "rct1beta.",
    "rct2.", "rct2ww.", "rct2tt.", "rct2dlc.", "rctc.",
)

#: Original-game data filenames. The standalone pack ships its own Data/g1.dat, which
#: is an original replacement rather than the original file, so it is exempt by path.
FORBIDDEN_FILENAMES = ("csg1.dat", "csg1i.dat", "ch.dat")
FORBIDDEN_FILENAME_PREFIXES = ("css",)
EXEMPT_PATHS = ("standalone/Data/g1.dat",)


def is_forbidden(relative: str) -> bool:
    if relative in EXEMPT_PATHS:
        return False
    name = relative.rsplit("/", 1)[-1].lower()
    if any(name.startswith(prefix) for prefix in FORBIDDEN_OBJECT_PREFIXES):
        return True
    if name in FORBIDDEN_FILENAMES:
        return True
    if any(name.startswith(prefix) for prefix in FORBIDDEN_FILENAME_PREFIXES) and name.endswith(".dat"):
        return True
    # An original-game sprite archive anywhere other than our own pack directory.
    if name == "g1.dat":
        return True
    return False


def digest(path: str) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            sha.update(block)
    return sha.hexdigest()


def lookup(relative: str) -> dict | None:
    if relative in RECORDS:
        return RECORDS[relative]
    # A key ending in "/" covers a directory; one ending in "." covers a family of
    # objects sharing an identifier prefix, which is how thirty-five procedurally
    # assembled scenery objects are declared once rather than thirty-five times.
    best = None
    for prefix, record in RECORDS.items():
        if prefix.endswith(("/", ".")) and relative.startswith(prefix):
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
            if is_forbidden(relative):
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
