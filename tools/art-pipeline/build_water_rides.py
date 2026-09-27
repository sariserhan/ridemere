"""Original procedural log boats. No commercial game artwork is read or copied."""
from pathlib import Path
import math
from PIL import Image, ImageDraw
import spritepack
import sunrise_palette as pal
ROOT = Path(__file__).resolve().parents[2]
STAGE = ROOT / 'assets/generated/staging/water'
STAGE.mkdir(parents=True, exist_ok=True)

def sprite(angle, pitch, name):
    im=Image.new('P',(96,80),0); im.putpalette([c for rgb in pal.PALETTE for c in rgb]); draw=ImageDraw.Draw(im)
    a=angle*math.tau; p=math.radians(pitch)
    def point(x,y,z):
        xx=x*math.cos(p)+z*math.sin(p); zz=z*math.cos(p)-x*math.sin(p)
        u=xx*math.cos(a)-y*math.sin(a); v=xx*math.sin(a)+y*math.cos(a)
        return (48+(u-v)*19,48+(u+v)*9-zz*24)
    outline=[(-.88,0),(-.63,-.25),(.63,-.25),(.82,0),(.63,.25),(-.63,.25)]
    faces=[]
    for i,(x,y) in enumerate(outline):
        nx,ny=outline[(i+1)%len(outline)]; faces.append(([point(x,y,0),point(nx,ny,0),point(nx,ny,.25),point(x,y,.25)],pal.ramp('brown')[3+i%3]))
    for poly,color in sorted(faces,key=lambda f:sum(p[1] for p in f[0])): draw.polygon(poly,fill=color)
    draw.polygon([point(x,y,.25) for x,y in outline],fill=pal.ramp('brown')[7])
    draw.polygon([point(x*.76,y*.66,.255) for x,y in outline],fill=pal.ramp('brown')[1])
    for x in [-.36,.1,.45]: draw.line([point(x,-.18,.26),point(x,.18,.26)],fill=pal.ramp('tan')[6],width=3)
    file=STAGE/f'{name}.png'; im.save(file,transparency=0); return file
images=[]; files={}
def add(file,name):
    key=f'images/{name}.png'; files[key]=str(file); images.append(dict(path=key,x=-48,y=-48))
for i in range(3): add(sprite(.125,0,f'preview{i}'),f'preview{i}')
for pitch,count in [(0,32),(12,4),(-12,4),(25,32),(-25,32)]:
    for i in range(count):
        name=f'boat-{pitch}-{i}'; add(sprite(i/count,pitch,name),name)
obj={'id':'sunrise.ride.log_flume','authors':['Project Sunrise'],'version':'1.0','sourceGame':'custom','objectType':'ride',
     'properties':{'type':'log_flume','category':'water','minCarsPerTrain':1,'maxCarsPerTrain':1,'playSplashSound':True,'noCollisionCrashes':True,
       'carColours':[[['dark_brown','yellow','black']]],
       'cars':{'numSeats':4,'numSeatRows':0,'spacing':174320,'mass':300,'carVisual':0,'isWaterRide':True,'isPowered':True,'poweredAcceleration':100,'poweredMaxSpeed':6,
               'spriteGroups':{'slopeFlat':32,'slopes12':4,'slopes25':32},'loadingPositions':[0,0,0,0]}},
     'strings':{'name':{'en-GB':'Timber Creek Log Flume'},'description':{'en-GB':'Four-seat timber boats with a lift hill, splashdown and winding water channel.'}},'images':images}
spritepack.write_parkobj(str(ROOT/'assets/generated/objects/sunrise.ride.log_flume.parkobj'),obj,files)
print(f'Log flume: {len(images)} original boat sprites')
