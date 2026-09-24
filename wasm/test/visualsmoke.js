// Capture a deterministic picture of a known park for the visual smoke test.
//
//   node visualsmoke.js [dist dir] [output png]
//
// Uses the engine's own off-screen capture rather than a page screenshot, so the image
// does not depend on window size, device pixel ratio or where the camera happens to be
// pointing. That also makes this a test of the same capture path the save thumbnails
// use.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const DIST = path.resolve(process.argv[2] || path.join(__dirname, '../../engine/openrct2/build/www-standalone'));
  const OUT = path.resolve(process.argv[3] || path.join(__dirname, 'results-visual/park.png'));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const port = 8970 + Math.floor(Math.random() * 25);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(6000);
    await page.mouse.move(640, 400);
    const loaded = await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']));
    if (loaded !== 1) throw new Error('the reference park did not load');
    await sleep(5000);
    const png = await page.evaluate(() => {
      try { window.Module.FS.mkdir('/persistent/screenshot'); } catch {}
      const r = JSON.parse(window.Module.ccall('SunriseCaptureThumbnail', 'string',
        ['string', 'number', 'number'], ['smoke.png', 640, 360]));
      if (r.ok !== 1) return { error: r.error || 'capture failed' };
      const bytes = window.Module.FS.readFile('/persistent/screenshot/smoke.png');
      return { bytes: Array.from(bytes) };
    });
    if (png.error) throw new Error(png.error);
    fs.writeFileSync(OUT, Buffer.from(png.bytes));
    console.log(`captured ${OUT} (${png.bytes.length} bytes)`);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
})();
