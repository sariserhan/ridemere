// A shipped starting reliability has to hold, and then age when the player opens the
// ride.
//
//   node reliabilitylever.js [minutes]
//
// scenariosettings.js proves the value is in the park file and comes back out of it at
// load. That is not the same as it surviving the park being played, and it did not: the
// value was read correctly at load and was 100% a couple of game-minutes later, because
// `FinancePayRideUpkeep` calls `ride.renew()` on every ride that has never been opened
// once per fortnight tick. A scenario that ships its coaster closed never sets
// `RideFlag::everBeenOpened`, so the engine kept handing the player a brand-new ride.
//
// The builder now opens the ride once and closes it again so the flag is set. This is
// what proves that worked, and it is deliberately the slow way round — watching real
// ticks pass — because the bug was invisible to anything that read the value once.
//
// Four claims:
//
//   held      the reliability the scenario asked for is still there after the park has
//             run long enough for upkeep to have been paid at least once. This is the
//             regression for the renewal bug.
//   aged      once the ride is open it loses reliability at the rate the engine defines:
//             `unreliabilityFactor` per 256 ticks. The factor is derived by
//             SetUnreliabilityFactor from the ride type and its design, so it is read
//             from the ride rather than assumed.
//   waited    a ride the scenario ships closed does not age at all, so the breakdown
//             clock starts when the player opens the coaster rather than while they are
//             still reading the tutorial. First Park's onboarding leans on this.
//   clean     opening the ride once during generation left no player-visible history:
//             the flag is set and the ride is closed, but nothing rode it, nobody paid
//             for it, and no breakdown is pending. "Open once to initialise" is a trick,
//             and a trick has to be checked for what else it did.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TICKS_PER_MINUTE = 40 * 60;
const TICKS_PER_WINDOW = 256;
//: One percentage point of reliability is 256 raw units: kRideInitialReliability is
//: (100 << 8) | 0xFF and the upper byte is the percentage.
const UNITS_PER_POINT = 256;

//: A fortnight tick is what renews a never-opened ride. Long enough that upkeep has
//: certainly been paid, so "held" is a real observation rather than a race won.
const CLOSED_MINUTES = 6;

//: reliabilityPercentage is a whole number, so a short run measures few points. The
//: tolerance is the looser of a relative band and the resolution of the reading.
const RELATIVE_TOLERANCE = 0.25;
const ABSOLUTE_TOLERANCE = 1.5;

//: RideStatus (Ride.h)
const CLOSED = 0, OPEN = 1;

