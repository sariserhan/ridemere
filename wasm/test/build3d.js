const {selectBuildItem}=require('./build-item-picker');
// Browser plugin not available: use the project's installed Playwright.
// /play -> Build park -> place real objects without replacing the 3D canvas -> save/reload.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.argv[2]||'http://localhost:3210', out='/tmp/ridemere-build3d';
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const T=await import(path.resolve(__dirname,'../../web/node_modules/three/build/three.module.js'));
  const browser=await chromium.launch({channel:'chromium',args:['--no-sandbox']});
  const errors=[];
  try {
    const ctx=await browser.newContext({viewport:{width:1440,height:960}}),p=await ctx.newPage();
    p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('dialog',d=>d.accept());
    await p.goto(base+'/play?scenario=small-footprint');
    await p.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects)>0,null,{timeout:180000});
    console.log('loaded',await p.title(),p.url());
    const read=()=>p.evaluate(()=>JSON.parse(Module.ccall('SunriseSceneJson','string',['number'],[1])));
    const action=req=>p.evaluate(req=>JSON.parse(Module.ccall('SunriseBuildAction','string',['string'],[JSON.stringify(req)])),req);
    await p.getByRole('button',{name:'Pause park',exact:true}).click();
    await p.getByRole('button',{name:'Resume park',exact:true}).waitFor();
    const before=await read(), canvas=p.getByTestId('park-3d-canvas'), scene=p.getByTestId('park-3d');
    await canvas.evaluate(c=>c.dataset.identity='same-canvas');
    const camera=await scene.getAttribute('data-camera-position');
    await p.getByRole('button',{name:'Build park',exact:true}).click();
    await p.getByRole('region',{name:'Build in 3D',exact:true}).waitFor();
    assert.equal(await canvas.getAttribute('data-identity'),'same-canvas');
    assert.equal(await scene.getAttribute('data-camera-position'),camera);
    assert.equal(await p.locator('#canvas').evaluate(c=>getComputedStyle(c).visibility),'hidden');
    const points=[...before.paths,...before.tracks],xs=points.map(p=>p.x),ys=points.map(p=>p.y),z=before.land[0][2];
    const target=new T.Vector3((Math.min(...xs)+Math.max(...xs))/2,z,(Math.min(...ys)+Math.max(...ys))/2);
    const span=Math.max(16,Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))*1.35);
    const cam=new T.OrthographicCamera(-span*1.5/2,span*1.5/2,span/2,-span/2,.1,500);
    cam.position.copy(target).add(new T.Vector3(25,28,32));cam.lookAt(target);cam.updateMatrixWorld();cam.updateProjectionMatrix();
    const clickTile=async(x,y)=>{const v=new T.Vector3(x+.5,z,y+.5).project(cam);await p.mouse.click((v.x+1)*720,(1-v.y)*480);await p.waitForFunction(expected=>document.querySelector('[data-testid="park-3d"]')?.dataset.buildTile===expected,`${x},${y}`,{timeout:10000});};
    const choose=async(id,x,y)=>{await selectBuildItem(p,id);await clickTile(x,y);await p.waitForTimeout(100);};
    const place=async()=>{const b=p.getByRole('button',{name:'Place selected item',exact:true}); await p.waitForTimeout(300); if(await b.isDisabled()) console.log('placement feedback',await p.getByRole('region',{name:'Build in 3D'}).innerText()); await b.click();console.log('placement result',await p.getByRole('region',{name:'Build in 3D'}).getByRole('status').allTextContents());};
    await choose('path',21,19);
    assert.equal((await read()).paths.length,before.paths.length,'preview does not place');
    const quote=await action({op:'path',x:21,y:19,direction:0,apply:false});assert.equal(quote.ok,true,JSON.stringify(quote));
    await place();let after=await read();assert.equal(after.paths.length,before.paths.length+1);assert.equal(before.cash-after.cash,quote.cost,'charge once');
    console.log('path + preview + cash passed');
    await choose('bench',21,19);await place();after=await read();assert.match(after.paths.find(t=>t.x===21&&t.y===19).addition,/bench/);
    await choose('tree_broadleaf',23,20);await place();after=await read();assert.ok(after.props.some(t=>t.x===23&&t.y===20&&t.object.includes('tree_broadleaf')));
    await choose('gift_stand',21,20);await place();after=await read();assert.equal(after.rides.length,before.rides.length+1);
    console.log('bench + tree + shop passed');
    const cash=after.cash,rideCount=after.rides.length;
    const refused=await action({op:'ride',object:'sunrise.ride.gift_stand',x:21,y:20,direction:0,apply:true});
    assert.equal(refused.ok,false,'overlapping shop rejected');after=await read();assert.equal(after.cash,cash);assert.equal(after.rides.length,rideCount,'failed placement leaves no empty ride');
    await choose('tree_broadleaf',21,20);await p.getByRole('alert').filter({hasText:/./}).first().waitFor();assert.equal(await p.getByRole('button',{name:'Place selected item',exact:true}).isDisabled(),true);
    console.log('rejection + rollback passed');
    await choose('removePath',21,19);await p.getByRole('button',{name:'Remove selected item',exact:true}).click();after=await read();assert.equal(after.paths.length,before.paths.length);
    await choose('carousel',12,11);await p.getByRole('button',{name:/Rotate item/}).click();await p.waitForTimeout(100);
    await p.screenshot({path:out+'/desktop-preview.png'});await place();after=await read();assert.equal(after.rides.length,before.rides.length+2);assert.equal(await p.locator('[data-selected-build-item]').getAttribute('data-selected-build-item'),'entrance');
    const newRide=after.rides.at(-1),tracks=after.tracks.filter(t=>t.ride===newRide.id);
    console.log('ride built',newRide,tracks.map(t=>[t.x,t.y]));
    // Locate valid doors using native read-only queries, then place through the visible panel.
    const dirs=[[-1,0],[0,1],[1,0],[0,-1]],doors=[];
    for(const track of tracks)for(let d=0;d<4;d++){
      const x=track.x-dirs[d][0],y=track.y-dirs[d][1];if(tracks.some(t=>t.x===x&&t.y===y))continue;
      const q=await action({op:'entrance',x,y,direction:d,ride:newRide.id,apply:false});if(q.ok)doors.push({x,y,d});
    }
    assert.ok(doors.length>=2,'ride has valid door placements');
    for(const [i,op] of ['entrance','exit'].entries()){
      const door=doors[i];await choose(op,door.x,door.y);await p.getByLabel('Connect to ride').selectOption(String(newRide.id));
      for(let n=0;n<4;n++){const text=await p.getByRole('button',{name:/Rotate item/}).innerText();if(text.includes(`${door.d*90}°`))break;await p.getByRole('button',{name:/Rotate item/}).click();}
      await place();
    }
    after=await read();assert.equal(after.props.filter(p=>p.kind==='entrance').length,before.props.filter(p=>p.kind==='entrance').length+2);
    console.log('entrance + exit passed');
    await p.getByRole('button',{name:'Done building',exact:true}).click();assert.equal(await canvas.getAttribute('data-identity'),'same-canvas');assert.equal(await scene.getAttribute('data-camera-position'),camera);
    const ridePoint=new T.Vector3(12.5,z+.8,11.5).project(cam);await p.mouse.click((ridePoint.x+1)*720,(1-ridePoint.y)*480);
    await p.getByRole('region',{name:'Selected ride',exact:true}).getByRole('heading',{name:newRide.name,exact:true}).waitFor();
    await p.getByRole('button',{name:'Open ride',exact:true}).click();assert.equal((await read()).rides.find(r=>r.id===newRide.id).open,true,'built ride opens with its new doors');
    console.log('new ride opens through 3D details');
    await p.getByRole('button',{name:'Save & exit',exact:true}).click();await p.waitForURL('**/parks',{timeout:60000});
    await p.getByTestId('park-card').first().getByRole('button',{name:'Play',exact:true}).click();await p.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects)>24,null,{timeout:180000});
    const resumed=await read();assert.equal(resumed.rides.length,after.rides.length);assert.equal(resumed.props.length,after.props.length);assert.equal(resumed.paths.length,after.paths.length);
    await p.screenshot({path:out+'/desktop-built.png'});
    assert.deepEqual(errors,[]);console.log('3D BUILD DESKTOP PASS: same canvas/camera, path, bench, tree, shop, ride, doors, removal, rejection, exact charge, save/reload');await ctx.close();
    const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:2}),m=await mobile.newPage();
    m.on('pageerror',e=>errors.push(e.message));await m.goto(base+'/play?scenario=small-footprint');await m.waitForFunction(()=>document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects,null,{timeout:180000});
    await m.getByRole('button',{name:'Build park',exact:true}).tap();await m.getByRole('region',{name:'Build in 3D'}).waitFor();
    await selectBuildItem(m,'tree_flowering');
    const mobileBefore=await m.evaluate(()=>JSON.parse(Module.ccall('SunriseSceneJson','string',['number'],[1])));
    const mobileSpan=span/(390/844),mobileCam=new T.OrthographicCamera(-span/2,span/2,mobileSpan/2,-mobileSpan/2,.1,500);
    mobileCam.position.copy(target).add(new T.Vector3(25,28,32));mobileCam.lookAt(target);mobileCam.updateMatrixWorld();mobileCam.updateProjectionMatrix();
    const candidates=mobileBefore.land.map(t=>{const v=new T.Vector3(t[0]+.5,t[2],t[1]+.5).project(mobileCam);return {x:t[0],y:t[1],px:(v.x+1)*195,py:(1-v.y)*422};}).filter(t=>t.px>25&&t.px<190&&t.py>285&&t.py<395);
    const free=await m.evaluate(candidates=>candidates.find(t=>JSON.parse(Module.ccall('SunriseBuildAction','string',['string'],[JSON.stringify({op:'scenery',object:'sunrise.scenery_small.tree_flowering',x:t.x,y:t.y,direction:0,apply:false})])).ok),candidates);
    assert.ok(free,'touch viewport has a clear, owned tile');await m.touchscreen.tap(free.px,free.py);await m.waitForFunction(()=>document.querySelector('[data-testid="park-3d"]')?.dataset.buildTile);
    const box=await m.getByRole('region',{name:'Build in 3D'}).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390&&box.y+box.height<=844);
    await m.screenshot({path:out+'/touch-preview.png'});assert.equal(await m.locator('#canvas').evaluate(c=>getComputedStyle(c).visibility),'hidden');assert.deepEqual(errors,[]);
    await m.getByRole('button',{name:'Place selected item',exact:true}).tap(); const mobileAfter=await m.evaluate(()=>JSON.parse(Module.ccall('SunriseSceneJson','string',['number'],[1])));assert.equal(mobileAfter.props.length,mobileBefore.props.length+1);console.log('3D BUILD TOUCH PASS: 390x844, tile selection and placement, panel fits, same 3D view');await mobile.close();
  }catch(e){ console.error(e); for(const context of browser.contexts())for(const page of context.pages()){console.log('FAILED UI',await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:out+'/failure.png',timeout:10000}).catch(()=>{});}throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
