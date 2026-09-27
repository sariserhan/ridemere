"""Validate the image contracts consumed by the five engine flat-ride painters.
Counts include three build previews; see docs/flat-rides.md for painter references.
"""
import io
import json
import os
import zipfile
from PIL import Image
import numpy as np

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
SPECS={
    'carousel':(163,list(range(3,35)),16),
    'dodgems':(67,list(range(3,35)),24),
    'drop_tower':(24,list(range(3,12)),8),
    'swinging_ship':(345,list(range(3,345,9)),32),
    'ferris_wheel':(547,list(range(3,35)),24),
}


def validate(path,key):
    expected,bodies,min_unique=SPECS[key]
    with zipfile.ZipFile(path) as archive:
        root=json.loads(archive.read('object.json'));images=root['images']
        assert len(images)==expected,f'{key}: {len(images)} images; painter requires {expected}'
        pictures=[]
        for index,entry in enumerate(images):
            image=Image.open(io.BytesIO(archive.read(entry['path'])))
            assert image.mode=='P',f'{key} #{index}: lost indexed palette'
            pixels=np.asarray(image)
            assert np.count_nonzero(pixels)>5,f'{key} #{index}: blank/placeholder frame'
            assert image.width<320 and image.height<320,f'{key} #{index}: clipped render canvas'
            if index<3:
                assert entry['x']>=0 and entry['y']>=0,f'{key}: preview cropped above/left of its cell'
                assert entry['x']+image.width<=112 and entry['y']+image.height<=112,f'{key}: preview exceeds ride selector cell'
            pictures.append((image.size,pixels.tobytes()))
        assert len({pictures[i] for i in bodies})>=min_unique,f'{key}: missing animation or orientation variation'
    return expected


def main():
    for key in SPECS:
        path=os.path.join(ROOT,f'assets/generated/objects/sunrise.ride.{key}.parkobj')
        count=validate(path,key)
        print(f'ok {key}: {count} self-contained images, visible previews and animated body frames')
    print('FLAT RIDE ART OK')

if __name__=='__main__':main()
