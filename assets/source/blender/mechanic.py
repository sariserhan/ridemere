"""Project Sunrise — original mechanic staff peep source.

    blender -b --python assets/source/blender/mechanic.py -- --out <dir>

The same figure and rig as the guest and the handyman (assets/source/blender/guest.py),
so staff read as one population, with a hard hat and a tool belt instead of the
handyman's peaked cap. The engine already separates the two by shirt colour — a handyman
is bright red and a mechanic light blue by default (`Park.cpp`) — so the art only has to
carry the difference in silhouette, which is what survives being four pixels wide.

Staff are drawn `ImageId(base, tShirtColour)` (Paint.Staff.cpp): primary remap only, so
the shirt is the only part recoloured at run time.

**The animations here are poses, not frame counts.** The engine reads specific frame
numbers out of a mechanic's repair animations — `staffFix` on frame 37, `staffFix2` on
80, `staffFix3` on 101, `staffFixGround` on 40 — and an animation shorter than the frame
it is read at plays to its end and reports success without the event ever happening.
That is what the handyman did for four milestones. The length is bought in
`build_peeps.py`, which plays these poses out and back until the sequence is long
enough; a hundred and two frames of `staffFix3` is six rendered poses. See
`docs/mechanic-engine-audit.md` and `check_staff_animations.py`, which reads the frame
numbers out of the engine rather than trusting this comment.
"""

from __future__ import annotations

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import guest  # noqa: E402
import sunrise_rig as rig  # noqa: E402

RENDER_SIZE = guest.RENDER_SIZE


def build_mechanic() -> dict:
    """The guest figure with a hard hat and a tool belt.

    A rounded hat rather than the handyman's peaked cap, and a belt with a tool block
    on the hip: two silhouette changes that survive the size these are drawn at, where
    a logo or a face would not.
    """
    parts = guest.build_figure()
    head = parts["head"]
    hips = parts["hips"]

    # Hard hat: a shallow dome with a brim all the way round, so it reads as a hat and
    # not as hair from any of the four camera angles.
    parts["hat"] = rig.box(
        "hat", "accessory",
        (guest.HEAD_SIZE * 1.04, guest.HEAD_SIZE * 1.04, 0.15),
        origin=(0.0, 0.0, guest.HEAD_SIZE - 0.11), pivot="bottom", parent=head,
    )
    parts["hat_brim"] = rig.box(
        "hat_brim", "accessory",
        (guest.HEAD_SIZE * 1.26, guest.HEAD_SIZE * 1.26, 0.04),
        origin=(0.0, 0.0, guest.HEAD_SIZE - 0.12), pivot="bottom", parent=head,
    )
    # Tool belt, and a tool block on the right hip. The block is what makes the
    # difference visible in profile.
    # The torso is 0.54 by 0.30 (guest.build_figure), so the belt is a little proud
    # of it and the tool block sits off the right hip.
    parts["belt"] = rig.box(
        "belt", "shoes", (0.58, 0.33, 0.08),
        origin=(0.0, 0.0, 0.02), pivot="bottom", parent=hips,
    )
    parts["belt_tools"] = rig.box(
        "belt_tools", "shoes", (0.11, 0.16, 0.20),
        origin=(0.30, 0.0, -0.10), pivot="bottom", parent=hips,
    )
    rig.remember_rest(parts)
    return parts


def anim_answer_call(frames: int = 5) -> list:
    """Straighten up and raise a hand: the mechanic acknowledging a call."""
    poses = []
    for index in range(frames):
        lift = math.sin(math.pi * index / max(frames - 1, 1))
        poses.append({
            "torso": (-2.0, 0.0, 0.0),
            "head": (-6.0 - lift * 6.0, 0.0, 0.0),
            "arm_r_upper": (-30.0 - lift * 86.0, 0.0, 18.0),
            "arm_r_lower": (-20.0 - lift * 30.0, 0.0, 0.0),
            "arm_l_upper": (6.0, 0.0, -8.0),
            "arm_l_lower": (10.0, 0.0, 0.0),
        })
    return poses


def anim_check_board(frames: int = 5) -> list:
    """Read the station board: head down, one arm up holding it."""
    poses = []
    for index in range(frames):
        turn = math.sin(2.0 * math.pi * index / frames)
        poses.append({
            "torso": (8.0, 0.0, turn * 5.0),
            "head": (18.0, 0.0, turn * 8.0),
            "arm_l_upper": (-72.0, 0.0, -14.0),
            "arm_l_lower": (-54.0, 0.0, 0.0),
            "arm_r_upper": (-30.0, 0.0, 12.0),
            "arm_r_lower": (-40.0 - turn * 10.0, 0.0, 0.0),
        })
    return poses


