import * as T from "three";
import { tree } from "./vegetation";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Original procedural artwork: common materials keep the park visually coherent.
export const palette = { ivory: "#eee4cb", timber: "#967454", darkWood: "#65503c", brass: "#cfa759", teal: "#398a89", coral: "#c77861", green: "#56824d", iron: "#344b49" };
const materials = new Map<string, T.MeshStandardMaterial>();
export function material(color: string) {
  let m = materials.get(color);
  if (!m) { m = new T.MeshStandardMaterial({ color, roughness: color === palette.brass ? .36 : color === palette.iron ? .48 : .72, metalness: color === palette.brass ? .62 : color === palette.iron ? .38 : 0 }); m.userData.shared = true; materials.set(color, m); }
  return m;
}
export function mesh(parent: T.Object3D, geometry: T.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
export function box(parent: T.Object3D, color: string, w: number, h: number, d: number, x = 0, y = 0, z = 0) { return mesh(parent, new RoundedBoxGeometry(w, h, d, 2, Math.min(w,h,d)*.16), color, x, y, z); }
export function cylinder(parent: T.Object3D, color: string, top: number, bottom: number, h: number, x = 0, y = 0, z = 0, segments = 40) { return mesh(parent, new T.CylinderGeometry(top, bottom, h, segments), color, x, y, z); }
export function ball(parent: T.Object3D, color: string, r: number, x: number, y: number, z: number) { return mesh(parent, new T.SphereGeometry(r, 24, 16), color, x, y, z); }
export function beam(parent: T.Object3D, color: string, a: T.Vector3, b: T.Vector3, r = .04) { const m = cylinder(parent, color, r, r, a.distanceTo(b)); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return m; }
export function label(parent: T.Object3D, text: string, x: number, y: number, z: number, width = .8) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const ctx = c.getContext("2d")!; ctx.fillStyle = palette.darkWood; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = palette.brass; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = palette.ivory; ctx.font = "bold 52px Georgia"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 65, 475);
  const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(new T.PlaneGeometry(width, width / 4), new T.MeshStandardMaterial({ map: texture, roughness: .8, side: T.DoubleSide }));
  m.position.set(x, y, z); parent.add(m);
}
export { tree };
export function fence(kind: string) {
  const g = new T.Group(), stone = kind.includes("stone"), metal = kind.includes("metal");
  const color = stone ? "#b8b09a" : metal ? palette.iron : palette.timber;
  if (stone) {
    for (let row=0;row<3;row++) for(let i=0;i<4;i++) box(g,row%2?"#aaa48f":color,.16,.105,.245,-.48,.065+row*.11,-.375+i*.25);
    box(g,"#d1c8b2",.21,.055,1.02,-.48,.365,0);
  } else {
    for(const z of [-.46,.46]) { cylinder(g,color,.032,.04,.62,-.48,.31,z,16); ball(g,metal?palette.brass:palette.darkWood,.048,-.48,.64,z); }
    for(const y of [.18,.48]) beam(g,color,new T.Vector3(-.48,y,-.48),new T.Vector3(-.48,y,.48),.022);
    for(let i=0;i<(metal?7:5);i++) { const z=-.36+i*(metal?.12:.18); if(metal)cylinder(g,color,.012,.012,.42,-.48,.33,z,12); else box(g,color,.055,.50,.095,-.48,.30,z); }
  }
  return g;
}

export function pathTile(surface: string, queue = false) {
  const g = new T.Group(), wood = surface.includes("wood"), stone = surface.includes("stone");
  const color = queue ? "#a4bcb5" : wood ? "#a08866" : stone ? "#b4b3aa" : "#d8c7a6";
  mesh(g,new T.BoxGeometry(1,.055,1),color,0,.035,0);
  if(wood) for(let i=1;i<7;i++) box(g,"#77654e",.99,.005,.008,0,.065,-.5+i/7);
  if(stone) { for(const z of [-.25,0,.25])box(g,"#93968e",.99,.004,.009,0,.064,z); for(let row=0;row<4;row++)box(g,"#93968e",.009,.004,.24,row%2?.2:-.2,.064,-.375+row*.25); }
  return g;
}

