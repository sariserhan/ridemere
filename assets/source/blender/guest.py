"""Project Sunrise — original guest peep source.

Run headless:
    blender -b --python assets/source/blender/guest.py -- --out <dir>

Produces one PNG per (animation, frame, rotation) plus frames.json describing the
exact image order the engine expects. Nothing here is derived from RollerCoaster
Tycoon: the figure is built from primitives in code and the animations are written
as parametric poses.

Engine contract (src/openrct2/paint/entity/Paint.Peep.cpp:36):

    image = baseImage + direction + frameOffset * 4          (normal animations)
    image = baseImage + frameOffset                          (the "hanging" pose)

so a normal animation with F distinct frames needs F*4 images ordered
frame-major/direction-minor, and "hanging" needs F images.

Guests are drawn as ImageId(base, tShirtColour, trousersColour)
(Paint.Guest.cpp:33), so the shirt and trousers are recoloured at runtime from the
primary and secondary palette ramps. One render therefore covers every colour
combination the game can produce.
"""

from __future__ import annotations

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import sunrise_rig as rig  # noqa: E402

RENDER_SIZE = 40  # px canvas; sprites are cropped to their content afterwards

# Figure proportions, in Blender units. Total height ~2.02 => ~20 px tall.
HIP_HEIGHT = 0.84
TORSO_HEIGHT = 0.62
HEAD_SIZE = 0.44
UPPER_LEG = 0.44
LOWER_LEG = 0.38
UPPER_ARM = 0.34
LOWER_ARM = 0.32


def build_figure(hat: bool = False) -> dict:
    """Build the guest as a parented hierarchy of boxes. Returns the rig map.

    The figure faces -Y. Limb swing is therefore rotation about X.
    """
    parts: dict = {}

    root = rig.empty("root", (0.0, 0.0, 0.0))
    parts["root"] = root

    hips = rig.empty("hips", (0.0, 0.0, HIP_HEIGHT), parent=root)
    parts["hips"] = hips

    torso = rig.box("torso", "shirt", (0.54, 0.30, TORSO_HEIGHT),
                    origin=(0.0, 0.0, 0.0), pivot="bottom", parent=hips)
    parts["torso"] = torso

    neck_z = TORSO_HEIGHT
    head = rig.box("head", "skin", (HEAD_SIZE, HEAD_SIZE * 0.86, HEAD_SIZE),
                   origin=(0.0, 0.0, neck_z), pivot="bottom", parent=torso)
    parts["head"] = head

    # Hair sits on and around the skull; a separate part so it can be recoloured.
    parts["hair"] = rig.box("hair", "hair", (HEAD_SIZE * 1.04, HEAD_SIZE * 0.92, 0.12),
                            origin=(0.0, 0.0, HEAD_SIZE - 0.08), pivot="bottom",
                            parent=head)
    parts["hair_back"] = rig.box("hair_back", "hair", (HEAD_SIZE * 1.04, 0.07, 0.20),
                                 origin=(0.0, HEAD_SIZE * 0.40, HEAD_SIZE - 0.22),
                                 pivot="bottom", parent=head)
    if hat:
        parts["hat"] = rig.box("hat", "accessory", (HEAD_SIZE * 1.3, HEAD_SIZE * 1.3, 0.10),
                               origin=(0.0, 0.0, HEAD_SIZE + 0.02), pivot="bottom",
                               parent=head)

    shoulder_z = TORSO_HEIGHT - 0.08
    for side, sign in (("l", -1.0), ("r", 1.0)):
        upper = rig.box(
            f"arm_{side}_upper", "shirt", (0.15, 0.15, UPPER_ARM),
            origin=(sign * 0.33, 0.0, shoulder_z), pivot="top", parent=torso,
        )
        lower = rig.box(
            f"arm_{side}_lower", "skin", (0.14, 0.14, LOWER_ARM),
            origin=(0.0, 0.0, -UPPER_ARM), pivot="top", parent=upper,
        )
        parts[f"arm_{side}_upper"] = upper
        parts[f"arm_{side}_lower"] = lower

        leg_upper = rig.box(
            f"leg_{side}_upper", "trousers", (0.19, 0.18, UPPER_LEG),
            origin=(sign * 0.14, 0.0, 0.0), pivot="top", parent=hips,
        )
        leg_lower = rig.box(
            f"leg_{side}_lower", "trousers", (0.18, 0.17, LOWER_LEG),
            origin=(0.0, 0.0, -UPPER_LEG), pivot="top", parent=leg_upper,
        )
        shoe = rig.box(
            f"shoe_{side}", "shoes", (0.20, 0.28, 0.11),
            origin=(0.0, -0.04, -LOWER_LEG), pivot="bottom", parent=leg_lower,
        )
        parts[f"leg_{side}_upper"] = leg_upper
        parts[f"leg_{side}_lower"] = leg_lower
        parts[f"shoe_{side}"] = shoe

    rig.remember_rest(parts)
    return parts


