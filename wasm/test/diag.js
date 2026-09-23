const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function run(mode) {
  const prof = path.join(__dirname, 'results', 'diag-' + mode); fs.rmSync(prof, { recursive: true, force: true });
  const ctx = mode === 'persistent' ? await chromium.launchPersistentContext(prof, { headless: true, args: ['--no-sandbox'] })
                                     : await (await chromium.launch({ headless: true, args: ['--no-sandbox'] })).newContext();
  const page = await ctx.newPage();
  page.on('console', m => console.log(`[${mode}] console: ${m.text().slice(0, 160)}`));
  page.on('pageerror', e => console.log(`[${mode}] pageerror: ${e.message.slice(0, 200)}`));
  page.on('requestfailed', r => console.log(`[${mode}] REQUEST FAILED: ${r.url()} -> ${r.failure() && r.failure().errorText}`));
  page.on('crash', () => console.log(`[${mode}] PAGE CRASHED`));
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 90; i++) {
    const s = await page.evaluate(() => { const bl = document.getElementById('beforeLoad'); const lw = document.getElementById('loadingWebassembly'); return bl && bl.style.display !== 'none' ? 'PROMPT' : (lw ? lw.innerText : 'past'); }).catch(e => 'evalerr:' + e.message.slice(0, 80));
    if (i % 10 === 0 || s === 'PROMPT') console.log(`[${mode}] t=${i}s state=${s}`);
    if (s === 'PROMPT') break; await sleep(1000);
  }
  await ctx.close();
}
(async () => { await run('ephemeral'); await run('persistent'); })();
