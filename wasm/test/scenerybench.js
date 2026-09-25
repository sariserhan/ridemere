// What scenery costs, and at what point a park stops being readable.
//
//   node scenerybench.js
//
// Three parks and three resolutions. The simulation tick rate is the number that must
// not move: scenery is drawn, not simulated, so a park with a thousand trees in it
// should tick exactly as fast as one with none. Frame rate may move, and this is where
// it would show.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PARKS = [
  { name: 'First Park, as it ships', park: 'first-park.park', guests: 0 },
  { name: 'First Park, undecorated', park: 'DevScenarios/first-park-bare.park', guests: 0 },
  { name: 'First Park, 250 guests', park: 'first-park.park', guests: 250 },
  { name: 'art scene, every object', park: 'DevScenarios/world-art-test.park', guests: 0 },
  { name: 'density scene, 1,070 objects', park: 'DevScenarios/scenery-density-test.park', guests: 0 },
];
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8988;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const rows = [];
  try {
    for (const entry of PARKS) {
      for (const size of SIZES) {
        const context = await browser.newContext({ viewport: size });
        const page = await context.newPage();
        await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(entry.park)}`, { waitUntil: 'domcontentloaded' });
        const centre = { x: Math.round(size.width / 2), y: Math.round(size.height / 2) };
        await page.mouse.move(centre.x, centre.y);
        await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
        await sleep(8000); await page.mouse.move(centre.x, centre.y);
        const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
        if (entry.guests > 0) {
          await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
          await call('SunriseGenerateGuests', 'number', ['number'], [entry.guests]);
          for (let i = 0; i < 6; i++) { await page.mouse.move(centre.x, centre.y); await sleep(3000); }
        }
        await page.evaluate(() => { window.__f = 0; const t = () => { window.__f++; requestAnimationFrame(t); }; requestAnimationFrame(t); });
        const before = JSON.parse(await call('SunriseParkMetadataJson', 'string', [], []));
        const wall = Date.now();
        for (let i = 0; i < 6; i++) { await page.mouse.move(centre.x, centre.y); await sleep(3000); }
        const after = JSON.parse(await call('SunriseParkMetadataJson', 'string', [], []));
        const frames = await page.evaluate(() => window.__f);
        const seconds = (Date.now() - wall) / 1000;
        const heap = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0));
        rows.push({
          park: entry.name, size: `${size.width}x${size.height}`, guests: after.guestCount,
          fps: +(frames / seconds).toFixed(1),
          ticksPerSecond: +((after.ticks - before.ticks) / seconds).toFixed(1),
          heapMB: +(heap / 1e6).toFixed(1),
        });
        console.log(JSON.stringify(rows[rows.length - 1]));
        await context.close();
      }
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  console.log('\n park                          size        guests   fps   ticks/s  heap MB');
  for (const row of rows) {
    console.log(` ${row.park.padEnd(28)} ${row.size.padEnd(11)} ${String(row.guests).padStart(6)} `
      + `${String(row.fps).padStart(5)} ${String(row.ticksPerSecond).padStart(9)} ${String(row.heapMB).padStart(8)}`);
  }
})();
