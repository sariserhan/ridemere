// Production-shell release checks, including a real failed write and rescue download.
const {chromium,firefox,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browserName=process.argv[3]||'chromium',base=process.argv[2]||'http://127.0.0.1:3210';
 const out=process.env.QA_OUTPUT||'/tmp/ridemere-v1-qa';fs.mkdirSync(out,{recursive:true});
 const b=await ({chromium,firefox,webkit}[browserName]).launch({headless:!process.env.HEADED,...(browserName==='chromium'?{channel:'chromium',args:['--no-sandbox']}:{})});
 try{
  const p=await b.newPage({viewport:{width:1280,height:800},acceptDownloads:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(process.env.AUDIO_DEBUG)console.log(m.type(),m.text())});p.on('dialog',d=>d.accept());
  await p.goto(base+'/parks');for(const name of ['First Park','Small Footprint','Growing Destination'])await p.getByRole('button',{name:'Start '+name,exact:true}).waitFor();
  await p.goto(base+'/play?scenario=small-footprint');await p.mouse.move(640,400);
  await p.getByRole('button',{name:'Save & exit',exact:true}).waitFor({timeout:180000});
  await p.getByText(/Autosaved/).first().waitFor({timeout:90000});
  const c=(n,r='string',t=[],a=[])=>p.evaluate(([n,r,t,a])=>Module.ccall(n,r,t,a),[n,r,t,a]);
  assert.equal(JSON.parse(await c('SunriseScenarioStateJson')).objectiveGuests,300);
  assert.equal(await p.evaluate(()=>document.elementFromPoint(42,12)?.id),'canvas','native speed control remains accessible');
  assert.equal(JSON.parse(await c('SunriseAudioStateJson')).samples,64);
  await p.evaluate(()=>{window.audioProbe={frames:0,peak:0};const node=Module.SDL2?.audio?.scriptProcessorNode;if(node){const original=node.onaudioprocess;node.onaudioprocess=e=>{original?.(e);audioProbe.frames++;for(const n of e.outputBuffer.getChannelData(0))audioProbe.peak=Math.max(audioProbe.peak,Math.abs(n))}}});
  await p.getByRole('button',{name:'Mute sound',exact:true}).click();assert.equal(JSON.parse(await c('SunriseAudioStateJson')).enabled,false);
  await p.getByRole('button',{name:'Enable sound',exact:true}).click();assert.equal(JSON.parse(await c('SunriseAudioStateJson')).enabled,true);
  if(process.env.AUDIO_DEBUG)console.log('resume',await p.evaluate(()=>Promise.race([Module.SDL2.audioContext.resume().then(()=>'resumed',e=>String(e)),new Promise(r=>setTimeout(()=>r('resume timed out'),2000))])));await p.waitForTimeout(5000);const audio=await p.evaluate(()=>({...audioProbe,context:Module.SDL2?.audioContext?.state,node:!!Module.SDL2?.audio?.scriptProcessorNode}));console.log('audio probe',audio);if(audio.context==='suspended'&&process.env.ALLOW_NO_AUDIO_DEVICE==='1'){console.log('UNVERIFIED: container audio output remains suspended');}else assert.ok(audio.frames>0&&audio.peak>0,'audio callback emits nonzero samples');
  if(browserName==='chromium'){
   await c('SunriseHireHandyman','number');await c('SunriseHireMechanic','number');await c('SunriseGenerateGuests','number',['number'],[360]);
   for(let i=0;i<3;i++){await p.mouse.click(42,12);await p.waitForTimeout(250)}
   await p.locator('[data-testid="scenario-complete"]').waitFor({timeout:90000}).catch(async e=>{console.log('objective diagnostic',await c('SunriseScenarioStateJson'),p.url());throw e});
   assert.ok(JSON.parse(await c('SunriseScenarioStateJson')).scenarioComplete,'native objective completes');
   assert.ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('ridemere.completed-scenarios.v1')||'[]').includes('small-footprint')));
   await p.screenshot({path:path.join(out,'objective-complete.png')});
  }
  await p.evaluate(()=>{
   window.failSave=true;
   if(window.FileSystemFileHandle){const original=FileSystemFileHandle.prototype.createWritable;FileSystemFileHandle.prototype.createWritable=function(...args){if(window.failSave)throw new DOMException('Injected full disk','QuotaExceededError');return original.apply(this,args)}}
   const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(window.failSave&&this.name==='blobs')throw new DOMException('Injected full disk','QuotaExceededError');return original.apply(this,args)};
  });
  await p.getByRole('button',{name:'Save & exit',exact:true}).click();
  await p.getByRole('button',{name:'Download rescue copy'}).waitFor({timeout:30000});assert.ok(p.url().includes('/play'));
  const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Download rescue copy'}).click();const download=await downloadPromise;
  const rescue=path.join(out,`rescue-${browserName}.park`);await download.saveAs(rescue);assert.ok(fs.statSync(rescue).size>1000);
  const bytes=Array.from(fs.readFileSync(rescue));assert.equal(await p.evaluate(bytes=>{Module.FS.writeFile('/persistent/rescue-test.park',new Uint8Array(bytes));return Module.ccall('SunriseLoadPark','number',['string'],['/persistent/rescue-test.park'])},bytes),1,'rescue is loadable by the engine');
  await p.screenshot({path:path.join(out,`save-recovery-${browserName}.png`)});
  await p.evaluate(()=>window.failSave=false);await p.getByRole('button',{name:'Save & exit',exact:true}).click();await p.waitForURL('**/parks',{timeout:30000});
  await p.locator('[data-testid="park-card"]').first().waitFor();for(const name of ['First Park','Small Footprint','Growing Destination'])await p.getByRole('button',{name:'Start '+name,exact:true}).first().waitFor();
  await p.screenshot({path:path.join(out,`scenarios-${browserName}.png`)});
  if(browserName==='chromium'){await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(out,'scenarios-mobile.png')});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'scenario picker fits a narrow screen')}
  assert.deepEqual(errors,[]);
  console.log('WEB V1 OK',JSON.stringify({browserName,audio,rescueBytes:bytes.length,saveFailureRetainedSession:true,rescueLoaded:true}));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
