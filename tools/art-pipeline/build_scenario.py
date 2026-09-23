"""Generate a scenario's .park file from its source description.

    .cache/venv/bin/python tools/art-pipeline/build_scenario.py [name]

A park file can normally only be produced by a person using the scenario editor.
This drives the engine's own park builder and writer instead, so the scenarios a
distribution ships are regenerated from a readable description rather than kept as
opaque binaries.

The engine runs in the browser build, which is the only build we produce, so the
description is handed to the exported SunriseBuildPark function through Playwright
and the resulting file is read back out of the virtual filesystem.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCENARIOS = os.path.join(REPO, "assets", "scenarios")
OUTPUT = os.path.join(REPO, "assets", "generated", "scenarios")
DRIVER = os.path.join(REPO, "wasm", "test", "make_scenario.js")


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "sunrise-test"
    source = os.path.join(SCENARIOS, name, "scenario.json")
    if not os.path.exists(source):
        raise SystemExit(f"no scenario description at {source}")
    with open(source, "r", encoding="utf-8") as handle:
        description = json.load(handle)

    os.makedirs(OUTPUT, exist_ok=True)
    destination = os.path.join(OUTPUT, f"{name}.park")

    result = subprocess.run(
        ["node", DRIVER, json.dumps(description), destination],
        cwd=os.path.join(REPO, "wasm", "test"), capture_output=True, text=True,
    )
    sys.stdout.write(result.stdout)
    if result.returncode != 0:
        sys.stderr.write(result.stderr[-4000:])
        raise SystemExit(f"scenario generation failed for {name}")
    print(f"{name}: {os.path.getsize(destination)} bytes -> {os.path.relpath(destination, REPO)}")


if __name__ == "__main__":
    main()
