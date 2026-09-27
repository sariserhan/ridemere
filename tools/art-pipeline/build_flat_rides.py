"""Pack five original flat rides into self-contained animated ride objects."""
import json
import os
import spritepack
import sunrise_palette as pal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
RENDERS = os.path.join(ROOT, 'assets/generated/flat-rides')
STAGE = os.path.join(ROOT, 'assets/generated/staging/flat-rides')


def main():
    os.makedirs(STAGE, exist_ok=True)
    manifest = json.load(open(os.path.join(RENDERS, 'frames.json')))
    scheme = dict(spritepack.WORLD_COLOURWAY)
    scheme.update(shirt=pal.RAMP_PRIMARY[1:9], accessory=pal.RAMP_SECONDARY[1:9], hair=pal.ramp('orange')[2:8], trim=pal.ramp('tan')[2:8], skin=pal.ramp('beige')[2:9])
    images, files = [], {}
    def add(source, name, colours, scale=1):
        dest = os.path.join(STAGE, name + '.png')
        rect = spritepack.convert_render(os.path.join(RENDERS, source), dest, colours,
                                        manifest['renderSize'], manifest['cameraTargetZ'], scale=scale)
        if scale != 1:
            rect['x'], rect['y'] = (112-rect['width']) // 2, (112-rect['height']) // 2
        key = 'images/' + name + '.png'
        files[key] = dest
        images.append(spritepack.image_entry(key, rect))
    preview = dict(scheme, shirt=pal.ramp('teal'), accessory=pal.ramp('red'))
    for i in range(3): add(manifest['carousel'][0], f'preview{i}', preview, .75)
    for i, source in enumerate(manifest['carousel']): add(source, f'body{i}', scheme)
    for i, source in enumerate(manifest['riders']): add(source, f'rider{i}', spritepack.GUEST_COLOURWAY)
    obj = {
        'id': 'sunrise.ride.carousel', 'authors': ['Project Sunrise'], 'version': '1.0',
        'sourceGame': 'custom', 'objectType': 'ride',
        'properties': {'type': 'merry_go_round', 'category': 'gentle', 'carsPerFlatRide': 1,
            'clearance': 64, 'tabScale': .5, 'carColours': [[['teal', 'bright_red', 'yellow']]],
            'cars': {'numSeats': 16, 'numSeatRows': 4, 'spriteGroups': {'slopeFlat': 32},
                     'carVisual': 1, 'spacing': 174320, 'mass': 1000, 'hasAdditionalColour1': True,
                     'loadingPositions': [0] * 16}},
        'strings': {'name': {'en-GB': 'Garden Carousel'},
                    'description': {'en-GB': 'A striped garden carousel with sixteen hand-carved horses.'},
                    'capacity': {'en-GB': '16 riders'}},
        'images': images}
    output = os.path.join(ROOT, 'assets/generated/objects/sunrise.ride.carousel.parkobj')
    size = spritepack.write_parkobj(output, obj, files)
    print(f'Garden Carousel: {len(images)} sprites, {size / 1024:.1f} KiB')


