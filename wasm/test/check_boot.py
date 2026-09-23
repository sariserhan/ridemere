"""Assert the M3 standalone boot criteria from the recorded browser run."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "results-standalone", "standalone.json"), encoding="utf-8") as handle:
    data = json.load(handle)

checks = {
    "engine reached a running state": data["booted"] is True,
    "no import prompt shown": data["promptShown"] is False,
    "no original-game data required": data["rct2Required"] is False,
    "standalone content mode active": data["standaloneEnabled"] is True,
    "sprite audit armed": data["spriteAuditArmed"] is True,
    "no fatal errors": not data["fatal"],
    "content objects indexed": int(data["objectIndex"] or 0) >= 4,
}
for name, ok in checks.items():
    print(f"   {'ok ' if ok else 'BAD'} {name}")
print(f"   boot took {data['bootMs']} ms")
sys.exit(0 if all(checks.values()) else 1)