# --------------------------------------------------------------------------
# Poses. Each generator returns a list of poses; a pose maps part name to
# (rx, ry, rz) degrees, or to {"rot": (...), "loc": (...)}.
# --------------------------------------------------------------------------


def pose_stand(arm_swing: float = 6.0) -> dict:
    return {
        "arm_l_upper": (arm_swing, 0.0, -4.0),
        "arm_r_upper": (-arm_swing, 0.0, 4.0),
        "arm_l_lower": (10.0, 0.0, 0.0),
        "arm_r_lower": (10.0, 0.0, 0.0),
    }


def anim_walking(frames: int = 6) -> list:
    """A walk cycle: legs and arms counter-swing, hips bob."""
    poses = []
    for index in range(frames):
        phase = 2.0 * math.pi * index / frames
        swing = math.sin(phase) * 32.0
        knee = max(0.0, -math.sin(phase + 0.6)) * 34.0
        knee_other = max(0.0, math.sin(phase + 0.6)) * 34.0
        bob = abs(math.cos(phase)) * 0.035
        poses.append({
            "hips": {"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, bob)},
            "leg_l_upper": (swing, 0.0, 0.0),
            "leg_r_upper": (-swing, 0.0, 0.0),
            "leg_l_lower": (knee, 0.0, 0.0),
            "leg_r_lower": (knee_other, 0.0, 0.0),
            "arm_l_upper": (-swing * 0.7, 0.0, -4.0),
            "arm_r_upper": (swing * 0.7, 0.0, 4.0),
            "arm_l_lower": (12.0 + max(0.0, swing * 0.4), 0.0, 0.0),
            "arm_r_lower": (12.0 + max(0.0, -swing * 0.4), 0.0, 0.0),
            "torso": (2.0, 0.0, math.sin(phase) * 3.0),
        })
    return poses


def pose_sit() -> dict:
    return {
        "hips": {"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.10, -0.34)},
        "leg_l_upper": (82.0, 0.0, 0.0),
        "leg_r_upper": (82.0, 0.0, 0.0),
        "leg_l_lower": (-80.0, 0.0, 0.0),
        "leg_r_lower": (-80.0, 0.0, 0.0),
        "arm_l_upper": (18.0, 0.0, -6.0),
        "arm_r_upper": (18.0, 0.0, 6.0),
        "arm_l_lower": (34.0, 0.0, 0.0),
        "arm_r_lower": (34.0, 0.0, 0.0),
        "torso": (-4.0, 0.0, 0.0),
    }


def _with(base: dict, **overrides) -> dict:
    merged = dict(base)
    merged.update(overrides)
    return merged


def anim_sitting_idle() -> list:
    return [pose_sit()]


def anim_sitting_eat() -> list:
    sit = pose_sit()
    return [
        _with(sit, arm_r_upper=(-42.0, 0.0, 18.0), arm_r_lower=(-74.0, 0.0, 0.0)),
        _with(sit, arm_r_upper=(-62.0, 0.0, 18.0), arm_r_lower=(-92.0, 0.0, 0.0)),
        _with(sit, arm_r_upper=(-50.0, 0.0, 18.0), arm_r_lower=(-82.0, 0.0, 0.0),
              head=(6.0, 0.0, 0.0)),
    ]


def anim_sitting_look(direction: int) -> list:
    sit = pose_sit()
    turn = 34.0 * (1 if direction > 0 else -1)
    return [sit, _with(sit, head=(0.0, 0.0, turn))]


def anim_hanging(frames: int = 4) -> list:
    """Picked up by the player: dangling, drawn without a rotation offset."""
    poses = []
    for index in range(frames):
        sway = math.sin(2.0 * math.pi * index / frames) * 9.0
        poses.append({
            "root": (0.0, sway, 0.0),
            "arm_l_upper": (-150.0, 0.0, -12.0),
            "arm_r_upper": (-150.0, 0.0, 12.0),
            "arm_l_lower": (-20.0, 0.0, 0.0),
            "arm_r_lower": (-20.0, 0.0, 0.0),
            "leg_l_upper": (16.0, 0.0, -6.0),
            "leg_r_upper": (10.0, 0.0, 6.0),
            "leg_l_lower": (22.0, 0.0, 0.0),
            "leg_r_lower": (16.0, 0.0, 0.0),
        })
    return poses


def anim_eat() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_r_upper=(-46.0, 0.0, 16.0), arm_r_lower=(-78.0, 0.0, 0.0)),
        _with(stand, arm_r_upper=(-66.0, 0.0, 16.0), arm_r_lower=(-96.0, 0.0, 0.0)),
        _with(stand, arm_r_upper=(-54.0, 0.0, 16.0), arm_r_lower=(-86.0, 0.0, 0.0),
              head=(7.0, 0.0, 0.0)),
    ]


