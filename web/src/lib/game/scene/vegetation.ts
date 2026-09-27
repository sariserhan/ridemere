import * as T from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const bark = new T.MeshStandardMaterial({ vertexColors: true, roughness: .98 });
const foliage = new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: T.DoubleSide });
bark.userData.shared = foliage.userData.shared = true;

function random(seed: number) {
  let state = (seed | 0) ^ 0x6d2b79f5;
  return () => { state = Math.imul(state ^ state >>> 15, 1 | state); state ^= state + Math.imul(state ^ state >>> 7, 61 | state); return ((state ^ state >>> 14) >>> 0) / 4294967296; };
}

/** Branching timber and folded individual leaves, not opaque canopy balls. */
export function tree(kind: string, seed: number) {
  const rng = random(seed), group = new T.Group();
  const shrub = kind.includes("shrub"), pine = kind.includes("evergreen"), column = kind.includes("column"), young = kind.includes("young"), flowering = kind.includes("flowering");
  const shade=kind.includes("shade"), ornamental=kind.includes("ornamental"), dense=kind.includes("dense");
  const height = (shrub ? .60 : young ? 1.65 : pine ? 3.8 : column ? 3.6 : ornamental ? 2.2 : shade ? 3.4 : 3.1) * (.88 + rng() * .24);
  const spread = shrub ? .29 : young ? .48 : column ? .52 : pine ? .95 : shade ? 1.65 : ornamental ? .74 : dense ? 1.25 : 1.03 + rng() * .26;
  const wood: number[] = [], woodColors: number[] = [], leaves: number[] = [], leafColors: number[] = [];
  const color = new T.Color(), up = new T.Vector3(0, 1, 0);
  const branch = (a: T.Vector3, b: T.Vector3, radius: number, endRadius: number) => {
    const axis = b.clone().sub(a).normalize(), side = new T.Vector3().crossVectors(axis, Math.abs(axis.y) > .95 ? new T.Vector3(1, 0, 0) : up).normalize();
    const across = new T.Vector3().crossVectors(axis, side);
    const rings = [a, a.clone().lerp(b, .5).addScaledVector(side, radius * .18), b];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 16; i++) {
      const point = (ring: number, index: number) => {
        const angle = index / 16 * Math.PI * 2, r = T.MathUtils.lerp(radius, endRadius, ring / 2) * (index % 2 ? .97 : 1.03);
        return rings[ring].clone().addScaledVector(side, Math.cos(angle) * r).addScaledVector(across, Math.sin(angle) * r);
      };
      const vertices = [point(j, i), point(j + 1, i), point(j + 1, i + 1), point(j, i + 1)];
      color.set(pine ? "#655846" : "#746250").multiplyScalar(.84 + (i % 3) * .025 + rng() * .025);
      for (const n of [0, 1, 2, 0, 2, 3]) { wood.push(...vertices[n].toArray()); woodColors.push(color.r, color.g, color.b); }
    }
  };
  const leaf = (centre: T.Vector3, axis: T.Vector3, length: number, blossom = false) => {
    const direction = axis.clone().normalize(), cross = new T.Vector3().crossVectors(direction, up);
    if (cross.lengthSq() < .01) cross.set(1, 0, 0); cross.normalize().applyAxisAngle(direction, (rng() - .5) * 2.2);
    const normal = new T.Vector3().crossVectors(direction, cross).normalize();
    const width = length * (pine ? .18 : .43);
    if (blossom) color.set(["#dba9b1", "#e8c8c8", "#f0dce0"][Math.floor(rng() * 3)]);
    else color.setHSL((pine ? .30 : .245) + rng() * .035, pine ? .25 + rng() * .14 : .30 + rng() * .17, (pine ? .22 : .27) + rng() * .16, T.SRGBColorSpace);
    const segments=blossom?15:10, rim:T.Vector3[]=[];
    for(let i=0;i<segments;i++) {
      const angle=i/segments*Math.PI*2;
      const petal=blossom?.82+.18*Math.cos(angle*5):1;
      rim.push(centre.clone().addScaledVector(direction,Math.cos(angle)*length*.5*petal).addScaledVector(cross,Math.sin(angle)*width*petal));
    }
    const middle=centre.clone().addScaledVector(normal,length*.045);
    for(let i=0;i<segments;i++) for(const point of [middle,rim[i],rim[(i+1)%segments]]) {
      leaves.push(...point.toArray());leafColors.push(color.r,color.g,color.b);
    }
  };
  // A slightly leaning, tapered trunk, with exposed roots and branching forks.
  const lean = new T.Vector3((rng() - .5) * .25, 0, (rng() - .5) * .25), trunk: T.Vector3[] = [];
  for (let i = 0; i <= 5; i++) trunk.push(new T.Vector3(lean.x * i / 5 + Math.sin(i * 1.8 + seed) * .025, height * i / 5, lean.z * i / 5));
  for (let i = 0; i < 5; i++) branch(trunk[i], trunk[i + 1], (.095 * (1 - i / 6)) * (shrub ? .24 : young ? .6 : 1), .095 * (1 - (i + 1) / 6) * (shrub ? .24 : young ? .6 : 1));
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * .4 + rng(); branch(new T.Vector3(Math.cos(a) * .24, .015, Math.sin(a) * .24), trunk[0].clone().setY(.22), .014, .065); }
  const arms = shrub ? 12 : young ? 9 : pine ? 32 : column ? 22 : dense ? 38 : 25;
  for (let i = 0; i < arms; i++) {
    const level = (shrub ? .12 : .34) + i / arms * .60, angle = i * 2.39996 + seed * .13 + rng() * .5;
    const reach = spread * (pine ? (1 - level) * 1.6 : Math.sqrt(Math.max(.1, 1 - Math.pow((level - .57) / .5, 2)))) * (.8 + rng() * .3);
    const origin = lean.clone().multiplyScalar(level); origin.y = height * level;
    const end = origin.clone().add(new T.Vector3(Math.cos(angle) * reach, pine ? -.10 : shrub ? .04 : .12 + rng() * .28, Math.sin(angle) * reach));
    const fork = origin.clone().lerp(end, .5).add(new T.Vector3(0, pine ? -.08 : .08, 0));
    branch(origin, fork, .034 * (1 - level * .5), .019); branch(fork, end, .019, .005);
    const twigs = shrub ? 3 : pine ? 7 : young ? 4 : 7;
    for (let j = 0; j < twigs; j++) {
      const anchor = origin.clone().lerp(end, .38 + j / twigs * .62);
      const azimuth = angle + (j % 2 ? -1 : 1) * (.45 + rng() * .6);
      const tip = anchor.clone().add(new T.Vector3(Math.cos(azimuth) * (shrub ? .12 : .18 + rng() * .28), pine ? .02 : shrub ? .04 : .07 + rng() * .2, Math.sin(azimuth) * (shrub ? .12 : .18 + rng() * .28)));
      branch(anchor, tip, .009, .002);
      const count = shrub ? 14 : pine ? 12 : 18;
      for (let k = 0; k < count; k++) {
        const fraction = .2 + k / count * .8, p = anchor.clone().lerp(tip, fraction);
        const az = azimuth + (k % 2 ? -1 : 1) * (pine ? 1.05 : .7 + rng() * 1.2);
        const leafAxis = new T.Vector3(Math.cos(az), (rng() - .35) * .8, Math.sin(az));
        p.addScaledVector(leafAxis, pine ? .035 : .04 + rng() * .07);
        leaf(p, leafAxis, shrub ? .055 + rng() * .025 : pine ? .12 + rng() * .05 : .08 + rng() * .06, flowering && rng() > .55);
      }
    }
  }
  const add = (positions: number[], colors: number[], mat: T.Material) => { const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3)); geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3)); const smooth=mergeVertices(geo,.00001);geo.dispose();smooth.computeVertexNormals(); const m = new T.Mesh(smooth, mat); m.castShadow = m.receiveShadow = true; group.add(m); };
  add(wood, woodColors, bark); add(leaves, leafColors, foliage);
  group.userData.treeLeaves = leaves.length / 36;
  return group;
}
