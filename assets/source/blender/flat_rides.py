"""Original flat-ride models, calibrated to Ridemere's world grid.
Run: .cache/blender/blender -b -t 4 --python assets/source/blender/flat_rides.py
"""
import math
import os
import sys
import bpy
sys.path.insert(0, os.path.dirname(__file__))
import sunrise_rig as rig

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
OUT = os.path.join(ROOT, 'assets/generated/flat-rides')
SIZE = 256
TARGET = 2.0


def horse(parent, radius, angle, bob):
    seat = rig.empty('horse', (radius * math.cos(angle), radius * math.sin(angle), 1.1 + bob), parent)
    seat.rotation_euler.z = angle + math.pi / 2
    rig.blob('body', 'skin', .48, (1.2, .48, .65), origin=(0, 0, .15), parent=seat)
    rig.box('neck', 'skin', (.23, .25, .58), origin=(.38, 0, .3), parent=seat)
    rig.blob('head', 'skin', .24, (1.4, .65, .75), origin=(.5, 0, .82), parent=seat)
    rig.box('mane', 'trim', (.09, .27, .52), origin=(.24, 0, .37), parent=seat)
    rig.box('saddle', 'accessory', (.45, .53, .13), origin=(-.08, 0, .44), parent=seat)
    for x in (-.3, .3):
        for y in (-.17, .17):
            rig.box('leg', 'skin', (.11, .1, .5), origin=(x, y, -.34), parent=seat)
    return seat


def carousel(frame, riders=False):
    rig.reset_scene(); rig._material_cache.clear(); rig.setup_world(); rig.setup_lights(); rig.setup_camera(SIZE, SIZE, TARGET)
    # Fourfold symmetry: the painter loops 32 structure frames over a 128-step turn.
    turn = 2 * math.pi * frame / 128
    if not riders:
        rig.cylinder('platform', 'trim', 5.2, .3, 64)
        rig.cylinder('gold_rim', 'hair', 5.25, .15, 64, origin=(0, 0, .3))
        rig.cylinder('central_column', 'accessory', .7, 4.3, 16, origin=(0, 0, .4))
        rig.cylinder('canopy_rim', 'hair', 5.35, .24, 64, origin=(0, 0, 4.55))
        canopy = rig.cone('striped_canopy', 'shirt', 5.35, 1.8, 16, origin=(0, 0, 4.75))
        canopy.data.materials.append(rig.tag_material('skin'))
        for face in canopy.data.polygons:
            face.material_index = face.index % 2
        rig.blob('finial', 'hair', .25, origin=(0, 0, 6.7))
        for index in range(8):
            angle = turn + index * math.pi / 4
            bob = .16 * math.sin(4 * angle)
            for radius in (3.0, 4.3):
                parent = rig.empty('mount')
                horse(parent, radius, angle, bob)
                rig.cylinder('pole', 'hair', .055, 4.2, 6,
                             origin=(radius * math.cos(angle), radius * math.sin(angle), .4))
    else:
        # The engine exposes rider offsets 13..80 as overlays 0..67.
        angle = turn
        bob = .16 * math.sin(4 * angle)
        for index, radius in enumerate((3.0, 4.3)):
            parent = rig.empty('rider', (radius * math.cos(angle), radius * math.sin(angle), 1.1 + bob))
            parent.rotation_euler.z = angle + math.pi / 2
            rig.box('shirt', 'shirt' if index == 0 else 'trousers', (.35, .35, .52), origin=(-.08, 0, .58), parent=parent)
            rig.blob('head', 'skin', .21, origin=(-.08, 0, 1.3), parent=parent)
            rig.blob('hair', 'hair', .21, (1, 1, .4), origin=(-.08, 0, 1.45), parent=parent)
            for side in (-1, 1):
                rig.box('leg', 'shoes', (.2, .15, .52), origin=(0, side * .3, .15), parent=parent)
                rig.box('arm', 'skin', (.4, .1, .1), origin=(.12, side * .24, .85), parent=parent)
    for obj in bpy.context.scene.objects:
        if obj.parent is not None: obj.matrix_parent_inverse.identity()
    bpy.context.scene.cycles.samples = 16
    name = ('rider' if riders else 'carousel') + f'-{frame:03}.png'
    rig.render_to(os.path.join(OUT, name))
    return name


