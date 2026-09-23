#!/usr/bin/env python3
"""Builds stub-rct2.zip: a fake 'RCT2 installation' containing NO proprietary data.
Data/g1.dat = 29,294 blank sprites built with gxc (the engine's expected g1 entry count, SPR_G1_END),
Data/ch.dat = empty marker file (the upstream launcher checks for it), empty ObjData/ and Scenarios/.
Purpose: test whether the engine boots when the RCT2 base sprite table is present but blank and no RCT2 objects exist."""
import json, os, subprocess, sys, zipfile, shutil, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GXC = os.path.join(ROOT, '.cache', 'tools', 'gxc')
EMPTY = os.path.join(ROOT, 'engine', 'openrct2', 'resources', 'g2', 'empty.png')
G1_COUNT = int(sys.argv[1]) if len(sys.argv) > 1 else 29294
out = os.path.join(os.path.dirname(__file__), 'stub-rct2-red.zip' if os.environ.get('MARKER') else 'stub-rct2.zip')
with tempfile.TemporaryDirectory() as tmp:
    if os.environ.get('MARKER'):
        import zlib, struct
        w=h=16; raw=b''.join(b'\x00'+b'\xff\x00\x00\xff'*w for _ in range(h))
        def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
        png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
        open(os.path.join(tmp,'empty.png'),'wb').write(png)
    else:
        shutil.copy(EMPTY, os.path.join(tmp, 'empty.png'))
    json.dump([{"path": "empty.png"}] * G1_COUNT, open(os.path.join(tmp, 'sprites.json'), 'w'))
    subprocess.run([GXC, '-q', '-m', 'closest', 'build', os.path.join(tmp, 'g1.dat'), os.path.join(tmp, 'sprites.json')], check=True)
    size = os.path.getsize(os.path.join(tmp, 'g1.dat'))
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('Data/', b'')  # launcher's extractor needs explicit directory entries
        z.write(os.path.join(tmp, 'g1.dat'), 'Data/g1.dat')
        z.writestr('Data/ch.dat', b'')
        z.writestr('ObjData/', b''); z.writestr('Scenarios/', b''); z.writestr('Tracks/', b'')
print(f"wrote {out}: g1.dat {size} bytes ({G1_COUNT} blank entries), zip {os.path.getsize(out)} bytes")
