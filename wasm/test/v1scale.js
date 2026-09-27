// Large-map measurement: real guest entities, simulation progress, memory and saves.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const out='/tmp/ridemere-v1-qa';fs.mkdirSync(out,{recursive:true});
 const server=spawn('python3',[path.join(__dirname,'../scripts/serve.py'),path.join(__dirname,'../../engine/openrct2/build/www-standalone'),'9059'],{stdio:'ignore',detached:true});
 const b=await chromium.launch({channel:'chromium',args:['--no-sandbox']});
 try{
  await sleep(1000);const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const start=Date.now();await p.goto('http://localhost:9059/?park=growing-destination.park');await p.mouse.move(640,400);await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:180000});
  const bootMs=Date.now()-start;await sleep(6000);const result={bootOverlayMs:bootMs,workers:p.workers().length,stages:[]};
  const c=(n,r='string',t=[],a=[])=>p.evaluate(([n,r,t,a])=>window.Module.ccall(n,r,t,a),[n,r,t,a]);
  for(const target of [250,1000]){
   const current=JSON.parse(await c('SunriseParkStatsJson'));await c('SunriseGenerateGuests','number',['number'],[Math.max(0,target-current.guestEntities)]);await sleep(5000);
   const before=JSON.parse(await c('SunriseParkStatsJson')),t0=Date.now();
   const fps=await p.evaluate(()=>new Promise(resolve=>{let frames=0;const t=performance.now();function sample(){frames++;if(performance.now()-t<10000)requestAnimationFrame(sample);else resolve(frames*1000/(performance.now()-t))}requestAnimationFrame(sample)}));
   const after=JSON.parse(await c('SunriseParkStatsJson'));
   const heap=await c('SunriseWasmHeapBytes','number');const jsHeap=await p.evaluate(()=>performance.memory?.usedJSHeapSize??null);
   result.stages.push({target,entities:after.guestEntities,inside:after.guestsInPark,fps,ticksPerSecond:(after.ticks-before.ticks)*1000/(Date.now()-t0),wasmHeapBytes:heap,jsHeapBytes:jsHeap,cash:after.cash});
   console.log('stage',JSON.stringify(result.stages.at(-1)));assert.ok(after.ticks>before.ticks,'simulation continues');assert.ok(after.guestEntities>=target-20,'requested population exists');
  }
  assert.equal(await c('SunriseSavePark','number',['string'],['/persistent/scale.park']),1);
  assert.equal(await c('SunriseLoadPark','number',['string'],['/persistent/scale.park']),1);await sleep(1500);
  assert.ok(JSON.parse(await c('SunriseParkStatsJson')).guestEntities>=950);
  await p.screenshot({path:path.join(out,'growing-1000.png')});assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'scale.json'),JSON.stringify(result,null,2));console.log('V1 SCALE OK',JSON.stringify(result));
 }finally{await b.close();try{process.kill(-server.pid)}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1});
