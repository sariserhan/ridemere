// Measure a loaded, running park at several guest populations.
// Usage: node parkbench.js <dist dir> <label>
// Reports boot time, worker count, wasm heap, browser memory, frame rate and the
// engine's own tick rate at each population, plus whether the page survived.
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const POPULATIONS = [100, 500, 1000];

function rssSnapshot() {
  const pids = execSync("pgrep -f 'chrome-linux64/chrom[e]' || true").toString().trim().split('\n').filter(Boolean);
  let rss = 0, pss = 0, priv = 0;
  for (const pid of pids) {
    try {
      const s = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
      const g = k => +(s.match(new RegExp(k + ':\\s+(\\d+) kB')) || [0, 0])[1];
      rss += g('Rss'); pss += g('Pss'); priv += g('Private_Dirty');
    } catch {}
  }
  const mb = v => Math.round(v / 1024);
  return { rssMB: mb(rss), pssMB: mb(pss), privDirtyMB: mb(priv), processes: pids.length };
}

(async () => {
  const dir = path.resolve(process.argv[2]), label = process.argv[3] || path.basename(dir);
  const port = 8300 + Math.floor(Math.random() * 400);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const result = { label, dir, stages: [], crashed: false, errors: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    page.on('crash', () => { result.crashed = true; });
    page.on('pageerror', e => result.errors.push(String(e).slice(0, 200)));
    await page.goto('about:blank'); await sleep(1500);
    result.idle = rssSnapshot();

    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
    result.bootMs = Date.now() - t0;
    await sleep(6000);
    // Keep the pointer off the screen edge; the engine scrolls the view when it rests there.
    await page.mouse.move(640, 400);
    result.workers = page.workers().length;
    result.wasmHeapMB = await page.evaluate(() => {
      const M = window.Module || {};
      const bytes = (M.HEAPU8 && M.HEAPU8.length)
        || (M.wasmMemory && M.wasmMemory.buffer && M.wasmMemory.buffer.byteLength) || null;
      return bytes ? Math.round(bytes / 1e6) : null;
    });

    await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park']));
    await sleep(4000);
    await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], []));
    await sleep(3000);
    result.afterLoad = rssSnapshot();

    let reached = 0;
    for (const target of POPULATIONS) {
      const add = target - reached;
      if (add > 0) {
        await page.evaluate(n => window.Module.ccall('SunriseGenerateGuests', 'number', ['number'], [n]), add);
      }
      reached = target;
      await sleep(12000);                                   // let the park settle
      const stats0 = await page.evaluate(() => JSON.parse(window.Module.ccall('SunriseParkStatsJson','string',[],[])));
      const wall0 = Date.now();
      const fps = await page.evaluate(() => new Promise(resolve => {
        let frames = 0; const start = performance.now();
        const tick = () => { frames++; if (performance.now() - start < 5000) requestAnimationFrame(tick);
          else resolve(Math.round(frames / ((performance.now() - start) / 1000))); };
        requestAnimationFrame(tick);
      })).catch(() => null);
      const stats1 = await page.evaluate(() => JSON.parse(window.Module.ccall('SunriseParkStatsJson','string',[],[])));
      const elapsed = (Date.now() - wall0) / 1000;
      result.stages.push({
        target,
        guestEntities: stats1.guestEntities,
        guestsInPark: stats1.guestsInPark,
        fps,
        ticksPerSecond: +((stats1.ticks - stats0.ticks) / elapsed).toFixed(1),
        wasmHeapMB: await page.evaluate(() => {
          const M = window.Module || {};
          const bytes = (M.HEAPU8 && M.HEAPU8.length)
            || (M.wasmMemory && M.wasmMemory.buffer && M.wasmMemory.buffer.byteLength) || 0;
          return Math.round(bytes / 1e6);
        }),
        memory: rssSnapshot(),
        crashed: result.crashed,
      });
      if (result.crashed) break;
    }
    result.survived = !result.crashed;
  } catch (e) {
    result.fatal = String(e).slice(0, 400);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  console.log(JSON.stringify(result, null, 1));
})();
