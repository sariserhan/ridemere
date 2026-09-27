const {selectBuildItem}=require('./build-item-picker');
// Browser plugin unavailable; use the installed Playwright. Test the real catalog and native saves.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ts=require('../../web/node_modules/typescript');
const catalog={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../../web/src/lib/game/scene/build.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(catalog.exports);
const {buildTools}=catalog.exports,base=process.argv[2]||'http://localhost:3210',out='/tmp/ridemere-catalog';
(async()=>{fs.mkdirSync(out,{recursive:true});const T=await import(path.resolve(__dirname,'../../web/node_modules/three/build/three.module.js'));const browser=await chromium.launch({channel:'chromium',args:['--no-sandbox']});const errors=[];
try{const ctx=await browser.newContext({viewport:{width:1440,height:960}}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('dialog',d=>d.accept());
await p.goto(base+'/play?scenario=small-footprint');await p.waitForFunction(()=>document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects,null,{timeout:180000});await p.getByRole('button',{name:'Pause park',exact:true}).click();await p.getByRole('button',{name:'Resume park',exact:true}).waitFor();
const read=()=>p.evaluate(()=>JSON.parse(Module.ccall('SunriseSceneJson','string',['number'],[1]))),before=await read();
await p.getByRole('button',{name:'Build park',exact:true}).click();assert.equal(await p.locator('[data-build-item]').count(),79);
const result=await p.evaluate(tools=>{
 const read=()=>JSON.parse(Module.ccall('SunriseSceneJson','string',['number'],[1]));const initial=read();
 const action=r=>JSON.parse(Module.ccall('SunriseBuildAction','string',['string'],[JSON.stringify(r)]));
 const occupied=new Set([...initial.props,...initial.paths,...initial.tracks].map(t=>`${t.x},${t.y}`));
 const candidates=initial.land.filter(t=>t[0]>=8&&t[0]<=18&&t[1]>=5&&t[1]<=20&&!occupied.has(`${t[0]},${t[1]}`));
 const placed=[];let total=0;
 for(const tool of tools.filter(t=>t.op==='scenery'||t.op==='wall'||t.id==='stone_path'||t.id==='wood_path')){
   let success=null;
   for(const tile of candidates){const key=`${tile[0]},${tile[1]}`;if(occupied.has(key))continue;
     const req={op:tool.op,object:tool.object,x:tile[0],y:tile[1],direction:tool.op==='wall'?1:0,apply:false};
     const previewBefore=JSON.stringify(read());const q=action(req);if(JSON.stringify(read())!==previewBefore)throw Error('preview changed park state');if(!q.ok)continue;
     const built=action({...req,apply:true});if(!built.ok)throw Error(`${tool.id}: ${built.error}`);if(built.cost!==q.cost)throw Error('quote mismatch');total+=built.cost;occupied.add(key);success={id:tool.id,object:tool.object,x:tile[0],y:tile[1],op:tool.op};placed.push(success);break;
   }
   if(!success)throw Error(`No placement for ${tool.id}`);
 }
 const after=read();if(initial.cash-after.cash!==total)throw Error('cash charged incorrectly');
 const wall=placed.find(t=>t.id==='fence_metal');const wrong=action({op:'removeWall',x:wall.x,y:wall.y,direction:0,apply:true});if(wrong.ok)throw Error('wrong edge removed wall');const removal=action({op:'removeWall',x:wall.x,y:wall.y,direction:1,apply:true});if(!removal.ok)throw Error(removal.error);
 return {placed,props:read().props.length,paths:read().paths.length,total};
},buildTools);
assert.equal(result.placed.length,37);let built=await read();for(const item of result.placed){if(item.id==='fence_metal')continue;if(item.op==='path')assert.ok(built.paths.some(p=>p.x===item.x&&p.y===item.y&&p.surface===item.object),item.id);else assert.ok(built.props.some(p=>p.x===item.x&&p.y===item.y&&p.object===item.object),item.id);}
console.log('CATALOG NATIVE PASS: all 32 scenery objects, 3 fences, 2 path finishes, costs, directional removal');
// Place an added item through the actual UI, with the original camera preserved.
const points=[...before.paths,...before.tracks],xs=points.map(t=>t.x),ys=points.map(t=>t.y),z=before.land[0][2],target=new T.Vector3((Math.min(...xs)+Math.max(...xs))/2,z,(Math.min(...ys)+Math.max(...ys))/2),span=Math.max(16,Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))*1.35);
const cam=new T.OrthographicCamera(-span*.75,span*.75,span/2,-span/2,.1,500);cam.position.copy(target).add(new T.Vector3(25,28,32));cam.lookAt(target);cam.updateMatrixWorld();
await selectBuildItem(p,'prop_clock');const v=new T.Vector3(21.5,z,19.5).project(cam);await p.mouse.click((v.x+1)*720,(1-v.y)*480);await p.getByRole('button',{name:'Place selected item',exact:true}).click();assert.ok((await read()).props.some(t=>t.x===21&&t.y===19&&t.object.includes('prop_clock')));
await selectBuildItem(p,'fence_timber');const w=new T.Vector3(21.5,z,20.5).project(cam);await p.mouse.click((w.x+1)*720,(1-w.y)*480);await p.getByRole('button',{name:/Rotate item/}).click();await p.screenshot({path:out+'/desktop-catalog.png'});await p.getByRole('button',{name:'Place selected item',exact:true}).click();built=await read();assert.ok(built.props.some(t=>t.x===21&&t.y===20&&t.kind==='wall'&&t.d===1));
await p.getByRole('button',{name:'Done building',exact:true}).click();await p.getByRole('button',{name:'Save & exit',exact:true}).click();await p.waitForURL('**/parks',{timeout:60000});await p.getByTestId('park-card').first().getByRole('button',{name:'Play',exact:true}).click();await p.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects)>50,null,{timeout:180000});const saved=await read();assert.deepEqual(saved.props,built.props);assert.deepEqual(saved.paths,built.paths);assert.deepEqual(errors,[]);console.log('CATALOG DESKTOP PASS: 79 menu tools, clock + rotated fence through UI, all objects and materials persist, no console errors');await ctx.close();
const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base+'/play?scenario=small-footprint');await m.waitForFunction(()=>document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects,null,{timeout:180000});await m.getByRole('button',{name:'Build park',exact:true}).tap();await selectBuildItem(m,'accent_arch');assert.equal(await m.locator('[data-selected-build-item]').getAttribute('data-selected-build-item'),'accent_arch');const box=await m.getByRole('region',{name:'Build in 3D'}).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.y+box.height<=844);await m.screenshot({path:out+'/mobile-catalog.png'});assert.deepEqual(errors,[]);console.log('CATALOG TOUCH PASS: expanded groups selectable, panel fits 390x844');await mobile.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
