// Build the park and inspect tiles in the SAME session, before and after saving,
// to find where the path elements are lost.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
const desc = fs.readFileSync(path.join(__dirname, '../../assets/scenarios/sunrise-test/scenario.json'), 'utf8');
(async () => {
  const port = 8700 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage();
    const log = []; page.on('console', m => log.push(m.text().replace(/\x1b\[[0-9;]*m/g, '')));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(5000);
    const result = await page.evaluate(({ d }) => {
      const status = window.Module.ccall('SunriseBuildPark', 'string', ['string', 'string'], [d, '/persistent/trace.park']);
      const tiles = [[16, 10], [16, 14], [10, 14], [16, 4]].map(([x, y]) =>
        JSON.parse(window.Module.ccall('SunriseTileDebugJson', 'string', ['number', 'number'], [x, y])));
      return { status, tiles };
    }, { d: desc });
    console.log('build status:', result.status);
    console.log('--- tiles immediately after building (before any save/load) ---');
    for (const t of result.tiles) console.log('  ', JSON.stringify(t.path), 'surface', t.surfaceObject && t.surfaceObject.drawnIndex);
    console.log('--- relevant log ---');
    for (const l of log.filter(l => /Built standalone|refused|could not/i.test(l))) console.log('  ', l.slice(0, 180));
  } finally { await browser.close(); try { process.kill(-server.pid); } catch {} }
})();
