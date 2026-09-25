"""Assert every staff animation is long enough to reach the engine event it drives.

    .cache/venv/bin/python tools/art-pipeline/check_staff_animations.py [pack dir]

This is the handyman lesson, written down so it cannot happen again.

`Peep::updateActionAnimation` (Peep.cpp) increments `animationFrameNum` once per update
and ends the action when it reaches `frameOffsets.size()`. The staff code then does
things like

    if (animationFrameNum != actionFrame) return false;
    vehicle->flags.unset(VehicleFlag::carIsBroken);

and nothing anywhere checks that the animation is long enough to reach `actionFrame`. A
short animation does not fail: it plays to its end, `isActionWalking()` becomes true, the
substate reports success, and the event never happened. The handyman mimed sweeping from
M3 to V1-4 for exactly this reason — his sweep was five frames and the litter is removed
on frame eight.

So the rule is: **a sequence must be longer than the highest frame number the engine
reads from it.** An event on frame N needs N + 1 entries.

The frame numbers are not written down here. They are read out of `entity/Staff.cpp`,
because a table kept by hand is a table that goes stale the first time upstream changes
one. If the parse stops finding what it expects, this fails rather than passing quietly.

A frame that only plays a sound is reported but not required: missing it costs a sound
effect, not a simulation event.
"""

from __future__ import annotations

import json
import os
import re
import sys
import zipfile
from typing import Dict, List, Set, Tuple

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STAFF_SOURCE = os.path.join(REPO, "engine", "openrct2", "src", "openrct2", "entity", "Staff.cpp")

#: Animations we know carry an engine event, so a parse that loses one is a broken
#: parse rather than an engine that changed. Checked after parsing, not used instead
#: of it: the frame numbers still come from the source.
EXPECTED_EVENT_ANIMATIONS = {
    "staffSweep", "staffEmptyBin", "staffFix", "staffFix2", "staffFix3", "staffFixGround",
}

#: What each staff object has to be able to do. Animations with no intermediate event
#: still have to exist and still have to have a sequence — a substate that waits for
#: the animation to end never ends if there is no animation.
REQUIRED_ANIMATIONS = {
    "handyman": ["walking", "staffSweep", "staffEmptyBin", "staffWatering", "staffMower"],
    "mechanic": ["walking", "staffAnswerCall", "staffAnswerCall2", "staffCheckBoard",
                 "staffFix", "staffFix2", "staffFix3", "staffFixGround"],
}

problems: List[str] = []


def function_bodies(source: str) -> List[Tuple[str, str]]:
    """Split Staff.cpp into (name, body) by brace matching from each member definition."""
    out = []
    for match in re.finditer(r"\b(?:bool|void|int32_t|uint8_t)\s+Staff::(\w+)\s*\([^)]*\)[^;{]*\{", source):
        name = match.group(1)
        depth, index = 0, match.end() - 1
        while index < len(source):
            if source[index] == "{":
                depth += 1
            elif source[index] == "}":
                depth -= 1
                if depth == 0:
                    break
            index += 1
        out.append((name, source[match.end(): index]))
    return out


def guarded_statement(body: str, start: int) -> str:
    """The code a frame comparison guards, so a sound can be told from an event."""
    tail = body[start: start + 400]
    brace = tail.find("{")
    newline = tail.find("\n")
    if brace != -1 and (newline == -1 or brace < newline + 3):
        depth, index = 0, brace
        while index < len(tail):
            if tail[index] == "{":
                depth += 1
            elif tail[index] == "}":
                depth -= 1
                if depth == 0:
                    return tail[brace: index + 1]
            index += 1
        return tail
    return tail[: tail.find(";") + 1] if ";" in tail else tail


