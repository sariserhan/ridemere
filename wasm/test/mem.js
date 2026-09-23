// Measures OS-level memory (RSS of all Chrome processes) at: browser idle, WASM loaded at asset prompt, engine started.
const { chromium } = require('playwright'); const { execSync } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rss = () => { const out = execSync("ps -eo rss,args | grep -E 'chrome-linux64/chrom[e]' | awk '{s+=$1} END {print s}'").toString().trim(); return Math.round(+out / 1024); };
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto('about:blank'); await sleep(1000); const idle = rss();
  const t0 = Date.now(); await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => { const b = document.getElementById('beforeLoad'); return b && b.style.display !== 'none'; }, null, { timeout: 120000 });
  const tPrompt = Date.now() - t0; await sleep(2000); const atPrompt = rss();
  await page.evaluate(() => { document.getElementById('beforeLoad').remove(); document.getElementById('canvas').style.display = '';
    window.Module.callMain(['--user-data-path=/persistent/', '--openrct2-data-path=/OpenRCT2/']); });
  await sleep(8000); const afterMain = rss();
  const heap = await page.evaluate(() => window.Module.HEAPU8 ? window.Module.HEAPU8.length : (window.Module.wasmMemory ? window.Module.wasmMemory.buffer.byteLength : null));
  console.log(JSON.stringify({ chromeIdleMB: idle, atPromptMB: atPrompt, afterEngineStartMB: afterMain, msToPrompt: tPrompt, wasmMemoryBytes: heap }));
  await browser.close();
})();