def dodgem(frame, riders=False):
    rig.reset_scene(); rig._material_cache.clear(); rig.setup_world(); rig.setup_lights()
    camera = rig.setup_camera(96, 96, 1.0)
    rig.aim_camera(camera, 45 + frame * 360 / 32)
    if not riders:
        rig.blob('rubber_bumper', 'shoes', 1, (1.05, 1.4, .26), origin=(0,0,.3))
        rig.blob('painted_body', 'shirt', 1, (.92, 1.25, .44), origin=(0,0,.6))
        rig.box('seat', 'accessory', (1.2,.65,.55), origin=(0,.3,.55))
        rig.box('back', 'accessory', (1.4,.22,.8), origin=(0,.7,.6))
        rig.cylinder('power_pole', 'trim', .045, 2.9, 6, origin=(0,.85,.5))
        rig.box('contact', 'trim', (.65,.08,.08), origin=(0,.85,3.4))
        for x in (-.65,.65):
            rig.blob('headlamp', 'skin', .13, (1,.4,.7), origin=(x,-1,.75))
    else:
        for i,x in enumerate((-.32,.32)):
            rig.box('shirt', 'shirt' if i==0 else 'trousers', (.45,.35,.6), origin=(x,.3,.9))
            rig.blob('head','skin',.23,origin=(x,.3,1.72))
            rig.blob('hair','hair',.23,(1,1,.4),origin=(x,.3,1.88))
            rig.box('legs','shoes',(.38,.65,.18),origin=(x,-.1,.8))
            rig.box('arms','skin',(.12,.55,.12),origin=(x,-.03,1.23))
    bpy.context.scene.cycles.samples=16
    name=('dodgem-rider' if riders else 'dodgem')+f'-{frame:03}.png'
    rig.render_to(os.path.join(OUT,name))
    return name


def tower_frame(kind, phase=0, direction=0):
    rig.reset_scene(); rig._material_cache.clear(); rig.setup_world(); rig.setup_lights()
    rig.setup_camera(128,128,2.0)
    if kind in ('base','segment','cap'):
        height=32/(rig.PIXELS_PER_UNIT*math.cos(math.pi/6))
        rig.box('tower_column','shirt',(1.05,1.05,height),pivot='bottom')
        for x in (-.6,.6):
            for y in (-.6,.6): rig.cylinder('guide','trim',.06,height,6,origin=(x,y,0))
        for z in (.25,1.7,3.0):
            rig.box('brace','accessory',(1.35,1.35,.12),origin=(0,0,z))
        if kind=='base':rig.box('footing','shoes',(2.1,2.1,.3))
        if kind=='cap':
            rig.cone('cap','accessory',1.0,.45,8,origin=(0,0,height))
            rig.blob('beacon','skin',.18,origin=(0,0,height+.65))
    else:
        sides=range(4) if kind!='riders' else [direction]
        for side in sides:
            angle=side*math.pi/2
            front=math.cos(angle)-math.sin(angle)>0
            if kind=='front' and not front:continue
            if kind=='back' and front:continue
            parent=rig.empty('seat_pair',(1.5*math.cos(angle),1.5*math.sin(angle),0))
            parent.rotation_euler.z=angle-math.pi/2
            if kind!='riders':
                rig.box('bench','shirt',(1.35,.6,.28),origin=(0,0,.6),parent=parent)
                rig.box('backrest','accessory',(1.4,.2,1.1),origin=(0,-.3,.72),parent=parent)
                for x in (-.36,.36):
                    rig.box('restraint','trim',(.53,.1,.12),origin=(x,.3,1.2+phase*.2),parent=parent)
                    rig.box('footrest','shoes',(.5,.5,.1),origin=(x,.3,.18),parent=parent)
            else:
                for i,x in enumerate((-.36,.36)):
                    rig.box('shirt','shirt' if i==0 else 'trousers',(.38,.32,.55),origin=(x,0,.87),parent=parent)
                    rig.blob('head','skin',.21,origin=(x,0,1.64),parent=parent)
                    rig.blob('hair','hair',.21,(1,1,.4),origin=(x,0,1.79),parent=parent)
                    rig.box('legs','shoes',(.3,.3,.58),origin=(x,.35,.25),parent=parent)
                    for hand in (-.17,.17):rig.box('arm','skin',(.09,.35,.1),origin=(x+hand,.2,1.2+phase*.15),parent=parent)
        for obj in bpy.context.scene.objects:
            if obj.parent is not None:obj.matrix_parent_inverse.identity()
    bpy.context.scene.cycles.samples=16
    name=f'tower-{kind}-{phase}-{direction}.png';rig.render_to(os.path.join(OUT,name));return name


