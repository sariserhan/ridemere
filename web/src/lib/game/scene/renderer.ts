import * as T from "three";
import { Crowd } from "./crowd";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { logBoat, ball, box, coasterTrack, entrance, fence, flatRide, gardenProp, kiosk, mesh, palette, pathTile, tree } from "./models";
import type { ParkSceneSnapshot, SceneRide, SceneTrack } from "./types";

import type { BuildTile, BuildTool } from "./build";

const dirs = [new T.Vector3(-1, 0, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0), new T.Vector3(0, 0, -1)];
function release(root: T.Object3D, disposeMaterials = true) {
  root.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (disposeMaterials && !m.userData.shared) { if (!m.userData.sharedTexture) m.map?.dispose(); m.dispose(); } } });
  root.removeFromParent();
}
function batch(root: T.Group) {
  const parent = root.parent;
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<T.Material, T.BufferGeometry[]>();
  root.traverse(o => {
    if (!(o instanceof T.Mesh) || Array.isArray(o.material) || o.material.map || o.userData.keepMesh || !o.visible) return;
    const list = groups.get(o.material) || []; const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(); list.push(geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld))); groups.set(o.material, list);
  });
  const textures: T.Mesh[] = [];
  root.traverse(o => { if (o instanceof T.Mesh && (o.material.map || o.userData.keepMesh)) { textures.push(o); } });
  for (const t of textures) { t.applyMatrix4(inverse.clone().multiply(t.parent!.matrixWorld)); t.removeFromParent(); }
  release(root, false); root.clear();
  for (const [m, parts] of groups) {
    const geometry = mergeGeometries(parts, false); parts.forEach(p => p.dispose());
    if (!geometry) continue;
    const merged = new T.Mesh(geometry, m); merged.castShadow = true; merged.receiveShadow = true; root.add(merged);
  }
  textures.forEach(t => root.add(t));
  parent?.add(root);
}

export class ParkRenderer {
  readonly renderer: T.WebGLRenderer;
  readonly camera = new T.OrthographicCamera(-20, 20, 16, -16, .1, 500);
  readonly controls: OrbitControls;
  private scene = new T.Scene();
  private world = new T.Group();
  private litterGroup = new T.Group();
  private litterSignature = "";
  private ground: T.Mesh;
  private grass: T.Texture;
  private sun: T.DirectionalLight;
  private rides = new Map<number, { root: T.Group; rotor?: T.Group; kind: string; train?: T.Group }>();
  private crowd: Crowd;
  private resize: ResizeObserver;
  private snapshot: ParkSceneSnapshot | null = null;
  private signature = "";
  private buildSelect: ((tile: BuildTile) => void) | null = null;
  private buildLand: number[][] = [];
  private preview = new T.Group();
  private terrain: T.Mesh | null = null;

  private frame = 0;
  private suspended = false;
  private shadowAt = 0;
  private tickAt = 0;
  private lastTick = 0;
  private homeTarget = new T.Vector3();
  private span = 24;
  private raycaster = new T.Raycaster();
  private pointerStart = new T.Vector2();
  private cleanupInput: () => void;

