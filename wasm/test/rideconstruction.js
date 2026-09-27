// Actual ride selector -> construction tool -> paid placement. No builder shortcut.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const kind=process.argv[2]||'carousel';const port=8930+['carousel','dodgems','drop-tower','swinging-ship','ferris-wheel','alpine','single-rail'].indexOf(kind);const out='/tmp/ridemere-v17-qa';fs.mkdirSync(out,{recursive:true});
 const server=spawn('python3',[path.join(__dirname,'../scripts/serve.py'),path.join(__dirname,'../../engine/openrct2/build/www-standalone'),String(port)],{stdio:'ignore',detached:true});
 const browser=await chromium.launch({channel:'chromium',args:['--no-sandbox']});
 try{
  await sleep(1000);const p=await browser.newPage({viewport:{width:1280,height:800}});
  await p.goto(`http://localhost:${port}/?park=DevScenarios/${kind}-test.park`);await p.mouse.move(640,400);
  await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:180000});await sleep(8000);
  const c=(n,r='string',t=[],a=[])=>p.evaluate(([n,r,t,a])=>window.Module.ccall(n,r,t,a),[n,r,t,a]);
  await c('SunriseSpriteAuditClear',null);assert.equal(await c('SunriseOpenWindow','number',['string'],['new-ride']),1);await sleep(1000);
  const w=JSON.parse(await c('SunriseWindowInfoJson','string',['string'],['new-ride']));assert.ok(w.open);
  const thrill=['drop-tower','swinging-ship'].includes(kind),coaster=['alpine','single-rail'].includes(kind),index=['dodgems','alpine','single-rail'].includes(kind)?1:0;
  await p.mouse.click(w.x+49+(thrill?62:coaster?31:0),w.y+30);await sleep(1000);
  await p.screenshot({path:path.join(out,`${kind}-menu.png`)});
  await p.mouse.click(w.x+57+index*116,w.y+120);await sleep(2000);
  assert.equal(JSON.parse(await c('SunriseWindowInfoJson','string',['string'],['ride-construction'])).open,true);
  const before=JSON.parse(await c('SunriseParkStatsJson'));
  await p.mouse.move(800,500);await sleep(1000);await p.mouse.click(800,500);await sleep(1000);
  const after=JSON.parse(await c('SunriseParkStatsJson'));assert.ok(after.cash<before.cash,'placement spends money');
  const rides=JSON.parse(await c('SunriseRideListJson'));assert.equal(rides.length,2);assert.equal(rides[1].rideType,rides[0].rideType,'selected the intended ride');
  await p.screenshot({path:path.join(out,`${kind}-placed.png`)});
  const audit=JSON.parse(await c('SunriseSpriteAuditJson'));console.log('audit',JSON.stringify(audit));assert.equal(audit.uniqueUnexpected,0);
  console.log(`RIDE CONSTRUCTION OK (${kind}); cost ${(before.cash-after.cash)/10}`);
 }finally{await browser.close();try{process.kill(-server.pid)}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1});
