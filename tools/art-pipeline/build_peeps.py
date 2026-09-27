"""Build Project Sunrise peep_animations objects from Blender renders.

    .cache/venv/bin/python tools/art-pipeline/build_peeps.py guest handyman

Reads assets/generated/peeps/<name>/frames.json (written by the Blender step) and
emits assets/generated/objects/sunrise.peep_animations.<name>.parkobj.

Two engine contracts drive the layout:

* Image order. Paint.Peep.cpp:36 computes `base + direction + frame*4` for ordinary
  animations and `base + frame` for "hanging", so ordinary animations need their
  four rotations interleaved per frame and "hanging" needs one rotation only.

* Animation groups. PeepAnimationsObject::GetPeepAnimation indexes
  `_animationGroups[EnumValue(animGroup)]` with no bounds check, and Guest.cpp can
  select groups up to `sandwich` (32) for nausea, needing the toilet, crossed arms,
  watching a ride, carrying an item and so on. A guest object must therefore expose
  35 groups or the game can read past the end of the vector. Groups 1..34 are
  declared with an empty `animations` map: ReadAnimations then copies every
  animation from group 0 (PeepAnimationsObject.cpp:113-131), so all 35 groups share
  one set of sprites. A guest carrying a burger simply looks like a guest, which is
  the content reduction this milestone set out to test.
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402
import sunrise_palette as pal

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RENDER_ROOT = os.path.join(REPO, "assets", "generated", "peeps")
STAGE_ROOT = os.path.join(REPO, "assets", "generated", "staging", "peeps")
OBJECT_ROOT = os.path.join(REPO, "assets", "generated", "objects")

#: Highest PeepAnimationGroup a guest can be given (Peep.h: sandwich = 32).
#: PeepAnimationGroup runs to 34 (lemonade), and the object is indexed by that value
#: with no bounds check. Thirty-three covered every group a guest could reach until
#: shops existed; a shop selling chicken or lemonade puts a guest into group 33 or 34
#: and reads past the end of the vector. Thirty-five covers the whole enum.
GUEST_ANIMATION_GROUPS = 35

PEEPS = {
    "guest": {
        "id": "sunrise.peep_animations.guest",
        "peepType": "guest",
        "name": "Sunrise Guest",
        "colourway": spritepack.GUEST_COLOURWAY,
        "groups": GUEST_ANIMATION_GROUPS,
    },
    "handyman": {
        "id": "sunrise.peep_animations.handyman",
        "peepType": "handyman",
        "name": "Sunrise Handyman",
        "colourway": spritepack.STAFF_COLOURWAY,
        "groups": 1,
    },
    "mechanic": {
        "id": "sunrise.peep_animations.mechanic",
        "peepType": "mechanic",
        "name": "Sunrise Mechanic",
        "colourway": spritepack.STAFF_COLOURWAY,
        "groups": 1,
    },
}


GUEST_VARIANTS = []
for shape in range(6):
    for tone in range(6):
        name = f"guest_{shape}_{tone}"
        GUEST_VARIANTS.append(f"sunrise.peep_animations.{name}")
        # Six overlapping but distinct warm ramps, from deep brown to light skin.
        skin = [pal.ramp("tan")[0:6], pal.ramp("tan")[2:8],
                pal.ramp("skin")[0:7], pal.ramp("skin")[2:9],
                pal.ramp("skin")[4:11], pal.ramp("skin")[6:12]][tone]
        PEEPS[name] = {
            "id": GUEST_VARIANTS[-1], "peepType": "guest",
            "name": f"Garden Visitor {shape + 1}.{tone + 1}",
            "colourway": dict(spritepack.GUEST_COLOURWAY, skin=skin,
                              hair=pal.ramp(["tan", "grey", "orange"][shape // 2])[:8]),
            "groups": GUEST_ANIMATION_GROUPS, "renderName": f"guest_shape_{shape}",
        }


#: Animations the engine reads a specific frame number from, and the length the
#: sequence must reach for that frame to exist.
#:
#: This is the difference between a handyman who mimes sweeping and one who picks
#: litter up. `Staff::updateSweeping` removes litter when `animationFrameNum == 8`
#: and `updateEmptyingBin` empties a bin when it reaches 11; neither checks that the
#: animation is that long, so a shorter one simply plays forever and does nothing.
#: Ours were five and six frames, and the handyman had been walking the paths
#: cleaning nothing since M3.
#:
#: A sequence is indices into the rendered frames, so the length is bought by playing
#: the frames out and back rather than by rendering more of them. A sweep that goes
#: out and returns is also what the motion looks like.
#: The mechanic's four repair animations are read much further out than the
#: handyman's, and all four are reachable on the one coaster we ship — the hybrid
#: coaster's availableBreakdowns covers safetyCutOut, both restraints failures,
#: vehicleMalfunction and brakesFailure, and a restraints failure picks between
#: staffFix and staffFix2 on a coin flip. See docs/mechanic-engine-audit.md.
#:
#: staffFixGround is 44 rather than 41 so the animation also reaches frame 43, where
#: the engine plays the last of its five mechanicFix sounds. That one is a sound and
#: not a simulation event, so it is a nicety rather than the rule.
#:
#: check_staff_animations.py reads these numbers out of entity/Staff.cpp and fails if
#: what is shipped cannot reach them, so this table is a target rather than the
#: authority. Keeping both means a stale number here is caught rather than believed.
MINIMUM_SEQUENCE_LENGTH = {
    "staffSweep": 9,
    "staffEmptyBin": 12,
    "staffFix": 38,
    "staffFix2": 81,
    "staffFix3": 102,
    "staffFixGround": 44,
}


def sequence_for(name: str, frame_count: int) -> list:
    """The frame order for one animation, long enough for the engine's frame checks."""
    forward = list(range(frame_count))
    minimum = MINIMUM_SEQUENCE_LENGTH.get(name, 0)
    if frame_count == 0 or len(forward) >= minimum:
        return forward
    # Ping-pong: 0,1,2,3,2,1,0,1,2... never repeating a frame back to back.
    swing = forward + forward[-2:0:-1]
    if not swing:
        return forward
    sequence = []
    while len(sequence) < minimum:
        sequence.extend(swing)
    return sequence[:minimum]

