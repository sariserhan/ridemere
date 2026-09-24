"""Assert that development scenes cannot reach the player.

    .cache/venv/bin/python tools/art-pipeline/check_scenario_visibility.py [pack dir]

The separation is structural rather than a filter. The engine's scenario repository
scans exactly one directory per base path, `<base>/Scenarios`
(`PlatformEnvironment.cpp`, `DirId::scenarios`), and never a sibling of it. So a
development scene shipped in `DevScenarios` is invisible to the selector because the
code that builds the selector never looks there, not because anything examined its
name. A scene cannot become visible by being renamed, and cannot be hidden by
accident: a scenario with no declared visibility is treated as a release scenario.

This checks the three things that separation depends on:

    every scenario description declares its visibility
    every development scene is in DevScenarios and in no other scenario directory
    the web shell offers no development scene to a player

The last one matters because the shell opens scenarios by path and could reach one
directly, which is exactly the mistake this is here to catch.
"""

from __future__ import annotations

import json
import os
import re
import sys
import zipfile
from typing import List

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENARIO_SOURCES = os.path.join(REPO, "assets", "scenarios")
SHELL_RUNTIME = os.path.join(REPO, "web", "src", "lib", "game", "runtime.ts")
SHELL_SELECTOR = os.path.join(REPO, "web", "src", "app", "parks", "page.tsx")
SHELL_ASSETS = os.path.join(REPO, "web", "public", "game", "assets.zip")

problems: List[str] = []


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    standalone = os.path.join(pack, "standalone")
    release_dir = os.path.join(standalone, "Scenarios")
    development_dir = os.path.join(standalone, "DevScenarios")

    release = set()
    development = set()
    for name in sorted(os.listdir(SCENARIO_SOURCES)):
        description_path = os.path.join(SCENARIO_SOURCES, name, "scenario.json")
        if not os.path.exists(description_path):
            continue
        with open(description_path, "r", encoding="utf-8") as handle:
            description = json.load(handle)
        visibility = description.get("visibility")
        if visibility is None:
            problems.append(f"{name}: no visibility declared; say 'release' or 'development'")
            continue
        if visibility not in ("release", "development"):
            problems.append(f"{name}: visibility is {visibility!r}, expected 'release' or 'development'")
            continue
        (development if visibility == "development" else release).add(name)

    shipped_release = {
        entry[: -len(".park")]
        for entry in os.listdir(release_dir)
        if entry.endswith(".park")
    } if os.path.isdir(release_dir) else set()
    shipped_development = {
        entry[: -len(".park")]
        for entry in os.listdir(development_dir)
        if entry.endswith(".park")
    } if os.path.isdir(development_dir) else set()

    for name in sorted(development):
        if name in shipped_release:
            problems.append(f"{name} is a development scene but is shipped in Scenarios, where the selector finds it")
        if name not in shipped_development:
            problems.append(f"{name} is a development scene but was not shipped in DevScenarios")
    for name in sorted(release):
        if name in shipped_development:
            problems.append(f"{name} is a release scenario but was shipped in DevScenarios, so a player cannot start it")

    manifest_path = os.path.join(standalone, "standalone.json")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as handle:
            manifest = json.load(handle)
        declared = set(manifest.get("developmentScenarios", []))
        if declared != development:
            problems.append(
                f"the manifest lists {sorted(declared)} as development scenes, the descriptions say {sorted(development)}")

    # The scenario selector is the other place a name could reach a player.
    if os.path.exists(SHELL_SELECTOR):
        with open(SHELL_SELECTOR, "r", encoding="utf-8") as handle:
            selector = handle.read()
        listed = set(re.findall(r'id:\s*"([a-z0-9-]+)"', selector))
        for name in sorted(listed & development):
            problems.append(f"the scenario selector offers the development scene {name}")
        missing = release - listed
        if missing:
            problems.append(
                f"release scenarios that the selector does not offer: {sorted(missing)}")

    if os.path.exists(SHELL_RUNTIME):
        with open(SHELL_RUNTIME, "r", encoding="utf-8") as handle:
            source = handle.read()
        offered = set(re.findall(r'"([a-z0-9-]+)":\s*"/OpenRCT2/standalone/', source))
        for name in sorted(offered & development):
            problems.append(f"the web shell offers the development scene {name} to players")
        if "DevScenarios" in source:
            problems.append("the web shell names the DevScenarios directory; a player route must not reach it")

    # The player build should not carry development content at all. The engine could
    # not list it in any case, but payload nobody will ever load is still payload, and
    # a path that exists is a path somebody can eventually guess.
    if os.path.exists(SHELL_ASSETS):
        with zipfile.ZipFile(SHELL_ASSETS) as archive:
            carried = [n for n in archive.namelist() if "DevScenarios/" in n and n.endswith(".park")]
        if carried:
            problems.append(
                f"the synced player build carries {len(carried)} development scene(s): {sorted(carried)}")
        else:
            print(f"the synced player build carries no development scenes ({os.path.basename(SHELL_ASSETS)})")

    print("scenarios:")
    for name in sorted(release):
        print(f"  release      {name}")
    for name in sorted(development):
        print(f"  development  {name}")

    if problems:
        print("FAIL: development scenes are not properly separated:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print("every scenario declares its visibility and development scenes ship where the selector cannot see them.")


if __name__ == "__main__":
    main()
