"""Assert the M3b gameplay criteria from the recorded browser run."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "results-gameplay", "gameplay.json"), encoding="utf-8") as handle:
    data = json.load(handle)

samples = data.get("samples", [])
loaded = data.get("afterLoad") or {}
peak_guests = max((s.get("guestEntities", 0) for s in samples), default=0)
final = samples[-1] if samples else {}

entered = max((s.get("guestsInPark", 0) for s in samples), default=0)
walking = max((s.get("guestsWalking", 0) for s in samples), default=0)
staff = max((s.get("staff", 0) for s in samples), default=0)

# Guest positions must actually change: a guest standing on its own destination
# reports a healthy state but never moves, which is the defect this guards.
positions = set()
for sample in samples:
    for entity in sample.get("entities", []):
        if entity.get("kind") == "guest":
            positions.add((entity["id"], entity["x"], entity["y"]))
guests_seen = {entity_id for entity_id, _, _ in positions}
moved = len(positions) > len(guests_seen)

checks = {
    "park loaded by name": loaded.get("parkName") == "Sunrise Test Park",
    "guests enter the park": entered > 0,
    "guests walk once inside": walking > 0,
    "guest positions change": moved,
    "a handyman is on the map": staff > 0,
    "view is centred on the park": final.get("savedViewY", 0) > 0,
    "park is open": loaded.get("parkOpen") is True,
    "starting cash present": (loaded.get("cash") or 0) > 0,
    "simulation advances": final.get("ticks", 0) > loaded.get("ticks", 0),
    "guests spawn": peak_guests > 0,
    "park saves": data.get("save", {}).get("ok") == 1,
    "saved file is non-empty": (data.get("save", {}).get("size") or 0) > 0,
    "no page crash": not any("CRASHED" in line for line in data.get("log", [])),
}
for name, ok in checks.items():
    print(f"   {'ok ' if ok else 'BAD'} {name}")
print(f"   peak guests {peak_guests}, entered {entered}, walking {walking}, staff {staff}, "
      f"final ticks {final.get('ticks')}, unexpected sprite indices "
      f"{data.get('audit', {}).get('uniqueUnexpected')}")
sys.exit(0 if all(checks.values()) else 1)
