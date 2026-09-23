// M0 browser smoke test for upstream OpenRCT2's Emscripten build served from build/www.
// Usage: node smoke.js [baseUrl]   (default http://localhost:8080/)
// Produces results/smoke.json + screenshots. Uses a persistent browser profile so IndexedDB survives reload.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8080/';
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { baseUrl: BASE, startedAt: new Date().toISOString(), steps: {} };

async function openPage(ctx, label) {
  const page = await ctx.newPage();
  const log = []; const net = [];
  page.on('console', m => log.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => log.push(`[pageerror] ${e.message}`));
  page.on('response', async r => { try {
    const h = r.headers(); net.push({ url: r.url(), status: r.status(), bytes: +(h['content-length'] || 0), fromCache: r.fromServiceWorker() });
  } catch {} });
  page._log = log; page._net = net; page._label = label;
  return page;
}
async function fsInfo(page) {
  return page.evaluate(() => {
    const M = window.Module; if (!M || !M.FS) return { module: false };
    const stat = p => { try { return M.FS.stat(p).size; } catch { return null; } };
    const ls = p => { try { return M.FS.readdir(p).filter(x => x !== '.' && x !== '..'); } catch { return null; } };
    return { module: true, crossOriginIsolated: window.crossOriginIsolated, sab: typeof SharedArrayBuffer !== 'undefined',
      wasmHeapBytes: M.HEAPU8 ? M.HEAPU8.length : null,
      version: (() => { try { return M.FS.readFile('/OpenRCT2/version', { encoding: 'utf8' }); } catch { return null; } })(),
      g2dat: stat('/OpenRCT2/g2.dat'), objectsDir: (ls('/OpenRCT2/object') || []).length, persistent: ls('/persistent'), rct: ls('/RCT'),
      hardwareConcurrency: navigator.hardwareConcurrency };
  });
}
async function memory(page) {
  try { return await page.evaluate(async () => { const m = await performance.measureUserAgentSpecificMemory(); return m.bytes; }); } catch (e) { return String(e); }
}

(async () => {
  // NOTE: launchPersistentContext is deliberately avoided: under it the 71MB assets.zip fetch fails with
  // net::ERR_FAILED and the page reloads (see docs/wasm.md). A normal context keeps IndexedDB for its lifetime,
  // so reload-persistence is tested with page.reload() inside the same context.
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    // ---- Step 1: fresh load (downloads openrct2.zip + assets.zip, mounts IDBFS, extracts assets) ----
    let page = await openPage(ctx, 'fresh');
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    let state = 'timeout';
    for (let i = 0; i < 240; i++) {
      const s = await page.evaluate(() => {
        const bl = document.getElementById('beforeLoad'); const lw = document.getElementById('loadingWebassembly');
        if (bl && bl.style.display !== 'none') return 'prompt';
        if (!lw) return 'past-loading';
        if (/Error/.test(lw.innerText)) return 'error:' + lw.innerText;
        return 'loading:' + lw.innerText;
      });
      if (s === 'prompt' || s.startsWith('error')) { state = s; break; }
      await sleep(500);
    }
    const t1 = Date.now();
    await page.screenshot({ path: path.join(OUT, '1-fresh.png') });
    results.steps.fresh = { state, ms: t1 - t0, fs: await fsInfo(page), memoryBytes: await memory(page),
      network: page._net.filter(n => /openrct2|assets|jszip|index/.test(n.url)), console: page._log.slice(0, 60) };
    results.steps.fresh.workers = page.workers().length;
    await page.evaluate(() => new Promise(r => window.Module ? window.Module.FS.syncfs(false, r) : r()));

    // ---- Step 2: reload — assets must come from IndexedDB, not re-downloaded ----
    page._net.length = 0; page._log.length = 0;
    const t2 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    let state2 = 'timeout';
    for (let i = 0; i < 120; i++) {
      const s = await page.evaluate(() => { const bl = document.getElementById('beforeLoad'); return bl && bl.style.display !== 'none' ? 'prompt' : (document.getElementById('loadingWebassembly')||{}).innerText || 'past-loading'; });
      if (s === 'prompt') { state2 = s; break; } await sleep(250);
    }
    results.steps.reload = { state: state2, ms: Date.now() - t2, fs: await fsInfo(page),
      assetsZipRequested: page._net.some(n => /assets\.zip/.test(n.url)), console: page._log.slice(0, 40) };
    await page.screenshot({ path: path.join(OUT, '2-reload.png') });

    // ---- Step 3: start the engine WITHOUT RCT2 assets to document the failure mode ----
    const t3 = Date.now();
    const before = page._log.length;
    await page.evaluate(() => { document.getElementById('beforeLoad').remove(); document.getElementById('canvas').style.display = '';
      window.__mainResult = 'running';
      try { window.Module.callMain(['--user-data-path=/persistent/', '--openrct2-data-path=/OpenRCT2/']); window.__mainResult = 'returned'; }
      catch (e) { window.__mainResult = 'threw: ' + (e && e.message || e); } });
    await sleep(15000);
    await page.screenshot({ path: path.join(OUT, '3-no-rct2-assets.png') });
    results.steps.noRct2Assets = { ms: Date.now() - t3, mainResult: await page.evaluate(() => window.__mainResult),
      canvasSize: await page.evaluate(() => { const c = document.getElementById('canvas'); return [c.width, c.height]; }),
      pageAlive: await page.evaluate(() => 1 + 1).then(v => v === 2).catch(() => false),
      console: page._log.slice(before), memoryBytes: await memory(page) };
    await page.close();
  } finally { await ctx.close(); await browser.close(); }
  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'smoke.json'), JSON.stringify(results, null, 2));
  const f = results.steps.fresh, r = results.steps.reload, n = results.steps.noRct2Assets;
  console.log(JSON.stringify({ fresh: { state: f.state, ms: f.ms, isolated: f.fs.crossOriginIsolated, heap: f.fs.wasmHeapBytes, version: f.fs.version, g2: f.fs.g2dat, objects: f.fs.objectsDir, mem: f.memoryBytes },
    reload: { state: r.state, ms: r.ms, assetsZipRequested: r.assetsZipRequested, version: r.fs.version, objects: r.fs.objectsDir },
    workers: results.steps.fresh.workers, noRct2: { mainResult: n.mainResult, alive: n.pageAlive, canvas: n.canvasSize, consoleLines: n.console.length, mem: n.memoryBytes } }, null, 2));
})().catch(e => { console.error('SMOKE FAILED', e); process.exit(1); });
