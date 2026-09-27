// Observe natural First Park breakdowns at each starting reliability.
//
//   node breakdowntuning.js [minutes] [parks...]
//
// Measurement, not a test. The question First Park has to answer is narrow: one
// breakdown a beginner can understand, late enough that they have opened the coaster
// and met the guest needs first, early enough that they meet the mechanic at all
// during a normal run.
//
// No mechanic is hired in this probe, so it measures the first failure and the cost
// of ignoring it. Inspection intervals have no effect without employed mechanics.
// Use breakdownseeds.js for paired comparisons rather than choosing from one draw.
//
// Nothing here triggers a breakdown. These are the engine's own random ones.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TICKS_PER_MINUTE = 40 * 60;

(async () => {
  const minutes = Number(process.argv[2] || 25);
  const parks = process.argv.slice(3);
  const candidates = parks.length ? parks : [
    'DevScenarios/tuning-r100.park',
    'DevScenarios/tuning-r80.park',
    'DevScenarios/tuning-r60.park',
  ];

  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8977;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const results = [];
  const runOne = async (park) => {
    {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
      await sleep(9000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const stats = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));
      const scenario = async () => JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));

      // Played the way the onboarding asks: open the coaster, build the three stalls,
      // hire a handyman. No mechanic — that is what is being measured.
      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
      for (const [shop, x, y, dir, price] of [
        ['sunrise.ride.grill_stand', 13, 12, 2, 8],
        ['sunrise.ride.refreshment_stand', 13, 16, 2, 6],
        ['sunrise.ride.restroom', 19, 12, 0, 0]]) {
        const placed = JSON.parse(await call('SunrisePlaceShop', 'string', ['string', 'number', 'number', 'number', 'number'],
          [shop, x, y, dir, price]));
        if (!placed.ok) throw new Error(`Could not build ${shop}: ${JSON.stringify(placed)}`);
      }
      await call('SunriseHireHandyman', 'number', [], []);

      const start = (await stats()).ticks;
      const target = start + minutes * TICKS_PER_MINUTE;
      let firstBreakdownTick = null;
      let breakdowns = 0;
      let inspections = 0;
      let brokenTicks = 0;
      let wasBroken = false;
      let lastInspection = (await ride()).lastInspection;
      let lastTick = start;

      while (true) {
        await page.mouse.move(640, 400); await sleep(2000);
        const now = await stats();
        const state = await ride();
        if (state.brokenDown && !wasBroken) {
          breakdowns++;
          if (firstBreakdownTick === null) firstBreakdownTick = now.ticks - start;
        }
        if (state.brokenDown) brokenTicks += now.ticks - lastTick;
        wasBroken = state.brokenDown;
        // lastInspection counts up and resets when one happens.
        if (state.lastInspection < lastInspection) inspections++;
        lastInspection = state.lastInspection;
        lastTick = now.ticks;
        if (now.ticks >= target) break;
      }

      const end = await scenario();
      const final = await stats();
      const row = {
        park: park.replace('DevScenarios/tuning-', '').replace('.park', ''),
        minutes: Math.round((final.ticks - start) / TICKS_PER_MINUTE),
        firstBreakdownMin: firstBreakdownTick === null ? null
          : Math.round(firstBreakdownTick / TICKS_PER_MINUTE * 10) / 10,
        breakdowns, inspections,
        downtimeMin: Math.round(brokenTicks / TICKS_PER_MINUTE * 10) / 10,
        guests: end.guests, rating: end.rating,
        reliability: (await ride()).reliabilityPercentage,
      };
      results.push(row);
      console.log(JSON.stringify(row));
      await page.close();
    }
  };
  try {
    await Promise.all(candidates.map(runOne));
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  console.log('\n reliability first breakdown   breakdowns  inspections  downtime  guests  rating');
  for (const r of results) {
    console.log(` ${r.park.padEnd(10)} ${String(r.firstBreakdownMin ?? 'none').padStart(13)} min`
      + ` ${String(r.breakdowns).padStart(11)} ${String(r.inspections).padStart(12)}`
      + ` ${String(r.downtimeMin).padStart(9)} ${String(r.guests).padStart(7)} ${String(r.rating).padStart(7)}`);
  }
})();
