"""Prove the content checks can fail.

    .cache/venv/bin/python tools/art-pipeline/demo_check_failures.py

A check that has never rejected anything is not evidence. This builds broken copies
of the shipped content, each broken in a way that a count or a file listing would not
notice, and asserts that the matching check rejects each one. It changes nothing in
the repository: every copy is made in a temporary directory and deleted.

    1. a stall whose four direction sprites are all the same frame
       — the failure a broken render loop produces, and the one that looks correct
    2. a stall whose direction sprites are blank
       — the placeholder failure
    3. a development scene shipped in Scenarios
       — the failure that puts a test scene in front of a player
    4. a scenery object whose four directions are all the same frame
       — the same render-loop failure, on the objects V1-5 added
    5. a scenery model built off the rotation origin
       — the defect that took half of every stall away in V1-3, caught in the
         renders this time rather than in a screenshot
    6. a build-menu tab icon carrying its world offsets
       — the defect that drew the Nature tab's tree off the top of the screen
    7. a window that opened and drew nothing
       — the defect that let a whole build menu go missing while every assertion
         about it passed
    8. a staff animation one frame too short for the engine event it drives
       — the handyman defect, which mimed sweeping for four milestones
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


def case_identical_scenery_directions(work: str) -> bool:
    pack = copy_pack(work)
    target = os.path.join(pack, "object", "sunrise.scenery_small.lamp_tall.parkobj")

    def mutate(members):
        root = json.loads(members["object.json"])
        first = root["images"][0]["path"]
        for entry in root["images"][1:4]:
            members[entry["path"]] = members[first]
        return members

    rewrite_object(target, mutate)
    print("  a lamp rendered from one angle four times:")
    return run("check_scenery_objects.py", pack) != 0


def case_scenery_off_rotation_origin(work: str) -> bool:
    """One object's renders, with a single rotation slid sideways.

    A model built away from the world origin swings from side to side as the camera
    orbits it, and every frame still looks perfectly good on its own. Shifting one
    frame by twelve pixels reproduces that exactly, and it is the defect that took
    half of every stall away in V1-3.
    """
    import numpy as np
    from PIL import Image

    renders = os.path.join(REPO, "assets", "generated", "world", "scenery")
    with open(os.path.join(renders, "frames.json"), "r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    stem = "sign_direction"
    frames = manifest.get(stem)
    if not frames:
        print(f"  {stem} is not among the renders, so this case cannot be demonstrated")
        return False

    directory = os.path.join(work, "renders")
    os.makedirs(directory)
    for index, file_name in enumerate(frames):
        with Image.open(os.path.join(renders, file_name)) as handle:
            image = np.array(handle.convert("RGBA"))
        if index == 1:
            image = np.roll(image, 12, axis=1)
        Image.fromarray(image).save(os.path.join(directory, file_name))
    with open(os.path.join(directory, "frames.json"), "w", encoding="utf-8") as handle:
        json.dump({stem: frames}, handle)

    print(f"  {stem} with one rotation twelve pixels off the origin:")
    return run("check_rotation_origin.py", directory) != 0


def case_tab_icon_outside_its_widget(work: str) -> bool:
    """A group icon with a tree's world anchor on it.

    A tab is 31 by 28 and draws the sprite at its own corner plus the sprite's own
    offsets. Every other object in the set anchors at the foot of its trunk, so an
    icon that kept those offsets was drawn forty-eight pixels above the tab — off the
    top of the screen — and the tab read as having no icon at all.
    """
    pack = copy_pack(work)
    target = os.path.join(pack, "object", "sunrise.scenery_group.nature.parkobj")

    def mutate(members):
        root = json.loads(members["object.json"])
        root["images"][0]["y"] = -48
        members["object.json"] = json.dumps(root, indent=1).encode()
        return members

    rewrite_object(target, mutate)
    print("  a build-menu tab icon anchored like a tree rather than like an icon:")
    return run("check_scenery_objects.py", pack) != 0


def case_window_that_drew_nothing(work: str) -> bool:
    """A window whose "after" capture is its "before" capture.

    That is what a window which opens and closes itself in the same frame leaves
    behind, and it is what the scenery window did for the whole of V1-5 while the
    sprite audit called it clean.
    """
    source = os.path.join(REPO, "wasm", "test", "results-visual", "menu-rects.json")
    if not os.path.exists(source):
        print("  no window captures on disk; run wasm/test/sceneryaudit.js first")
        return False
    with open(source, "r", encoding="utf-8") as handle:
        entries = json.load(handle)
    if not entries:
        print("  no windows were captured, so this case cannot be demonstrated")
        return False

    for entry in entries:
        entry["after"] = entry["before"]
    rects = os.path.join(work, "menu-rects.json")
    with open(rects, "w", encoding="utf-8") as handle:
        json.dump(entries, handle)

    print("  a build menu whose frame is unchanged by opening it:")
    return run("check_window_drawn.py", rects) != 0


def case_staff_animation_one_frame_short(work: str) -> bool:
    """A repair animation that ends on the frame the engine reads, rather than past it.

    `animationFrameNum` is compared for equality and the action ends when it reaches
    the sequence length, so a sequence of exactly N frames runs 0..N-1 and never hits
    frame N. One frame short is the whole defect, and it looks completely correct: the
    mechanic walks over, plays the animation and walks away.
    """
    pack = copy_pack(work)
    target = os.path.join(pack, "object", "sunrise.peep_animations.mechanic.parkobj")
    if not os.path.exists(target):
        print("  no mechanic in the pack, so this case cannot be demonstrated")
        return False

    def mutate(members):
        root = json.loads(members["object.json"])
        animations = root["animationGroups"][0]["animations"]
        for name in ("staffFix", "staffFix3"):
            animations[name]["sequence"] = animations[name]["sequence"][:-1]
        members["object.json"] = json.dumps(root, indent=1).encode()
        return members

    rewrite_object(target, mutate)
    print("  a mechanic whose repair animations are one frame short:")
    return run("check_staff_animations.py", pack) != 0


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
        ("identical scenery direction sprites", case_identical_scenery_directions),
        ("scenery model off the rotation origin", case_scenery_off_rotation_origin),
        ("tab icon outside its widget", case_tab_icon_outside_its_widget),
        ("a window that drew nothing", case_window_that_drew_nothing),
        ("staff animation one frame short", case_staff_animation_one_frame_short),
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
