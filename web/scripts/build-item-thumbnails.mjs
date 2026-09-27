#!/usr/bin/env node
// Render the actual game models once; the catalog needs no additional WebGL context.
import { chromium } from '../../wasm/test/node_modules/playwright/index.mjs';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(root, 'public/art/build-items');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage(), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    await page.route('http://catalog.local/**', async route => {
      const name = new URL(route.request().url()).pathname.slice(1);
      let body;
      if (!name) body = `<!doctype html><html><script type="importmap">{"imports":{"three":"/three.module.js","three/addons/":"/addons/"}}</script><script type="module">
        import * as T from 'three';
        import {buildTools} from '/build';
        import {gardenProp,tree,kiosk,flatRide,entrance,fence,pathTile,coasterTrack} from '/models';
        const designs=await (await fetch('/designs.json')).json();
        const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setSize(192,144);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
        const scene=new T.Scene();scene.background=new T.Color('#dce4d9');scene.add(new T.HemisphereLight('#fff8ee','#76846c',2));const sun=new T.DirectionalLight('#fff1dc',2.5);sun.position.set(-4,9,6);scene.add(sun);
        window.items=buildTools;window.capture=(id)=>{
          const tool=buildTools.find(t=>t.id===id),object=tool.object||'';let model;
          if(tool.op==='path'||tool.op==='queue'||tool.op==='removePath')model=pathTile(object,tool.op==='queue');
          else if(tool.op==='wall'||tool.op==='removeWall')model=fence(object||'fence_timber');
          else if(tool.op==='design'){if(object.includes('tower'))model=flatRide(object).group;else{model=new T.Group();const tracks=designs[tool.id]||designs[object]||[],ground=Math.min(...tracks.map(t=>t.z));for(const t of tracks)coasterTrack(model,{...t,z:t.z-ground,end:[t.end[0],t.end[1]-ground,t.end[2]]},object);}}
          else if(tool.op==='ride')model=tool.category==='Shops'?kiosk(object):flatRide(object).group;
          else if(tool.op==='entrance'||tool.op==='exit')model=entrance(false);
          else if(object.includes('tree_'))model=tree(object,41);
          else model=gardenProp(object||'shrub_round');
          scene.add(model);model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3());
          const camera=new T.OrthographicCamera(-1.333,1.333,1,-1,.01,1000);camera.position.copy(center).add(new T.Vector3(4,3.2,6).normalize().multiplyScalar(box.getSize(new T.Vector3()).length()*2+10));camera.lookAt(center);camera.updateMatrixWorld();camera.updateProjectionMatrix();
          let extent=0;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new T.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(v.x),Math.abs(v.y));}camera.zoom=.80/Math.max(.05,extent);camera.updateProjectionMatrix();renderer.render(scene,camera);
          const url=renderer.domElement.toDataURL('image/png');model.removeFromParent();model.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.userData.shared){m.map?.dispose();m.dispose();}}});return url;
        };window.ready=true;
      </script></html>`;
      else if (name==='designs.json') { await route.fulfill({body:fs.readFileSync(path.join(root,'scripts/ride-design-previews.json'),'utf8'),contentType:'application/json'});return; }
      else if (['models','vegetation','build'].includes(name)) body=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/game/scene',name+'.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
      else body=fs.readFileSync(name.startsWith('addons/')?path.join(root,'node_modules/three/examples/jsm',name.slice(7)):path.join(root,'node_modules/three/build',name),'utf8');
      await route.fulfill({body,contentType:name?'text/javascript':'text/html'});
    });
    await page.goto('http://catalog.local/');await page.waitForFunction(()=>window.ready);
    const items=await page.evaluate(()=>window.items);
    for(const item of items){const url=await page.evaluate(id=>window.capture(id),item.id);fs.writeFileSync(path.join(out,item.id+'.png'),Buffer.from(url.split(',')[1],'base64'));}
    if(errors.length)throw Error(errors.join('\n'));
    console.log(`Rendered ${items.length} build thumbnails to ${out}`);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
