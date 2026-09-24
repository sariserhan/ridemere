"""Prove the V1-3 checks can fail.

    .cache/venv/bin/python tools/art-pipeline/demo_check_failures.py

A check that has never rejected anything is not evidence. This builds three broken
copies of the shipped content, each broken in a way that a count or a file listing
would not notice, and asserts that the matching check rejects each one. It changes
nothing in the repository: every copy is made in a temporary directory and deleted.

    1. a stall whose four direction sprites are all the same frame
       — the failure a broken render loop produces, and the one that looks correct
    2. a stall whose direction sprites are blank
       — the placeholder failure
    3. a development scene shipped in Scenarios
       — the failure that puts a test scene in front of a player
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PACK = os.path.join(REPO, "assets", "generated", "pack")
PYTHON = sys.executable


def copy_pack(destination: str) -> str:
    pack = os.path.join(destination, "pack")
    shutil.copytree(PACK, pack)
    return pack


def rewrite_object(path: str, mutate) -> None:
    """Rewrite a .parkobj through a temporary archive, applying `mutate` to its members."""
    with zipfile.ZipFile(path) as archive:
        members = {name: archive.read(name) for name in archive.namelist()}
    members = mutate(members)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in members.items():
            archive.writestr(name, data)


def run(script: str, pack: str) -> int:
    result = subprocess.run(
        [PYTHON, os.path.join(REPO, "tools", "art-pipeline", script), pack],
        capture_output=True, text=True)
    sys.stdout.write("".join(f"    {line}\n" for line in result.stdout.strip().splitlines()[-4:]))
    return result.returncode


def case_identical_directions(work: str) -> bool:
    pack = copy_pack(work)
    target = os.path.join(pack, "object", "sunrise.ride.grill_stand.parkobj")

    def mutate(members):
        root = json.loads(members["object.json"])
        first = root["images"][3]["path"]
        for entry in root["images"][4:7]:
            members[entry["path"]] = members[first]
        return members

    rewrite_object(target, mutate)
    print("  a stall rendered from one angle four times:")
    return run("check_shop_objects.py", pack) != 0


def case_blank_directions(work: str) -> bool:
    pack = copy_pack(work)
    target = os.path.join(pack, "object", "sunrise.ride.restroom.parkobj")
    blank = None

    def mutate(members):
        nonlocal blank
        root = json.loads(members["object.json"])
        # A one-by-one transparent PNG: the smallest thing that still parses.
        import io
        import numpy as np
        from PIL import Image
        image = Image.fromarray(np.zeros((32, 32), dtype="uint8"), mode="P")
        image.putpalette([0, 0, 0] * 256)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        blank = buffer.getvalue()
        for entry in root["images"][3:7]:
            members[entry["path"]] = blank
        return members

    rewrite_object(target, mutate)
    print("  a facility whose direction sprites are empty:")
    return run("check_shop_objects.py", pack) != 0


def case_development_scene_in_scenarios(work: str) -> bool:
    pack = copy_pack(work)
    standalone = os.path.join(pack, "standalone")
    development = os.path.join(standalone, "DevScenarios")
    entries = [e for e in os.listdir(development) if e.endswith(".park")] if os.path.isdir(development) else []
    if not entries:
        print("  no development scene is shipped, so this case cannot be demonstrated")
        return False
    shutil.copy(os.path.join(development, entries[0]), os.path.join(standalone, "Scenarios", entries[0]))
    print(f"  the development scene {entries[0]} shipped where the selector finds it:")
    return run("check_scenario_visibility.py", pack) != 0


def main() -> None:
    cases = [
        ("identical direction sprites", case_identical_directions),
        ("blank direction sprites", case_blank_directions),
        ("development scene in Scenarios", case_development_scene_in_scenarios),
    ]
    results = []
    for name, case in cases:
        with tempfile.TemporaryDirectory(prefix="ridemere-demo-") as work:
            rejected = case(work)
        results.append((name, rejected))
        print(f"  -> {'rejected, as it should be' if rejected else 'ACCEPTED, the check is useless'}\n")

    if all(rejected for _, rejected in results):
        print("every check rejected the artefact it exists to catch.")
        return
    print("FAIL: a check accepted content it should have rejected:")
    for name, rejected in results:
        if not rejected:
            print(f"  {name}")
    sys.exit(1)


if __name__ == "__main__":
    main()
