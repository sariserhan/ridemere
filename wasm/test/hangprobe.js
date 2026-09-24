// Post-mortem for a configuration that stops responding.
//
//   node hangprobe.js <dist dir> [label]
//
// Boots, loads the park without waiting on the result, and then keeps asking two
// separate questions: is the browser main thread still running (does an animation
// frame fire, does a trivial evaluate return), and did the engine ever try to create
// another worker. A blocked main thread with worker creation frozen at the prewarmed
// count is the signature of a proxied pthread_create that will never be serviced.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, 'results-workers');
fs.mkdirSync(OUT, { recursive: true });

const PROBE = `
  (() => {
    const log = { created: 0, events: [], live: 0, peak: 0 };
    window.__workerProbe = log;
    let frames = 0;
    const Native = window.Worker;
    window.Worker = function (url, opts) {
      const w = new Native(url, opts);
      log.created++; log.live++; log.peak = Math.max(log.peak, log.live);
      log.events.push({ t: Math.round(performance.now()), kind: 'create', n: log.created });
      return w;
    };
    window.Worker.prototype = Native.prototype;
    // A frame counter driven by the browser, readable even if the engine is stuck.
    const tick = () => { frames++; window.__frames = frames; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  })();
`;

const withTimeout = (p, ms) => Promise.race([
  p, new Promise(r => setTimeout(() => r('__TIMEOUT__'), ms))]);

(async () => {
  const dir = path.resolve(process.argv[2]);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'build-config.json'), 'utf8'));
  const label = process.argv[3] || config.label;
  const port = 8800 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const result = { label, config, samples: [], console: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(PROBE);
    const page = await context.newPage();
    page.on('console', m => result.console.push(m.text().slice(0, 200)));

    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    result.booted = true;
    await sleep(6000);
    await page.mouse.move(640, 400);
    result.afterBoot = await page.evaluate(() => ({
      created: window.__workerProbe.created, frames: window.__frames,
      hardwareConcurrency: navigator.hardwareConcurrency }));
    result.afterBoot.attachedWorkers = page.workers().length;

    // Fire the park load without awaiting it, so the probe survives a hang.
    const loading = page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park'])).catch(e => 'ERR ' + e);

    for (let i = 0; i < 24; i++) {
      await sleep(5000);
      // Read the probe from a fresh isolated evaluate; if the main thread is blocked
      // this call itself will not return, which is the answer.
      const snap = await withTimeout(page.evaluate(() => ({
        created: window.__workerProbe.created,
        events: window.__workerProbe.events.slice(-4),
        frames: window.__frames,
      })), 4000);
      // page.workers() is answered by the browser over the debugging protocol, not by
      // the page, so it still reports while the main thread is blocked.
      const attached = page.workers().length;
      result.samples.push({ atMs: (i + 1) * 5000, snapshot: snap, attachedWorkers: attached });
      if (snap !== '__TIMEOUT__' && snap.created > result.afterBoot.created) break;
    }
    result.loadResult = await withTimeout(loading, 1000);
    result.mainThreadBlocked = result.samples.some(s => s.snapshot === '__TIMEOUT__');
    const framesSeen = result.samples.map(s => s.snapshot === '__TIMEOUT__' ? null : s.snapshot.frames);
    result.framesAdvanced = framesSeen.filter(Boolean).length > 1
      && framesSeen[framesSeen.length - 1] > framesSeen[0];
    result.workersCreatedDuringLoad = result.samples.length
      ? (result.samples.at(-1).snapshot === '__TIMEOUT__' ? null
         : result.samples.at(-1).snapshot.created - result.afterBoot.created)
      : null;
  } catch (e) {
    result.fatal = String(e).split('\n')[0].slice(0, 300);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, `hang-${label}.json`), JSON.stringify(result, null, 1));
  const attachedSeries = result.samples.map(s => s.attachedWorkers);
  result.attachedWorkerSeries = attachedSeries;
  console.log(JSON.stringify({ label, booted: result.booted,
    workersAfterBoot: result.afterBoot?.created,
    attachedAfterBoot: result.afterBoot?.attachedWorkers,
    attachedDuringLoad: attachedSeries.length ? attachedSeries[attachedSeries.length - 1] : null,
    workersDuringLoad: result.workersCreatedDuringLoad,
    mainThreadBlocked: result.mainThreadBlocked, framesAdvanced: result.framesAdvanced,
    loadResult: result.loadResult, fatal: result.fatal }));
})();
