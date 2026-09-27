// Verify visible animation behavior independently of WebGL and the park simulation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const web = path.resolve(__dirname, '../../web');
const ts = require(path.join(web, 'node_modules/typescript'));
(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ridemere-crowd-'));
  try {
    const threeURL = pathToFileURL(path.join(web, 'node_modules/three/build/three.module.js')).href;
    const roundedURL = pathToFileURL(path.join(web, 'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js')).href;
    const source = fs.readFileSync(path.join(web, 'src/lib/game/scene/crowd.ts'), 'utf8')
      .replace('"three"', JSON.stringify(threeURL)).replace('"three/addons/geometries/RoundedBoxGeometry.js"', JSON.stringify(roundedURL));
    fs.writeFileSync(path.join(temporary,'crowd-motion.mjs'),ts.transpileModule(fs.readFileSync(path.join(web,'src/lib/game/scene/crowd-motion.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
    fs.writeFileSync(path.join(temporary,'organic.mjs'),ts.transpileModule(fs.readFileSync(path.join(web,'src/lib/game/scene/organic.ts'),'utf8').replace('"three"',JSON.stringify(threeURL)),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
    const output = path.join(temporary, 'crowd.mjs');
    fs.writeFileSync(output, ts.transpileModule(source.replace('"./crowd-motion"','"./crowd-motion.mjs"').replace('"./organic"','"./organic.mjs"'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
    const {Crowd} = await import(pathToFileURL(output).href), T = await import(threeURL), crowd = new Crowd();
    const part = name => crowd.group.getObjectByName('guest-' + name);
    const matrix = (name, index=0) => {const m=new T.Matrix4();part(name).getMatrixAt(index,m);return m};
    const position = (name,index=0) => new T.Vector3().setFromMatrixPosition(matrix(name,index));
    const pose = () => crowd.group.children.map(m=>Array.from(m.instanceMatrix.array.slice(0,m.count*16)));
    try {
      crowd.sample([[11,10,3.5,10,0,5,8]],false,0);crowd.draw(250);
      assert.equal(part('shin').count,2,'each person has two lower legs');
      assert.ok(position('shoe',0).distanceTo(position('shoe',1))>.06,'feet are separate');
      assert.ok(position('shoe').y>=3.56,'feet are above the path surface');
      const start=position('hips'), idlePose=pose();crowd.draw(300);assert.deepEqual(pose(),idlePose,'idle people do not walk in place');
      crowd.sample([[11,10,3.5,10.25,0,5,8]],false,300);crowd.draw(425);
      const mid=position('hips'), stepping=matrix('shin').toArray();
      assert.ok(mid.z>start.z && mid.z<10.25,'motion interpolates between real engine positions');
      crowd.draw(550);assert.notDeepEqual(matrix('shin').toArray(),stepping,'knees and lower legs move during a step');
      assert.equal(crowd.group.userData.walking,1);
      crowd.sample([[11,10,3.5,10.25,0,5,8]],true,550);crowd.draw(800);const frozen=pose();crowd.draw(1800);
      assert.deepEqual(pose(),frozen,'pause holds the whole articulated pose');
      assert.equal(crowd.group.userData.walking,0);
      crowd.sample([[11,10,3.5,10.25,0,8,8]],false,1800);crowd.draw(2050);assert.ok(position('hips').y<mid.y-.08,'sitting lowers the body');
      const rows=Array.from({length:1000},(_,id)=>[id,10+id%20,3.5,10+Math.floor(id/20),0,5,8]);
      crowd.sample(rows,false,2100);crowd.draw(2350);assert.equal(part('head').count,1000);assert.equal(part('shoe').count,2000);
      rows.forEach(r=>r[3]+=.2);crowd.sample(rows,false,2350);
      const began=performance.now();for(let i=0;i<30;i++)crowd.draw(2350+i*8);
      console.log('Crowd CPU draw, 1000 people:',((performance.now()-began)/30).toFixed(2),'ms/frame (geometry updates only; excludes WebGL)');
      crowd.sample([],false,2600);crowd.draw(2850);assert.ok(crowd.group.children.every(m=>m.count===0),'departed guests disappear');
      console.log('CROWD PASS: visible legs, grounded feet, interpolation, walking, idle, pause, sitting, 1000 people, removal');
    } finally {crowd.dispose()}
    const {CrowdMotion}=await import(pathToFileURL(path.join(temporary,'crowd-motion.mjs')).href);
    const motion=new CrowdMotion();
    const paths=Array.from({length:12},(_,i)=>({x:0,y:i,z:0,queue:false,edges:10,slope:-1,addition:''}));
    motion.setPaths(paths);
    const person=(id,x,z,gx,gz)=>({id,x,y:0,z,goalX:gx,goalY:0,goalZ:gz,radius:.18,speed:.8,placed:true,seated:false});
    const people=[person(1,.5,1.5,.5,8.5),person(2,.5,8.5,.5,1.5)];
    const clearance=rows=>{for(let a=0;a<rows.length;a++)for(let b=a+1;b<rows.length;b++)if(rows[a].placed&&rows[b].placed&&Math.abs(rows[a].y-rows[b].y)<.45)assert.ok(Math.hypot(rows[a].x-rows[b].x,rows[a].z-rows[b].z)>=rows[a].radius+rows[b].radius,'guests must not intersect')};
    for(let frame=0;frame<1200;frame++){motion.step(people,1/60,false);clearance(people);for(const p of people)assert.ok(p.x>=.18&&p.x<=.82,'guests remain on the path')}
    assert.ok(people[0].z>7.5&&people[1].z<2.5,'head-on guests pass each other without a deadlock');
    const queue=Array.from({length:20},(_,id)=>({...person(id,.5,5.5,.5,5.5),placed:false}));
    for(let frame=0;frame<180;frame++){motion.step(queue,1/60,false);clearance(queue)}
    assert.ok(queue.filter(p=>p.placed).length>=16,'coincident arrivals spread into available path space');
    const stopped=JSON.stringify(queue);motion.step(queue,.1,true);assert.equal(JSON.stringify(queue),stopped,'paused crowd remains stationary');
    const crossing=[person(31,.5,3,.5,8),person(32,.5,5,.5,0)];
    for(let frame=0;frame<100;frame++){motion.step(crossing,.25,false);clearance(crossing)}
    const bend=new CrowdMotion();
    bend.setPaths([{x:0,y:0,z:0,queue:false,edges:4,slope:-1,addition:''},{x:1,y:0,z:0,queue:false,edges:3,slope:-1,addition:''},{x:1,y:1,z:0,queue:false,edges:8,slope:-1,addition:''}]);
    const turning=[person(99,.5,.5,1.5,1.5)];
    for(let frame=0;frame<600;frame++){bend.step(turning,1/60,false);const p=turning[0];assert.ok(p.z<1||p.x>=1.18,'turning guest must not cut across the grass');}
    assert.ok(Math.hypot(turning[0].x-1.5,turning[0].z-1.5)<.05,'guest follows an L-shaped path');
    const bridge=new CrowdMotion(), levels=[{...person(101,0,0,0,0),placed:false},{...person(102,0,0,0,0),y:1,goalY:1,placed:false}];
    bridge.step(levels,1/60,false);assert.ok(levels.every(p=>p.placed),'both elevations render');assert.ok(Math.hypot(levels[0].x-levels[1].x,levels[0].z-levels[1].z)<.001,'separate elevations do not push each other sideways');
    const seated=[{...person(301,.5,2,.5,2.3),seated:true}];for(let i=0;i<120;i++)motion.step(seated,1/60,false);assert.ok(Math.abs(seated[0].z-2.3)<.02,'seated guests finish approaching their bench');
    const ramp=new CrowdMotion();ramp.setPaths([{x:0,y:0,z:0,queue:false,edges:2,slope:-1,addition:''},{x:0,y:1,z:0,queue:false,edges:10,slope:1,addition:''},{x:0,y:2,z:.5,queue:false,edges:8,slope:-1,addition:''}]);
    const climbing=[{...person(401,.5,.5,.5,2.5),goalY:.5}];
    for(let frame=0;frame<360;frame++){ramp.step(climbing,1/60,false);const p=climbing[0];if(p.z>=1&&p.z<2)assert.ok(Math.abs(p.y-(p.z-1)*.5)<.015,'feet follow ramp height');}
    assert.ok(climbing[0].z>2.4&&Math.abs(climbing[0].y-.5)<.01,'guest reaches the raised path');
    console.log('SEPARATION PASS: head-on passing, path boundaries, coincident arrivals, pause, long frames, connected corners, separate elevations');
  } finally {fs.rmSync(temporary,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