def build(name: str) -> dict:
    spec = PEEPS[name]
    render_dir = os.path.join(RENDER_ROOT, spec.get("renderName", name))
    manifest_path = os.path.join(render_dir, "frames.json")
    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    render_size = manifest["renderSize"]
    target_z = manifest.get("cameraTargetZ", 0.0)
    colourway = spec["colourway"]

    stage_dir = os.path.join(STAGE_ROOT, name)
    os.makedirs(stage_dir, exist_ok=True)

    images: list = []
    files: dict = {}

    def add(source_name: str, archive_name: str) -> None:
        source = os.path.join(render_dir, source_name)
        dest = os.path.join(stage_dir, archive_name)
        offsets = spritepack.convert_render(
            source, dest, colourway, render_size, target_z
        )
        images.append(spritepack.image_entry(f"images/{archive_name}", offsets))
        files[f"images/{archive_name}"] = dest

    # Image 0 is the preview icon shown in object lists.
    add(manifest["preview"], "preview.png")

    animations: dict = {}
    for entry in manifest["animations"]:
        animation_name = entry["name"]
        offset = len(images)
        for frame_index, rotation_files in enumerate(entry["frames"]):
            for direction, file_name in enumerate(rotation_files):
                add(file_name, f"{animation_name}_f{frame_index}_d{direction}.png")
        animations[animation_name] = {
            "offset": offset,
            "sequence": sequence_for(animation_name, len(entry["frames"])),
        }

    groups = [{"animations": animations, "legacyPosition": 0}]
    # Every further group reuses group 0's sprites (see module docstring).
    for _ in range(spec["groups"] - 1):
        groups.append({"animations": {}})

    object_json = {
        "id": spec["id"],
        "authors": ["Project Sunrise"],
        "version": "1.0",
        "sourceGame": "custom",
        "objectType": "peep_animations",
        "properties": {
            "peepType": spec["peepType"],
            "noRandomPlacement": False,
        },
        "strings": {"name": {"en-GB": spec["name"]}},
        "images": images,
        "animationGroups": groups,
    }

    out_path = os.path.join(OBJECT_ROOT, f"{spec['id']}.parkobj")
    size = spritepack.write_parkobj(out_path, object_json, files, store_images="renderName" in spec)

    return {
        "id": spec["id"],
        "path": out_path,
        "images": len(images),
        "animations": len(animations),
        "groups": len(groups),
        "bytes": size,
    }


def main() -> None:
    names = sys.argv[1:] or list(PEEPS)
    for name in names:
        result = build(name)
        print(
            f"{result['id']}: {result['images']} images, "
            f"{result['animations']} animations, {result['groups']} groups, "
            f"{result['bytes'] / 1024:.1f} KiB -> {os.path.relpath(result['path'], REPO)}"
        )


if __name__ == "__main__":
    main()
