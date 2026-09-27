import * as T from "three";
import { CrowdMotion, type Pedestrian } from "./crowd-motion";
import type { ScenePath } from "./types";
import { organicProfile } from "./organic";

const capacity = 4096;
const pairs = new Set(["eye", "upperArm", "forearm", "hand", "thigh", "shin", "shoe", "shoulder", "elbow", "knee"]);
const skins = ["#edc6aa", "#d9ae88", "#bc8965", "#9b6a49", "#754d36", "#543a2c"];
const shirts = ["#b65d4c", "#568695", "#d1b775", "#7e6890", "#62816b", "#dbd4c4", "#414f67", "#976966"];
const trousers = ["#354b62", "#5d5d54", "#343839", "#877761", "#4e596d"];
const hairColors = ["#382a22", "#604632", "#9a7952", "#c1a477", "#282321", "#77726c"];
type Person = { sick: boolean; queued: boolean; motion: Pedestrian; anchor: T.Vector3; id: number; from: T.Vector3; target: T.Vector3; position: T.Vector3; phase: number; phaseFrom: number; distance: number; yaw: number; yawFrom: number; yawTarget: number; scale: number; seated: boolean; colors: Record<string,T.Color>; amount: number; amountFrom: number };

/** Articulated people share geometry and draw calls; animation follows engine displacement. */
export class Crowd {
  readonly group = new T.Group();
  private parts = new Map<string,T.InstancedMesh>();
  private people = new Map<number,Person>();
  private ordered: Person[] = [];
  private at = 0;
  private paused = false;
  private motion = new CrowdMotion();
  private lastDraw = 0;
  private desired = new T.Vector3();
  private matrix = new T.Matrix4();
  private rotation = new T.Quaternion();
  private yawRotation = new T.Quaternion();
  private position = new T.Vector3();
  private size = new T.Vector3();
  private axis = new T.Vector3(0,1,0);
  private xAxis = new T.Vector3(1,0,0);
  private direction = new T.Vector3();
  private a = new T.Vector3();
  private b = new T.Vector3();
  private joint = new T.Vector3();
  private hip = new T.Vector3();
  private ankle = new T.Vector3();

  constructor() {
    const capsule = new T.CapsuleGeometry(.5, 1, 3, 10); capsule.scale(1,.5,1);
    const head = new T.SphereGeometry(.5, 20, 12);
    const headPoints = head.getAttribute("position");
    for (let i = 0; i < headPoints.count; i++) {
      const y = headPoints.getY(i);
      // Narrow the jaw instead of using a perfectly round toy head.
      if (y < 0) headPoints.setX(i, headPoints.getX(i) * (1 + y * .42));
    }
    head.computeVertexNormals();
    const torso=organicProfile([
      [0,-.50,0],[.31,-.49,.35],[.37,-.38,.43],[.39,-.10,.48],
      [.46,.15,.49],[.48,.30,.43],[.40,.40,.34],[.22,.48,.22],[0,.50,0],
    ],20,20);
    const sleeve=organicProfile([[0,-.5,0],[.38,-.46,.38],[.5,-.24,.5],[.48,.15,.48],[.36,.43,.36],[0,.5,0]],12,12);
    const limb=organicProfile([[0,-.5,0],[.36,-.46,.36],[.5,-.25,.5],[.44,.10,.44],[.31,.42,.31],[0,.5,0]],14,12);
    const hips=new T.SphereGeometry(.5,16,12);
    const shoe=new T.SphereGeometry(.5,16,10),shoePoints=shoe.getAttribute("position");
    for(let i=0;i<shoePoints.count;i++) {
      const y=Math.max(-.31,shoePoints.getY(i));
      shoePoints.setY(i,(y+.31)/.81-.5);
      shoePoints.setX(i,shoePoints.getX(i)*(1+.16*shoePoints.getZ(i)));
    }
    shoe.computeVertexNormals();
    const feature = new T.SphereGeometry(.5,8,6);
    const hair = new T.SphereGeometry(.5, 16, 10, 0, Math.PI * 2, 0, Math.PI * .49);
    const material = new T.MeshStandardMaterial({color:0xffffff,roughness:.87});
    for (const name of ["torso","hips","neck","head","hair","eye","nose","upperArm","forearm","hand","thigh","shin","shoe","shoulder","elbow","knee"]) {
      const geometry = name === "torso" ? torso : name === "head" ? head : ["eye","nose"].includes(name) ? feature : name === "hair" ? hair : name === "hips" ? hips : name === "shoe" ? shoe : ["shoulder","elbow","knee"].includes(name) ? feature : name === "upperArm" ? sleeve : ["thigh","shin","forearm"].includes(name) ? limb : capsule;
      const m = new T.InstancedMesh(geometry,material,capacity * (pairs.has(name) ? 2 : 1));
      m.name = `guest-${name}`; m.count = 0; m.frustumCulled = false; m.castShadow = !["eye","nose"].includes(name); m.receiveShadow = true;
      m.instanceMatrix.setUsage(T.DynamicDrawUsage); this.parts.set(name,m); this.group.add(m);
    }
  }

