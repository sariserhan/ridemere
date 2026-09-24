"""Write the development scenery scenes from the object tables.

    .cache/venv/bin/python tools/art-pipeline/build_art_scenes.py

Two scenes, both development only:

**world-art-test** gains every new object, laid out so each one can be found: a row of
vegetation, a row of park scenery, a run of each fence and wall, examples beside
paths, beside the ride, and a small planted corner. A scene nobody can navigate is a
scene nobody checks.

**scenery-density-test** is one deliberately crowded area, for answering how much
scenery can be on screen before a park stops being readable — and for measuring what
that costs.

Written from the same tables the objects are built from, so an object added there
appears in both scenes without anybody remembering to add it.
"""

from __future__ import annotations

import json
import os
import sys
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_scenery_objects as objects  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENARIOS = os.path.join(REPO, "assets", "scenarios")

SMALL = [spec[0] for spec in objects.SMALL_SCENERY]
WALLS = [spec[0] for spec in objects.WALLS]
GROUPS = [spec[0] for spec in objects.GROUPS]
ADDITIONS = ["sunrise.footpath_item.bench", "sunrise.footpath_item.bin"]


def grid(names, start_x: int, y: int, step: int = 2):
    """One object per position along a row, four quadrants of nothing between them."""
    return [{"object": name, "tiles": [[start_x + index * step, y, 0]]}
            for index, name in enumerate(names)]


def load(name: str) -> OrderedDict:
    with open(os.path.join(SCENARIOS, name, "scenario.json"), "r", encoding="utf-8") as handle:
        return json.load(handle, object_pairs_hook=OrderedDict)


def save(name: str, description: OrderedDict) -> None:
    directory = os.path.join(SCENARIOS, name)
    os.makedirs(directory, exist_ok=True)
    with open(os.path.join(directory, "scenario.json"), "w", encoding="utf-8") as handle:
        handle.write(json.dumps(description, indent=2) + "\n")


