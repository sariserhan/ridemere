// The smooth view must be the live park, survive construction, and save real state.
const {chromium, firefox, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.argv[2] || 'http://localhost:3210', browserName = process.argv[3] || 'chromium';
const out = process.env.QA_OUTPUT || '/tmp/ridemere-3d';
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await ({chromium, firefox, webkit}[browserName]).launch({headless:!process.env.HEADED, ...(browserName==='chromium' ? {channel:'chromium',args:['--no-sandbox']} : {})});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:960}}), page = await context.newPage(), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('dialog',d=>d.accept());
    await page.goto(base+'/play?scenario=small-footprint');
    const scene=page.locator('[data-testid="park-3d"]');
    await page.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects)>0,null,{timeout:180000});
    const read = (full=false) => page.evaluate(full=>JSON.parse(Module.ccall('SunriseSceneJson','string',['number'],[full?1:0])),full);
    const before=await read(true); assert.equal(before.width,32); assert.equal(before.rides.length,4);
    assert.equal(before.land.length,900,'all playable tiles including the last row');
    assert.equal(Number(await scene.getAttribute('data-scene-paths')),before.paths.length);
    assert.equal(await page.locator('#canvas').evaluate(c=>getComputedStyle(c).visibility),'hidden','3D is the default view');
    const camera=await scene.getAttribute('data-camera-position');
    await page.mouse.move(650,400);await page.mouse.down();await page.mouse.move(790,460,{steps:10});await page.mouse.up();await page.waitForTimeout(600);
    assert.notEqual(await scene.getAttribute('data-camera-position'),camera,'drag pans 3D camera');
    assert.ok(await page.evaluate(()=>JSON.parse(Module.ccall('SunriseScenarioStateJson','string',[],[])).viewMoved>64),'3D movement updates the camera lesson');
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.cameraZoom)>1);
    await page.getByRole('button',{name:'Rotate park view',exact:true}).click();
    await page.getByRole('button',{name:'Return to park centre',exact:true}).click();await page.waitForTimeout(400);
    assert.equal(await scene.getAttribute('data-camera-zoom'),'1.00');
    await page.getByRole('button',{name:'Pause park',exact:true}).click();await page.getByRole('button',{name:'Resume park',exact:true}).waitFor();
    const paused=(await read()).ticks;await page.waitForTimeout(700);assert.equal((await read()).ticks,paused);
    await page.getByRole('button',{name:'Resume park',exact:true}).click();await page.waitForTimeout(700);assert.ok((await read()).ticks>paused);
    // Carousel picking is tested at its actual projected location in the fixed scenario.
    await page.mouse.click(875,570);await page.getByRole('region',{name:'Selected ride',exact:true}).waitFor();
    await page.getByRole('button',{name:'Close ride',exact:true}).click();await page.waitForTimeout(400);assert.equal((await read()).rides[0].open,false);
    await page.getByRole('button',{name:'Open ride',exact:true}).click();await page.waitForTimeout(400);assert.equal((await read()).rides[0].open,true);
    await page.getByRole('button',{name:'Close ride details',exact:true}).click();
    await page.screenshot({path:`${out}/smooth-${browserName}.png`});
    await page.getByRole('button',{name:'Build park',exact:true}).click();
    await page.getByRole('region',{name:'Build in 3D',exact:true}).waitFor();
    assert.equal(await page.locator('[data-testid="park-3d-canvas"]').count(),1,'building keeps the 3D view');
    await page.getByRole('button',{name:'Advanced editor (2D)',exact:true}).click();
    await page.getByRole('button',{name:'View in 3D',exact:true}).waitFor();
    assert.equal(await page.locator('#canvas').evaluate(c=>getComputedStyle(c).visibility),'visible');
    assert.equal(await page.locator('[data-testid="park-3d-canvas"]').count(),0,'3D context released during construction');
    const added=await page.evaluate(()=>JSON.parse(Module.ccall('SunrisePlaceShop','string',['string','number','number','number','number'],['sunrise.ride.gift_stand',21,19,3,200])));
    assert.equal(added.ok,true,JSON.stringify(added));
    await page.getByRole('button',{name:'View in 3D',exact:true}).click();
    await page.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects)>22,null,{timeout:15000});
    assert.equal((await read()).rides.length,5,'native construction reflected in 3D');
    const unchanged=await page.evaluate(()=>{
      const read=()=>Module.ccall('SunriseSceneJson','string',['number'],[1]);
      const first=read(); for(let i=0;i<20;i++)read(); return first===read();
    });
    assert.equal(unchanged,true,'scene polling does not mutate the park');
    await page.getByRole('button',{name:'Save & exit',exact:true}).click();await page.waitForURL('**/parks');
    await page.locator('[data-testid="park-card"]').first().getByRole('button',{name:'Play',exact:true}).click();
    await page.waitForFunction(()=>Number(document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects)>22,null,{timeout:180000});
    assert.equal((await read()).rides.length,5,'save resumes the edited park in 3D');
    assert.deepEqual(errors,[]);
    console.log('3D PASS',browserName,'live map, pan/zoom/rotate, lesson, pause, ride picking/status, build sync, read-only polling, save/reload');
    await context.close();
    if(browserName==='chromium') {
      const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:2});const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(base+'/play?scenario=small-footprint');await p.waitForFunction(()=>document.querySelector('[data-testid="park-3d"]')?.dataset.sceneObjects,null,{timeout:180000});
      const initial=await p.locator('[data-testid="park-3d"]').getAttribute('data-camera-position'),cdp=await mobile.newCDPSession(p);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:100,y:400}]});
      for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100+i*12,y:400+i*3}]});await p.waitForTimeout(30)}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);
      assert.notEqual(await p.locator('[data-testid="park-3d"]').getAttribute('data-camera-position'),initial);
      const build=await p.getByRole('button',{name:'Build park',exact:true}).boundingBox();assert.ok(build.x>=0&&build.x+build.width<=390);
      await p.screenshot({path:`${out}/smooth-touch.png`});assert.deepEqual(errors,[]);await mobile.close();console.log('3D TOUCH PASS 390x844');
    }
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