def anim_fix_high(frames: int = 6) -> list:
    """Work on a car at waist height: both arms in, shoulders driving the motion.

    Used for `staffFix`, the restraints and doors repair. Six poses; the engine reads
    frame 37, and build_peeps.py plays these out and back to get there.
    """
    poses = []
    for index in range(frames):
        drive = math.sin(2.0 * math.pi * index / frames)
        poses.append({
            "torso": (22.0 + drive * 7.0, 0.0, drive * 6.0),
            "head": (16.0, 0.0, 0.0),
            "arm_l_upper": (-78.0 - drive * 16.0, 0.0, -10.0),
            "arm_r_upper": (-78.0 + drive * 16.0, 0.0, 10.0),
            "arm_l_lower": (-46.0 + drive * 22.0, 0.0, 0.0),
            "arm_r_lower": (-46.0 - drive * 22.0, 0.0, 0.0),
            "leg_l_upper": (10.0, 0.0, 0.0),
            "leg_r_upper": (-8.0, 0.0, 0.0),
        })
    return poses


def anim_fix_reach(frames: int = 6) -> list:
    """Reach into the car and work: one arm deep, the other bracing.

    Used for `staffFix2`, the other restraints and doors repair — the engine picks
    between this and `staffFix` on a coin flip, so both have to exist and both have to
    be long enough.
    """
    poses = []
    for index in range(frames):
        reach = math.sin(2.0 * math.pi * index / frames)
        poses.append({
            "torso": (30.0 + reach * 6.0, 0.0, -10.0),
            "head": (20.0, 0.0, -8.0),
            "arm_r_upper": (-96.0 - reach * 14.0, 0.0, 22.0),
            "arm_r_lower": (-30.0 - reach * 26.0, 0.0, 0.0),
            "arm_l_upper": (-40.0, 0.0, -24.0),
            "arm_l_lower": (-20.0, 0.0, 0.0),
            "leg_l_upper": (16.0, 0.0, 0.0),
            "leg_r_upper": (-14.0, 0.0, 0.0),
            "leg_r_lower": (20.0, 0.0, 0.0),
        })
    return poses


def anim_fix_under(frames: int = 6) -> list:
    """Crouch and work underneath: the vehicle malfunction repair, `staffFix3`.

    The longest of them — the engine reads frame 101 — and the one that should look
    like the biggest job.
    """
    poses = []
    for index in range(frames):
        phase = 2.0 * math.pi * index / frames
        work = math.sin(phase)
        crouch = 0.62 + 0.10 * math.cos(phase)
        poses.append({
            "torso": (40.0 + work * 6.0, 0.0, 0.0),
            "head": (26.0, 0.0, 0.0),
            "hips": {"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, -crouch * 0.30)},
            "arm_l_upper": (-92.0 - work * 18.0, 0.0, -12.0),
            "arm_r_upper": (-92.0 + work * 18.0, 0.0, 12.0),
            "arm_l_lower": (-52.0 + work * 26.0, 0.0, 0.0),
            "arm_r_lower": (-52.0 - work * 26.0, 0.0, 0.0),
            "leg_l_upper": (crouch * 52.0, 0.0, 0.0),
            "leg_r_upper": (crouch * 52.0, 0.0, 0.0),
            "leg_l_lower": (-crouch * 78.0, 0.0, 0.0),
            "leg_r_lower": (-crouch * 78.0, 0.0, 0.0),
        })
    return poses


def anim_fix_ground(frames: int = 6) -> list:
    """Kneel to the station brakes: `staffFixGround`, read at frame 40."""
    poses = []
    for index in range(frames):
        phase = 2.0 * math.pi * index / frames
        work = math.sin(phase)
        poses.append({
            "torso": (46.0 + work * 5.0, 0.0, 6.0),
            "head": (30.0, 0.0, 0.0),
            "hips": {"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, -0.40)},
            "arm_l_upper": (-88.0 - work * 20.0, 0.0, -14.0),
            "arm_r_upper": (-84.0 + work * 12.0, 0.0, 14.0),
            "arm_l_lower": (-58.0 + work * 28.0, 0.0, 0.0),
            "arm_r_lower": (-44.0, 0.0, 0.0),
            "leg_l_upper": (72.0, 0.0, 0.0),
            "leg_r_upper": (46.0, 0.0, 0.0),
            "leg_l_lower": (-96.0, 0.0, 0.0),
            "leg_r_lower": (-70.0, 0.0, 0.0),
        })
    return poses


MECHANIC_ANIMATIONS = [
    ("walking", guest.anim_walking, True),
    ("watchRide", lambda: [guest.pose_stand()], True),
    ("hanging", guest.anim_hanging, False),
    ("drowning", guest.anim_drowning, True),
    ("staffAnswerCall", anim_answer_call, True),
    ("staffAnswerCall2", anim_answer_call, True),
    ("staffCheckBoard", anim_check_board, True),
    ("staffFix", anim_fix_high, True),
    ("staffFix2", anim_fix_reach, True),
    ("staffFix3", anim_fix_under, True),
    ("staffFixGround", anim_fix_ground, True),
]


def main() -> None:
    args = rig.argv_after_double_dash()
    out_dir = "assets/generated/peeps/mechanic"
    if "--out" in args:
        out_dir = args[args.index("--out") + 1]

    rig.reset_scene()
    rig.setup_world()
    rig.setup_lights()
    rig.setup_camera(RENDER_SIZE, RENDER_SIZE, target_z=1.0)

    parts = build_mechanic()
    manifest = guest.render_peep(out_dir, MECHANIC_ANIMATIONS, parts, "mechanic")
    manifest["cameraTargetZ"] = 1.0
    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] mechanic manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