def tower_set(manifest):
    manifest['towerStructure']=[tower_frame(k) for k in ('base','segment','cap')]
    manifest['towerCars']=[tower_frame('full')]+[tower_frame(k,p) for p in range(4) for k in ('front','back')]
    manifest['towerRiders']=[tower_frame('riders',p,d) for d in range(4) for p in range(3)]


def beam(name,part,a,b,width,parent=None):
    from mathutils import Vector
    delta=Vector(b)-Vector(a)
    obj=rig.box(name,part,(width,width,delta.length),origin=a,pivot='bottom',parent=parent)
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    return obj


def ship_frame(state, direction, row=None, support=None):
    rig.reset_scene();rig._material_cache.clear();rig.setup_world();rig.setup_lights()
    camera=rig.setup_camera(320,320,5.0);rig.aim_camera(camera,45+direction*90)
    angle=state*7 if state<=9 else -(state-9)*7
    if support is not None:
        y=2.3 if support=='back' else -2.3
        # Camera orientation 1 sees the opposite side of the longitudinal frame.
        if direction==1:y=-y
        for x in (-4,4):beam('frame','shirt',(x,y,0),(0,y,8),.23)
        rig.cylinder('axle','trim',.24,.6,12,origin=(0,y,7.9))
    else:
        pivot=rig.empty('swing_pivot',(0,0,8));pivot.rotation_euler.y=math.radians(angle)
        if row is None:
            vertices=[]
            for y in (-1.35,1.35):
                for x,z in [(-7,-4.6),(-5,-5.7),(5,-5.7),(7,-4.6),(-6.5,-5.6),(-4.8,-6.5),(4.8,-6.5),(6.5,-5.6)]:
                    vertices.append((x,y,z))
            faces=[]
            for side in (0,8):
                for i in range(3):faces.append((side+i,side+i+1,side+i+5,side+i+4))
            for i in range(3):faces.append((i+4,i+5,i+13,i+12))
            faces.extend([(0,4,12,8),(3,11,15,7)])
            mesh=bpy.data.meshes.new('hull');mesh.from_pydata(vertices,[],faces);mesh.update()
            obj=bpy.data.objects.new('hull',mesh);bpy.context.collection.objects.link(obj);obj.parent=pivot
            obj.data.materials.append(rig.tag_material('shirt'))
            rig.box('deck','skin',(10,2.5,.18),origin=(0,0,-5.85),parent=pivot)
            for y in (-1.3,1.3):
                for x in (-5,5):beam('suspension','trim',(0,y,0),(x,y,-5.7),.12,pivot)
            for x in (-3.6,-1.2,1.2,3.6):
                rig.box('bench','accessory',(.35,2.35,.65),origin=(x,0,-5.75),parent=pivot)
        else:
            x=(-3.6,-1.2,1.2,3.6)[row//2]+.4
            ys=(-.85,-.28) if row%2==0 else (.28,.85)
            for i,y in enumerate(ys):
                rig.box('shirt','shirt' if i==0 else 'trousers',(.36,.36,.55),origin=(x,y,-5.2),parent=pivot)
                rig.blob('head','skin',.21,origin=(x,y,-4.5),parent=pivot)
                rig.blob('hair','hair',.21,(1,1,.4),origin=(x,y,-4.35),parent=pivot)
                rig.box('legs','shoes',(.5,.3,.2),origin=(x+.2,y,-5.35),parent=pivot)
        for obj in bpy.context.scene.objects:
            if obj.parent is not None:obj.matrix_parent_inverse.identity()
    bpy.context.scene.cycles.samples=16
    name=f'ship-{state}-{direction}-{row}-{support}.png';rig.render_to(os.path.join(OUT,name));return name


def ship_set(manifest):
    manifest['shipSupports']=[ship_frame(0,d,support=k) for d in range(2) for k in ('back','front')]
    manifest['ship']=[ship_frame(s,d,r) for s in range(19) for d in range(2) for r in [None,*range(8)]]


def wheel_frame(frame,direction,riders=False,support=None):
    rig.reset_scene();rig._material_cache.clear();rig.setup_world();rig.setup_lights()
    camera=rig.setup_camera(320,320,7.0);rig.aim_camera(camera,45+direction*90)
    centre,radius=7.7,6.1
    if support is not None:
        y=1.5 if support=='back' else -1.5
        if direction==1:y=-y
        for x in (-3,3):beam('support','shirt',(x,y,0),(0,y,centre),.25)
        beam('axle','trim',(0,y-.2,centre),(0,y+.2,centre),.3)
    elif not riders:
        turn=frame*2*math.pi/128
        for i in range(16):
            angle=turn+i*math.pi/8
            x,z=radius*math.sin(angle),centre-radius*math.cos(angle)
            nx,nz=radius*math.sin(angle+math.pi/8),centre-radius*math.cos(angle+math.pi/8)
            for y in (-.65,.65):
                beam('rim','shirt',(x,y,z),(nx,y,nz),.12)
                beam('spoke','trim',(0,y,centre),(x,y,z),.055)
            rig.box('cabin','accessory',(.9,1.8,.48),origin=(x,0,z-.25))
            for y in (-.8,.8):beam('cabin_hanger','trim',(x,y,z-.2),(x,y,z+.8),.05)
            rig.box('canopy','shirt',(1.2,2,.15),origin=(x,0,z+.8))
    else:
        angle=frame*2*math.pi/128
        x,z=radius*math.sin(angle),centre-radius*math.cos(angle)
        for i,y in enumerate((-.38,.38)):
            rig.box('shirt','shirt' if i==0 else 'trousers',(.35,.35,.45),origin=(x,y,z+.15))
            rig.blob('head','skin',.18,origin=(x,y,z+.8))
            rig.blob('hair','hair',.18,(1,1,.4),origin=(x,y,z+.91))
    bpy.context.scene.cycles.samples=16
    name=f'wheel-{frame}-{direction}-{riders}-{support}.png';rig.render_to(os.path.join(OUT,name));return name


def wheel_set(manifest):
    manifest['wheelSupports']=[wheel_frame(0,d,support=k) for d in range(2) for k in ('back','front')]
    manifest['wheel']=[wheel_frame(f,d) for d in range(4) for f in range(8)]
    manifest['wheelRiders']=[wheel_frame(f,d,True) for d in range(4) for f in range(128)]


def main():
    os.makedirs(OUT, exist_ok=True)
    if '--carousel' in sys.argv:
        import json
        manifest=json.load(open(os.path.join(OUT,'frames.json')))
        manifest['carousel']=[carousel(i) for i in range(32)]
        manifest['riders']=[carousel(i+13,True) for i in range(128)]
    elif '--wheel' in sys.argv:
        import json
        manifest=json.load(open(os.path.join(OUT,'frames.json')))
        wheel_set(manifest)
    elif '--ship' in sys.argv:
        import json
        manifest=json.load(open(os.path.join(OUT,'frames.json')))
        ship_set(manifest)
    elif '--tower' in sys.argv:
        import json
        manifest=json.load(open(os.path.join(OUT,'frames.json')))
        tower_set(manifest)
    elif '--dodgems' in sys.argv:
        import json
        manifest=json.load(open(os.path.join(OUT,'frames.json')))
        manifest['dodgems']=[dodgem(i) for i in range(32)]
        manifest['dodgemRiders']=[dodgem(i,True) for i in range(32)]
    else:
        manifest={'renderSize':SIZE,'cameraTargetZ':TARGET,
                  'carousel':[carousel(i) for i in range(32)],
                  'riders':[carousel(i+13,True) for i in range(128)],
                  'dodgems':[dodgem(i) for i in range(32)],
                  'dodgemRiders':[dodgem(i,True) for i in range(32)]}
    if not any(arg in sys.argv for arg in ('--carousel','--tower','--dodgems','--ship','--wheel')):
        tower_set(manifest)
        ship_set(manifest)
        wheel_set(manifest)
    rig.write_manifest(os.path.join(OUT,'frames.json'),manifest)

if __name__ == '__main__': main()