def build_world_art_test() -> int:
    description = load("world-art-test")
    for identifier in SMALL + WALLS + GROUPS + ADDITIONS:
        if identifier not in description["objects"]:
            description["objects"].append(identifier)

    # Row 33: every piece of vegetation, in the order the tables declare it.
    vegetation = [name for name in SMALL if any(
        key in name for key in (".tree_", ".shrub_", ".flowers_", ".ornamental_grass", ".ground_planting"))]
    park = [name for name in SMALL if name not in vegetation]

    scenery = grid(vegetation, 4, 33)
    scenery += grid(park, 4, 31)

    # Two rows in the empty south-east corner: the pieces that look different from
    # each side, each placed four times,
    # once per direction. A tile is [x, y, quadrant, rotation], so the turn goes in
    # the fourth position; putting it in the third rotates nothing and moves the
    # object into a different corner of its tile instead. The rest of the scene is built at direction zero, which
    # means a save that dropped orientation, or a model built off the rotation
    # origin, would pass through it without leaving a mark.
    ROTATED = ["sign_direction", "sign_board", "accent_arch", "prop_banner",
               "prop_picnic_table", "prop_clock"]
    rotation_row = []
    for index, stem in enumerate(ROTATED):
        name = f"sunrise.scenery_small.{stem}"
        if name not in SMALL:
            continue
        rotation_row.append({"object": name,
                             "tiles": [[20 + (index % 3) * 5 + turn, 36 if index < 3 else 38, 0, turn]
                                       for turn in range(4)]})
    scenery += rotation_row

    # A planted corner: several objects sharing tiles by quadrant, which is how a
    # garden is actually made and the only place the quadrant handling is exercised.
    # Quarter-tile objects only: a full-tile one cannot share a tile, and asking it to
    # is how this block fills up with refusals that mean nothing.
    quarter = [name for name in vegetation
               if name not in ("sunrise.scenery_small.shrub_hedge",
                               "sunrise.scenery_small.ground_planting")]
    # Four objects to a tile, one per quadrant, which is the only place the quadrant
    # handling is exercised: giving each object a tile of its own, as this block used
    # to, tests nothing. Two tiles well clear of the coaster, whose track reached the
    # ground this block first stood on and refused two of it.
    corner = []
    for index, name in enumerate(quarter[:8]):
        corner.append({"object": name, "tiles": [[34 + (index // 4), 30, index % 4]]})
    scenery += corner

    # Beside the path, beside the ride: the two places readability actually matters.
    # Beside it, not on it — the earlier version of this block put half of its pieces
    # on path tiles, where the engine refused them, and a refusal in a test scene is
    # a piece nobody ever looks at. The main east-west path runs along y = 22, so
    # these sit in the rows either side of it and are the test of whether a lamp or a
    # canopy hides where guests walk.
    scenery.append({"object": "sunrise.scenery_small.lamp_tall",
                    "tiles": [[18, 21, 0], [22, 21, 0], [18, 23, 0], [22, 23, 0]]})
    scenery.append({"object": "sunrise.scenery_small.tree_ornamental",
                    "tiles": [[26, 21, 0], [28, 21, 0], [26, 23, 0], [28, 23, 0]]})

    walls = []
    for index, name in enumerate(WALLS):
        # A straight run, then a corner, so junction behaviour is visible.
        tiles = [[4 + index * 8 + step, 29, 0] for step in range(4)]
        tiles += [[4 + index * 8 + 3, 29, 1], [4 + index * 8 + 3, 28, 1]]
        walls.append({"object": name, "tiles": tiles})

    # Open on the rows, not on the map centre: a scene whose contents are off screen
    # is a scene nobody looks at.
    description["view"] = OrderedDict(x=16, y=30)
    description["scenery"] = scenery
    description["walls"] = walls
    description["pathAdditions"] = [
        {"object": "sunrise.footpath_item.bench", "tiles": [[20, 21], [20, 19]]},
        {"object": "sunrise.footpath_item.bin", "tiles": [[20, 17]]},
    ]
    save("world-art-test", description)
    return sum(len(item["tiles"]) for item in scenery) + sum(len(item["tiles"]) for item in walls)


#: The one row of the planted block left as path, so guests can walk through it.
CORRIDOR = 18


def build_density_test() -> int:
    """One crowded block. Deliberately more scenery than a park would ever carry.

    Quarter-tile objects go four to a tile; the ones that claim a whole tile get a
    tile each, in their own band. Cycling everything through the quadrant loop asked
    a hedge to share a tile with three trees two hundred and twenty-four times, and
    the engine refused every one of them — a ceiling measurement should be made of
    scenery that is actually on the map.
    """
    quarter = [spec[0] for spec in objects.SMALL_SCENERY if spec[5] == "1/4"]
    whole = [spec[0] for spec in objects.SMALL_SCENERY if spec[5] != "1/4"]

    # Row 18 is left clear for a path straight through the middle. A ceiling
    # measurement that guests cannot walk into measures the drawing and nothing else,
    # and the one thing scenery does to the simulation is something a guest has to be
    # standing next to it to feel.
    scenery = []
    index = 0
    for x in range(10, 26):
        for y in (y for y in range(10, 26) if y != CORRIDOR):
            for quadrant in range(4):
                scenery.append({"object": quarter[index % len(quarter)],
                                "tiles": [[x, y, quadrant]]})
                index += 1
    for offset, y in enumerate(range(28, 32)):
        for x in range(10, 26):
            scenery.append({"object": whole[(offset * 16 + x) % len(whole)],
                            "tiles": [[x, y, 0]]})

    walls = []
    for wall_index, name in enumerate(WALLS):
        tiles = [[8, y, 0] for y in range(10, 26) if y != CORRIDOR] if wall_index == 0 else \
                [[27, y, 2] for y in range(10, 26) if y != CORRIDOR] if wall_index == 1 else \
                [[x, 27, 1] for x in range(10, 26)]
        walls.append({"object": name, "tiles": tiles})

    description = OrderedDict(
        name="Scenery Density Test",
        details=("A development scene packed with far more scenery than a park would "
                 "carry, for measuring readability and cost. Not a release scenario."),
        visibility="development",
        mapTiles=40,
        initialCash=500000,
        objectiveGuests=10,
        breakdowns=False,
        pathSurface="sunrise.footpath_surface.paved",
        queueSurface="sunrise.footpath_surface.queue",
        pathRailings="sunrise.footpath_railings.metal",
        view=OrderedDict(x=18, y=18),
        objects=[
            "sunrise.terrain_surface.grass", "sunrise.terrain_surface.dirt",
            "sunrise.terrain_edge.rock", "sunrise.footpath_surface.paved",
            "sunrise.footpath_surface.queue", "sunrise.footpath_railings.metal",
            "sunrise.station.plain", "sunrise.park_entrance.arch",
            "sunrise.peep_names.visitors", "sunrise.climate.temperate",
            "sunrise.peep_animations.guest", "sunrise.peep_animations.handyman",
        ] + SMALL + WALLS + GROUPS,
        owned=OrderedDict(fromX=4, fromY=5, toX=38, toY=38),
        # The way in is the corridor, so a guest walking anywhere at all is walking
        # through the planting. Two things this scene got wrong first, both of which
        # left it with nothing to measure: the entrance sat two tiles inside the owned
        # land, so guests reached owned ground before the entrance, never triggered it
        # and were removed as having wandered off — the scene had no guests in it at
        # all. And when it did, the entrance was at the far end of a long path with
        # the planting down a side turning, and with no rides to stay for the guests
        # simply walked back out again without ever seeing it.
        entrance=OrderedDict(x=3, y=CORRIDOR, direction=2),
        peepSpawn=OrderedDict(x=1, y=CORRIDOR, direction=0),
        paths=[{"from": [1, CORRIDOR], "to": [32, CORRIDOR]}],
        scenery=scenery,
        walls=walls,
    )
    save("scenery-density-test", description)
    return len(scenery) + sum(len(item["tiles"]) for item in walls)


def build_first_park_bare() -> int:
    """First Park with the decoration taken out, and nothing else changed.

    The control for every claim about what decoration does. Comparing First Park with
    the density scene compares two different parks; comparing it with itself compares
    the decoration. Generated from First Park's own description so it cannot drift
    away from the scenario it is the control for.
    """
    description = load("first-park")
    removed = sum(len(item["tiles"]) for item in description.get("scenery", []))
    removed += sum(len(item["tiles"]) for item in description.get("walls", []))
    description.pop("scenery", None)
    description.pop("walls", None)
    description["name"] = "First Park (no decoration)"
    description["details"] = ("First Park with every piece of scenery removed, and "
                              "nothing else changed. The control for the scenery "
                              "checks. Not a release scenario.")
    description["visibility"] = "development"
    save("first-park-bare", description)
    return removed


def main() -> None:
    art = build_world_art_test()
    dense = build_density_test()
    bare = build_first_park_bare()
    print(f"world-art-test: {art} scenery placements")
    print(f"scenery-density-test: {dense} scenery placements")
    print(f"first-park-bare: First Park with {bare} pieces removed")


if __name__ == "__main__":
    main()
