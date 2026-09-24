// Measure a configuration under a genuinely heavier rendering workload.
//
//   node renderstress.js <dist dir>
//
// The viewport is painted in columns of a fixed pixel width, so paint work scales
// with the canvas area: a 2560x1440 canvas is 3.6 times the pixels of 1280x800 and
// splits into twice as many columns, over far more of the map, at a thousand guests.
// Resizing also forces a full-screen invalidation, so unlike changing the zoom level
// it cannot be confused with stale pixels left by the dirty-block renderer.
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OUT = path.join(__dirname, 'results-workers');

function rssSnapshot() {
  const pids = execSync("pgrep -f 'chrome-linux64/chrom[e]' || true").toString().trim().split('\n').filter(Boolean);
  let rss = 0, priv = 0;
  for (const pid of pids) {
    try {
      const s = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
      const g = k => +(s.match(new RegExp(k + ':\\s+(\\d+) kB')) || [0, 0])[1];
      rss += g('Rss'); priv += g('Private_Dirty');
    } catch {}
  }
  return { rssMB: Math.round(rss / 1024), privDirtyMB: Math.round(priv / 1024) };
}

const pace = (page, ms) => page.evaluate(duration => new Promise(resolve => {
  let frames = 0, worst = 0, last = performance.now();
  const start = last;
  const tick = () => {
    const now = performance.now();
    worst = Math.max(worst, now - last); last = now; frames++;
    if (now - start < duration) requestAnimationFrame(tick);
    else resolve({ fps: Math.round(frames / ((now - start) / 1000)), worstFrameGapMs: Math.round(worst) });
  };
  requestAnimationFrame(tick);
}), ms).catch(() => ({ fps: null, worstFrameGapMs: null }));

const stats = page => page.evaluate(() =>
  JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])));

(async () => {
  const dir = path.resolve(process.argv[2]);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'build-config.json'), 'utf8'));
  const port = 8940 + Math.floor(Math.random() * 50);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const result = { label: config.label, config, sizes: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(6000);
    await page.mouse.move(640, 400);
    await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']));
    await sleep(4000);
    await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], []));
    await page.evaluate(() => window.Module.ccall('SunriseGenerateGuests', 'number', ['number'], [1000]));
    await sleep(12000);

    for (const [w, h] of [[1280, 800], [1920, 1080], [2560, 1440]]) {
      await page.setViewportSize({ width: w, height: h });
      await sleep(3000);
      await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], []));
      await page.mouse.move(Math.round(w / 2), Math.round(h / 2));
      await sleep(9000);
      const canvas = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return { width: c.width, height: c.height, pixels: c.width * c.height };
      });
      const before = await stats(page);
      const t0 = Date.now();
      const p = await pace(page, 5000);
      const after = await stats(page);
      result.sizes.push({
        viewport: `${w}x${h}`, canvas, guests: after.guestEntities,
        fps: p.fps, worstFrameGapMs: p.worstFrameGapMs,
        ticksPerSecond: +((after.ticks - before.ticks) / ((Date.now() - t0) / 1000)).toFixed(1),
        memory: rssSnapshot(), workers: page.workers().length,
      });
      await page.screenshot({ path: path.join(OUT, `render-${config.label}-${w}x${h}.png`) });
    }
  } catch (e) {
    result.fatal = String(e).split('\n')[0].slice(0, 300);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, `render-${config.label}.json`), JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ label: result.label,
    sizes: result.sizes.map(s => ({ v: s.viewport, px: s.canvas.pixels, fps: s.fps,
      gap: s.worstFrameGapMs, tps: s.ticksPerSecond, priv: s.memory.privDirtyMB })),
    fatal: result.fatal }));
})();