def build_dodgems():
    manifest=json.load(open(os.path.join(RENDERS,'frames.json')))
    images,files=[],{}
    scheme=dict(spritepack.WORLD_COLOURWAY, shirt=pal.RAMP_PRIMARY[1:9], accessory=pal.RAMP_SECONDARY[1:9])
    def add(source,name,colours,preview=False):
        dest=os.path.join(STAGE,name+'.png')
        rect=spritepack.convert_render(os.path.join(RENDERS,source),dest,colours,96,1.0)
        if preview:rect['x'],rect['y']=(112-rect['width'])//2,(112-rect['height'])//2
        key='images/'+name+'.png';files[key]=dest;images.append(spritepack.image_entry(key,rect))
    for i in range(3):add(manifest['dodgems'][4],f'dodgem-preview{i}',dict(scheme,shirt=pal.ramp('teal'),accessory=pal.ramp('red')),True)
    for i,source in enumerate(manifest['dodgems']):add(source,f'dodgem{i}',scheme)
    for i,source in enumerate(manifest['dodgemRiders']):add(source,f'dodgem-rider{i}',spritepack.GUEST_COLOURWAY)
    obj={'id':'sunrise.ride.dodgems','authors':['Project Sunrise'],'version':'1.0','sourceGame':'custom','objectType':'ride',
         'properties':{'type':'dodgems','category':'gentle','carsPerFlatRide':12,'clearance':48,
                       'carColours':[[['bright_red','yellow','yellow']],[['light_blue','white','white']],[['dark_green','yellow','yellow']]],
                       'cars':{'numSeats':2,'numSeatRows':1,'spriteGroups':{'slopeFlat':32},'spacing':174320,
                               'mass':180,'carVisual':0,'useDodgemCarPlacement':True,'hasAdditionalColour1':True,
                               'loadingPositions':[0,0]}},
         'strings':{'name':{'en-GB':'Garden Dodgems'},'description':{'en-GB':'Colourful bumper cars on a sheltered driving floor.'},'capacity':{'en-GB':'2 riders per car'}},
         'images':images}
    dest=os.path.join(ROOT,'assets/generated/objects/sunrise.ride.dodgems.parkobj')
    size=spritepack.write_parkobj(dest,obj,files)
    print(f'Garden Dodgems: {len(images)} sprites, {size/1024:.1f} KiB')


def build_tower():
    manifest=json.load(open(os.path.join(RENDERS,'frames.json')))
    scheme=dict(spritepack.WORLD_COLOURWAY,shirt=pal.RAMP_PRIMARY[1:9],accessory=pal.RAMP_SECONDARY[1:9])
    images,files=[],{}
    def add(source,name,colours,preview=False):
        dest=os.path.join(STAGE,name+'.png')
        rect=spritepack.convert_render(os.path.join(RENDERS,source),dest,colours,128,2.0)
        if preview:rect['x'],rect['y']=(112-rect['width'])//2,(112-rect['height'])//2
        key='images/'+name+'.png';files[key]=dest;images.append(spritepack.image_entry(key,rect))
    for i in range(3):add(manifest['towerCars'][0],f'tower-preview{i}',dict(scheme,shirt=pal.ramp('teal'),accessory=pal.ramp('red')),True)
    for i,source in enumerate(manifest['towerCars']):add(source,f'tower-car{i}',scheme)
    for i,source in enumerate(manifest['towerRiders']):add(source,f'tower-rider{i}',spritepack.GUEST_COLOURWAY)
    obj={'id':'sunrise.ride.drop_tower','authors':['Project Sunrise'],'version':'1.0','sourceGame':'custom','objectType':'ride',
         'properties':{'type':'launched_freefall','category':'thrill','clearance':32,
                       'carColours':[[['teal','bright_red','yellow']]],
                       'cars':{'numSeats':8,'numSeatRows':0,'spriteGroups':{'slopeFlat':1},
                               'overrideNumberOfVerticalFrames':True,'numVerticalFramesOverride':21,
                               'spacing':174320,'mass':800,'carVisual':2,'hasAdditionalColour1':True,
                               'loadingPositions':[0]*8}},
         'strings':{'name':{'en-GB':'Garden Drop Tower'},'description':{'en-GB':'An eight-seat gondola climbs a steel tower before dropping back to the garden.'},'capacity':{'en-GB':'8 riders'}},'images':images}
    size=spritepack.write_parkobj(os.path.join(ROOT,'assets/generated/objects/sunrise.ride.drop_tower.parkobj'),obj,files)
    print(f'Garden Drop Tower: {len(images)} sprites, {size/1024:.1f} KiB')