const PARK = 'DevScenarios/tuning-r60.park';
const ASKED_FOR = 60;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const minutes = Number(process.argv[2] || 10);
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8975;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });

  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(PARK)}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 300000 });
    await sleep(9000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
    const stats = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));
    const run = async (gameMinutes) => {
      const from = (await stats()).ticks;
      while (true) {
        await page.mouse.move(640, 400); await sleep(2000);
        const now = await stats();
        if (now.ticks - from >= gameMinutes * TICKS_PER_MINUTE) return now.ticks - from;
      }
    };

    const atLoad = await ride();
    check('the scenario loads at the reliability it asked for',
      atLoad.reliabilityPercentage === ASKED_FOR,
      `asked for ${ASKED_FOR}%, loaded with ${atLoad.reliabilityPercentage}%`);

    // ---- clean: what opening the ride once during generation left behind ------------
    // The whole point of the open-then-close is the flag; everything else it might have
    // touched is a side effect nobody asked for.
    check('the ride has been opened, which is what stops upkeep renewing it',
      atLoad.everBeenOpened === true, `everBeenOpened=${atLoad.everBeenOpened}`);
    check('the ride is closed, the way the scenario ships it',
      atLoad.status === CLOSED, `status=${atLoad.status}`);
    check('nobody rode it during generation', atLoad.totalCustomers === 0,
      `totalCustomers=${atLoad.totalCustomers}`);
    check('it earned nothing during generation', Number(atLoad.totalProfit) === 0,
      `totalProfit=${atLoad.totalProfit}`);
    check('no train was carrying anyone', atLoad.numRiders === 0,
      `numRiders=${atLoad.numRiders}`);
    check('no queue was left on it', atLoad.curNumCustomers === 0,
      `curNumCustomers=${atLoad.curNumCustomers}`);
    check('no breakdown is pending from the generation open',
      atLoad.brokenDown === false && atLoad.breakdownPending === false,
      `brokenDown=${atLoad.brokenDown} breakdownPending=${atLoad.breakdownPending}`);
    check('the ride has a mechanic access point, so the circuit is still valid',
      atLoad.access !== null && atLoad.access !== undefined
      && Number.isInteger(atLoad.access.x),
      JSON.stringify(atLoad.access));

    // ---- held, and waited: the ride is still closed --------------------------------
    await run(CLOSED_MINUTES);
    const afterClosed = await ride();
    check(`the reliability holds through ${CLOSED_MINUTES} minutes of upkeep`,
      afterClosed.reliabilityPercentage === ASKED_FOR,
      `${atLoad.reliabilityPercentage}% -> ${afterClosed.reliabilityPercentage}%`
      + (afterClosed.reliabilityPercentage === 100
        ? ' — the engine renewed the ride, so everBeenOpened was never set' : ''));
    check('a ride the scenario ships closed does not age while closed',
      afterClosed.reliabilityPercentage === atLoad.reliabilityPercentage,
      `${atLoad.reliabilityPercentage}% -> ${afterClosed.reliabilityPercentage}%`);

    // ---- aged: open it, the way the player would -----------------------------------
    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    const opened = await ride();
    // Opening successfully after the generation-time open and close is the proof that
    // the circuit is intact: RideSetStatusAction refuses a ride whose track is not.
    check('the ride still opens after being opened and closed during generation',
      opened.status === OPEN, `status=${opened.status}`);
    let operatingTicks = 0;
    let last = (await stats()).ticks;
    const target = last + minutes * TICKS_PER_MINUTE;
    while (true) {
      await page.mouse.move(640, 400); await sleep(2000);
      const now = await stats();
      const state = await ride();
      // The conditions RideBreakdownUpdate returns early on: a broken or
      // pending-breakdown ride does not age, and at 60% one is plausible here.
      if (!state.brokenDown && !state.breakdownPending) operatingTicks += now.ticks - last;
      last = now.ticks;
      if (now.ticks >= target) break;
    }
    const aged = await ride();

    // The factor is whatever SetUnreliabilityFactor derived for this design, read from
    // the ride: asserting against a number written here would just restate the source.
    const factor = aged.unreliabilityFactor;
    const windows = operatingTicks / TICKS_PER_WINDOW;
    const predicted = factor * windows / UNITS_PER_POINT;
    const lost = opened.reliabilityPercentage - aged.reliabilityPercentage;
    const tolerance = Math.max(ABSOLUTE_TOLERANCE, predicted * RELATIVE_TOLERANCE);
    console.log(`  factor ${factor}, ${windows.toFixed(1)} operating windows:`
      + ` lost ${lost} points, engine arithmetic predicts ${predicted.toFixed(1)}`);

    check('the ride reports a derived unreliability factor', factor > 0, `factor=${factor}`);
    check('an open ride ages at the rate the engine defines',
      Math.abs(lost - predicted) <= tolerance,
      `lost ${lost}, predicted ${predicted.toFixed(1)}, tolerance ${tolerance.toFixed(1)}`);
    check('opening the ride is what starts the decay', lost > 0,
      `lost ${lost} points over ${windows.toFixed(1)} windows of operation`);
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  console.log(failures === 0 ? 'RELIABILITY LEVER OK' : `RELIABILITY LEVER FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
