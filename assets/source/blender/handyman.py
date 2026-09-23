"""Project Sunrise — original handyman staff peep source.

    blender -b --python assets/source/blender/handyman.py -- --out <dir>

Reuses the guest figure and rig (assets/source/blender/guest.py) and adds a cap plus
the staff work animations the engine requires of a handyman
(PeepAnimations.cpp availableHandymanAnimations): walking, watchRide, hanging,
staffMower, staffSweep, drowning, staffWatering, staffEmptyBin.

Staff are drawn ImageId(base, tShirtColour) (Paint.Staff.cpp:37): primary remap only,
so only the shirt is recoloured at runtime.
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


def build_handyman() -> dict:
    """The guest figure plus a peaked cap, so staff read differently in a crowd."""
    parts = guest.build_figure()
    head = parts["head"]
    parts["cap"] = rig.box(
        "cap", "accessory",
        (guest.HEAD_SIZE * 1.10, guest.HEAD_SIZE * 1.00, 0.13),
        origin=(0.0, 0.0, guest.HEAD_SIZE - 0.10), pivot="bottom", parent=head,
    )
    parts["cap_peak"] = rig.box(
        "cap_peak", "accessory",
        (guest.HEAD_SIZE * 0.86, 0.13, 0.05),
        origin=(0.0, -guest.HEAD_SIZE * 0.50, guest.HEAD_SIZE - 0.08),
        pivot="bottom", parent=head,
    )
    rig.remember_rest(parts)
    return parts


def anim_sweep(frames: int = 5) -> list:
    """Push a broom back and forth, leaning into it."""
    poses = []
    for index in range(frames):
        phase = 2.0 * math.pi * index / frames
        push = math.sin(phase)
        poses.append({
            "torso": (16.0 + push * 6.0, 0.0, 0.0),
            "head": (10.0, 0.0, 0.0),
            "arm_l_upper": (-58.0 - push * 22.0, 0.0, -14.0),
            "arm_r_upper": (-44.0 - push * 26.0, 0.0, 12.0),
            "arm_l_lower": (-24.0 + push * 12.0, 0.0, 0.0),
            "arm_r_lower": (-30.0 + push * 14.0, 0.0, 0.0),
            "leg_l_upper": (12.0 + push * 8.0, 0.0, 0.0),
            "leg_r_upper": (-10.0 - push * 6.0, 0.0, 0.0),
            "leg_r_lower": (18.0, 0.0, 0.0),
        })
    return poses


def anim_mower(frames: int = 6) -> list:
    """Walk while pushing a mower: same gait, arms locked forward."""
    poses = []
    for index, walk in enumerate(guest.anim_walking(frames)):
        pose = dict(walk)
        pose["arm_l_upper"] = (-66.0, 0.0, -12.0)
        pose["arm_r_upper"] = (-66.0, 0.0, 12.0)
        pose["arm_l_lower"] = (-18.0, 0.0, 0.0)
        pose["arm_r_lower"] = (-18.0, 0.0, 0.0)
        pose["torso"] = (12.0, 0.0, 0.0)
        pose["head"] = (6.0, 0.0, 0.0)
        poses.append(pose)
    return poses


def anim_watering(frames: int = 4) -> list:
    """Tip a watering can towards the ground and back."""
    poses = []
    for index in range(frames):
        tip = math.sin(math.pi * index / max(frames - 1, 1))
        poses.append({
            "torso": (14.0 + tip * 10.0, 0.0, 0.0),
            "head": (12.0, 0.0, 0.0),
            "arm_r_upper": (-50.0 - tip * 26.0, 0.0, 16.0),
            "arm_r_lower": (-26.0 - tip * 22.0, 0.0, 0.0),
            "arm_l_upper": (10.0, 0.0, -8.0),
            "arm_l_lower": (14.0, 0.0, 0.0),
            "leg_l_upper": (8.0, 0.0, 0.0),
            "leg_r_upper": (-6.0, 0.0, 0.0),
        })
    return poses


def anim_empty_bin(frames: int = 6) -> list:
    """Bend down, lift, tip out, straighten."""
    keys = [0.0, 0.45, 0.9, 1.0, 0.6, 0.2]
    poses = []
    for index in range(frames):
        amount = keys[index % len(keys)]
        poses.append({
            "torso": (18.0 + amount * 30.0, 0.0, 0.0),
            "head": (14.0, 0.0, 0.0),
            "hips": {"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, -amount * 0.16)},
            "arm_l_upper": (-40.0 - amount * 40.0, 0.0, -16.0),
            "arm_r_upper": (-40.0 - amount * 40.0, 0.0, 16.0),
            "arm_l_lower": (-30.0 - amount * 20.0, 0.0, 0.0),
            "arm_r_lower": (-30.0 - amount * 20.0, 0.0, 0.0),
            "leg_l_upper": (amount * 26.0, 0.0, 0.0),
            "leg_r_upper": (amount * 26.0, 0.0, 0.0),
            "leg_l_lower": (-amount * 34.0, 0.0, 0.0),
            "leg_r_lower": (-amount * 34.0, 0.0, 0.0),
        })
    return poses


HANDYMAN_ANIMATIONS = [
    ("walking", guest.anim_walking, True),
    ("watchRide", lambda: [guest.pose_stand()], True),
    ("hanging", guest.anim_hanging, False),
    ("staffMower", anim_mower, True),
    ("staffSweep", anim_sweep, True),
    ("drowning", guest.anim_drowning, True),
    ("staffWatering", anim_watering, True),
    ("staffEmptyBin", anim_empty_bin, True),
]


def main() -> None:
    args = rig.argv_after_double_dash()
    out_dir = "assets/generated/peeps/handyman"
    if "--out" in args:
        out_dir = args[args.index("--out") + 1]

    rig.reset_scene()
    rig.setup_world()
    rig.setup_lights()
    rig.setup_camera(RENDER_SIZE, RENDER_SIZE, target_z=1.0)

    parts = build_handyman()
    manifest = guest.render_peep(out_dir, HANDYMAN_ANIMATIONS, parts, "handyman")
    manifest["cameraTargetZ"] = 1.0
    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] handyman manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
