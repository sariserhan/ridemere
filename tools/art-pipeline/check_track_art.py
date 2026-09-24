"""Assert that shipped track artwork is real art, not blank placeholders.

    .cache/venv/bin/python tools/art-pipeline/check_track_art.py [pack dir]

This exists because of a specific mistake. During M3e, tracks.dat was replaced with an
archive of transparent one-pixel entries on the belief that it held track-design
preview thumbnails. It holds the rails. The coaster ran for a whole milestone with a
train, stations and supports and no track, and nothing caught it: the ride-loop test
asserts engine state rather than pixels, and the sprite audit covers only the base
archive while tracks.dat is a separate sprite table.

Checking that the file exists is not enough, because the placeholder existed too. This
checks the art inside it: a sprite table full of one-pixel entries fails, whatever its
name or size.

Archive format (libsawyer "g1"): a header of two little-endian uint32 fields,
numEntries and totalSize, then numEntries element headers of 16 bytes each
(offset, width, height, xOffset, yOffset, flags, zoomedOffset), then the pixel data.
"""

from __future__ import annotations

import hashlib
import os
import struct
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

#: A real track sprite is a piece of rail seen isometrically; none of them is tiny.
MIN_INTERESTING_WIDTH = 8
MIN_INTERESTING_HEIGHT = 4

#: Almost every entry should be real art. The allowance covers the handful of genuinely
#: empty slots an archive of this size may carry.
MIN_FRACTION_REAL = 0.90

#: A blank 8,685-entry archive is about 0.15 MB; the real one is about 6.5 MB.
MIN_TOTAL_DATA_BYTES = 2_000_000


def read_archive(path: str) -> dict:
    with open(path, "rb") as handle:
        blob = handle.read()
    if len(blob) < 8:
        raise SystemExit(f"{path}: too short to be a sprite archive")
    num_entries, total_size = struct.unpack_from("<II", blob, 0)
    table_end = 8 + num_entries * 16
    if len(blob) < table_end:
        raise SystemExit(f"{path}: truncated element table")

    real = 0
    widths = []
    for index in range(num_entries):
        offset, width, height = struct.unpack_from("<IHH", blob, 8 + index * 16)
        widths.append((width, height))
        if width >= MIN_INTERESTING_WIDTH and height >= MIN_INTERESTING_HEIGHT:
            real += 1
    return {
        "path": path,
        "entries": num_entries,
        "totalDataBytes": total_size,
        "fileBytes": len(blob),
        "realEntries": real,
        "fractionReal": real / num_entries if num_entries else 0.0,
        "sha256": hashlib.sha256(blob).hexdigest(),
        "sample": widths[:3],
    }


def main() -> None:
    pack = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "assets", "generated", "pack")
    path = os.path.join(pack, "tracks.dat")
    if not os.path.exists(path):
        raise SystemExit(f"FAIL: {path} is not in the content pack; rides that use it draw no track")

    info = read_archive(path)
    print(
        f"tracks.dat: {info['entries']} entries, {info['fileBytes'] / 1e6:.2f} MB, "
        f"{info['realEntries']} with real art ({info['fractionReal'] * 100:.1f}%)"
    )
    print(f"  sha256 {info['sha256']}")

    problems = []
    if info["totalDataBytes"] < MIN_TOTAL_DATA_BYTES:
        problems.append(
            f"only {info['totalDataBytes'] / 1e6:.2f} MB of pixel data, expected at least "
            f"{MIN_TOTAL_DATA_BYTES / 1e6:.1f} MB"
        )
    if info["fractionReal"] < MIN_FRACTION_REAL:
        problems.append(
            f"only {info['fractionReal'] * 100:.1f}% of entries are larger than "
            f"{MIN_INTERESTING_WIDTH}x{MIN_INTERESTING_HEIGHT}, expected at least "
            f"{MIN_FRACTION_REAL * 100:.0f}%"
        )

    if problems:
        print("FAIL: the shipped track artwork looks like placeholders, not art:")
        for problem in problems:
            print(f"  {problem}")
        print("  Rides drawn from this table would render with no rails.")
        sys.exit(1)

    print("track artwork is real.")


if __name__ == "__main__":
    main()
