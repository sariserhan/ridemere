// Trace one guest's entering-park state over time, using engine state only.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
(async () => {
  const port = 8800 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(5000);
    await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'], ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']));

    let id = null;
    for (let i = 0; i < 40 && id === null; i++) {
      await sleep(1500);
      const list = await page.evaluate(() => JSON.parse(window.Module.ccall('SunriseGuestListJson', 'string', [], [])));
      if (list.length) id = list[0].id;
    }
    if (id === null) { console.log('no guest appeared'); return; }

    const samples = [];
    for (let i = 0; i < 10; i++) {
      const s = await page.evaluate((gid) => ({
        guest: JSON.parse(window.Module.ccall('SunriseGuestDebugJson', 'string', ['number'], [gid])),
        stats: JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])),
      }), id);
      samples.push(s);
      await sleep(2500);
    }
    fs.writeFileSync(path.join(__dirname, 'results-gameplay', 'guest.json'), JSON.stringify(samples, null, 2));
    const g0 = samples[0].guest;
    console.log('entrances:', JSON.stringify(g0.entrances));
    console.log('tick | state var37 dir outside | pos            | next           | dest        tol');
    for (const s of samples) {
      const g = s.guest;
      console.log(`${String(s.stats.ticks).padStart(5)} | ${g.state} ${String(g.var37).padStart(2)} ${g.peepDirection} ${g.outsideOfPark ? 'out' : 'in '} ` +
        `| ${String(g.x).padStart(5)},${String(g.y).padStart(5)},${String(g.z).padStart(4)} ` +
        `| ${String(g.nextX).padStart(5)},${String(g.nextY).padStart(5)},${String(g.nextZ).padStart(4)} ` +
        `| ${String(g.destinationX).padStart(5)},${String(g.destinationY).padStart(5)} ${g.destinationTolerance} tile ${g.tile}`);
    }
  } finally { await browser.close(); try { process.kill(-server.pid); } catch {} }
})();
