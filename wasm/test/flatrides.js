// Real ride session: queue -> board -> leave -> save/load, plus sprite audit.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const kind=process.argv[2] || 'carousel';
 const port=({carousel:8924,dodgems:8926,'drop-tower':8927,'swinging-ship':8928,'ferris-wheel':8929,alpine:8940,'single-rail':8941})[kind], out='/tmp/ridemere-v17-qa';fs.mkdirSync(out,{recursive:true});
 const server=spawn('python3',[path.join(__dirname,'../scripts/serve.py'),path.join(__dirname,'../../engine/openrct2/build/www-standalone'),String(port)],{stdio:'ignore',detached:true});
 const browser=await chromium.launch({channel:'chromium',args:['--no-sandbox']});
 try {
  await sleep(1000);const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://localhost:${port}/?park=DevScenarios/${kind}-test.park`);await p.mouse.move(640,400);
  await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:180000});await sleep(8000);
  const call=(n,r='string',t=[],a=[])=>p.evaluate(([n,r,t,a])=>window.Module.ccall(n,r,t,a),[n,r,t,a]);
  const rides=async()=>JSON.parse(await call('SunriseRideListJson'));
  assert.equal((await rides())[0].status,1);assert.equal((await rides())[0].entranceSet,true);assert.equal((await rides())[0].exitSet,true);
  console.log('ok ride opens with connected entry and exit');
  await call('SunriseSpriteAuditClear',null);await call('SunriseGenerateGuests','number',['number'],[80]);
  // Normal UI speed control; three presses select 8x without changing game state.
  for(let i=0;i<3;i++){await p.mouse.click(42,12);await sleep(300);}
  let sawQueue=false,sawRiders=false,capturedRiders=false,maxHeight=0;const deadline=Date.now()+180000;
  while(Date.now()<deadline){await p.mouse.move(640,400);await sleep(1000);const r=(await rides())[0];maxHeight=Math.max(maxHeight,r.vehicleZ);sawQueue ||= r.queueLength>0;sawRiders ||= r.numRiders>0;
   if(r.numRiders>0 && !capturedRiders){await p.screenshot({path:path.join(out,`${kind}-riders.png`)});capturedRiders=true;}
   if(sawRiders && r.totalCustomers>0){console.log('ok guests complete a real ride session',JSON.stringify(r));break;}
  }
  console.log('ride',JSON.stringify(await rides()));assert.ok(sawQueue,'guests queue');assert.ok(sawRiders,'guests board');assert.ok((await rides())[0].totalCustomers>0,'guests leave after a session');
  assert.equal(await call('SunriseSavePark','number',['string'],['/persistent/flat-test.park']),1);
  const before=(await rides())[0];assert.equal(await call('SunriseLoadPark','number',['string'],['/persistent/flat-test.park']),1);await sleep(3000);
  const after=(await rides())[0];assert.equal(after.rideType,before.rideType);assert.equal(after.status,1);assert.ok(after.totalCustomers>=before.totalCustomers);console.log('ok ride and customers survive save/load');
  await p.screenshot({path:path.join(out,`${kind}-playing.png`)});
  if(kind==='drop-tower')assert.ok(maxHeight>160,'gondola rises above the station');
  for(let rotation=0;rotation<4;rotation++){await p.screenshot({path:path.join(out,`${kind}-rotation-${rotation}.png`)});await p.keyboard.press('Enter');await sleep(1000);}
  const audit=JSON.parse(await call('SunriseSpriteAuditJson'));console.log('audit',JSON.stringify(audit));assert.equal(audit.uniqueUnexpected,0);assert.deepEqual(errors,[]);
  console.log('FLAT RIDES OK');
 }finally{await browser.close();try{process.kill(-server.pid)}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1});
