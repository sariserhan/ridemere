// Reference captures of the product shell, for review alongside the game.
//
//   node shellshots.js [baseUrl]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const OUT = path.join(__dirname, 'results-visual');
  fs.mkdirSync(OUT, { recursive: true });
  const base = process.argv[2] || 'http://localhost:3100';
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT, 'shell-home.png') });

    await page.goto(`${base}/play?scenario=first-park`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    // Catch the loading screen before it goes away.
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, 'shell-loading.png') });

    await page.waitForSelector('button:has-text("Save & exit")', { timeout: 240000 });
    await page.waitForSelector('text=Autosaved', { timeout: 120000 });

    await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="park-card"] img', { timeout: 60000 }).catch(() => {});
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, 'shell-parks.png') });
    console.log('captured shell-home, shell-loading, shell-parks');
  } finally {
    await browser.close().catch(() => {});
  }
})();
