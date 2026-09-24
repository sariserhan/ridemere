"""Build a placeholder track-preview archive (tracks.dat).

    .cache/venv/bin/python tools/art-pipeline/build_track_previews.py

tracks.dat holds the preview thumbnails the track-design list draws, one per track
piece per design style. The engine loads it unconditionally at startup and insists on
an exact entry count (Drawing.Sprite.cpp:652); a missing or short file produces a
fatal log line and a message box.

The standalone distribution ships no track designs, so nothing ever reads an entry,
yet upstream's file is the single largest item in the content pack: 3.18 MB of the
6.39 MB download. This writes an archive with the entry count the engine demands and
one transparent pixel behind each entry.

The consequence is that if track designs are added later, their previews will be
blank until this is replaced with real art. The architecture is untouched: the file,
its entry count and every index remain exactly where the engine expects them.
"""

from __future__ import annotations

import json
import os
import struct
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import spritepack  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GXC = os.path.join(REPO, ".cache", "tools", "gxc")
OUT_DIR = os.path.join(REPO, "assets", "generated", "base")
UPSTREAM_ARCHIVES = (
    os.path.join(REPO, "engine", "openrct2", "build", "www", "_engine_data", "tracks.dat"),
    os.path.join(REPO, "assets", "generated", "engine-data", "tracks.dat"),
)


def entry_count() -> int:
    """How many entries the engine insists tracks.dat has.

    The engine computes this from SPR_TRACKS_END - SPR_TRACKS_BEGIN, both of which are
    defined in terms of long chains of other constants, so rather than reimplement that
    arithmetic this reads the entry count out of the header of upstream's own built
    archive. The two are the same number by construction: upstream builds that file
    from the same enum. If the archive is missing, the pack build must not guess.
    """
    for candidate in UPSTREAM_ARCHIVES:
        if os.path.exists(candidate):
            with open(candidate, "rb") as handle:
                return struct.unpack("<I", handle.read(4))[0]
    raise SystemExit(
        "upstream tracks.dat not found; run wasm/scripts/build-assets.sh first so the "
        "expected entry count can be read from it")


def build() -> dict:
    count = entry_count()
    if not os.path.exists(GXC):
        raise SystemExit(f"gxc not found at {GXC}; see wasm/scripts/build-assets.sh")
    os.makedirs(OUT_DIR, exist_ok=True)
    work = tempfile.mkdtemp(prefix="sunrise-tracks-")
    try:
        blank = os.path.join(work, "blank.png")
        spritepack.write_indexed_png(blank, np.zeros((1, 1), dtype=np.uint8))
        entries = [{"path": "blank.png", "palette": "keep"} for _ in range(count)]
        manifest = os.path.join(work, "sprites.json")
        with open(manifest, "w", encoding="utf-8") as handle:
            json.dump(entries, handle)
        archive = os.path.join(OUT_DIR, "tracks.dat")
        result = subprocess.run([GXC, "-q", "build", archive, manifest],
                                capture_output=True, text=True)
        if result.returncode != 0:
            raise SystemExit(f"gxc failed: {result.stderr[-2000:]}")
        return {"entries": count, "bytes": os.path.getsize(archive), "path": archive}
    finally:
        import shutil
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    info = build()
    print(f"track previews: {info['entries']} placeholder entries, "
          f"{info['bytes'] / 1e6:.3f} MB -> {os.path.relpath(info['path'], REPO)}")