def anim_check_time() -> list:
    stand = pose_stand()
    return [
        stand,
        _with(stand, arm_l_upper=(-58.0, 0.0, -14.0), arm_l_lower=(-64.0, 0.0, 0.0),
              head=(10.0, 0.0, -8.0)),
        _with(stand, arm_l_upper=(-70.0, 0.0, -14.0), arm_l_lower=(-72.0, 0.0, 0.0),
              head=(14.0, 0.0, -8.0)),
    ]


def anim_shake_head() -> list:
    stand = pose_stand()
    return [
        _with(stand, head=(0.0, 0.0, 26.0)),
        stand,
        _with(stand, head=(0.0, 0.0, -26.0)),
    ]


def anim_empty_pockets() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_l_upper=(-24.0, 0.0, -26.0), arm_r_upper=(-24.0, 0.0, 26.0),
              arm_l_lower=(-40.0, 0.0, 0.0), arm_r_lower=(-40.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-40.0, 0.0, -34.0), arm_r_upper=(-40.0, 0.0, 34.0),
              arm_l_lower=(-56.0, 0.0, 0.0), arm_r_lower=(-56.0, 0.0, 0.0),
              head=(12.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-30.0, 0.0, -30.0), arm_r_upper=(-30.0, 0.0, 30.0),
              arm_l_lower=(-48.0, 0.0, 0.0), arm_r_lower=(-48.0, 0.0, 0.0)),
    ]


def anim_hold_mat() -> list:
    stand = pose_stand()
    held = _with(stand, arm_l_upper=(-70.0, 0.0, -10.0), arm_r_upper=(-70.0, 0.0, 10.0),
                 arm_l_lower=(-22.0, 0.0, 0.0), arm_r_lower=(-22.0, 0.0, 0.0))
    return [held, _with(held, torso=(4.0, 0.0, 0.0))]


def anim_wow() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_l_upper=(-96.0, 0.0, -22.0), arm_r_upper=(-96.0, 0.0, 22.0),
              arm_l_lower=(-40.0, 0.0, 0.0), arm_r_lower=(-40.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-150.0, 0.0, -28.0), arm_r_upper=(-150.0, 0.0, 28.0),
              arm_l_lower=(-16.0, 0.0, 0.0), arm_r_lower=(-16.0, 0.0, 0.0),
              head=(-12.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-120.0, 0.0, -24.0), arm_r_upper=(-120.0, 0.0, 24.0),
              arm_l_lower=(-28.0, 0.0, 0.0), arm_r_lower=(-28.0, 0.0, 0.0),
              head=(-8.0, 0.0, 0.0)),
    ]


