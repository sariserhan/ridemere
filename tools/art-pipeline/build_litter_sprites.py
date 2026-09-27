"""Original tiny ground-level discarded packaging, in every native orientation."""
import json
import os
import numpy as np
from build_ui_sprites import Canvas, PAPER, EDGE, INK, ACCENT, GREEN_DARK, BLUE, RED, BROWN
import spritepack
from build_ui_sprites import REPO

OUT = os.path.join(REPO, 'assets/generated/litter')
TYPES = [('sick',2),('sick_alt',2),('can',2),('paper',2),('burger_box',2),('cup',2),('box',2),('bottle',2),('bowl_red',4),('carton',4),('juice_cup',4),('bowl_blue',4)]

def draw(kind, direction):
    c = Canvas(14, 10)
    c.line(3,7,10,7,EDGE)
    if kind.startswith('sick'):
        c.rect(3,5,9,6,GREEN_DARK); c.rect(6,4,10,5,BROWN)
        c.rect(2,6,4,7,BROWN); c.rect(10,7,11,7,GREEN_DARK)
    elif kind in ('burger_box','box','carton','paper'):
        c.rect(3,4,9,6,PAPER); c.line(3,6,9,6,BROWN)
        c.line(4,3,9,3,EDGE); c.line(9,4,11,5,EDGE)
        if kind != 'paper': c.line(5,4,8,4,ACCENT if kind!='carton' else BLUE)
    elif kind.startswith('bowl'):
        colour = BLUE if kind=='bowl_blue' else RED
        c.line(3,4,10,4,colour); c.line(4,5,9,5,PAPER); c.line(5,6,8,6,colour)
    elif kind=='bottle':
        c.line(3,6,8,4,GREEN_DARK,2); c.rect(9,3,10,4,EDGE); c.rect(5,5,7,5,PAPER)
    else:
        c.rect(5,3,8,6,EDGE); c.rect(5,3,7,5,PAPER)
        c.line(5,5,8,5,BLUE if kind=='can' else ACCENT)
        if kind=='juice_cup': c.line(7,1,7,3,RED)
    if direction & 1: c.pixels = np.fliplr(c.pixels).copy()
    if direction & 2: c.pixels = np.roll(c.pixels, 1, axis=1)
    return c.pixels

def build():
    os.makedirs(OUT,exist_ok=True); offsets={}; index=23101
    for kind,count in TYPES:
        for direction in range(count):
            spritepack.write_indexed_png(os.path.join(OUT,f'{index}.png'),draw(kind,direction))
            offsets[str(index)]={'x':-7,'y':-7}; index+=1
    with open(os.path.join(OUT,'offsets.json'),'w') as f: json.dump(offsets,f,indent=2)
    print(f'Original litter: {len(offsets)} sprites')
if __name__=='__main__': build()
