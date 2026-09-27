"""Original ground-level decking and rope fencing used by integral flat rides.
Fixed sprite slots are defined by TrackPaint.h; no legacy artwork is read.
"""
import json
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from build_fonts import FACE_REGULAR
import spritepack
import sunrise_palette as pal
from build_paths import diamond_mask

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, 'assets/generated/ui/flat-rides')


def main():
    os.makedirs(OUT, exist_ok=True)
    offsets = {}
    def save(index, pixels, x=-32, y=0):
        spritepack.write_indexed_png(os.path.join(OUT, f'{index}.png'), np.asarray(pixels,dtype=np.uint8))
        offsets[str(index)] = {'x':x,'y':y}
    mask=diamond_mask(); yy,xx=np.indices(mask.shape)
    for index in range(22134,22138):
        pixels=np.where(mask, np.array(pal.ramp('tan'))[5 + ((xx+2*yy)//8)%2],0).astype(np.uint8)
        save(index,pixels)
    # The engine positions these relative to the tile origin, not its centre.
    edges=[((32,0),(0,16)),((0,16),(32,31)),((32,31),(63,16)),((63,16),(32,0))]
    for i,(a,b) in enumerate(edges):
        image=Image.new('P',(64,43),0); draw=ImageDraw.Draw(image)
        for t in (0,.5,1):
            x=round(a[0]+(b[0]-a[0])*t);y=round(a[1]+(b[1]-a[1])*t)+10
            draw.line([(x,y),(x,y-9)],fill=pal.ramp('tan')[3],width=2)
            draw.point((x,y-9),fill=pal.ramp('beige')[9])
        for low,high in ((0,.5),(.5,1)):
            points=[]
            for j in range(9):
                t=low+(high-low)*j/8
                x=round(a[0]+(b[0]-a[0])*t)
                y=round(a[1]+(b[1]-a[1])*t)+3+round(2*np.sin(j*np.pi/8))
                points.append((x,y))
            draw.line(points,fill=pal.ramp('beige')[7],width=1)
        save(22138+i,image,y=-10)
    # Dodgems: painted driving floor, open steel power-grid roof and perimeter rails.
    floor=np.where(mask,np.array(pal.ramp('blue_grey'))[5+((xx//8+yy//8)%2)],0).astype(np.uint8)
    save(21925,floor)
    for direction in range(4):
        roof=Image.new('P',(64,61),0);draw=ImageDraw.Draw(roof)
        draw.line([(0,16),(32,0),(63,16),(32,31),(0,16)],fill=pal.ramp('grey')[7],width=1)
        draw.line([(0,16),(32,31),(63,16)],fill=pal.ramp('grey')[3],width=2)
        for x,y in ([(0,16),(63,16)] if direction%2==0 else [(32,0),(32,31)]):
            draw.line([(x,y),(x,y+29)],fill=pal.ramp('grey')[5],width=1)
        save(21926+direction,roof)
        mesh=np.where(mask & ((xx%8==0)|(yy%8==0)),1,0).astype(np.uint8)
        save(21930+direction,mesh)
        source=np.array(Image.open(os.path.join(OUT,f'{22138+direction}.png')))
        save(21934+direction,source,y=-10)
    # The tower's three vertical modules are rendered in Blender at 32 engine pixels.
    rendered=os.path.join(ROOT,'assets/generated/flat-rides')
    manifest=json.load(open(os.path.join(rendered,'frames.json')))
    scheme=dict(spritepack.WORLD_COLOURWAY,shirt=pal.RAMP_PRIMARY[1:9],accessory=pal.RAMP_SECONDARY[1:9])
    for i,source in enumerate(manifest['towerStructure']):
        index=14564+i
        rect=spritepack.convert_render(os.path.join(rendered,source),os.path.join(OUT,f'{index}.png'),scheme,128,2.0,extra_y=16)
        offsets[str(index)]={'x':rect['x'],'y':rect['y']}
    save(14567,floor)
    for direction in range(4):
        source=np.array(Image.open(os.path.join(OUT,f'{22138+direction}.png')))
        save(14568+direction,source,y=-10)
    for i,source in enumerate(manifest['shipSupports']):
        index=21994+i
        rect=spritepack.convert_render(os.path.join(rendered,source),os.path.join(OUT,f'{index}.png'),scheme,320,5.0)
        offsets[str(index)]={'x':rect['x'],'y':rect['y']}
    for i,source in enumerate(manifest['wheelSupports']):
        index=22150+i
        rect=spritepack.convert_render(os.path.join(rendered,source),os.path.join(OUT,f'{index}.png'),scheme,320,7.0)
        offsets[str(index)]={'x':rect['x'],'y':rect['y']}
    # Raised boarding strips used by the swinging ship, in both grid directions.
    for index in range(22362,22370):
        vertical=index%2==1
        vertices=[(0,0),(32,16),(24,20),(-8,4)] if not vertical else [(0,0),(8,4),(-24,20),(-32,16)]
        left=min(x for x,y in vertices)
        strip=Image.new('P',(41,25),0);draw=ImageDraw.Draw(strip)
        points=[(x-left,y) for x,y in vertices]
        draw.polygon([(x,y+3) for x,y in points],fill=pal.ramp('tan')[3])
        draw.polygon(points,fill=pal.ramp('beige')[7])
        draw.line(points+[points[0]],fill=pal.ramp('tan')[5])
        if index in (22364,22365,22366,22367):
            a,b=points[0],points[1] if not vertical else points[3]
            draw.line([a,b],fill=pal.ramp('grey')[4],width=2)
        save(index,strip,x=left)
    for index in range(22370,22376):
        vertical=index%2==1 if index<22374 else index==22374
        length=8 if index>=22374 else 32
        direction=-1 if vertical else 1
        left=-length if vertical else 0
        railing=Image.new('P',(length+2,length//2+11),0);draw=ImageDraw.Draw(railing)
        for t in (0,.5,1):
            x=round(direction*length*t)-left;y=round(length*t/2)+9
            draw.line([(x,y),(x,y-8)],fill=pal.ramp('grey')[4],width=2)
        draw.line([(-left,1),(direction*length-left,length//2+1)],fill=pal.ramp('grey')[8],width=2)
        save(index,railing,x=left,y=-9)
    for index in range(22426,22433):
        deck=Image.new('P',(64,41),0);draw=ImageDraw.Draw(deck)
        draw.polygon([(0,16),(32,31),(63,16),(63,25),(32,40),(0,25)],fill=pal.ramp('tan')[3])
        draw.polygon([(32,0),(63,16),(32,31),(0,16)],fill=pal.ramp('tan')[6])
        save(index,deck)
    # Coaster station platform variants and their red/green dispatch signals.
    for index in range(22380,22392):
        vertical=index%2==1
        source=Image.open(os.path.join(OUT,f'{22362+int(vertical)}.png'))
        platform=Image.new('P',(41,36),0);platform.paste(source,(0,11))
        draw=ImageDraw.Draw(platform)
        x=30 if vertical else 8
        draw.line([(x,15),(x,2)],fill=pal.ramp('grey')[4],width=2)
        colour='green' if index in (22382,22383,22390,22391) else 'red'
        draw.rectangle((x-2,1,x+2,5),fill=pal.ramp('grey')[2])
        draw.rectangle((x-1,2,x+1,4),fill=pal.ramp(colour)[7])
        save(index,platform,x=-32 if vertical else -8,y=-11)
    # Signed height markers: zero is 5769, with imperial/metres banks +256/+512.
    font=ImageFont.truetype(FACE_REGULAR,9)
    for bank in range(3):
        for height in range(-127,129):
            text=str(height) if bank==0 else (f'{height*5}ft' if bank==1 else f'{height*1.5:g}m')
            width=int(font.getlength(text))+6
            label=Image.new('P',(width,12),0);draw=ImageDraw.Draw(label)
            draw.rounded_rectangle((0,0,width-1,10),radius=2,fill=pal.ramp('grey')[2],outline=pal.ramp('grey')[7])
            draw.text((3,-1),text,font=font,fill=pal.ramp('grey')[11])
            save(5769+bank*256+height,label,x=-width//2,y=-11)
    with open(os.path.join(OUT,'offsets.json'),'w') as f:json.dump(offsets,f,indent=2)
    print(f'flat ride bases: {len(offsets)} original platform, roof and fence sprites')

if __name__=='__main__':main()