  setPaths(paths: ScenePath[]) { this.motion.setPaths(paths); }

  sample(rows: number[][], paused: boolean, now: number) {
    this.at = now; this.paused = paused;
    const alive = new Set<number>(); this.ordered = [];
    for (const row of rows.slice(0,capacity)) {
      const [id,x,y,z,staff,state,orientation,action,role] = row; alive.add(id);
      let p = this.people.get(id);
      if (!p) {
        const skin = new T.Color(skins[(id * 7) % skins.length]), shirt = new T.Color(staff ? (role === 0 ? "#438879" : "#d89843") : shirts[id % shirts.length]);
        const pants = new T.Color(trousers[(id * 3) % trousers.length]), hair = new T.Color(hairColors[(id * 11) % hairColors.length]);
        p = {sick:action===8,queued:state===2||state===6,motion:{id,x,y,z,goalX:x,goalY:y,goalZ:z,radius:.18*(.89+(id%13)*.016),speed:1,placed:false,seated:state===8},anchor:new T.Vector3(x,y,z),id,from:new T.Vector3(x,y,z),target:new T.Vector3(x,y,z),position:new T.Vector3(x,y,z),phase:id * 1.7,phaseFrom:id * 1.7,distance:0,yaw:((orientation || 0)/32 * Math.PI * 2)-Math.PI/2,yawFrom:0,yawTarget:0,scale:.89+(id%13)*.016,seated:state===8,amount:0,amountFrom:0,
          colors:{shoulder:shirt,elbow:skin,knee:pants,torso:shirt,hips:pants,neck:skin,head:skin,hair,eye:new T.Color("#302b29"),nose:skin,upperArm:shirt,forearm:skin,hand:skin,thigh:pants,shin:pants,shoe:new T.Color(id%4===0 ? "#d2ccc0" : "#303332")}};
        p.yawFrom=p.yawTarget=p.yaw; this.people.set(id,p);
      }
      p.from.copy(p.anchor); p.target.set(x,y,z); p.phaseFrom=p.phase; p.amountFrom=p.amount; p.yawFrom=p.yaw;
      p.sick=action===8;
      p.distance=Math.hypot(x-p.from.x,z-p.from.z); p.seated=state===8;p.motion.seated=p.seated;p.queued=state===2||state===6;
      if (p.distance>1.5) {p.from.copy(p.target);p.anchor.copy(p.target);p.distance=0;}
      if(p.distance>.003) p.yawTarget=Math.atan2(x-p.from.x,z-p.from.z);
      if(p.seated)p.yawTarget=((orientation||0)/32*Math.PI*2)-Math.PI/2;
      this.ordered.push(p);
      const index=this.ordered.length-1;
      for(const [name,m] of this.parts) { const paired=pairs.has(name), color=p.colors[name];m.setColorAt(paired?index*2:index,color);if(paired)m.setColorAt(index*2+1,color); }
    }
    for(const id of this.people.keys()) if(!alive.has(id))this.people.delete(id);
    for(const [name,m] of this.parts) {m.count=this.ordered.length*(pairs.has(name)?2:1);if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  }

  private put(name:string,index:number,p:Person,x:number,y:number,z:number,w:number,h:number,d:number,pitch=0) {
    if (p.sick && ["torso","neck","head","hair","eye","nose","shoulder"].includes(name)) {
      const height=y-.36; y=.36+height*Math.cos(.8); z+=height*Math.sin(.8); pitch-=.8;
    }
    this.position.set(x,y,z).applyQuaternion(this.yawRotation).multiplyScalar(p.scale).add(p.position);this.position.y+=.06;
    this.rotation.setFromAxisAngle(this.xAxis,pitch).premultiply(this.yawRotation);
    this.size.set(w*p.scale,h*p.scale,d*p.scale);this.matrix.compose(this.position,this.rotation,this.size);this.parts.get(name)!.setMatrixAt(index,this.matrix);
  }
  private limb(name:string,index:number,p:Person,a:T.Vector3,b:T.Vector3,width:number,depth=width) {
    this.position.copy(a).add(b).multiplyScalar(.5).applyQuaternion(this.yawRotation).multiplyScalar(p.scale).add(p.position);this.position.y+=.06;
    this.direction.copy(b).sub(a); const length=this.direction.length();this.direction.normalize();
    this.rotation.setFromUnitVectors(this.axis,this.direction).premultiply(this.yawRotation);
    this.size.set(width*p.scale,(length + .012)*p.scale,depth*p.scale);this.matrix.compose(this.position,this.rotation,this.size);this.parts.get(name)!.setMatrixAt(index,this.matrix);
  }

  draw(now:number) {
    const t=Math.min(1,Math.max(0,(now-this.at)/250));let walking=0;
    const elapsed=this.lastDraw?Math.max(0,(now-this.lastDraw)/1000):0;this.lastDraw=now;
    for(const p of this.ordered) {
      p.anchor.lerpVectors(p.from,p.target,t);
      this.desired.copy(p.anchor);
      // Opposing traffic keeps to its right; queues and seated guests retain their native centreline.
      if(p.distance>.008&&!p.seated&&!p.queued) {
        const yaw=p.yawTarget;
        this.desired.x+=Math.cos(yaw)*.17;this.desired.z-=Math.sin(yaw)*.17;
      }
      Object.assign(p.motion,{goalX:this.desired.x,goalY:this.desired.y,goalZ:this.desired.z,speed:Math.min(1.5,Math.max(.45,p.distance/.25+ .3))});
    }
    this.motion.step(this.ordered.map(p=>p.motion),elapsed,this.paused);
    let visible=0;
    for(const p of this.ordered) {
      if(!p.motion.placed)continue;
      const i=visible++;
      for(const [name,m] of this.parts) {
        const paired=pairs.has(name);m.setColorAt(paired?i*2:i,p.colors[name]);if(paired)m.setColorAt(i*2+1,p.colors[name]);
      }
      const previousX=p.position.x,previousZ=p.position.z;
      p.position.set(p.motion.x,p.motion.y,p.motion.z);
      const travelled=Math.hypot(p.position.x-previousX,p.position.z-previousZ);
      const moving=!this.paused&&!p.seated&&travelled>.00005;
      if(moving) {
        p.phase+=travelled*Math.PI*2/.40;
        const target=Math.atan2(p.position.x-previousX,p.position.z-previousZ);
        p.yaw+=Math.atan2(Math.sin(target-p.yaw),Math.cos(target-p.yaw))*Math.min(1,elapsed*12);
      }
      if(p.seated&&!this.paused)p.yaw+=Math.atan2(Math.sin(p.yawTarget-p.yaw),Math.cos(p.yawTarget-p.yaw))*Math.min(1,elapsed*12);
      if(!this.paused)p.amount=T.MathUtils.lerp(p.amount,moving?1:0,Math.min(1,elapsed*12));
      this.yawRotation.setFromAxisAngle(this.axis,p.yaw);
      if(moving&&!this.paused)walking++;
      const bob=p.seated?-.12:Math.cos(p.phase*2)*.004*p.amount, hipY=.345+bob;
      this.put("hips",i,p,0,hipY,0,.135,.085,.092);
      this.put("torso",i,p,0,.455+bob,0,.17,.205,.105,Math.sin(p.phase)*.015*p.amount);
      this.put("neck",i,p,0,.57+bob,0,.043,.044,.043);
      this.put("head",i,p,0,.632+bob,.003,.092,.119,.092);
      this.put("hair",i,p,0,.647+bob,-.004,.099,.102,.097);
      this.put("nose",i,p,0,.623+bob,.052,.015,.02,.02);
      for(const side of [-1,1]) {
        const j=i*2+(side===1?1:0), phase=p.phase+(side===1?Math.PI:0);
        this.put("eye",j,p,side*.019,.645+bob,.046,.009,.007,.006);
        // Two-bone legs: planted stance foot, lifted swing foot, bending knee.
        const cycle=((phase/(Math.PI*2))%1+1)%1, stance=cycle<.6;
        const footZ=(stance?.12-.24*cycle/.6:-.12+.24*(cycle-.6)/.4)*p.amount;
        const footY=.033+(stance?0:Math.sin((cycle-.6)/.4*Math.PI)*.07)*p.amount;
        this.hip.set(side*.044,hipY-.012,0);this.ankle.set(side*.044,footY,p.seated?.18:footZ);
        if(p.seated) this.joint.set(side*.045,.23,.15);
        else {
          this.direction.copy(this.ankle).sub(this.hip);const dist=Math.min(.319,this.direction.length());this.direction.normalize();
          const bend=Math.sqrt(Math.max(0,.16*.16-dist*dist/4));
          this.joint.copy(this.hip).addScaledVector(this.direction,dist/2);this.joint.y+=this.direction.z*bend;this.joint.z-=this.direction.y*bend;
        }
        this.put("knee",j,p,this.joint.x,this.joint.y,this.joint.z,.048,.049,.050);
        this.limb("thigh",j,p,this.hip,this.joint,.062,.068);this.limb("shin",j,p,this.joint,this.ankle,.049,.052);
        this.put("shoe",j,p,side*.044,footY-.015,p.seated?.205:footZ+.025,.060,.031,.115);
        const swing=Math.sin(phase+Math.PI)*.45*p.amount;
        this.a.set(side*.098,.522+bob,0);
        this.b.set(side*.103,.522+bob-Math.cos(swing)*.105,Math.sin(swing)*.105);
        this.put("shoulder",j,p,this.a.x,this.a.y,this.a.z,.059,.061,.060);
        this.put("elbow",j,p,this.b.x,this.b.y,this.b.z,.036,.038,.036);
        this.limb("upperArm",j,p,this.a,this.b,.056);
        this.a.copy(this.b);const fore=swing+.18;
        this.b.set(side*.10,this.a.y-Math.cos(fore)*.10,this.a.z+Math.sin(fore)*.10);
        if(p.seated)this.b.set(side*.06,.275,.115);
        this.limb("forearm",j,p,this.a,this.b,.035);this.put("hand",j,p,this.b.x,this.b.y-.014,this.b.z,.033,.048,.027);
      }
    }
    for(const m of this.parts.values()) {
      m.count=visible*(pairs.has(m.name.replace("guest-",""))?2:1);
      m.instanceMatrix.addUpdateRange(0,m.count*16);
      m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor)m.instanceColor.needsUpdate=true;
    }
    this.group.userData.walking=walking;this.group.userData.people=visible;this.group.userData.waiting=this.ordered.length-visible;
  }
  dispose() {const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();for(const m of this.parts.values()){geometries.add(m.geometry);materials.add(m.material as T.Material);}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.group.removeFromParent();this.people.clear();}
}
