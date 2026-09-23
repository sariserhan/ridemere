#!/usr/bin/env python3
"""Inventory OpenRCT2 object definitions and classify their image sources.

Reads every object inside .cache/assets/objects.zip (both `.parkobj` zips
containing object.json and bare `.json` definitions) and records, per object:
id, objectType, sourceGame(s), originalId, authors, the directory tree it
lives in, and a classification of where its sprites come from:

  embedded  - PNG files or $LGX:images.dat ranges shipped inside the object
  g1        - $G1[...] ranges  (RCT2 g1.dat, proprietary)
  csg       - $CSG[...] ranges (RCT1 csg1.dat/csg1i.dat, proprietary)
  rct2dat   - $RCT2:OBJDATA/NAME.DAT[...] (RCT2 ObjData .DAT files, proprietary)
  none      - no images / only empty entries (e.g. water, music, peep_names)

Outputs:
  tools/asset-audit/out/object_refs.json
  tools/asset-audit/out/object_summary.md

Python 3 stdlib only.
"""
import collections
import io
import json
import os
import re
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ZIP_PATH = os.path.join(ROOT, ".cache", "assets", "objects.zip")
OUT_DIR = os.path.join(ROOT, "tools", "asset-audit", "out")

RANGE_RE = re.compile(r"\[(\d+)(?:\.\.(\d+))?\]")


def _strip_comment(s):
    idx = s.find("//")
    return s[:idx].strip() if idx >= 0 else s.strip()


def _range_len(ref):
    m = RANGE_RE.search(ref)
    if not m:
        return 1
    lo = int(m.group(1))
    hi = int(m.group(2)) if m.group(2) else lo
    return hi - lo + 1


def classify_ref(ref):
    """Return (class, detail) for one image reference."""
    if isinstance(ref, dict):
        # {"gx": "$CSG[123]", "y": -5}  or  {"path": "foo.png", "x": .., "y": ..}
        if "gx" in ref:
            return classify_ref(ref["gx"])
        if "path" in ref:
            return classify_ref(ref["path"])
        return ("other", json.dumps(ref)[:40])
    if not isinstance(ref, str):
        return ("other", repr(ref)[:40])
    s = _strip_comment(ref)
    if s == "":
        return ("empty", "")
    if s.startswith("$G1"):
        return ("g1", s)
    if s.startswith("$CSG"):
        return ("csg", s)
    if s.startswith("$RCT2:OBJDATA/"):
        return ("rct2dat", s)
    if s.startswith("$RCT2"):
        return ("rct2dat", s)
    if s.startswith("$LGX"):
        return ("embedded", s)
    if s.lower().endswith(".png"):
        return ("embedded", s)
    if s.startswith("$"):
        return ("other", s)
    return ("embedded", s)  # bare file name inside the parkobj


def overall_class(counts):
    """Collapse per-reference classes to a single object-level class."""
    proprietary = {k: v for k, v in counts.items() if k in ("g1", "csg", "rct2dat")}
    has_embedded = counts.get("embedded", 0) > 0
    if not proprietary:
        if has_embedded:
            return "self-contained"
        return "no-images"
    keys = sorted(proprietary)
    tag = "+".join(keys)
    if has_embedded:
        return "mixed:" + tag
    return "needs:" + tag


def load_object(z, name):
    data = z.read(name)
    files = None
    if name.endswith(".parkobj"):
        inner = zipfile.ZipFile(io.BytesIO(data))
        files = inner.namelist()
        obj = json.loads(inner.read("object.json").decode("utf-8-sig"))
    else:
        obj = json.loads(data.decode("utf-8-sig"))
    return obj, files


