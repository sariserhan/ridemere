// A simulated play-through of First Park, used to tune it and to keep it tuned.
//
//   node firstpark.js [minutes] [--quiet]
//
// This is the playtest the scenario's numbers come from: starting cash, what the
// opening build actually costs, whether the park can become profitable, how long the
// objective takes, and whether the litter loop closes. It plays the scenario the way
// the onboarding asks a player to, in the same order, and prints a timeline.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const money = v => `$${(v / 10).toFixed(2)}`;

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const minutes = Number(process.argv[2] || 12);
  const port = 8991;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const b = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const timeline = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto(`http://localhost:${port}/?park=first-park.park`, { waitUntil: 'domcontentloaded' });
    await p.mouse.move(640, 400);
    await p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(8000); await p.mouse.move(640, 400);

    const call = (n, r, t, a) => p.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const stats = async () => JSON.parse(await call('SunriseParkMetadataJson', 'string', [], []));
    const rides = async () => JSON.parse(await call('SunriseRideListJson', 'string', [], []));
    const alerts = async () => JSON.parse(await call('SunriseGuestAlertsJson', 'string', [], []));
    const litter = async () => JSON.parse(await call('SunriseLitterCountJson', 'string', [], [])).litter;
    const staff = async () => JSON.parse(await call('SunriseStaffListJson', 'string', [], []));
    const run = async (seconds) => {
      for (let i = 0; i < Math.ceil(seconds / 3); i++) {
        await p.mouse.move(640, 400);
        await sleep(3000);
        const state = JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
        if (state.rideBroken && state.mechanics === 0) {
          const hired = await call('SunriseHireMechanic', 'number', [], []);
          console.log(`breakdown lesson: hire mechanic=${hired}`);
          if (hired !== 1) throw new Error('First Park could not hire its mechanic');
        }
      }
    };
    const note = async (label) => {
      const s = await stats();
      const row = {
        at: label, ticks: s.ticks, guests: s.guestCount, rating: s.parkRating, cash: s.cash,
        litter: await litter(),
        alerts: (await alerts()).map(a => `${a.kind}/${a.severity}`),
      };
      timeline.push(row);
      console.log(`${label.padEnd(26)} t=${String(row.ticks).padStart(6)} guests=${String(row.guests).padStart(4)} ` +
        `rating=${String(row.rating).padStart(3)} cash=${money(row.cash).padStart(11)} litter=${String(row.litter).padStart(3)} ` +
        `${row.alerts.join(' ')}`);
      return row;
    };

    const opening = await note('on load');
    const closed = await rides();
    console.log(`coaster ships ${closed[0].status === 1 ? 'OPEN' : 'closed'} at ${money(closed[0].price)}`);

    // Step 2 of the onboarding: open the coaster.
    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    await run(60);
    await note('coaster open, 1 min');

    // Step 5: the needs. A player builds the three stalls the park asks for. These are
    // the tiles the onboarding suggests, beside the plaza.
    const build = async (object, x, y, direction, price) => {
      const result = JSON.parse(await call(
        'SunrisePlaceShop', 'string', ['string', 'number', 'number', 'number', 'number'],
        [object, x, y, direction, price]));
      console.log(`build ${object.padEnd(34)} ${result.ok ? `cost ${money(result.cost)}` : `FAILED ${result.error}`}`);
      return result.ok ? result.cost : 0;
    };
    let openingCost = 0;
    openingCost += await build('sunrise.ride.grill_stand', 13, 12, 2, 8);
    openingCost += await build('sunrise.ride.refreshment_stand', 13, 16, 2, 6);
    openingCost += await build('sunrise.ride.restroom', 19, 12, 0, 0);
    console.log(`opening build total ${money(openingCost)} of ${money(opening.cash)} starting cash`);

    await run(120);
    await note('stalls open, 3 min');

    // Step 7: litter. Let it accumulate, then hire the handyman the alert asks for.
    for (let i = 0; i < Math.max(0, minutes - 6); i++) {
      await run(60);
      await note(`minute ${3 + i + 1}`);
    }

    const beforeStaff = await note('before handyman');
    console.log('hire handyman:', await call('SunriseHireHandyman', 'number', [], []));
    await run(180);
    const afterStaff = await note('3 min after handyman');
    const crew = await staff();
    console.log('staff:', JSON.stringify(crew.map(s => ({ state: s.state, orders: s.orders, swept: s.litterSwept, bins: s.binsEmptied }))));

    const sold = await rides();
    console.log('rides:', JSON.stringify(sold.map(r => ({ type: r.rideType, cust: r.totalCustomers, profit: r.totalProfit, price: r.price }))));
    console.log(`litter before handyman ${beforeStaff.litter}, after ${afterStaff.litter}`);
    await p.screenshot({ path: path.join(__dirname, 'results-visual', 'first-park-operating.png') });
  } finally { try { process.kill(-server.pid); } catch {} await b.close(); }
})();
