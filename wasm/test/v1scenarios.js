// Release scenario economics, guest appearances, sound loading and save persistence.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const kind=process.argv[2] || 'small-footprint';
 const index=['first-park','small-footprint','growing-destination'].indexOf(kind);assert.ok(index>=0);
 const port=9055+index,out='/tmp/ridemere-v1-qa';fs.mkdirSync(out,{recursive:true});
 const server=spawn('python3',[path.join(__dirname,'../scripts/serve.py'),path.join(__dirname,'../../engine/openrct2/build/www-standalone'),String(port)],{stdio:'ignore',detached:true});
 const browser=await chromium.launch({channel:'chromium',args:['--no-sandbox']});
 try{
  await sleep(1000);const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  p.on('console',m=>{if(process.env.SPRITE_TRACE)console.log(m.text())});p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://localhost:${port}/?park=${kind}.park`);await p.mouse.move(640,400);
  await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:180000});await sleep(6000);
  const c=(n,r='string',t=[],a=[])=>p.evaluate(([n,r,t,a])=>window.Module.ccall(n,r,t,a),[n,r,t,a]);
  const state=async()=>JSON.parse(await c('SunriseScenarioStateJson'));
  const economy=async()=>JSON.parse(await c('SunriseEconomyJson'));
  const rides=async()=>JSON.parse(await c('SunriseRideListJson'));
  assert.equal((await state()).objectiveGuests,[180,300,750][index]);
  assert.equal((await economy()).freeEntry,index!==2);assert.equal((await economy()).entranceFee,index===2?150:0);
  assert.equal(JSON.parse(await c('SunriseAudioStateJson')).samples,64);
  assert.equal(await c('SunriseSetAudioEnabled','number',['number'],[0]),0);
  assert.equal(JSON.parse(await c('SunriseAudioStateJson')).enabled,false);
  assert.equal(await c('SunriseSetAudioEnabled','number',['number'],[1]),1);
  if(index===0)assert.equal(await c('SunriseSetRideStatus','number',['number','number'],[0,1]),1);
  assert.ok(await c('SunriseHireHandyman','number'));assert.ok(await c('SunriseHireMechanic','number'));
  await c('SunriseGenerateGuests','number',['number'],[120]);
  const appearances=JSON.parse(await c('SunriseGuestAppearanceJson'));assert.ok(appearances.length>=36,'diverse guests actually spawned');
  await c('SunriseSpriteAuditClear',null);
  for(let i=0;i<3;i++){await p.mouse.click(42,12);await sleep(250)}
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){await sleep(2000);const r=await rides();if(r[0].totalCustomers>0 && (index!==2 || r[1].totalCustomers>0))break;}
  const stats=await state(),allRides=await rides();console.log(kind,JSON.stringify({state:stats,economy:await economy(),rides:allRides}));
  assert.ok(allRides[0].totalCustomers>0,'starter ride serves guests');
  if(index===2){assert.ok(allRides[1].totalCustomers>0,'destination carousel is reachable');assert.ok((await economy()).admissionIncome>0,'paid entry earns real income');assert.equal(allRides[0].price,0)}
  else assert.ok(allRides[0].price>0);
  const before=await economy();const appearancesBefore=JSON.parse(await c('SunriseGuestAppearanceJson')).length;
  assert.equal(await c('SunriseSavePark','number',['string'],['/persistent/v1-test.park']),1);
  assert.equal(await c('SunriseLoadPark','number',['string'],['/persistent/v1-test.park']),1);await sleep(1500);
  const after=await economy();assert.equal(after.freeEntry,before.freeEntry);assert.equal(after.entranceFee,before.entranceFee);assert.ok(after.admissionIncome>=before.admissionIncome);
  assert.ok(JSON.parse(await c('SunriseGuestAppearanceJson')).length>=appearancesBefore-1);
  for(let rotation=0;rotation<4;rotation++){await p.screenshot({path:path.join(out,`${kind}-${rotation}.png`)});await p.keyboard.press('Enter');await sleep(500)}
  const audit=JSON.parse(await c('SunriseSpriteAuditJson'));assert.equal(audit.uniqueUnexpected,0,JSON.stringify(audit));assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,`${kind}-state.json`),JSON.stringify({state:stats,economy:after,rides:allRides,appearances},null,2));
  console.log('V1 SCENARIO OK',kind);
 }finally{await browser.close();try{process.kill(-server.pid)}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1});
