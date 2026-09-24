// Smoke-test one browser engine against a served standalone build.
//
//   node crossbrowser.js <chromium|firefox|webkit> <url>
//
// Answers only the questions that decide whether the product can run there: is the
// page cross-origin isolated, does SharedArrayBuffer exist, does the engine boot,
// does it spawn workers, does a park load and simulate. Deeper debugging is out of
// scope for M3f.
const playwright = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const name = process.argv[2], url = process.argv[3];
  const result = { browser: name, url, console: [], pageErrors: [] };
  let browser;
  try {
    const type = playwright[name];
    browser = await type.launch({ headless: true,
      args: name === 'chromium' ? ['--no-sandbox'] : [] });
    result.version = browser.version();
    const page = await (await browser.newContext({ viewport: { width: 1024, height: 768 } })).newPage();
    page.on('pageerror', e => result.pageErrors.push(String(e).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') result.console.push(m.text().slice(0, 200)); });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    result.platform = await page.evaluate(() => ({
      crossOriginIsolated: self.crossOriginIsolated === true,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      hardwareConcurrency: navigator.hardwareConcurrency,
      webgl2: (() => { try { return !!document.createElement('canvas').getContext('webgl2'); }
                       catch { return false; } })(),
      wasmThreads: (() => { try {
        // A module that declares a shared memory only validates where threads are on.
        return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,5,4,1,3,1,1]));
      } catch { return false; } })(),
    }));

    const t0 = Date.now();
    try {
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
      result.bootMs = Date.now() - t0;
      result.booted = true;
    } catch {
      result.booted = false;
      result.bootFailureStatus = await page.evaluate(() => {
        const el = document.getElementById('status');
        return el ? el.textContent : null;
      }).catch(() => null);
    }

    if (result.booted) {
      await sleep(6000);
      await page.mouse.move(512, 400);
      result.workers = page.workers().length;
      const loaded = await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number',
        ['string'], ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park'])).catch(e => 'ERR ' + e);
      result.parkLoaded = loaded;
      await sleep(4000);
      await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], [])).catch(() => {});
      const first = await page.evaluate(() =>
        JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], []))).catch(() => null);
      await sleep(12000);
      const second = await page.evaluate(() =>
        JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], []))).catch(() => null);
      if (first && second) {
        result.simulated = second.ticks > first.ticks;
        result.ticksAdvanced = second.ticks - first.ticks;
        result.guestsInPark = second.guestsInPark;
        result.ridesOpen = second.ridesOpen;
      }
    }
  } catch (e) {
    result.fatal = String(e).split('\n').slice(0, 3).join(' | ').slice(0, 400);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  console.log(JSON.stringify(result));
})();
