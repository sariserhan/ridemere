import * as T from "three";

/** A smooth elliptical surface sampled along a curved anatomical profile. */
export function organicProfile(points: [number,number,number][], rings=18, sides=16) {
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,"centripetal");
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let j=0;j<=rings;j++) {
    const p=curve.getPoint(j/rings);
    for(let i=0;i<=sides;i++) {
      const angle=i/sides*Math.PI*2;
      positions.push(Math.cos(angle)*Math.max(.0001,p.x),p.y,Math.sin(angle)*Math.max(.0001,p.z));
      uvs.push(i/sides,j/rings);
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<sides;i++) {
    const a=j*(sides+1)+i,b=a+sides+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));geometry.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  // Average the duplicated UV seam so it cannot appear as a hard vertical edge.
  const normals=geometry.getAttribute("normal");
  for(let j=0;j<=rings;j++) {
    const a=j*(sides+1),b=a+sides;
    const n=new T.Vector3(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();
    normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);
  }
  return geometry;
}
