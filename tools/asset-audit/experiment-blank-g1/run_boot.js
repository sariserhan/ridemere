// Boots the served WASM build with stub-rct2.zip (blank g1, no RCT2 objects) and records what happens.
const { chromium } = require('/home/ssari/projects/theme-park/wasm/test/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const log = []; page.on('console', m => log.push(m.text())); page.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  page.on('crash', () => log.push('PAGE CRASHED'));
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => { const b = document.getElementById('beforeLoad'); return b && b.style.display !== 'none'; }, null, { timeout: 120000 });
  const t0 = Date.now();
  await page.setInputFiles('#selectFile', path.join(__dirname, process.env.STUB || 'stub-rct2.zip'));
  for (const s of [5, 15, 30, 45]) {
    await sleep((s - (Date.now() - t0) / 1000) * 1000 > 0 ? (s - (Date.now() - t0) / 1000) * 1000 : 0);
    await page.screenshot({ path: path.join(OUT, `${process.env.TAG || 'boot'}-${s}s.png`) }).catch(e => log.push('screenshot failed: ' + e.message));
    const st = await page.evaluate(() => ({ canvas: [document.getElementById('canvas')?.width, document.getElementById('canvas')?.height, document.getElementById('canvas')?.style.display], title: document.title })).catch(e => ({ err: e.message }));
    log.push(`--- t=${s}s state ${JSON.stringify(st)}`);
    if (s === 15) {
      const fsinfo = await page.evaluate(() => { const M = window.Module; const st = M.FS.stat('/RCT/Data/g1.dat'); const b = M.FS.readFile('/RCT/Data/g1.dat'); 
        const n = b[0] | (b[1] << 8) | (b[2] << 16) | (b[3] << 24); const ds = b[4] | (b[5] << 8) | (b[6] << 16) | (b[7] << 24);
        return { size: st.size, numEntries: n, dataSize: ds, rct: M.FS.readdir('/RCT'), data: M.FS.readdir('/RCT/Data'), objdata: M.FS.readdir('/RCT/ObjData') }; }).catch(e => ({ err: e.message }));
      log.push('FS CHECK ' + JSON.stringify(fsinfo));
    }
  }
  // Try interacting: click centre of the canvas, press Escape, take one more screenshot
  await page.mouse.click(640, 400).catch(() => {}); await sleep(1500);
  await page.screenshot({ path: path.join(OUT, (process.env.TAG || 'boot') + '-after-click.png') }).catch(() => {});
  fs.writeFileSync(path.join(OUT, 'boot-console.log'), log.join('\n'));
  console.log(log.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 220)).join('\n'));
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
