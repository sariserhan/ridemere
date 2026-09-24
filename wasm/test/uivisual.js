// Interface coverage and reference captures for V1-1.
//
//   node uivisual.js [baseUrl]
//
// Opens the windows a player actually uses, keeps the sprite audit running across all
// of them, and captures deterministic reference views. The pointer is parked in the
// middle of the canvas from the first moment: the engine scrolls the view when it
// rests against a screen edge, which both smears the picture and makes a capture
// meaningless.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = path.join(__dirname, 'results-visual');
const WINDOWS = ['ride-list', 'guest-list', 'staff-list', 'park', 'finances', 'map', 'scenery', 'footpath'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // With a URL, drive the product shell. Without one, serve the standalone
  // distribution directly, so the engine test suite does not depend on the web shell
  // being built and running.
  const target = process.argv[2] || path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const usingShell = target.startsWith('http');
  let server = null;
  let base = target;
  if (!usingShell) {
    const port = 8990 + Math.floor(Math.random() * 9);
    server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), path.resolve(target), String(port)],
      { stdio: 'ignore', detached: true });
    await sleep(1200);
    base = `http://localhost:${port}`;
  }
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const logs = [];
  page.on('console', m => logs.push(m.text()));
  const result = { opened: {}, audit: null, logs: [] };
  try {
    const url = usingShell
      ? `${base}/play?scenario=sunrise-test`
      : `${base}/?park=sunrise-test.park`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    if (usingShell) {
      await page.waitForSelector('button:has-text("Save & exit")', { timeout: 240000 });
    } else {
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
      await sleep(9000);
    }
    await page.mouse.move(640, 400);
    await sleep(6000);
    await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], []));
    await page.mouse.move(640, 400);
    await sleep(6000);

    // Scope the audit to interface use, so a marker found here is one the interface asked for.
    await page.evaluate(() => window.Module.ccall('SunriseSpriteAuditClear', null, [], []));
    await page.screenshot({ path: path.join(OUT, 'ui-main.png') });

    for (const name of WINDOWS) {
      const ok = await page.evaluate(
        n => window.Module.ccall('SunriseOpenWindow', 'number', ['string'], [n]), name);
      result.opened[name] = ok === 1;
      await page.mouse.move(640, 400);
      await sleep(2500);
      await page.screenshot({ path: path.join(OUT, `ui-window-${name}.png`) });
    }

    result.audit = JSON.parse(await page.evaluate(
      () => window.Module.ccall('SunriseSpriteAuditJson', 'string', [], [])));
    result.logs = logs.filter(l => /ERROR|FATAL/.test(l)).slice(0, 5);
  } catch (error) {
    result.fatal = String(error).split('\n')[0].slice(0, 200);
  } finally {
    await browser.close().catch(() => {});
    if (server) { try { process.kill(-server.pid); } catch {} }
  }
  fs.writeFileSync(path.join(OUT, 'ui-coverage.json'), JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ opened: result.opened, audit: result.audit, fatal: result.fatal }, null, 1));
})();
