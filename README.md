# Project Sunrise (working codename)

Browser-native theme-park simulator built on an OpenRCT2-derived engine compiled to WebAssembly.
Current stage: **M0, upstream browser verification** (see `docs/status.md`). Full spec: `spec.md`.

## Layout

```
engine/openrct2/   git submodule -> github.com/sariserhan/OpenRCT2 (fork of OpenRCT2/OpenRCT2, unmodified). GPL-3.0.
wasm/scripts/      build.sh (containerized WASM build), build-assets.sh (assets.zip), serve.py (COOP/COEP dev server)
wasm/test/         Playwright smoke test (smoke.js, mem.js)
docs/              wasm.md, status.md, asset-dependencies.md, licensing.md
.cache/            downloaded packs, gxc, ccache (ignored)
```

## Quick start

Requires Docker, Python 3, Node 22+. No RCT2 files are needed to build or to reach the launcher; the M0/M1
gameplay test needs your own RCT2 installation zipped so that `Data/ch.dat` is at the zip root.

```bash
git submodule update --init --depth 1
wasm/scripts/build.sh            # ~3 min clean on 20 cores; output engine/openrct2/build/www
wasm/scripts/build-assets.sh     # downloads open packs (~70 MB), builds sprite tables, writes assets.zip
python3 wasm/scripts/serve.py    # http://localhost:8080/
cd wasm/test && npm install && node smoke.js
```

## Licensing

Engine and anything linked into the WASM module: GPL-3.0. Open asset packs: CC-BY / CC-BY-SA / MIT.
Details and obligations in `docs/licensing.md`. No proprietary RCT2 data is committed or distributed.