  constructor(private host: HTMLElement, private select: (ride: SceneRide | null) => void, private moved: (target: T.Vector3) => void) {
    this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.grass = new T.TextureLoader().load("/art/grass-height.png");
    this.grass.wrapS = this.grass.wrapT = T.RepeatWrapping;
    this.grass.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .98;
    this.renderer.domElement.setAttribute("aria-label", "Live 3D park. Drag to pan, right-drag to rotate, scroll to zoom.");
    this.renderer.domElement.dataset.testid = "park-3d-canvas";
    this.renderer.domElement.tabIndex = 0;
    host.append(this.renderer.domElement);
    this.scene.background = new T.Color("#d7e0dc");
    this.scene.fog=new T.Fog("#d7e0dc",70,190);
    this.scene.add(new T.HemisphereLight("#e4efff", "#59654e", 1.55));
    const sun = new T.DirectionalLight("#fff5e5", 1.85);this.sun=sun; sun.position.set(-18, 40, 24); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: .5, far: 150 }); sun.shadow.normalBias = .015; sun.shadow.bias = -.0002; sun.shadow.radius = 3;
    this.scene.add(sun); this.scene.add(sun.target);
    const ground = mesh(this.scene, new T.PlaneGeometry(400, 400), "#58774e", 0, -.9, 0); ground.rotation.x = -Math.PI / 2; ground.castShadow = false; this.ground = ground;
    this.scene.add(this.world); this.scene.add(this.preview);
    this.crowd = new Crowd(); this.scene.add(this.crowd.group);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = .12; this.controls.screenSpacePanning = false;
    this.controls.minPolarAngle = .2; this.controls.maxPolarAngle = 1.35; this.controls.minZoom = .08; this.controls.maxZoom = 6;
    this.controls.mouseButtons = { LEFT: T.MOUSE.PAN, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.ROTATE };
    this.controls.touches = { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_ROTATE };
    let interacting = false; const dragStart = new T.Vector3();
    this.controls.addEventListener("start", () => { interacting = true; dragStart.copy(this.controls.target); });
    this.controls.addEventListener("end", () => { if (interacting && dragStart.distanceToSquared(this.controls.target) > .0025) this.moved(this.controls.target); interacting = false; });
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h); const aspect = w / h; this.camera.left = -this.span * aspect / 2; this.camera.right = this.span * aspect / 2; this.camera.top = this.span / 2; this.camera.bottom = -this.span / 2; this.camera.updateProjectionMatrix(); };
    this.resize = new ResizeObserver(resize); this.resize.observe(host);
    const activePointers = new Set<number>();
    let tapMoved = false;
    const down = (e: PointerEvent) => {
      if (!activePointers.size) { tapMoved = false; this.pointerStart.set(e.clientX, e.clientY); }
      activePointers.add(e.pointerId); if (activePointers.size > 1) tapMoved = true;
      this.renderer.domElement.focus();
    };
    const move = (e: PointerEvent) => { if (activePointers.has(e.pointerId) && this.pointerStart.distanceTo(new T.Vector2(e.clientX,e.clientY)) > 5) tapMoved = true; };
    const cancel = (e: PointerEvent) => { activePointers.delete(e.pointerId); tapMoved = true; };
    const up = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (tapMoved || activePointers.size || e.button !== 0 || this.pointerStart.distanceTo(new T.Vector2(e.clientX, e.clientY)) > 5) return;
      const r = this.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), this.camera);
      if (this.buildSelect) {
        const hit = this.terrain && this.raycaster.intersectObject(this.terrain)[0];
        if (hit) {
          const x = Math.floor(hit.point.x), y = Math.floor(hit.point.z);
          const land = this.buildLand.find(t => t[0] === x && t[1] === y);
          if (land) this.buildSelect({ x, y, z: land[2] });
        }
        return;
      }
      const hits = this.raycaster.intersectObjects([...this.rides.values()].map(r => r.root), true);
      let o: T.Object3D | null = hits[0]?.object || null; while (o && o.userData.rideId === undefined) o = o.parent;
      this.select(this.snapshot?.rides.find(r => r.id === o?.userData.rideId) || null);
    };
    const key = (e: KeyboardEvent) => { const keys: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; if (keys[e.key]) { e.preventDefault(); e.stopPropagation(); this.pan(...keys[e.key]); } };
    this.renderer.domElement.addEventListener("pointermove", move); this.renderer.domElement.addEventListener("pointercancel", cancel); this.renderer.domElement.addEventListener("pointerdown", down); this.renderer.domElement.addEventListener("pointerup", up); this.renderer.domElement.addEventListener("keydown", key);
    this.cleanupInput = () => { this.renderer.domElement.removeEventListener("pointermove", move); this.renderer.domElement.removeEventListener("pointercancel", cancel); this.renderer.domElement.removeEventListener("pointerdown", down); this.renderer.domElement.removeEventListener("pointerup", up); this.renderer.domElement.removeEventListener("keydown", key); };
    this.frame = requestAnimationFrame(this.draw);
  }

  update(data: ParkSceneSnapshot) {
    const now = performance.now();
    if (data.ticks !== this.lastTick) { this.tickAt = now; this.lastTick = data.ticks; }
    if(data.paths)this.crowd.setPaths(data.paths);
    this.crowd.sample(data.people, data.paused, now);
    this.snapshot = data;
    const litterSignature = JSON.stringify(data.litter || []);
    if (litterSignature !== this.litterSignature) {
      this.litterSignature = litterSignature;
      release(this.litterGroup); this.litterGroup = new T.Group();
      for (const [id,x,y,z,type] of data.litter || []) {
        const item = new T.Group();
        if (type <= 1) {
          for (let i=0;i<5;i++) {
            const patch=ball(item, i%2 ? "#b0a45e" : "#8e9250", .06+(i%3)*.018, Math.sin(id+i*2.1)*.095, .012, Math.cos(id+i*2.1)*.095);
            patch.scale.y=.13;
          }
        } else {
          const rubbish=box(item,type%2 ? "#f2e7cf" : "#cd6554",.075,.035,.1,0,.023);
          rubbish.rotation.y=id*2.4;
        }
        item.position.set(x,y+.025,z); this.litterGroup.add(item);
      }
      batch(this.litterGroup); this.scene.add(this.litterGroup);
    }
    if (data.land) {
      this.buildLand = data.land;
      const signature = JSON.stringify([data.land, data.paths, data.props, data.tracks, data.rides.map(r => [r.id, r.object])]);
      if (signature !== this.signature) { const first = !this.signature; this.signature = signature; this.rebuild(data); if (first) {
        const points = [...(data.paths || []), ...(data.tracks || [])];
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        this.homeTarget.set(xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : data.width / 2, data.land[0]?.[2] || 0, ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : data.height / 2);
        this.span = Math.max(16, xs.length ? Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.35 : data.width);
        const aspect = this.host.clientWidth / this.host.clientHeight; if (aspect < 1) this.span /= aspect;
        this.home(); const w = this.host.clientWidth, h = this.host.clientHeight; this.renderer.setSize(w, h); this.camera.left = -this.span * w / h / 2; this.camera.right = -this.camera.left; this.camera.top = this.span / 2; this.camera.bottom = -this.camera.top; this.camera.updateProjectionMatrix();
      } }
    }
    this.host.dataset.sceneTicks = String(data.ticks); this.host.dataset.sceneGuests = String(data.guests);
  }

  private rebuild(data: ParkSceneSnapshot) {
    release(this.world); this.world = new T.Group(); this.rides.clear();
    const staticWorld = new T.Group(); this.world.add(staticWorld); const land = data.land || [];
    const positions: number[] = [], colors: number[] = [], uvs: number[] = [];
    const middle=new T.Vector3(data.width/2,land[0]?.[2]||0,data.height/2),extent=Math.max(data.width,data.height)*.72;
    this.sun.target.position.copy(middle);this.sun.position.copy(middle).add(new T.Vector3(-18,40,24));
    Object.assign(this.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent});this.sun.shadow.camera.updateProjectionMatrix();
    this.ground.position.y = Math.min(...land.map(t => t[2])) - .012;
    for (const t of land) {
      const [x, z, y] = t, cs = [[x, t[6], z], [x + 1, t[7], z], [x + 1, t[8], z + 1], [x, t[9], z + 1]];
      const base = new T.Color(["#58774e", "#a08660", "#ccbb8a", "#9eaaa0"][t[4] % 4]);
      for (const i of [0, 2, 1, 0, 3, 2]) { positions.push(...cs[i]); uvs.push(t[4] === 0 ? cs[i][0] / 5 : 0, t[4] === 0 ? cs[i][2] / 5 : 0); const c = base.clone().multiplyScalar(1 + Math.sin(cs[i][0] * .51) * Math.cos(cs[i][2] * .39) * .035); colors.push(c.r, c.g, c.b); }
      if (t[5] > y) { const water = mesh(staticWorld, new T.PlaneGeometry(1, 1), "#68b4bd", x + .5, t[5] + .01, z + .5); water.rotation.x = -Math.PI / 2; }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3)); geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3)); geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2)); geo.computeVertexNormals();
    const terrain = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, bumpMap: this.grass, bumpScale: .014 })); terrain.userData.keepMesh = true; terrain.receiveShadow = true; this.terrain = terrain; staticWorld.add(terrain);
    for (const p of data.paths || []) {
      const path = pathTile(p.surface || "", p.queue); path.position.set(p.x+.5,p.z,p.y+.5); staticWorld.add(path);
      if (p.slope >= 0) { path.position.y += .25; if (p.slope % 2) path.rotation.x = p.slope === 1 ? -.4636 : .4636; else path.rotation.z = p.slope === 0 ? -.4636 : .4636; }
      if (p.addition) { const a = gardenProp(p.addition); a.position.set(p.x + .5, p.z + .08, p.y + .15); staticWorld.add(a); }
      // A fine border belongs to the path silhouette, never a repeating tile grid.
      if (!p.queue && p.slope < 0) for (let d = 0; d < 4; d++) if (!(p.edges & (1 << d))) { const v = dirs[d]; box(staticWorld, "#b6aa8d", d % 2 ? 1 : .035, .075, d % 2 ? .035 : 1, p.x + .5 + v.x * .49, p.z + .02, p.y + .5 + v.z * .49); }
    }
    for (const p of data.props || []) {
      let prop: T.Group;
      if (p.kind === "entrance") prop = entrance(p.object === "park");
      else if (p.kind === "wall") prop = fence(p.object);
      else if (p.object.includes("tree_")) prop = tree(p.object, p.x * 9 + p.y);
      else prop = gardenProp(p.object);
      prop.position.set(p.x + .5, p.z + .025, p.y + .5); prop.rotation.y = (p.kind === "wall" ? p.d : -p.d) * Math.PI / 2; staticWorld.add(prop);
    }
    for (const ride of data.rides) {
      const tracks = (data.tracks || []).filter(t => t.ride === ride.id); if (!tracks.length) continue;
      const root = new T.Group(); root.userData.rideId = ride.id;
      const flat = /carousel|dodgems|ferris_wheel|swinging_ship|drop_tower/.test(ride.object);
      const shop = /stand|restroom|kiosk|information_point|first_aid|cash_machine/.test(ride.object);
      if (flat || shop) {
        const xs = tracks.map(t => t.x), ys = tracks.map(t => t.y);
        const x = (Math.min(...xs) + Math.max(...xs) + 1) / 2, z = (Math.min(...ys) + Math.max(...ys) + 1) / 2;
        const y = Math.min(...tracks.map(t => t.z));
        const model = shop ? { group: kiosk(ride.object), rotor: undefined } : flatRide(ride.object);
        if (model.rotor && ride.object.includes("carousel")) batch(model.rotor);
        root.add(model.group); root.position.set(x, y + .06, z); root.rotation.y = -tracks[0].d * Math.PI / 2;
        this.rides.set(ride.id, { root, rotor: model.rotor, kind: ride.object });
      } else {
        for (const t of tracks) if (t.sequence === 0) coasterTrack(root, t, ride.object);
        batch(root);
        const train = ride.object.includes("log_flume") ? logBoat() : new T.Group(); for (let i = 0; i < (ride.object.includes("log_flume") ? 0 : 3); i++) { ball(train,palette.coral,.16,0,.14,i*.34).scale.set(.82,.68,1.1);box(train,palette.ivory,.18,.06,.20,0,.235,i*.34); }
        if (ride.vehicles[0]) train.position.set(...ride.vehicles[0] as [number, number, number]);
        root.add(train); this.rides.set(ride.id, { root, train, kind: ride.object });
      }
      this.world.add(root);
    }
    // Only static scenery is merged; ride groups retain their animation/picking identity.
    batch(staticWorld); this.world.add(staticWorld); this.scene.add(this.world);
    this.host.dataset.sceneObjects = String((data.props?.length || 0) + data.rides.length);
    this.host.dataset.scenePaths = String(data.paths?.length || 0);
  }

  setBuildMode(select: ((tile: BuildTile) => void) | null) {
    this.buildSelect = select;
    this.host.dataset.buildMode = String(!!select);
    this.renderer.domElement.style.cursor = select ? "crosshair" : "grab";
    if (!select) this.clearBuildPreview();
  }

  clearBuildPreview() {
    release(this.preview); this.preview = new T.Group(); this.scene.add(this.preview);
    delete this.host.dataset.buildTile;
  }

  showBuildPreview(tool: BuildTool, tile: BuildTile, direction: number, valid: boolean, footprint?: number[][], tracks?: SceneTrack[]) {
    this.clearBuildPreview();
    this.host.dataset.buildTile = `${tile.x},${tile.y}`;
    const points = footprint?.length ? footprint : [[tile.x, tile.y]];
    const color = valid ? "#8edbc3" : "#ef8580";
    for (const [x,y] of points) {
      const marker = new T.Mesh(new T.PlaneGeometry(.96,.96), new T.MeshBasicMaterial({ color, transparent:true, opacity:.42, depthWrite:false, side:T.DoubleSide }));
      marker.rotation.x = -Math.PI/2; marker.position.set(x+.5,tile.z+.095,y+.5); this.preview.add(marker);
    }
    let model: T.Group | null = null;
    const object = tool.object || "";
    if (tool.op === "scenery") model = object.includes("tree_") ? tree(object,tile.x*9+tile.y) : gardenProp(object);
    else if (tool.op === "addition") model = gardenProp(object);
    else if (tool.op === "wall") model = fence(object);
    else if (tool.op === "path" || tool.op === "queue") model = pathTile(object,tool.op === "queue");
    else if (tool.op === "ride") model = tool.category === "Shops" ? kiosk(object) : flatRide(object).group;
    else if (tool.op === "entrance" || tool.op === "exit") model = entrance(false);
    if (tool.op === "design" && object.includes("tower")) model = flatRide(object).group;
    else if (tool.op === "design" && tracks) {
      const trackPreview = new T.Group();
      for (const t of tracks) coasterTrack(trackPreview, t, object);
      trackPreview.traverse(o => { if (o instanceof T.Mesh) { const material = new T.MeshBasicMaterial({ color, transparent: true, opacity: .6 }); o.material = material; } });
      this.preview.add(trackPreview);
    }
    if (model) {
      model.position.set((Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0]))+1)/2,tile.z+.1,(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1]))+1)/2);
      model.rotation.y = (tool.op === "wall" ? direction : -direction)*Math.PI/2;
      model.traverse(o=>{ if(o instanceof T.Mesh) {
        const materials = (Array.isArray(o.material)?o.material:[o.material]).map(m=>{ const clone=m.clone(); clone.userData={}; if (clone.map) clone.map=clone.map.clone(); clone.transparent=true; clone.opacity=.55; clone.depthWrite=false; return clone; });
        o.material=Array.isArray(o.material)?materials:materials[0]; o.castShadow=false;
      }});
      this.preview.add(model);
    }
    const arrow = new T.ArrowHelper(dirs[direction], new T.Vector3(tile.x+.5,tile.z+.15,tile.y+.5), .7, color,.2,.14);
    this.preview.add(arrow);
  }


  private draw = (now: number) => {
    this.frame = requestAnimationFrame(this.draw); if (document.hidden || this.suspended) return;
    const s = this.snapshot;
    if (s) {
      const extrapolated = s.paused ? 0 : Math.min((now - this.tickAt) / 25, 10), time = (s.ticks + extrapolated) / 40;
      for (const ride of s.rides) {
        const m = this.rides.get(ride.id); if (!m) continue;
        if (m.rotor && ride.open) {
          if (m.kind.includes("ferris")) { m.rotor.rotation.z = time * .12; for (const c of m.rotor.children) if (c.userData.cabin) c.rotation.z = -m.rotor.rotation.z; }
          else if (m.kind.includes("ship")) m.rotor.rotation.z = Math.sin(time * .8) * .7;
          else if (m.kind.includes("tower")) m.rotor.position.y = (Math.sin(time * .4) + 1) * 1.9;
          else m.rotor.rotation.y = time * .25;
        }
        if (m.train) { m.train.visible = !!ride.vehicles.length; if (ride.vehicles[0]) { const target = new T.Vector3(...ride.vehicles[0]); const old = m.train.position.clone(); m.train.position.lerp(target, .2); if (old.distanceTo(target) > .03) m.train.rotation.y = Math.atan2(target.x - old.x, target.z - old.z); } }
      }
      this.crowd.draw(now);
      this.host.dataset.scenePeople = String(this.crowd.group.userData.people);
      this.host.dataset.sceneWalking = String(this.crowd.group.userData.walking);
      this.host.dataset.sceneWaiting = String(this.crowd.group.userData.waiting);
    }
    this.controls.update();
    if (now - this.shadowAt > 150) { this.renderer.shadowMap.needsUpdate = true; this.shadowAt = now; }
    this.renderer.render(this.scene, this.camera);
    this.host.dataset.cameraPosition = this.camera.position.toArray().map(n => n.toFixed(2)).join(",");
    this.host.dataset.cameraZoom = this.camera.zoom.toFixed(2);
  };
  fitBuildPreview() {
    if (!this.preview.children.length) return;
    const bounds = new T.Box3().setFromObject(this.preview), center = bounds.getCenter(new T.Vector3());
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.controls.target.copy(center); this.camera.position.copy(center).add(offset); this.camera.lookAt(center);
    this.camera.zoom = 1; this.camera.updateMatrixWorld(); this.camera.updateProjectionMatrix();
    let extent = 0;
    for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
      const projected = new T.Vector3(x,y,z).project(this.camera);
      extent = Math.max(extent,Math.abs(projected.x),Math.abs(projected.y));
    }
    this.camera.zoom = T.MathUtils.clamp(.72 / Math.max(.1,extent), .08, 6);
    this.camera.updateProjectionMatrix(); this.controls.update(); this.moved(this.controls.target);
  }
  setSuspended(suspended: boolean) { this.suspended=suspended; }
  home() { this.controls.target.copy(this.homeTarget); this.camera.position.copy(this.homeTarget).add(new T.Vector3(25, 28, 32)); this.camera.zoom = 1; this.camera.updateProjectionMatrix(); this.controls.update(); }
  zoom(delta: number) { this.camera.zoom = T.MathUtils.clamp(this.camera.zoom * delta, .08, 6); this.camera.updateProjectionMatrix(); }
  pan(x: number, y: number) { const right = new T.Vector3().setFromMatrixColumn(this.camera.matrix, 0); const forward = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), right).normalize(); const move = right.multiplyScalar(x / this.camera.zoom).addScaledVector(forward, -y / this.camera.zoom); this.controls.target.add(move); this.camera.position.add(move); this.controls.update(); this.moved(this.controls.target); }
  rotate() { const offset = this.camera.position.clone().sub(this.controls.target).applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 4); this.camera.position.copy(this.controls.target).add(offset); this.controls.update(); }
  dispose() {
    release(this.litterGroup); release(this.preview); cancelAnimationFrame(this.frame); this.resize.disconnect(); this.cleanupInput(); this.controls.dispose(); release(this.world); this.crowd.dispose(); this.ground.geometry.dispose(); this.grass.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); }
}
