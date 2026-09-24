// Does the park load on a small worker pool once the engine stops using job threads?
//
//   node mtload.js <dist dir>
//
// Boots, records how many workers exist, tries to load the park, then turns the
// engine's multiThreading config off, reloads the page and tries again. The paint
// JobPool is the largest single consumer of threads, so if the load only succeeds
// with it gone, thread demand rather than anything else is what the small pool
// cannot satisfy.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r('__TIMEOUT__'), ms))]);

(async () => {
  const dir = path.resolve(process.argv[2]);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'build-config.json'), 'utf8'));
  const port = 8860 + Math.floor(Math.random() * 100);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const result = { label: config.label };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const url = `http://localhost:${port}/`;

    const boot = async page => {
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
      await sleep(6000);
      await page.mouse.move(640, 400);
    };
    const tryLoad = async page => {
      const before = page.workers().length;
      const r = await withTimeout(page.evaluate(() =>
        window.Module.ccall('SunriseLoadPark', 'number', ['string'],
          ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park'])).catch(() => 'ERR'), 60000);
      await sleep(2000);
      return { workersBefore: before, workersAfter: page.workers().length, result: r };
    };

    // A wedged page cannot be navigated away from, so each attempt gets its own page
    // and the two attempts get their own contexts.
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageA = await contextA.newPage();
    await pageA.goto(url, { waitUntil: 'domcontentloaded' });
    await boot(pageA);
    result.multithreadingOn = await tryLoad(pageA);
    await contextA.close().catch(() => {});

    // A second context, where the engine's config is changed before the park is
    // touched. Contexts have separate storage, so the setting is written on a page
    // that never loads a park, and read by a fresh page in the same context.
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const setup = await contextB.newPage();
    await setup.goto(url, { waitUntil: 'domcontentloaded' });
    await boot(setup);
    await setup.evaluate(() => {
      const fsx = window.Module.FS;
      let text = fsx.readFile('/persistent/config.ini', { encoding: 'utf8' });
      text = /^multithreading\s*=/m.test(text)
        ? text.replace(/^multithreading\s*=.*$/m, 'multithreading = false')
        : text.replace(/^\[general\]\s*$/m, '[general]\nmultithreading = false');
      fsx.writeFile('/persistent/config.ini', text);
      return new Promise(r => fsx.syncfs(false, r));
    });
    await sleep(2500);
    await setup.close();

    const pageB = await contextB.newPage();
    await pageB.goto(url, { waitUntil: 'domcontentloaded' });
    await boot(pageB);
    result.configuredMultithreading = await pageB.evaluate(() =>
      (window.Module.FS.readFile('/persistent/config.ini', { encoding: 'utf8' })
        .match(/multithreading.*/) || ['?'])[0]);
    result.multithreadingOff = await tryLoad(pageB);
    await contextB.close().catch(() => {});
  } catch (e) {
    result.fatal = String(e).split('\n')[0].slice(0, 300);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  console.log(JSON.stringify(result, null, 1));
})();
