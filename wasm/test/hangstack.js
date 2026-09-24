// Capture what the main thread is blocked in.
//
//   node hangstack.js <dist dir>
//
// Boots, starts loading the park, then pauses the page over the Chrome DevTools
// Protocol. The protocol is served by the browser process, not by the page, so it
// answers even when the page's main thread is wedged. The resulting call frames name
// the JavaScript glue the engine is stuck inside, which distinguishes a blocked futex
// wait from a stalled worker creation.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, 'results-workers');

(async () => {
  const dir = path.resolve(process.argv[2]);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'build-config.json'), 'utf8'));
  const port = 8830 + Math.floor(Math.random() * 120);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const result = { label: config.label, frames: [], workerFrames: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(6000);
    await page.mouse.move(640, 400);

    const client = await page.context().newCDPSession(page);
    await client.send('Debugger.enable');
    const paused = new Promise(resolve => client.once('Debugger.paused', resolve));

    page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park'])).catch(() => {});
    await sleep(25000);

    await client.send('Debugger.pause').catch(e => { result.pauseError = String(e).slice(0, 200); });
    const event = await Promise.race([paused, sleep(15000).then(() => null)]);
    if (event) {
      result.reason = event.reason;
      result.frames = (event.callFrames || []).slice(0, 25).map(f => ({
        fn: f.functionName || '(anonymous)',
        line: f.location ? f.location.lineNumber : null,
        url: (f.url || '').split('/').pop(),
      }));
    } else {
      result.frames = null;   // the page could not even be paused
    }

    // Also look at one worker, to see whether the job threads are alive and waiting.
    const workers = page.workers();
    result.workerCount = workers.length;
    for (const w of workers.slice(0, 2)) {
      try {
        const wc = await page.context().newCDPSession(w);
        await wc.send('Debugger.enable');
        const wp = new Promise(r => wc.once('Debugger.paused', r));
        await wc.send('Debugger.pause').catch(() => {});
        const we = await Promise.race([wp, sleep(8000).then(() => null)]);
        result.workerFrames.push(we ? (we.callFrames || []).slice(0, 12)
          .map(f => ({ fn: f.functionName || '(anonymous)', url: (f.url || '').split('/').pop() })) : null);
      } catch (e) { result.workerFrames.push('ERR ' + String(e).slice(0, 120)); }
    }
  } catch (e) {
    result.fatal = String(e).split('\n')[0].slice(0, 300);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, `stack-${result.label}.json`), JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result, null, 1).slice(0, 2500));
})();