def as_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def main():
    if not os.path.exists(ZIP_PATH):
        print("missing", ZIP_PATH, file=sys.stderr)
        return 1
    z = zipfile.ZipFile(ZIP_PATH)
    names = [n for n in z.namelist() if not n.endswith("/")]
    records = []
    errors = []
    for name in sorted(names):
        if not (name.endswith(".parkobj") or name.endswith(".json")):
            continue
        try:
            obj, files = load_object(z, name)
        except Exception as e:  # noqa: BLE001
            errors.append({"path": name, "error": str(e)})
            continue
        images = obj.get("images")
        ref_counts = collections.Counter()
        sprite_counts = collections.Counter()
        g1_ranges, csg_ranges, dat_files = [], [], set()
        if isinstance(images, list):
            for ref in images:
                cls, detail = classify_ref(ref)
                ref_counts[cls] += 1
                n = _range_len(detail) if detail else 1
                sprite_counts[cls] += n
                if cls == "g1":
                    g1_ranges.append(detail)
                elif cls == "csg":
                    csg_ranges.append(detail)
                elif cls == "rct2dat":
                    m = re.match(r"\$RCT2:OBJDATA/([^\[]+)", detail)
                    if m:
                        dat_files.add(m.group(1))
        tree = name.split("/")[0]
        rec = {
            "path": name,
            "tree": tree,
            "format": "parkobj" if name.endswith(".parkobj") else "json",
            "id": obj.get("id"),
            "objectType": obj.get("objectType"),
            "sourceGame": as_list(obj.get("sourceGame")),
            "originalId": obj.get("originalId"),
            "isCompatibilityObject": bool(obj.get("isCompatibilityObject", False)),
            "authors": as_list(obj.get("authors")),
            "hasImagesField": images is not None,
            "imageRefCount": len(images) if isinstance(images, list) else 0,
            "imageRefClasses": dict(ref_counts),
            "spriteCountByClass": dict(sprite_counts),
            "imageSource": overall_class(ref_counts),
            "g1Ranges": g1_ranges,
            "csgRanges": csg_ranges,
            "rct2DatFiles": sorted(dat_files),
            "embeddedFiles": [f for f in (files or []) if f != "object.json"],
        }
        records.append(rec)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "object_refs.json"), "w") as f:
        json.dump({"source": os.path.relpath(ZIP_PATH, ROOT), "count": len(records),
                   "errors": errors, "objects": records}, f, indent=1)

    # ---- summary ----------------------------------------------------------
    classes = ["self-contained", "no-images", "needs:g1", "needs:csg", "needs:rct2dat",
               "needs:csg+g1", "needs:g1+rct2dat", "needs:csg+rct2dat", "needs:csg+g1+rct2dat",
               "mixed:g1", "mixed:csg", "mixed:rct2dat", "mixed:csg+g1", "mixed:g1+rct2dat",
               "mixed:csg+rct2dat", "mixed:csg+g1+rct2dat"]
    seen_classes = sorted({r["imageSource"] for r in records}, key=lambda c: classes.index(c) if c in classes else 99)
    by_type = collections.defaultdict(collections.Counter)
    by_tree = collections.defaultdict(collections.Counter)
    for r in records:
        by_type[r["objectType"] or "?"][r["imageSource"]] += 1
        by_tree[r["tree"]][r["imageSource"]] += 1

    def needs_rct_data(r):
        return r["imageSource"] not in ("self-contained", "no-images")

    lines = []
    lines.append("# OpenRCT2 object inventory: image-source audit\n")
    lines.append(f"Source: `{os.path.relpath(ZIP_PATH, ROOT)}`, {len(records)} objects "
                 f"({sum(1 for r in records if r['format']=='parkobj')} .parkobj, "
                 f"{sum(1 for r in records if r['format']=='json')} bare .json). Errors: {len(errors)}.\n")
    lines.append("Classes: `self-contained` = every sprite is embedded (PNG / `$LGX:images.dat`); "
                 "`no-images` = object has no sprites (water palettes, music, audio, peep_names, scenario text); "
                 "`needs:*` = every sprite comes from proprietary data; `mixed:*` = some embedded, some proprietary. "
                 "`g1` = RCT2 g1.dat, `csg` = RCT1 csg1.dat, `rct2dat` = RCT2 ObjData/*.DAT.\n")

    total = collections.Counter(r["imageSource"] for r in records)
    lines.append("## Totals\n")
    lines.append("| class | objects |\n|---|---|")
    for c in seen_classes:
        lines.append(f"| {c} | {total[c]} |")
    sc = sum(1 for r in records if r["imageSource"] == "self-contained")
    ni = sum(1 for r in records if r["imageSource"] == "no-images")
    nd = sum(1 for r in records if needs_rct_data(r))
    lines.append(f"\nUsable without any RCT1/RCT2 file: **{sc + ni}** ({sc} self-contained + {ni} image-less). "
                 f"Need proprietary data: **{nd}**.\n")

    lines.append("## By source tree\n")
    lines.append("| tree | " + " | ".join(seen_classes) + " | total |")
    lines.append("|---|" + "---|" * (len(seen_classes) + 1))
    for t in sorted(by_tree):
        row = by_tree[t]
        lines.append(f"| {t} | " + " | ".join(str(row.get(c, 0)) for c in seen_classes) + f" | {sum(row.values())} |")

    lines.append("\n## By objectType x image source\n")
    lines.append("| objectType | " + " | ".join(seen_classes) + " | total | usable w/o RCT2 |")
    lines.append("|---|" + "---|" * (len(seen_classes) + 2))
    for t in sorted(by_type):
        row = by_type[t]
        usable = row.get("self-contained", 0) + row.get("no-images", 0)
        lines.append(f"| {t} | " + " | ".join(str(row.get(c, 0)) for c in seen_classes) + f" | {sum(row.values())} | {usable} |")

    lines.append("\n## By objectType x image source, `official/` tree only\n")
    off = [r for r in records if r["tree"] == "official"]
    bt = collections.defaultdict(collections.Counter)
    for r in off:
        bt[r["objectType"] or "?"][r["imageSource"]] += 1
    lines.append("| objectType | " + " | ".join(seen_classes) + " | total |")
    lines.append("|---|" + "---|" * (len(seen_classes) + 1))
    for t in sorted(bt):
        row = bt[t]
        lines.append(f"| {t} | " + " | ".join(str(row.get(c, 0)) for c in seen_classes) + f" | {sum(row.values())} |")

    lines.append("\n## Fully self-contained objects (embedded images only)\n")
    for t in sorted(by_type):
        ids = sorted(r["id"] for r in records if r["objectType"] == t and r["imageSource"] == "self-contained")
        if ids:
            lines.append(f"### {t} ({len(ids)})\n")
            lines.append(", ".join(f"`{i}`" for i in ids) + "\n")

    lines.append("\n## Image-less objects (no sprites; usable without RCT2 unless they reference audio files)\n")
    for t in sorted(by_type):
        ids = sorted(r["id"] for r in records if r["objectType"] == t and r["imageSource"] == "no-images")
        if ids:
            lines.append(f"### {t} ({len(ids)})\n")
            lines.append(", ".join(f"`{i}`" for i in ids) + "\n")

    lines.append("\n## Objects that need RCT1/RCT2 data\n")
    lines.append("Grouped by objectType; each entry shows the class. `$G1` users list their g1.dat ranges "
                 "(these are the ones that would need OpenGraphics replacements even if the .DAT objects are dropped).\n")
    for t in sorted(by_type):
        rs = sorted((r for r in records if r["objectType"] == t and needs_rct_data(r)), key=lambda r: r["id"])
        if not rs:
            continue
        lines.append(f"### {t} ({len(rs)})\n")
        for r in rs:
            extra = ""
            if r["g1Ranges"]:
                extra = " g1=" + ",".join(x.replace("$G1", "") for x in r["g1Ranges"][:12])
                if len(r["g1Ranges"]) > 12:
                    extra += f",...(+{len(r['g1Ranges'])-12})"
            if r["rct2DatFiles"]:
                extra += " dat=" + ",".join(r["rct2DatFiles"])
            lines.append(f"- `{r['id']}` [{r['imageSource']}]{extra}")
        lines.append("")

    lines.append("\n## Objects referencing `$G1` (need g1.dat / OpenGraphics)\n")
    g1 = sorted((r for r in records if r["g1Ranges"]), key=lambda r: (r["objectType"], r["id"]))
    lines.append(f"{len(g1)} objects. Total distinct g1 sprite count referenced: "
                 f"{len(_g1_index_set(g1))}.\n")
    lines.append("| id | type | tree | g1 ranges |\n|---|---|---|---|")
    for r in g1:
        lines.append(f"| `{r['id']}` | {r['objectType']} | {r['tree']} | "
                     + ", ".join(x.replace('$G1', '') for x in r["g1Ranges"]) + " |")

    with open(os.path.join(OUT_DIR, "object_summary.md"), "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"objects: {len(records)}  errors: {len(errors)}")
    for c in seen_classes:
        print(f"  {c:28s} {total[c]}")
    print(f"usable without RCT data: {sc + ni}; need RCT data: {nd}")
    return 0


def _g1_index_set(recs):
    s = set()
    for r in recs:
        for ref in r["g1Ranges"]:
            m = RANGE_RE.search(ref)
            if not m:
                continue
            lo = int(m.group(1))
            hi = int(m.group(2)) if m.group(2) else lo
            s.update(range(lo, hi + 1))
    return s


if __name__ == "__main__":
    sys.exit(main())