def parse_event_frames() -> Tuple[Dict[str, int], Dict[str, int]]:
    """animation -> highest frame the engine reads, for events and for sounds."""
    with open(STAFF_SOURCE, "r", encoding="utf-8") as handle:
        source = handle.read()

    events: Dict[str, int] = {}
    sounds: Dict[str, int] = {}

    for name, body in function_bodies(source):
        # Every action this function can put the peep into.
        actions: Set[str] = set()
        for assignment in re.finditer(r"action\s*=\s*([^;]+);", body):
            actions.update(re.findall(r"PeepActionType::(\w+)", assignment.group(1)))
        if not actions:
            continue

        def record(animation: str, frame: int, statement: str) -> None:
            is_sound = "Audio::Play" in statement and "ride." not in statement \
                and "flags.unset" not in statement and "return" not in statement
            table = sounds if is_sound else events
            table[animation] = max(table.get(animation, -1), frame)

        # actionFrame = (action == PeepActionType::A) ? V : W;
        for ternary in re.finditer(
                r"=\s*\(\s*action\s*==\s*PeepActionType::(\w+)\s*\)\s*\?\s*(0x[0-9a-fA-F]+|\d+)"
                r"\s*:\s*(0x[0-9a-fA-F]+|\d+)", body):
            named, first, second = ternary.group(1), int(ternary.group(2), 0), int(ternary.group(3), 0)
            others = actions - {named}
            record(named, first, "ternary")
            for other in others:
                record(other, second, "ternary")

        # if (animationFrameNum == N) / != N, possibly with an action test beside it.
        for comparison in re.finditer(
                r"if\s*\(([^)]*animationFrameNum\s*(?:==|!=)[^)]*)\)", body):
            condition = comparison.group(1)
            frames = [int(value, 0) for value in
                      re.findall(r"animationFrameNum\s*(?:==|!=)\s*(0x[0-9a-fA-F]+|\d+)", condition)]
            if not frames:
                continue
            named = re.findall(r"action\s*==\s*PeepActionType::(\w+)", condition)
            targets = set(named) if named else actions
            statement = guarded_statement(body, comparison.end())
            for animation in targets:
                for frame in frames:
                    record(animation, frame, statement)

    return events, sounds


def object_animations(path: str) -> Dict[str, int]:
    with zipfile.ZipFile(path) as archive:
        root = json.loads(archive.read("object.json"))
    groups = root.get("animationGroups", [])
    if not groups:
        return {}
    return {name: len(entry.get("sequence", []))
            for name, entry in groups[0].get("animations", {}).items()}


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    directory = os.path.join(pack, "object")
    if not os.path.isdir(directory):
        raise SystemExit(f"no objects in {directory}")

    events, sounds = parse_event_frames()
    missing = EXPECTED_EVENT_ANIMATIONS - set(events)
    if missing:
        raise SystemExit(
            "the engine parse found no event frame for " + ", ".join(sorted(missing))
            + f" — {os.path.relpath(STAFF_SOURCE, REPO)} has changed shape and this check "
              "needs rereading, not relaxing")

    print("staff animation event frames, read from the engine:")
    for animation in sorted(events):
        note = f", sound to {sounds[animation]}" if animation in sounds else ""
        print(f"  {animation:20} event on frame {events[animation]:3}  "
              f"needs {events[animation] + 1:3} frames{note}")

    checked = 0
    for staff, required in sorted(REQUIRED_ANIMATIONS.items()):
        path = os.path.join(directory, f"sunrise.peep_animations.{staff}.parkobj")
        if not os.path.exists(path):
            problems.append(f"{staff}: no object in the pack")
            continue
        animations = object_animations(path)
        checked += 1
        print(f"  {staff}: {len(animations)} animations")

        for animation in required:
            length = animations.get(animation)
            if length is None:
                problems.append(f"{staff}: has no {animation} animation")
                continue
            if length < 1:
                problems.append(f"{staff}: {animation} has an empty sequence")
                continue
            event = events.get(animation)
            if event is not None and length <= event:
                problems.append(
                    f"{staff}: {animation} is {length} frames and the engine reads frame "
                    f"{event} from it, so the event never happens and the animation still "
                    f"looks right")

        # Anything else the object ships still has to clear its own event frame.
        for animation, length in animations.items():
            if animation in required:
                continue
            event = events.get(animation)
            if event is not None and length <= event:
                problems.append(
                    f"{staff}: {animation} is {length} frames against an event on frame {event}")

    if problems:
        print("FAIL: a staff animation cannot reach its engine event:")
        for problem in problems:
            print(f"  {problem}")
        sys.exit(1)
    print(f"{checked} staff objects, every animation long enough for the frame the engine reads.")


if __name__ == "__main__":
    main()
