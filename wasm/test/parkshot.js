// A capture of a named park for review and for visual regression.
//
//   node parkshot.js <park file> <output name> [seconds] [--open] [--guests N]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const park = process.argv[2] || 'first-park.park';
  const name = process.argv[3] || 'park';
  const seconds = Number(process.argv[4] || 20);
  const openRides = process.argv.includes('--open');
  const guestsArg = process.argv.indexOf('--guests');
  const guests = guestsArg > 0 ? Number(process.argv[guestsArg + 1]) : 0;
  const port = 8992;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const b = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto(`http://localhost:${port}/?park=${encodeURIComponent(park)}`, { waitUntil: 'domcontentloaded' });
    await p.mouse.move(640, 400);
    await p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(8000); await p.mouse.move(640, 400);
    const call = (n, r, t, a) => p.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    if (openRides) {
      const rides = JSON.parse(await call('SunriseRideListJson', 'string', [], []));
      for (const ride of rides) await call('SunriseSetRideStatus', 'number', ['number', 'number'], [ride.id, 1]);
    }
    if (guests > 0) await call('SunriseGenerateGuests', 'number', ['number'], [guests]);
    for (let i = 0; i < Math.ceil(seconds / 3); i++) { await p.mouse.move(640, 400); await sleep(3000); }
    console.log('render:', await call('SunriseRenderInfoJson', 'string', [], []));
    console.log('stats:', await call('SunriseParkMetadataJson', 'string', [], []));
    console.log('rides:', await call('SunriseRideListJson', 'string', [], []));
    await p.screenshot({ path: path.join(__dirname, 'results-visual', `${name}.png`) });
    console.log('captured', name);
  } finally { try { process.kill(-server.pid); } catch {} await b.close(); }
})();