def anim_throw_up() -> list:
    stand = pose_stand()
    return [
        _with(stand, torso=(18.0, 0.0, 0.0), head=(16.0, 0.0, 0.0)),
        _with(stand, torso=(38.0, 0.0, 0.0), head=(24.0, 0.0, 0.0),
              arm_l_upper=(-34.0, 0.0, -18.0), arm_r_upper=(-34.0, 0.0, 18.0)),
        _with(stand, torso=(46.0, 0.0, 0.0), head=(28.0, 0.0, 0.0),
              arm_l_upper=(-44.0, 0.0, -20.0), arm_r_upper=(-44.0, 0.0, 20.0)),
        _with(stand, torso=(30.0, 0.0, 0.0), head=(20.0, 0.0, 0.0),
              arm_l_upper=(-30.0, 0.0, -16.0), arm_r_upper=(-30.0, 0.0, 16.0)),
    ]


def anim_jump() -> list:
    stand = pose_stand()
    return [
        _with(stand, hips={"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, -0.14)},
              leg_l_upper=(26.0, 0.0, 0.0), leg_r_upper=(26.0, 0.0, 0.0),
              leg_l_lower=(-42.0, 0.0, 0.0), leg_r_lower=(-42.0, 0.0, 0.0)),
        _with(stand, hips={"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, 0.16)},
              arm_l_upper=(-120.0, 0.0, -20.0), arm_r_upper=(-120.0, 0.0, 20.0),
              leg_l_upper=(-14.0, 0.0, 0.0), leg_r_upper=(-14.0, 0.0, 0.0)),
        _with(stand, hips={"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, 0.30)},
              arm_l_upper=(-150.0, 0.0, -24.0), arm_r_upper=(-150.0, 0.0, 24.0),
              leg_l_upper=(18.0, 0.0, 0.0), leg_r_upper=(-18.0, 0.0, 0.0),
              leg_l_lower=(26.0, 0.0, 0.0)),
        _with(stand, hips={"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, 0.10)},
              arm_l_upper=(-90.0, 0.0, -18.0), arm_r_upper=(-90.0, 0.0, 18.0)),
    ]


def anim_drowning(frames: int = 4) -> list:
    poses = []
    for index in range(frames):
        phase = 2.0 * math.pi * index / frames
        flail = math.sin(phase) * 50.0
        poses.append({
            "root": {"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, -0.48)},
            "arm_l_upper": (-140.0 + flail, 0.0, -26.0),
            "arm_r_upper": (-140.0 - flail, 0.0, 26.0),
            "arm_l_lower": (-24.0, 0.0, 0.0),
            "arm_r_lower": (-24.0, 0.0, 0.0),
            "head": (-14.0, 0.0, flail * 0.3),
            "torso": (-10.0, 0.0, 0.0),
        })
    return poses


def anim_joy(frames: int = 4) -> list:
    stand = pose_stand()
    poses = []
    for index in range(frames):
        phase = 2.0 * math.pi * index / frames
        lift = (math.sin(phase) + 1.0) * 0.5
        poses.append(_with(
            stand,
            hips={"rot": (0.0, 0.0, 0.0), "loc": (0.0, 0.0, lift * 0.16)},
            arm_l_upper=(-90.0 - lift * 60.0, 0.0, -22.0),
            arm_r_upper=(-90.0 - lift * 60.0, 0.0, 22.0),
            arm_l_lower=(-30.0, 0.0, 0.0),
            arm_r_lower=(-30.0, 0.0, 0.0),
            head=(-6.0 * lift, 0.0, 0.0),
        ))
    return poses


def anim_read_map() -> list:
    stand = pose_stand()
    held = _with(stand, arm_l_upper=(-74.0, 0.0, -16.0), arm_r_upper=(-74.0, 0.0, 16.0),
                 arm_l_lower=(-30.0, 0.0, 0.0), arm_r_lower=(-30.0, 0.0, 0.0),
                 head=(16.0, 0.0, 0.0))
    return [held, _with(held, head=(18.0, 0.0, -10.0)), _with(held, head=(18.0, 0.0, 10.0))]


def anim_wave() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_r_upper=(-146.0, 0.0, 26.0), arm_r_lower=(-16.0, 0.0, 0.0)),
        _with(stand, arm_r_upper=(-152.0, 0.0, 42.0), arm_r_lower=(-30.0, 0.0, 0.0)),
        _with(stand, arm_r_upper=(-146.0, 0.0, 12.0), arm_r_lower=(-10.0, 0.0, 0.0)),
    ]


def anim_wave2() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_l_upper=(-146.0, 0.0, -26.0), arm_r_upper=(-146.0, 0.0, 26.0),
              arm_l_lower=(-16.0, 0.0, 0.0), arm_r_lower=(-16.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-152.0, 0.0, -42.0), arm_r_upper=(-152.0, 0.0, 42.0),
              arm_l_lower=(-30.0, 0.0, 0.0), arm_r_lower=(-30.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-146.0, 0.0, -12.0), arm_r_upper=(-146.0, 0.0, 12.0),
              arm_l_lower=(-10.0, 0.0, 0.0), arm_r_lower=(-10.0, 0.0, 0.0)),
    ]


def anim_take_photo() -> list:
    stand = pose_stand()
    held = _with(stand, arm_l_upper=(-84.0, 0.0, -8.0), arm_r_upper=(-84.0, 0.0, 8.0),
                 arm_l_lower=(-62.0, 0.0, 0.0), arm_r_lower=(-62.0, 0.0, 0.0))
    return [held, _with(held, head=(-6.0, 0.0, 0.0))]


def anim_clap() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_l_upper=(-72.0, 0.0, -34.0), arm_r_upper=(-72.0, 0.0, 34.0),
              arm_l_lower=(-56.0, 0.0, 0.0), arm_r_lower=(-56.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-72.0, 0.0, -10.0), arm_r_upper=(-72.0, 0.0, 10.0),
              arm_l_lower=(-62.0, 0.0, 0.0), arm_r_lower=(-62.0, 0.0, 0.0)),
        _with(stand, arm_l_upper=(-72.0, 0.0, -24.0), arm_r_upper=(-72.0, 0.0, 24.0),
              arm_l_lower=(-58.0, 0.0, 0.0), arm_r_lower=(-58.0, 0.0, 0.0)),
    ]


