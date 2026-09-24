const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
const TILES = [[21,14],[21,13],[21,7],[21,6],[22,6],[22,8],[22,9],[22,14]];
(async () => {
  const port = 8600 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(5000);
    await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'], ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park']));
    await sleep(6000);
    const out = await page.evaluate((tiles) => tiles.map(([x, y]) =>
      JSON.parse(window.Module.ccall('SunriseTileDebugJson', 'string', ['number', 'number'], [x, y]))), TILES);
    fs.writeFileSync(path.join(__dirname, 'results-gameplay', 'tiles.json'), JSON.stringify(out, null, 2));
    for (const t of out) console.log(JSON.stringify(t));
  } finally { await browser.close(); try { process.kill(-server.pid); } catch {} }
})();
