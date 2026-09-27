"""Release gates for guest appearances, audible sample slots and music payloads."""
import io
import json
import wave
import zipfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
OBJECTS=ROOT/'assets/generated/objects'

def main():
    previews=set()
    for shape in range(6):
        walking=set()
        for tone in range(6):
            with zipfile.ZipFile(OBJECTS/f'sunrise.peep_animations.guest_{shape}_{tone}.parkobj') as z:
                d=json.loads(z.read('object.json'))
                assert len(d['animationGroups'])==35
                assert len(d['images'])==293
                assert d['properties']['peepType']=='guest'
                p=Image.open(io.BytesIO(z.read(d['images'][1]['path'])))
                pixels=np.asarray(p)
                assert np.count_nonzero(pixels)>20
                walking.add(pixels.tobytes())
                previews.add((p.size,pixels.tobytes()))
                for anim in d['animationGroups'][0]['animations'].values():
                    assert anim['sequence'] and anim['offset']<len(d['images'])

        assert len(walking)==6,f'shape {shape}: skin palettes do not differ'
    assert len(previews)==36,'appearances must have distinct rendered art'
    with zipfile.ZipFile(OBJECTS/'sunrise.audio.base.parkobj') as z:
        d=json.loads(z.read('object.json'));assert len(d['samples'])==64
        for sample in d['samples']:
            with wave.open(io.BytesIO(z.read(sample['source']))) as wav:
                assert wav.getnframes()>100
                raw=wav.readframes(wav.getnframes())
                assert len(set(raw))>8,f'{sample}: silent sample'
    for music in ('dodgems','mystic','rock4'):
        with zipfile.ZipFile(OBJECTS/f'openrct2.music.{music}.parkobj') as z:
            d=json.loads(z.read('object.json'))
            for track in d['properties']['tracks']:
                data=z.read(track['source']);assert data.startswith(b'OggS') and len(data)>10000
    litter=ROOT/'assets/generated/litter'
    offsets=json.loads((litter/'offsets.json').read_text())
    assert set(map(int,offsets))==set(range(23101,23133))
    for index in offsets:
        assert np.count_nonzero(np.asarray(Image.open(litter/f'{index}.png')))>8
    ui=json.loads((ROOT/'assets/generated/ui/ui-sprites.json').read_text())
    for index in ('5130','5131'):
        assert np.count_nonzero(np.asarray(Image.open(ROOT/ui[index])))>8
    print('V1 CONTENT OK: 36 distinct guest appearances, 64 audible base slots, three music tracks')

if __name__=='__main__':main()
