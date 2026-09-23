// Ask the running engine where each object's images actually landed.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
const IDS = ['sunrise.terrain_surface.grass', 'sunrise.footpath_surface.paved',
  'sunrise.footpath_surface.queue', 'sunrise.footpath_railings.plain',
  'sunrise.park_entrance.arch', 'sunrise.station.plain',
  'sunrise.peep_animations.guest', 'sunrise.peep_animations.handyman'];
(async () => {
  const port = 8500 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(5000);
    await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']));
    await sleep(6000);
    const out = await page.evaluate((ids) => ids.map(id =>
      JSON.parse(window.Module.ccall('SunriseObjectDebugJson', 'string', ['string'], [id]))), IDS);
    fs.mkdirSync(path.join(__dirname, 'results-gameplay'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'results-gameplay', 'objects.json'), JSON.stringify(out, null, 2));
    for (const o of out) {
      if (!o.loaded) { console.log(`${o.identifier}: NOT LOADED`); continue; }
      const first = o.images[0] || {};
      console.log(`${o.identifier}\n   base=${o.baseImageId} count=${o.imageCount} entry=${o.entryIndex} type=${o.objectType}` +
        `\n   image[0] ${first.present ? `${first.width}x${first.height} @(${first.xOffset},${first.yOffset})` : 'ABSENT'}` +
        `\n   imageList=${o.imageListBegin}..${o.imageListEnd} g1End=${o.g1End} g2Begin=${o.g2Begin}`);
    }
  } finally { await browser.close(); try { process.kill(-server.pid); } catch {} }
})();