def build_ship():
    manifest=json.load(open(os.path.join(RENDERS,'frames.json')))
    images,files=[],{}
    scheme=dict(spritepack.WORLD_COLOURWAY,shirt=pal.RAMP_PRIMARY[1:9],accessory=pal.RAMP_SECONDARY[1:9],skin=pal.ramp('tan')[2:8])
    def add(source,name,colours,preview=False):
        dest=os.path.join(STAGE,name+'.png')
        rect=spritepack.convert_render(os.path.join(RENDERS,source),dest,colours,320,5.0,scale=.65 if preview else 1)
        if preview:rect['x'],rect['y']=(112-rect['width'])//2,(112-rect['height'])//2
        key='images/'+name+'.png';files[key]=dest;images.append(spritepack.image_entry(key,rect))
    for i in range(3):add(manifest['ship'][0],f'ship-preview{i}',dict(scheme,shirt=pal.ramp('teal'),accessory=pal.ramp('red')),True)
    for i,source in enumerate(manifest['ship']):add(source,f'ship{i}',scheme if i%9==0 else spritepack.GUEST_COLOURWAY)
    obj={'id':'sunrise.ride.swinging_ship','authors':['Project Sunrise'],'version':'1.0','sourceGame':'custom','objectType':'ride',
         'properties':{'type':'swinging_ship','category':'thrill','carsPerFlatRide':1,'clearance':112,'tabScale':.5,
                       'carColours':[[['teal','bright_red','yellow']]],
                       'cars':{'numSeats':16,'numSeatRows':0,'spriteGroups':{'slopeFlat':2},
                               'overrideNumberOfVerticalFrames':True,'numVerticalFramesOverride':171,
                               'spacing':174320,'mass':1000,'carVisual':1,'hasAdditionalColour1':True,
                               'loadingPositions':[0]*16}},
         'strings':{'name':{'en-GB':'Garden Swinging Ship'},'description':{'en-GB':'A sixteen-seat garden boat swings high between its steel supports.'},'capacity':{'en-GB':'16 riders'}},'images':images}
    size=spritepack.write_parkobj(os.path.join(ROOT,'assets/generated/objects/sunrise.ride.swinging_ship.parkobj'),obj,files)
    print(f'Garden Swinging Ship: {len(images)} sprites, {size/1024:.1f} KiB')


def build_wheel():
    manifest=json.load(open(os.path.join(RENDERS,'frames.json')))
    images,files=[],{}
    scheme=dict(spritepack.WORLD_COLOURWAY,shirt=pal.RAMP_PRIMARY[1:9],accessory=pal.RAMP_SECONDARY[1:9])
    def add(source,name,colours,preview=False):
        dest=os.path.join(STAGE,name+'.png')
        rect=spritepack.convert_render(os.path.join(RENDERS,source),dest,colours,320,7.0,scale=.65 if preview else 1)
        if preview:rect['x'],rect['y']=(112-rect['width'])//2,(112-rect['height'])//2
        key='images/'+name+'.png';files[key]=dest;images.append(spritepack.image_entry(key,rect))
    for i in range(3):add(manifest['wheel'][0],f'wheel-preview{i}',dict(scheme,shirt=pal.ramp('teal'),accessory=pal.ramp('red')),True)
    for i,source in enumerate(manifest['wheel']):add(source,f'wheel{i}',scheme)
    for i,source in enumerate(manifest['wheelRiders']):add(source,f'wheel-rider{i}',spritepack.GUEST_COLOURWAY)
    obj={'id':'sunrise.ride.ferris_wheel','authors':['Project Sunrise'],'version':'1.0','sourceGame':'custom','objectType':'ride',
         'properties':{'type':'ferris_wheel','category':'gentle','carsPerFlatRide':1,'clearance':176,'tabScale':.5,
                       'carColours':[[['teal','bright_red','yellow']]],
                       'cars':{'numSeats':32,'numSeatRows':16,'spriteGroups':{'slopeFlat':32},
                               'spacing':174320,'mass':1000,'carVisual':1,'hasAdditionalColour1':True,
                               'loadingPositions':[0]*32}},
         'strings':{'name':{'en-GB':'Garden Ferris Wheel'},'description':{'en-GB':'Sixteen open cabins turn above the gardens for a gentle view of the park.'},'capacity':{'en-GB':'32 riders'}},'images':images}
    size=spritepack.write_parkobj(os.path.join(ROOT,'assets/generated/objects/sunrise.ride.ferris_wheel.parkobj'),obj,files)
    print(f'Garden Ferris Wheel: {len(images)} sprites, {size/1024:.1f} KiB')

if __name__ == '__main__':
    main()
    build_dodgems()
    build_tower()
    build_ship()
    build_wheel()
