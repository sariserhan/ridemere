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

checks = {
    "park loaded by name": loaded.get("parkName") == "Sunrise Test Park",
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
print(f"   peak guests {peak_guests}, final ticks {final.get('ticks')}, "
      f"unexpected sprite indices {data.get('audit', {}).get('uniqueUnexpected')}")
sys.exit(0 if all(checks.values()) else 1)
