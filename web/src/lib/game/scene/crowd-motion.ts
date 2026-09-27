import type { ScenePath } from "./types";

export interface Pedestrian {
  id: number;
  x: number; y: number; z: number;
  goalX: number; goalY: number; goalZ: number;
  radius: number;
  speed: number;
  placed: boolean;
  seated: boolean;
}

const cellSize = .5;
const offsets = [0, .45, -.45, .9, -.9, 1.35, -1.35, Math.PI / 2, -Math.PI / 2];

/** Local presentation steering. Native destinations and park simulation stay authoritative. */
export class CrowdMotion {
  private paths = new Map<string, ScenePath[]>();
  private grid = new Map<string, Set<Pedestrian>>();
  private turn = 0;
  private clock = 0;
  private placementAt = 0;
  private placementBudget = 0;
  private placementCursor = 0;
  private routes = new Map<ScenePath, Map<ScenePath, ScenePath>>();

  setPaths(paths: ScenePath[]) {
    this.paths.clear();this.routes.clear();
    for (const p of paths) {
      const key = `${p.x},${p.y}`, list = this.paths.get(key) || [];
      list.push(p); this.paths.set(key, list);
    }
  }
  private key(x: number, z: number) { return `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`; }
  private insert(p: Pedestrian) {
    const key = this.key(p.x,p.z), bucket = this.grid.get(key) || new Set<Pedestrian>();
    bucket.add(p); this.grid.set(key,bucket);
  }
  private height(path: ScenePath, x: number, z: number) {
    if(path.slope<0)return path.z;
    const u=x-path.x,v=z-path.y;
    return path.z+[1-u,v,u,1-v][path.slope]*.5;
  }
  private path(x: number, y: number, z: number) {
    let best:ScenePath|undefined, distance=.32;
    for(const p of this.paths.get(`${Math.floor(x)},${Math.floor(z)}`)||[]) {
      const d=Math.abs(this.height(p,x,z)-y);if(d<distance){best=p;distance=d;}
    }
    return best;
  }
  private route(destination: ScenePath) {
    let route=this.routes.get(destination);if(route)return route;
    route=new Map<ScenePath,ScenePath>([[destination,destination]]);
    const queue=[destination], directions=[[-1,0],[0,1],[1,0],[0,-1]];
    for(let i=0;i<queue.length;i++) {
      const tile=queue[i];
      for(let d=0;d<4;d++) {
        if(!(tile.edges&(1<<d)))continue;
        const [dx,dz]=directions[d];
        for(const next of this.paths.get(`${tile.x+dx},${tile.y+dz}`)||[]) {
          if(!(next.edges&(1<<((d+2)%4)))||Math.abs(this.height(tile,tile.x+.5+dx*.5,tile.y+.5+dz*.5)-this.height(next,tile.x+.5+dx*.5,tile.y+.5+dz*.5))>.08||route.has(next))continue;
          route.set(next,tile);queue.push(next);
        }
      }
    }
    this.routes.set(destination,route);return route;
  }
  private onPath(p: Pedestrian, x: number, z: number) {
    if(p.seated)return Math.hypot(x-p.goalX,z-p.goalZ)<.65;
    const origin = this.path(p.goalX,p.goalY,p.goalZ);
    // Staff can work on grass; ride doors can lie just beyond a path tile.
    if (!origin) return p.placed || Math.hypot(x-p.goalX,z-p.goalZ) < .65;
    const old = this.path(p.x,p.y,p.z), next = this.path(x,p.y,z)||this.path(x,p.goalY,z);
    if(!next||!this.route(origin).has(next))return false;
    const height=this.height(next,x,z);
    for (let i=0;i<8;i++) {
      const angle=i*Math.PI/4;
      if (!this.path(x+Math.cos(angle)*p.radius,height,z+Math.sin(angle)*p.radius)) return false;
    }
    if (p.placed && old && next && old !== next) {
      const dx=next.x-old.x, dz=next.y-old.y;
      if (Math.abs(dx)+Math.abs(dz)>1) return false;
      const direction=dx<0?0:dz>0?1:dx>0?2:3;
      if (!(old.edges&(1<<direction)) || !(next.edges&(1<<((direction+2)%4)))) return false;
    }
    return true;
  }
  private clear(p: Pedestrian, x: number, z: number, swept = true) {
    const cx=Math.floor(x/cellSize), cz=Math.floor(z/cellSize);
    const surface=this.path(x,p.y,z)||this.path(x,p.goalY,z), height=surface&&!p.seated?this.height(surface,x,z):p.goalY;
    for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++) {
      const bucket=this.grid.get(`${cx+dx},${cz+dz}`); if(!bucket)continue;
      for(const other of bucket) {
        if(other===p || Math.abs(other.y-height)>.8)continue;
        let px=x,pz=z;
        if(swept && p.placed) {
          const vx=x-p.x,vz=z-p.z, length=vx*vx+vz*vz;
          const t=length ? Math.max(0,Math.min(1,((other.x-p.x)*vx+(other.z-p.z)*vz)/length)) : 1;
          px=p.x+vx*t; pz=p.z+vz*t;
        }
        if(Math.hypot(px-other.x,pz-other.z)<p.radius+other.radius+.008)return false;
      }
    }
    return true;
  }
  private place(p: Pedestrian) {
    // Loaded saves and simultaneous arrivals can contain coincident native positions.
    // Find a free nearby spot; an overfull entrance waits for space instead of drawing overlapping bodies.
    for(let ring=0;ring<=16;ring++) {
      const distance=ring*.22, count=ring===0?1:Math.ceil(Math.PI*2*distance/.22);
      for(let i=0;i<count;i++) {
        if(this.placementBudget--<=0)return;
        const angle=i/count*Math.PI*2+p.id*2.39996;
        const x=p.goalX+Math.cos(angle)*distance,z=p.goalZ+Math.sin(angle)*distance;
        if(!this.onPath(p,x,z)||!this.clear(p,x,z,false))continue;
        p.x=x;p.z=z;const surface=this.path(x,p.goalY,z);p.y=surface&&!p.seated?this.height(surface,x,z):p.goalY;p.placed=true;this.insert(p);return;
      }
    }
  }
  step(people: Pedestrian[], seconds: number, paused: boolean) {
    this.grid.clear();
    for(const p of people) if(p.placed)this.insert(p);
    // Retry pending arrivals at simulation-snapshot cadence, not every animation frame.
    this.clock+=seconds;
    if(this.clock>=this.placementAt) {
      this.placementBudget=6000;
      for(let i=0;i<people.length&&this.placementBudget>0;i++) {
        const p=people[this.placementCursor++%people.length];if(!p.placed)this.place(p);
      }
      this.placementAt=this.clock+.25;
    }
    if(paused || seconds<=0)return;
    const steps=Math.max(1,Math.ceil(Math.min(seconds,.25)/.04)), dt=Math.min(seconds,.25)/steps;
    for(let step=0;step<steps;step++) {
      this.turn++;
      for(let n=0;n<people.length;n++) {
        const p=people[(n+this.turn)%people.length];if(!p.placed)continue;
        let goalX=p.goalX,goalZ=p.goalZ;
        const destination=this.path(p.goalX,p.goalY,p.goalZ), current=this.path(p.x,p.y,p.z);
        if(destination&&current&&destination!==current) {
          const next=this.route(destination).get(current);
          if(next&&next!==destination) {
            const dx=next.x-current.x,dz=next.y-current.y;
            goalX=next.x+.5+dz*.17;goalZ=next.y+.5-dx*.17;
          }
        }
        const dx=goalX-p.x,dz=goalZ-p.z,distance=Math.hypot(dx,dz);if(distance<.008)continue;
        const travel=Math.min(distance,p.speed*dt,.055), heading=Math.atan2(dz,dx);
        for(const offset of offsets) {
          const angle=heading+offset, x=p.x+Math.cos(angle)*travel,z=p.z+Math.sin(angle)*travel;
          if(!this.onPath(p,x,z)||!this.clear(p,x,z))continue;
          const oldKey=this.key(p.x,p.z);this.grid.get(oldKey)?.delete(p);
          p.x=x;p.z=z;
          const surface=this.path(x,p.y,z)||this.path(x,p.goalY,z);
          if(surface&&surface.slope>=0&&!p.seated) {
            p.y=this.height(surface,x,z);
          } else p.y=surface&&!p.seated?surface.z:p.goalY;
          this.insert(p);break;
        }
      }
    }
  }
}
