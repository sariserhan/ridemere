// Confirm the shipped build really runs the configuration it was meant to, and that
// the render-stress lever actually moves.
//
//   node verifyconfig.js [dist dir]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, '../../engine/openrct2/build/www-standalone'));
  const port = 8910 + Math.floor(Math.random() * 60);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const out = {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(6000);
    await page.mouse.move(640, 400);
    out.liveWorkers = page.workers().length;
    out.crossOriginIsolated = await page.evaluate(() => self.crossOriginIsolated === true);
    out.hardwareConcurrency = await page.evaluate(() => navigator.hardwareConcurrency);

    out.loadPark = await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number',
      ['string'], ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']));
    await sleep(4000);
    await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], []));
    await sleep(2000);
    out.workersAfterLoad = page.workers().length;

    // The render-stress lever: zoom must be accepted and must visibly change the
    // picture, otherwise the W4 measurement means nothing.
    const shot = async name => (await page.screenshot({ fullPage: false })).length;
    out.bytesAtZoom0 = await shot();
    out.setZoom3 = await page.evaluate(() => window.Module.ccall('SunriseSetZoom', 'number', ['number'], [3]));
    await sleep(9000);
    // Nudge the pointer so the engine repaints, then settle again; a screenshot taken
    // mid-repaint shows a torn frame and proves nothing either way.
    await page.mouse.move(600, 380);
    await sleep(6000);
    out.bytesAtZoom3 = await shot();
    out.pictureChanged = out.bytesAtZoom0 !== out.bytesAtZoom3;
    await page.screenshot({ path: path.join(__dirname, 'results-workers', 'zoom3.png') });
    await page.evaluate(() => window.Module.ccall('SunriseSetZoom', 'number', ['number'], [0]));
    await sleep(8000);
    await page.mouse.move(640, 400);
    await sleep(4000);
    await page.screenshot({ path: path.join(__dirname, 'results-workers', 'zoom0.png') });
  } catch (e) {
    out.fatal = String(e).split('\n')[0].slice(0, 300);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  console.log(JSON.stringify(out, null, 1));
})();