export function gardenProp(kind: string) {
  const g = new T.Group();
  const planting = (x:number,y:number,z:number,sx=1,sy=1,sz=1) => { const p=tree("shrub", Math.round((x+2)*73+(z+2)*29));p.position.set(x,y,z);p.scale.set(sx,sy,sz);g.add(p); };
  const flowers = (cool:boolean, y=0, corner=false) => {
    for(let i=0;i<18;i++) {
      const x=Math.sin(i*2.399)*(.08+(i%5)*.065),z=Math.cos(i*2.399)*(.08+(i%5)*.065);
      if(corner&&x>0&&z>0)continue;
      const h=.10+(i%4)*.027, c=(cool?["#9786c0","#cad4e8","#8eaabd"]:["#eaa379","#d47782","#ead699"])[i%3];
      cylinder(g,"#59754c",.007,.009,h,x,y+h/2,z,8);
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball(g,c,.027,x+Math.cos(a)*.026,y+h,z+Math.sin(a)*.026).scale.set(1,.4,1);}
      ball(g,"#e5c45e",.015,x,y+h+.01,z);
    }
  };
  if (kind.includes("lamp")) {
    const tall=kind.includes("tall"),h=tall?1.75:1.1;
    cylinder(g,palette.iron,.03,.065,h,0,h/2);cylinder(g,palette.iron,.09,.10,.10,0,.05);
    const lantern=(x:number,y:number)=>{cylinder(g,"#e9ddb6",.09,.075,.21,x,y,0,24);cylinder(g,palette.iron,.025,.15,.10,x,y+.16,0,32);for(let i=0;i<4;i++){const a=i*Math.PI/2;cylinder(g,palette.iron,.008,.008,.23,x+Math.cos(a)*.08,y,Math.sin(a)*.08,8);}};
    if(tall){beam(g,palette.iron,new T.Vector3(-.25,h-.05,0),new T.Vector3(.25,h-.05,0),.025);lantern(-.25,h-.2);lantern(.25,h-.2);}else lantern(0,h+.06);
  } else if (kind.includes("picnic")) {
    for(let i=0;i<5;i++)box(g,palette.timber,.86,.04,.085,0,.43,(i-2)*.09);
    for(const z of [-.35,.35]) {box(g,palette.timber,.9,.045,.17,0,.25,z);for(const x of [-.29,.29])beam(g,palette.darkWood,new T.Vector3(x,.02,z),new T.Vector3(x,.42,z*.28),.027);}
    for(const x of [-.29,.29])beam(g,palette.darkWood,new T.Vector3(x,.19,-.42),new T.Vector3(x,.19,.42),.025);
  } else if (kind.includes("bench")) {
    for(let i=0;i<3;i++)box(g,palette.timber,.73,.035,.075,0,.24,(i-1)*.09);
    for(const x of [-.28,.28]){for(const z of [-.10,.10])cylinder(g,palette.iron,.022,.025,.24,x,.12,z,16);cylinder(g,palette.iron,.019,.022,.37,x,.30,-.12,16);}
    box(g,palette.timber,.73,.13,.035,0,.43,-.12);
  } else if (kind.includes("bin")) {
    cylinder(g,palette.iron,.13,.12,.32,0,.16);cylinder(g,palette.brass,.15,.15,.035,0,.34);
  } else if (kind.includes("bollard")) {
    cylinder(g,palette.iron,.045,.065,.36,0,.18);ball(g,palette.iron,.05,0,.37,0);cylinder(g,palette.brass,.048,.048,.035,0,.30);
  } else if (kind.includes("fountain")) {
    cylinder(g,"#aaa691",.4,.43,.14,0,.07);cylinder(g,"#79b7bc",.35,.35,.02,0,.145);cylinder(g,"#b8b09a",.055,.13,.43,0,.31);
    cylinder(g,"#b8b09a",.21,.12,.07,0,.53);cylinder(g,"#79b7bc",.19,.19,.01,0,.57);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const curve=new T.QuadraticBezierCurve3(new T.Vector3(0,.60,0),new T.Vector3(Math.cos(a)*.20,.9,Math.sin(a)*.20),new T.Vector3(Math.cos(a)*.28,.15,Math.sin(a)*.28));mesh(g,new T.TubeGeometry(curve,12,.009,6,false),"#abd8db");}
  } else if (kind.includes("clock")) {
    cylinder(g,palette.iron,.04,.07,1.22,0,.61);const rim=cylinder(g,palette.brass,.23,.23,.065,0,1.2,0,48);rim.rotation.x=Math.PI/2;
    const face=cylinder(g,palette.ivory,.20,.20,.07,0,1.2,0,48);face.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=box(g,palette.iron,.012,.035,.01,Math.sin(a)*.168,1.2+Math.cos(a)*.168,.04);tick.rotation.z=-a;}
    beam(g,palette.iron,new T.Vector3(0,1.2,.052),new T.Vector3(.09,1.28,.052),.011);beam(g,palette.iron,new T.Vector3(0,1.2,.052),new T.Vector3(-.035,1.34,.052),.008);
  } else if (kind.includes("banner")) {
    cylinder(g,palette.iron,.025,.045,1.55,0,.775);ball(g,palette.brass,.055,0,1.59,0);
    beam(g,palette.brass,new T.Vector3(0,1.46,0),new T.Vector3(.38,1.46,0),.018);
    const fabric=new T.PlaneGeometry(.30,.65,12,8),v=fabric.getAttribute("position");for(let i=0;i<v.count;i++)v.setZ(i,Math.sin(v.getX(i)*20+v.getY(i)*4)*.035);fabric.computeVertexNormals();const m=mesh(g,fabric,palette.coral,.2,1.09);(m.material as T.Material).side=T.DoubleSide;
    label(g,"PARK",.2,1.13,.045,.25);
  } else if (kind.includes("sign")) {
    if(kind.includes("direction")){cylinder(g,palette.darkWood,.035,.04,1.0,0,.5);for(const [y,x,text] of [[.88,.07,"RIDES →"],[.65,-.07,"← GARDEN"]] as const){box(g,palette.teal,.52,.15,.05,x,y);label(g,text,x,y,.03,.46);}}
    else {for(const x of [-.23,.23])cylinder(g,palette.darkWood,.027,.033,.85,x,.425);box(g,palette.darkWood,.59,.42,.075,0,.70);box(g,palette.ivory,.51,.34,.015,0,.70,.045);label(g,"WELCOME",0,.81,.06,.44);for(let i=0;i<3;i++)box(g,palette.teal,.34-i*.055,.013,.009,-i*.025,.7-i*.06,.06);}
  } else if (kind.includes("pillar")) {
    cylinder(g,"#b8b09a",.17,.20,.10,0,.05);cylinder(g,"#d0c7b3",.105,.13,.95,0,.57);cylinder(g,"#b8b09a",.18,.18,.10,0,1.08);ball(g,"#d0c7b3",.15,0,1.24,0);
  } else if (kind.includes("arch")) {
    for(const x of [-.4,.4]){cylinder(g,"#b8b09a",.07,.095,.90,x,.45);cylinder(g,"#d0c7b3",.13,.13,.08,x,.08);}
    const curve=new T.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(Math.cos(a)*.4,.9+Math.sin(a)*.4,0);}));mesh(g,new T.TubeGeometry(curve,32,.075,12,false),"#d0c7b3");
  } else if (kind.includes("sculpture")) {
    cylinder(g,"#b8b09a",.22,.25,.18,0,.09);const sculpture=mesh(g,new T.TorusKnotGeometry(.16,.047,64,12,2,3),palette.brass,0,.50);sculpture.scale.y=1.35;
  } else if (kind.includes("ornamental_grass")) {
    for(let i=0;i<36;i++){const a=i*2.399,r=.025+(i%6)*.026,h=.22+(i%7)*.033;const curve=new T.QuadraticBezierCurve3(new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r),new T.Vector3(Math.cos(a)*r,h,Math.sin(a)*r),new T.Vector3(Math.cos(a)*(r+.1),h*.85,Math.sin(a)*(r+.1)));mesh(g,new T.TubeGeometry(curve,8,.006,4,false),i%3?"#8e9c65":"#c6b37c");}
  } else if (kind.includes("ground_planting")) {
    for(const x of [-.2,0,.2])for(const z of [-.2,0,.2])planting(x,0,z,.6,.18,.6);
  } else if (/planter|bed|flowers/.test(kind)) {
    const raised=/planter|bed/.test(kind),round=kind.includes("round"),corner=kind.includes("corner");
    if(raised){if(round){cylinder(g,palette.coral,.30,.23,.25,0,.125);cylinder(g,"#594d3b",.27,.27,.015,0,.25);}else if(corner){box(g,palette.timber,.72,.16,.22,0,.08,-.24);box(g,palette.timber,.22,.16,.5,-.25,.08,.12);}else{box(g,palette.timber,kind.includes("rectangular")?.84:.65,.19,kind.includes("rectangular")?.46:.65,0,.095);box(g,"#594d3b",.58,.015,.39,0,.19);}}
    flowers(kind.includes("cool"),raised?(round?.25:.19):.015,corner);
  } else if (kind.includes("topiary")) {
    cylinder(g,palette.darkWood,.025,.04,.6,0,.30);planting(0,.38,0,.65,.7,.65);planting(0,.7,0,.44,.5,.44);
  } else if (kind.includes("hedge")) {
    for(const x of [-.3,0,.3])planting(x,0,0,.8,1.2,.75);
  } else if (kind.includes("tall")) planting(0,0,0,.7,1.65,.7);
  else planting(0,0,0);
  return g;
}
export function kiosk(kind: string) {
  const g = new T.Group(); const roof = /ice_cream/.test(kind) ? "#ad78b8" : /coffee/.test(kind) ? "#715448" : /pizza|first_aid|grill|gift/.test(kind) ? palette.coral : /chips|popcorn/.test(kind) ? "#dca74b" : palette.teal;
  box(g, "#c2a582", .76, .67, .70, 0, .34); box(g, palette.darkWood, .79, .07, .74, 0, .06);
  for (const x of [-.36, .36]) for (const z of [-.32, .32]) cylinder(g, palette.darkWood, .03,.036,.9,x,.45,z,20);
  for (const x of [-.255, -.085, .085, .255]) box(g, palette.timber, .012, .50, .015, x, .3, .359);
  for (let row=0;row<7;row++) for (const side of [-1,1]) {
    box(g, row%2 ? "#a38461" : "#b19370", .012,.069,.59,side*.388,.11+row*.075,0);
  }
  box(g, palette.darkWood, .56, .33, .03, 0, .52, .36);
  box(g, palette.ivory, .67, .055, .24, 0, .34, .46);
  const arch=new T.Shape();arch.moveTo(-.50,.77);arch.bezierCurveTo(-.43,1.15,.43,1.15,.50,.77);arch.lineTo(.455,.77);arch.bezierCurveTo(.38,1.085,-.38,1.085,-.455,.77);arch.closePath();
  const extruded=new T.ExtrudeGeometry(arch,{depth:.94,steps:1,curveSegments:32,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:3});
  extruded.deleteAttribute("normal");extruded.deleteAttribute("uv");
  const roofSurface=mergeVertices(extruded,.00001);extruded.dispose();roofSurface.computeVertexNormals();
  const roofPoints=roofSurface.getAttribute("position"),roofUV:number[]=[];
  for(let i=0;i<roofPoints.count;i++)roofUV.push(roofPoints.getX(i),roofPoints.getZ(i));
  roofSurface.setAttribute("uv",new T.Float32BufferAttribute(roofUV,2));mesh(g,roofSurface,roof,0,0,-.47);
  const trim=new T.CubicBezierCurve3(new T.Vector3(-.49,.78,.485),new T.Vector3(-.42,1.145,.485),new T.Vector3(.42,1.145,.485),new T.Vector3(.49,.78,.485));
  mesh(g,new T.TubeGeometry(trim,32,.014,8,false),palette.ivory);
  for (let i=0;i<8;i++) {
    const colour=i%2?palette.ivory:roof, strip=new T.PlaneGeometry(.11,.42,1,12), points=strip.getAttribute("position");
    for(let v=0;v<points.count;v++) {
      const t=(points.getY(v)+.21)/.42;
      points.setXYZ(v,points.getX(v),.73-.11*t*t,.32+.42*t);
    }
    strip.computeVertexNormals(); const canopy=mesh(g,strip,colour,-.385+i*.11);(canopy.material as T.Material).side=T.DoubleSide;
    const scallop=mesh(g,new T.SphereGeometry(.055,16,10),colour,-.385+i*.11,.62,.735);scallop.scale.set(1,.70,.12);
  }
  label(g, /pizza/.test(kind) ? "PIZZA" : /ice_cream/.test(kind) ? "ICE CREAM" : /chips/.test(kind) ? "FRIES" : /popcorn/.test(kind) ? "POPCORN" : /coffee/.test(kind) ? "COFFEE" : /balloon/.test(kind) ? "BALLOONS" : /first_aid/.test(kind) ? "FIRST AID" : /cash_machine/.test(kind) ? "ATM" : /grill/.test(kind) ? "SNACKS" : /refresh/.test(kind) ? "DRINKS" : /restroom/.test(kind) ? "WC" : /gift/.test(kind) ? "GIFTS" : "INFO", 0, .84, .492, .61);
  if (/balloon/.test(kind)) for (let i=0;i<5;i++) { const x=(i-2)*.13; cylinder(g,palette.ivory,.005,.005,.48,x,1.1,.1,6);ball(g,[palette.coral,palette.teal,"#dca74b"][i%3],.115,x,1.38+Math.sin(i)*.08,.1).scale.y=1.25; }
  if (/first_aid/.test(kind)) { box(g,"#fff9ed",.23,.08,.03,0,1.04,.49); box(g,"#fff9ed",.08,.23,.03,0,1.04,.49); }
  for (const x of [-.55, .55]) { cylinder(g, palette.timber, .11, .085, .2, x, .10, .40); const plant = tree("shrub", x < 0 ? 41 : 52); plant.scale.setScalar(.5); plant.position.set(x,.20,.40); g.add(plant); }
  return g;
}
export function entrance(park: boolean) {
  const g = new T.Group(); const w = park ? 1.5 : .75;
  for (const x of [-w / 2, w / 2]) { cylinder(g, palette.darkWood, .07, .09, 1.1, x, .55); ball(g, palette.brass, .095, x, 1.14, 0); }
  box(g, palette.timber, w + .18, .27, .12, 0, 1.0); label(g, park ? "RIDEMERE" : "WELCOME", 0, 1.0, .068, w);
  return g;
}
export function carousel() {
  const g = new T.Group(), rotor = new T.Group(); g.add(rotor);
  cylinder(g, palette.darkWood, 1.38, 1.4, .14, 0, .07, 0, 64);
  cylinder(rotor, palette.timber, 1.32, 1.32, .08, 0, .18, 0, 64);
  cylinder(rotor, palette.teal, .3, .36, 1.65, 0, 1.01);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8, x = Math.cos(angle) * .96, z = Math.sin(angle) * .96;
    cylinder(rotor, palette.brass, .018, .018, 1.64, x, 1.04, z);
    const horse = new T.Group(); horse.position.set(x, .67 + (i % 2) * .1, z); horse.rotation.y = -angle; rotor.add(horse);
    const body = ball(horse, palette.ivory, .14, 0, 0, 0); body.scale.set(1.65, .7, .7);
    const neck = ball(horse,palette.ivory,.075,-.14,.10,0);neck.scale.set(.55,1.65,.65);neck.rotation.z=-.35;
    ball(horse, palette.ivory, .08, -.18, .21, 0).scale.set(1.4, .8, .7);
    for (const hx of [-.11, .12]) for (const hz of [-.07, .07]) { const leg = cylinder(horse, palette.ivory, .019,.013,.16,hx,-.12,hz,16); leg.rotation.z = hx * 2; }
    box(horse, palette.coral, .12, .045, .15, .015, .08);
    const roofGeometry=new T.CylinderGeometry(.045,1.47,.66,8,8,true,angle,Math.PI/8), points=roofGeometry.getAttribute("position");
    for(let v=0;v<points.count;v++) {
      const radius=Math.hypot(points.getX(v),points.getZ(v));
      points.setY(v,.34-.66*Math.pow(radius/1.47,.72));
    }
    roofGeometry.computeVertexNormals();mesh(rotor,roofGeometry,i%2?palette.ivory:palette.teal,0,2.09);
    ball(rotor, palette.brass, .04, Math.cos(angle) * 1.44, 1.77, Math.sin(angle) * 1.44);
  }
  cylinder(rotor, palette.brass, 1.47, 1.47, .08, 0, 1.77, 0, 64);
  cylinder(rotor, palette.brass, .025, .06, .23, 0, 2.49); ball(rotor, palette.brass, .065, 0, 2.63, 0);
  return { group: g, rotor };
}
export function flatRide(kind: string) {
  if (kind.includes("carousel")) return carousel();
  const g = new T.Group(), rotor = new T.Group(); g.add(rotor);
  box(g, palette.timber, 3, .15, 3, 0, .075);
  if (kind.includes("ferris")) {
    for (const z of [-.5, .5]) for (const x of [-1, 1]) beam(g, palette.ivory, new T.Vector3(x, .15, z), new T.Vector3(0, 2.5, 0), .065);
    rotor.position.y = 2.5;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; beam(rotor, palette.brass, new T.Vector3(), new T.Vector3(Math.cos(a) * 2, Math.sin(a) * 2, 0), .025); const cabin = new T.Group(); cabin.position.set(Math.cos(a) * 2, Math.sin(a) * 2, 0); mesh(cabin,new RoundedBoxGeometry(.38,.3,.36,4,.13),i%2?palette.coral:palette.teal,0,-.15); ball(cabin,palette.ivory,.23,0,.20,0).scale.set(1,.25,.95); cabin.userData.cabin = true; rotor.add(cabin); }
    const ring = mesh(rotor, new T.TorusGeometry(2, .04, 8, 80), palette.teal); ring.position.z = -.05;
  } else if (kind.includes("ship")) {
    for (const z of [-.8, .8]) for (const x of [-1.2, 1.2]) beam(g, palette.ivory, new T.Vector3(x, .15, z), new T.Vector3(0, 2.5, z), .07);
    rotor.position.y = 2.5;
    const hull=mesh(rotor,new T.SphereGeometry(1,40,20,0,Math.PI*2,Math.PI/2,Math.PI/2),palette.teal,0,-1.33,0);hull.scale.set(1.2,.48,.47);
    const rim=mesh(rotor,new T.TorusGeometry(1,.04,10,64),palette.brass,0,-1.33,0);rim.rotation.x=Math.PI/2;rim.scale.set(1.2,.47,1);
    for (const x of [-1, 1]) beam(rotor, palette.brass, new T.Vector3(0, 0, 0), new T.Vector3(x, -1.4, 0), .04);
    for (let i = 0; i < 6; i++) box(rotor, palette.ivory, .06, .22, .70, -.9 + i * .36, -1.29);
  } else if (kind.includes("tower")) {
    for (const x of [-.22, .22]) for (const z of [-.22, .22]) box(g, palette.ivory, .08, 5.5, .08, x, 2.85, z);
    for (let i = 0; i < 11; i++) box(g, palette.brass, .55, .04, .55, 0, .4 + i * .5);
    cylinder(rotor,palette.teal,.72,.68,.20,0,.7,0,48);
    for(let i=0;i<8;i++) {
      const angle=i*Math.PI/4;
      ball(rotor,palette.coral,.12,Math.cos(angle)*.55,.89,Math.sin(angle)*.55).scale.set(1,.65,1);
    }
  } else {
    for (const x of [-1.35, 1.35]) for (const z of [-1.35, 1.35]) cylinder(g, palette.ivory, .06, .06, 1.65, x, .92, z);
    const cover=new T.PlaneGeometry(3.15,3.15,32,1),coverPoints=cover.getAttribute("position");
    for(let i=0;i<coverPoints.count;i++){const x=coverPoints.getX(i),z=coverPoints.getY(i);coverPoints.setXYZ(i,x,1.8+.32*(1-(x/1.575)**2),z);}
    cover.computeVertexNormals();const canopy=mesh(g,cover,palette.teal);(canopy.material as T.Material).side=T.DoubleSide;
    for(const z of [-1.575,1.575])mesh(g,new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(-1.575,1.8,z),new T.Vector3(0,2.44,z),new T.Vector3(1.575,1.8,z)),32,.035,8,false),palette.ivory);
    for(let i=0;i<8;i++) {
      const car=new T.Group();car.position.set(Math.sin(i*7)*1.05,.25,Math.cos(i*4)*1.05);car.rotation.y=i;rotor.add(car);
      const rubber=mesh(car,new T.TorusGeometry(.18,.045,10,32),palette.iron);rubber.rotation.x=Math.PI/2;rubber.scale.set(.82,1.15,1);
      ball(car,i%2?palette.coral:palette.teal,.18,0,.055,0).scale.set(.85,.5,1.15);
      ball(car,palette.darkWood,.085,0,.12,-.06).scale.set(.8,1.05,.35);
      const steering=mesh(car,new T.TorusGeometry(.038,.009,6,16),palette.iron,0,.15,.065);steering.rotation.x=-.6;
    }
  }
  return { group: g, rotor };
}

