# Experiment: boot the browser engine with a stub RCT2 directory (no proprietary data)

Question: does current OpenRCT2 need the *content* of the RCT2 files, or only their *presence*? What breaks when
the base sprite table is present but blank and no RCT2 objects exist?

## Setup

`make_stub_rct2.py` builds `stub-rct2.zip`:

- `Data/g1.dat`: 29,294 entries (exactly `SPR_G1_END`, the count the loader insists on) built with `gxc` from a
  single 1×1 transparent PNG. With `MARKER=1` every entry is instead a 16×16 solid red square
  (`gxc -m closest`), so anything the engine draws from g1 shows up red.
- `Data/ch.dat`: empty (the upstream launcher only checks that this path exists).
- `ObjData/`, `Scenarios/`, `Tracks/`: empty.

`run_boot.js` loads the served build, feeds the zip to the launcher's file input, and screenshots at 5/15/30/45 s.

```bash
python3 make_stub_rct2.py && node run_boot.js                       # blank g1
MARKER=1 python3 make_stub_rct2.py && STUB=stub-rct2-red.zip TAG=red2 node run_boot.js   # red marker g1
```

## Result (engine d99eb5dcf7, 2026-09-23)

- **The engine boots and runs the title sequence.** Object index built (2,518 items), scenario/track indexes
  empty, title parks from `openrct2.parkseq` load and animate, the changelog window opens, the UI is responsive.
  No crash, no fatal log line, 45 s+ of runtime.
- The 849 `rct2.*` / `rct1.*` wrapper objects that point at RCT2 `.DAT` files each log one
  `Unable to open 'X.DAT'` warning at index time and are skipped (`ObjectFactory.cpp:315`); 434 of them are rides,
  227 small scenery, 104 walls, 29 scenery groups, 13 large scenery, 12 path items, 11 path surfaces, 6 railings,
  5 banners, 2 park entrances, 2 music. Nothing else complains about them.
- With the red marker table (`results/red2-45s.png`): terrain surfaces and edges, water, footpaths, ride
  supports, fences, the title-menu buttons and most trees are red, i.e. drawn straight from g1 by index.
  Everything that still renders correctly comes from objects that carry their own images: the four upstream
  rides (`openrct2.ride.{hybrid_coaster,single_rail_coaster,alpine_coaster,modern_twister}` draw their track and
  trains), and custom objects embedded inside the title parks. The OpenRCT2 logo, fonts and window chrome are
  from the open `g2.dat`/`fonts.dat`.
- Blank-table screenshots are **not evidence**. A transparent sprite draws nothing, so the software renderer
  leaves whatever was previously in the framebuffer (earlier frames, previous camera positions, previous
  parks in the sequence; `ViewportShiftPixels` scrolls old pixels rather than repainting). The blank runs
  (`blank2-*.png`) therefore show a plausible-looking but stale collage, including textures that cannot have
  come from the stub table. Only the opaque marker run (`red3-*.png`, and `red2-*`) is diagnostic. The
  in-page filesystem check in `run_boot.js` confirms both runs loaded the stub (`FS CHECK` line: 498,006 B
  blank / 7,967,976 B red, 29,294 entries).

## What this establishes

1. The RCT2 dependency is a **data-presence gate plus a sprite-index contract**, not a structural one. The engine
   does not inspect the g1 content; a replacement archive with 29,294 entries in the same order is accepted.
   The gate itself is three file checks (`Platform.Common.cpp:148` `classifyGamePath` looks for `Data/g1.dat`) and
   the launcher's `Data/ch.dat` check.
2. Missing RCT2 objects degrade gracefully: warnings, then absent from the repository. A reduced object set
   is architecturally fine at boot and on the title screen. (Behaviour when a *park* references a missing
   object is covered in `docs/content-reduction.md`.)
3. The red-marker table is a useful ongoing audit instrument: load any park with it and everything red is
   remaining proprietary sprite dependency, everything else is already open. Always use an opaque marker;
   never draw conclusions from a transparent/blank table.

## Not shown by this experiment

- Gameplay (new park, building, guests) was not exercised; guests and staff sprites are g1 (would be red).
- Audio was not evaluated.
- The remaining g1 usages are enumerated by `tools/asset-audit/sprite_refs.py`, not by this experiment.