def anim_disgust() -> list:
    stand = pose_stand()
    return [
        _with(stand, head=(-14.0, 0.0, 16.0), arm_l_upper=(-52.0, 0.0, -24.0),
              arm_l_lower=(-70.0, 0.0, 0.0)),
        _with(stand, head=(-20.0, 0.0, 24.0), arm_l_upper=(-64.0, 0.0, -30.0),
              arm_l_lower=(-84.0, 0.0, 0.0), torso=(-6.0, 0.0, 8.0)),
    ]


def anim_draw_picture() -> list:
    stand = pose_stand()
    held = _with(stand, arm_l_upper=(-70.0, 0.0, -14.0), arm_l_lower=(-34.0, 0.0, 0.0),
                 head=(14.0, 0.0, 0.0))
    return [
        _with(held, arm_r_upper=(-64.0, 0.0, 16.0), arm_r_lower=(-48.0, 0.0, 0.0)),
        _with(held, arm_r_upper=(-58.0, 0.0, 24.0), arm_r_lower=(-56.0, 0.0, 0.0)),
        _with(held, arm_r_upper=(-66.0, 0.0, 10.0), arm_r_lower=(-44.0, 0.0, 0.0)),
    ]


def anim_being_watched() -> list:
    stand = pose_stand()
    crossed = _with(stand, arm_l_upper=(-58.0, 0.0, -30.0), arm_r_upper=(-58.0, 0.0, 30.0),
                    arm_l_lower=(-74.0, 0.0, 0.0), arm_r_lower=(-74.0, 0.0, 0.0))
    return [crossed, _with(crossed, head=(0.0, 0.0, 18.0))]


def anim_withdraw_money() -> list:
    stand = pose_stand()
    return [
        _with(stand, arm_r_upper=(-72.0, 0.0, 14.0), arm_r_lower=(-40.0, 0.0, 0.0)),
        _with(stand, arm_r_upper=(-86.0, 0.0, 14.0), arm_r_lower=(-56.0, 0.0, 0.0),
              head=(10.0, 0.0, 0.0)),
        _with(stand, arm_r_upper=(-60.0, 0.0, 14.0), arm_r_lower=(-34.0, 0.0, 0.0)),
    ]


