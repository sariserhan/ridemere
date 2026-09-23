// Measure boot time, worker count and committed memory for each worker-pool build.
// Usage: node bench.js <dir> <label> ; serves the directory itself on a free port.
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  const dir = process.argv[2], label = process.argv[3] || path.basename(dir);
  const port = 8100 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  try {
    const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto('about:blank'); await sleep(1200);
    const idle = rssSnapshot();

    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    const bootMs = Date.now() - t0;
    await sleep(9000);
    const running = rssSnapshot();
    const workers = page.workers().length;
    const heap = await page.evaluate(() => {
      const M = window.Module;
      return M && M.HEAPU8 ? M.HEAPU8.length : null;
    }).catch(() => null);
    // Frame pacing while the title scene renders.
    const fps = await page.evaluate(() => new Promise(resolve => {
      let frames = 0; const start = performance.now();
      const tick = () => { frames++; if (performance.now() - start < 3000) requestAnimationFrame(tick);
        else resolve(Math.round(frames / ((performance.now() - start) / 1000))); };
      requestAnimationFrame(tick);
    })).catch(() => null);

    console.log(JSON.stringify({ label, bootMs, workers, wasmHeapMB: heap ? Math.round(heap / 1e6) : null,
      idle, running, titleFps: fps }));
    await browser.close();
  } finally {
    try { process.kill(-server.pid); } catch {}
  }
})();
