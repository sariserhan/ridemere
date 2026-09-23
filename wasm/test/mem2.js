// Per-process committed-memory breakdown (from /proc/<pid>/smaps_rollup) of Chrome at the launcher prompt.
const { chromium } = require('playwright'); const { execSync } = require('child_process'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function snapshot() {
  const pids = execSync("pgrep -f 'chrome-linux64/chrom[e]'").toString().trim().split('\n').filter(Boolean);
  const rows = [];
  for (const pid of pids) { try {
    const s = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'); const g = k => +(s.match(new RegExp(k + ':\\s+(\\d+) kB')) || [0, 0])[1];
    const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8'); const type = (cmd.match(/--type=([a-z-]+)/) || [0, 'browser'])[1];
    rows.push({ pid, type, rssMB: g('Rss') / 1024, pssMB: g('Pss') / 1024, privDirtyMB: g('Private_Dirty') / 1024, sharedMB: (g('Shared_Clean') + g('Shared_Dirty')) / 1024, anonMB: g('Anonymous') / 1024 });
  } catch {} }
  return rows;
}
const sum = (rows, k) => Math.round(rows.reduce((a, r) => a + r[k], 0));
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto('about:blank'); await sleep(1500); const idle = snapshot();
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => { const b = document.getElementById('beforeLoad'); return b && b.style.display !== 'none'; }, null, { timeout: 120000 });
  await sleep(3000); const prompt = snapshot();
  const renderer = prompt.filter(r => r.type === 'renderer').sort((a, b) => b.rssMB - a.rssMB)[0];
  console.log(JSON.stringify({ idle: { rss: sum(idle, 'rssMB'), pss: sum(idle, 'pssMB'), privDirty: sum(idle, 'privDirtyMB') },
    prompt: { rss: sum(prompt, 'rssMB'), pss: sum(prompt, 'pssMB'), privDirty: sum(prompt, 'privDirtyMB'), processes: prompt.length },
    gameRenderer: renderer && Object.fromEntries(Object.entries(renderer).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v])),
    perType: Object.entries(prompt.reduce((m, r) => { (m[r.type] ||= { n: 0, rss: 0, priv: 0 }); m[r.type].n++; m[r.type].rss += r.rssMB; m[r.type].priv += r.privDirtyMB; return m; }, {})).map(([t, v]) => `${t}: n=${v.n} rss=${Math.round(v.rss)} priv=${Math.round(v.priv)}`) }, null, 1));
  await browser.close();
})();