#: Every animation the engine requires of a guest
#: (PeepAnimations.cpp availableGuestAnimations). "hanging" is the only one drawn
#: without a rotation offset.
GUEST_ANIMATIONS = [
    ("walking", anim_walking, True),
    ("checkTime", anim_check_time, True),
    ("watchRide", lambda: [pose_stand()], True),
    ("eatFood", anim_eat, True),
    ("shakeHead", anim_shake_head, True),
    ("emptyPockets", anim_empty_pockets, True),
    ("holdMat", anim_hold_mat, True),
    ("sittingIdle", anim_sitting_idle, True),
    ("sittingEatFood", anim_sitting_eat, True),
    ("sittingLookAroundLeft", lambda: anim_sitting_look(-1), True),
    ("sittingLookAroundRight", lambda: anim_sitting_look(1), True),
    ("hanging", anim_hanging, False),
    ("wow", anim_wow, True),
    ("throwUp", anim_throw_up, True),
    ("jump", anim_jump, True),
    ("drowning", anim_drowning, True),
    ("joy", anim_joy, True),
    ("readMap", anim_read_map, True),
    ("wave", anim_wave, True),
    ("wave2", anim_wave2, True),
    ("takePhoto", anim_take_photo, True),
    ("clap", anim_clap, True),
    ("disgust", anim_disgust, True),
    ("drawPicture", anim_draw_picture, True),
    ("beingWatched", anim_being_watched, True),
    ("withdrawMoney", anim_withdraw_money, True),
]


def render_peep(out_dir: str, animations, parts, label: str) -> dict:
    """Render every animation. Returns a manifest for the packing step."""
    os.makedirs(out_dir, exist_ok=True)
    manifest = {
        "label": label,
        "renderSize": RENDER_SIZE,
        "pixelsPerUnit": rig.PIXELS_PER_UNIT,
        "preview": None,
        "animations": [],
    }

    # Image 0 of the object's table is the preview icon shown in UI lists.
    rig.apply_pose(parts, pose_stand())
    preview = os.path.join(out_dir, "preview_d0.png")
    rig.aim_camera(bpy.context.scene.camera, 45.0)
    rig.render_to(preview)
    manifest["preview"] = os.path.basename(preview)

    for name, generator, rotated in animations:
        poses = generator()
        frames = []
        for frame_index, pose in enumerate(poses):
            rig.apply_pose(parts, pose)
            stem = f"{name}_f{frame_index}"
            if rotated:
                paths = rig.render_rotations(out_dir, stem)
            else:
                rig.aim_camera(bpy.context.scene.camera, 45.0)
                path = os.path.join(out_dir, f"{stem}_d0.png")
                rig.render_to(path)
                paths = [path]
            frames.append([os.path.basename(p) for p in paths])
        manifest["animations"].append({
            "name": name,
            "rotated": rotated,
            "frames": frames,
        })
        print(f"[sunrise] rendered {label}.{name}: {len(poses)} frames "
              f"x {4 if rotated else 1} rotations", flush=True)

    return manifest


def main() -> None:
    args = rig.argv_after_double_dash()
    out_dir = "assets/generated/peeps/guest"
    if "--out" in args:
        out_dir = args[args.index("--out") + 1]

    rig.reset_scene()
    rig.setup_world()
    rig.setup_lights()
    # Centre the camera on the middle of the figure so it stays inside the canvas.
    rig.setup_camera(RENDER_SIZE, RENDER_SIZE, target_z=1.0)

    parts = build_figure()
    manifest = render_peep(out_dir, GUEST_ANIMATIONS, parts, "guest")
    manifest["cameraTargetZ"] = 1.0
    rig.write_manifest(os.path.join(out_dir, "frames.json"), manifest)
    print(f"[sunrise] guest manifest -> {out_dir}/frames.json", flush=True)


if __name__ == "__main__":
    main()