// One geometry builder for live tracks, placement previews, and catalog pictures.
export function coasterTrack(root: T.Group, t: import("./types").SceneTrack, kind = "") {
  const dirs = [new T.Vector3(-1,0,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0),new T.Vector3(0,0,-1)];
  const color = kind.includes("hybrid") ? palette.coral : kind.includes("single_rail") ? "#dfa949" : palette.teal;
    const a = new T.Vector3(t.x + .5, t.z + .16, t.y + .5), b = new T.Vector3(t.end[0] + .5, t.end[1] + .16, t.end[2] + .5);
    const distance = a.distanceTo(b); if (distance < .05 || distance > 16) return;
    const incoming = a.clone().addScaledVector(dirs[t.d], distance * .4);
    const outgoing = b.clone().addScaledVector(dirs[t.exit], -distance * .4);
    // Preserve grade across adjacent slope pieces instead of flattening at every tile.
    incoming.y = T.MathUtils.lerp(a.y,b.y,.4); outgoing.y = T.MathUtils.lerp(a.y,b.y,.6);
    const c = new T.CubicBezierCurve3(a, incoming, outgoing, b);
    if (kind.includes("log_flume")) {
      for (let i=0;i<24;i++) {
        const f=i/24, next=(i+1)/24, pa=c.getPoint(f), pb=c.getPoint(next), mid=pa.clone().lerp(pb,.5), tangent=pb.clone().sub(pa);
        const channel=box(root,"#4d9fba",.54,.065,tangent.length()+.025,mid.x,mid.y-.07,mid.z);
        channel.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),tangent.normalize());
      }
      for (const side of [-1,1]) {
        const points=Array.from({length:25},(_,i)=>{const tangent=c.getTangent(i/24);return c.getPoint(i/24).addScaledVector(new T.Vector3(-tangent.z,0,tangent.x).normalize(),side*.29);});
        mesh(root,new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.065,8,false),palette.timber);
      }
      for (const p of [a,b]) cylinder(root,palette.darkWood,.065,.085,p.y,p.x,p.y/2,p.z);
      if(t.type>=1&&t.type<=3) box(root,palette.timber,.30,.12,.9,t.x+.99,t.z+.05,t.y+.5);
      return;
    }
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 25 }, (_, i) => { const f = i / 24, tangent = c.getTangent(f); const lateral = new T.Vector3(-tangent.z, 0, tangent.x).normalize(); return c.getPoint(f).addScaledVector(lateral, side * .12); });
      mesh(root, new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, .035, 6, false), color);
    }
    for (let i = 0; i <= Math.ceil(distance * 3); i++) { const f = i / Math.ceil(distance * 3), pos = c.getPoint(f), tangent = c.getTangent(f), lateral = new T.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(.19); beam(root, palette.darkWood, pos.clone().sub(lateral), pos.clone().add(lateral), .025); }
    for (const p of [a, b]) if (p.y > .3) cylinder(root, palette.ivory, .035, .05, p.y, p.x, p.y / 2, p.z);
  if (t.type >= 1 && t.type <= 3) {
    box(root, palette.timber, .85, .12, .85, t.x+.5, t.z+.05, t.y+.5);
  }
}

export function logBoat() {
  const g=new T.Group();
  const hull=ball(g,"#855734",.36,0,.12,0);hull.scale.set(.70,.45,1.7);
  const inside=ball(g,"#3d2c24",.28,0,.20,0);inside.scale.set(.66,.18,1.75);
  for(const z of [-.24,.06,.32])box(g,"#d5ac75",.31,.06,.08,0,.235,z);
  return g;
}
