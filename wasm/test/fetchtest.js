const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await b.newPage();
  page.on('console', m => console.log('console:', m.text()));
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });
  for (const f of ['openrct2.zip', 'assets.zip']) {
    const r = await page.evaluate(async (f) => {
      const t = performance.now();
      try { const r = await fetch(f); const b = await r.blob(); return { f, ok: r.ok, bytes: b.size, ms: Math.round(performance.now() - t) }; }
      catch (e) { return { f, error: String(e), ms: Math.round(performance.now() - t) }; }
    }, f);
    console.log(JSON.stringify(r));
  }
  await b.close();
})();
