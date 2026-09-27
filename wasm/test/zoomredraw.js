// Zoom must erase the previous projection, including pixels outside the map.
// Real wheel/button input; the pixel assertion rejects the original nested-map bug.
const {chromium}=require('playwright');
const {spawn,execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),out=process.env.QA_OUTPUT||'/tmp/ridemere-zoom-regression';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 fs.mkdirSync(out,{recursive:true});const server=spawn('python3',[path.join(root,'wasm/scripts/serve.py'),path.join(root,'engine/openrct2/build/www-standalone'),'9058'],{stdio:'ignore',detached:true});
 const b=await chromium.launch({channel:'chromium',args:['--no-sandbox']});
 try{
  await sleep(1000);const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://localhost:9058/?park=small-footprint.park');await p.mouse.move(640,400);await p.waitForFunction(()=>!document.getElementById('boot'),null,{timeout:180000});await sleep(6000);
  for(let cycle=0;cycle<2;cycle++){
   for(let n=0;n<3;n++){if(cycle===0)await p.mouse.wheel(0,120);else await p.mouse.click(110,12);await sleep(350)}
   await p.mouse.move(640,400);await sleep(500);const file=path.join(out,`zoom-out-${cycle}.png`);await p.screenshot({path:file});
   execFileSync(path.join(root,'.cache/venv/bin/python'),['-c',`
from PIL import Image
import numpy as np,sys
im=np.asarray(Image.open(sys.argv[1]).convert('RGB'))
for x,y in [(250,200),(950,200),(250,500),(950,500)]:
 region=im[y:y+50,x:x+50]
 cleared=np.all(region==[23,35,35],axis=2).mean()
 assert cleared>.995, f'old terrain remains outside zoomed map at {x},{y}: only {cleared:.1%} cleared'
# Both toolbar groups must remain visible after repainting the background.
for x0,x1 in [(30,250),(920,1275)]:
 pixels=im[2:23,x0:x1]
 assert np.count_nonzero(np.any(pixels!=[23,35,35],axis=2))>1200,'toolbar icons disappeared'
`,file],{stdio:'inherit'});
   for(let n=0;n<3;n++){await p.mouse.wheel(0,-120);await sleep(350)}
   await p.keyboard.press('Enter');await sleep(500);
  }
  assert.deepEqual(errors,[]);console.log('ZOOM REDRAW OK: wheel, toolbar, rotation; no stale map pixels; toolbar retained');
 }finally{await b.close();try{process.kill(-server.pid)}catch{}}
})().catch(e=>{console.error(e);process.exitCode=1});
