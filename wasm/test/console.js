const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, 'results-standalone');
(async () => {
  const b = await chromium.launch({ headless:true, channel:'chromium', args:['--no-sandbox'] });
  const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
  const log=[]; p.on('console', m=>log.push(m.text()));
  await p.goto('http://localhost:8081/', { waitUntil:'domcontentloaded' });
  await p.waitForFunction(()=>!document.getElementById('boot'), null, {timeout:120000});
  await sleep(9000);
  await p.evaluate(()=>document.getElementById('canvas').focus());
  // The changelog window opens on first run and takes keyboard focus; close it.
  await p.mouse.click(1143, 80); await sleep(800);
  await p.mouse.click(640, 400); await sleep(400);
  await p.keyboard.press('Backquote'); await sleep(1500);
  await p.screenshot({ path: path.join(OUT,'console-open.png') });
  await p.keyboard.type('sprite_audit write', { delay: 30 }); await sleep(400);
  await p.screenshot({ path: path.join(OUT,'console-typed.png') });
  await p.keyboard.press('Enter'); await sleep(3000);
  await p.screenshot({ path: path.join(OUT,'console-result.png') });
  const r = await p.evaluate(()=>{ try { return window.Module.FS.readFile('/persistent/sprite-audit.txt',{encoding:'utf8'}); } catch(e){ return 'ERR '+e; } });
  fs.writeFileSync(path.join(OUT,'sprite-audit.txt'), r);
  console.log(r.slice(0, 1200));
  await b.close();
})();
