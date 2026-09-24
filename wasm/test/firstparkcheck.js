// First Park, asserted end to end.
//
//   node firstparkcheck.js
//
// This is the scenario's acceptance test: it opens the park the way a player does,
// checks the things a player would notice and a screenshot would not, and plays the
// loops the onboarding teaches — ride, needs, litter, maintenance — through the
// engine's own simulation.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

/**
 * Where a tile lands on screen, at rotation 0.
 *
 * The same projection the engine uses (Translate3DTo2DWithZ): screen x is the
 * difference of the world coordinates and screen y is their mean, less the height.
 * Repeating it here is what lets the test assert what is on screen without looking
 * at a picture, which is the only way to assert a camera position precisely.
 */
const project = (tileX, tileY, z = 16) => {
  const x = tileX * 32 + 16;
  const y = tileY * 32 + 16;
  return { x: y - x, y: (x + y) / 2 - z };
};

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8990;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const b = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto(`http://localhost:${port}/?park=first-park.park`, { waitUntil: 'domcontentloaded' });
    await p.mouse.move(640, 400);
    await p.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(8000); await p.mouse.move(640, 400);

    const call = (n, r, t, a) => p.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const scenario = async () => JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
    const render = async () => JSON.parse(await call('SunriseRenderInfoJson', 'string', [], []));
    const rides = async () => JSON.parse(await call('SunriseRideListJson', 'string', [], []));
    const alerts = async () => JSON.parse(await call('SunriseGuestAlertsJson', 'string', [], []));
    const staff = async () => JSON.parse(await call('SunriseStaffListJson', 'string', [], []));
    const stats = async () => JSON.parse(await call('SunriseParkMetadataJson', 'string', [], []));
    const run = async (seconds) => {
      for (let i = 0; i < Math.ceil(seconds / 3); i++) { await p.mouse.move(640, 400); await sleep(3000); }
    };

    // --- the engine is drawing at the size of the canvas -----------------------
    //
    // These disagreed for three milestones and no assertion noticed, because every
    // assertion looked at game state and this is not game state.
    const canvas = await p.evaluate(() => {
      const element = document.getElementById('canvas');
      return { width: element.width, height: element.height };
    });
    const info = await render();
    check('the engine draws at the size of the canvas',
      info.width === canvas.width && info.height === canvas.height,
      `engine ${info.width}x${info.height}, canvas ${canvas.width}x${canvas.height}`);
    check('the render scale is one', info.scale === 1, String(info.scale));

    // --- the scenario opens looking at the park -------------------------------
    const landmarks = {
      'the park entrance': project(16, 4),
      'the main path': project(16, 14),
      'the plaza': project(16, 14),
      'the coaster station': project(24, 6),
    };
    for (const [name, point] of Object.entries(landmarks)) {
      const onScreen = point.x >= info.viewX && point.x <= info.viewX + canvas.width
        && point.y >= info.viewY && point.y <= info.viewY + canvas.height;
      check(`${name} is on screen when the scenario opens`, onScreen,
        `at ${point.x},${point.y} in view ${info.viewX}..${info.viewX + canvas.width}, ${info.viewY}..${info.viewY + canvas.height}`);
    }

    // --- the start state ------------------------------------------------------
    const opening = await scenario();
    const startRides = await rides();
    check('the coaster is built and closed', startRides.length === 1 && startRides[0].status !== 1);
    check('the coaster has a ticket price', startRides[0].price > 0, `$${(startRides[0].price / 10).toFixed(2)}`);
    check('the park starts with benches', opening.benches >= 4, String(opening.benches));
    check('the park starts with bins', opening.bins >= 3, String(opening.bins));
    check('the park starts with no staff', opening.handymen === 0);
    check('the objective is a guest target', opening.objectiveGuests > 0, String(opening.objectiveGuests));
    check('the objective also requires a park rating', opening.objectiveRating > 0, String(opening.objectiveRating));
    check('money is on', opening.cash > 0, `$${(opening.cash / 10).toFixed(2)}`);

    // --- the five-minute rule -------------------------------------------------
    //
    // Opening the coaster is the first thing the onboarding asks for. From that
    // moment a new player should be watching people ride it, not waiting.
    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    const openedAt = (await stats()).ticks;
    let ridingAt = null;
    for (let i = 0; i < 40 && ridingAt === null; i++) {
      await run(9);
      const current = await rides();
      if (current[0].totalCustomers > 0) ridingAt = (await stats()).ticks;
    }
    const ticksToRide = ridingAt === null ? Infinity : ridingAt - openedAt;
    check('guests ride the coaster within five minutes of opening it',
      ticksToRide < 5 * 60 * 40, `${ticksToRide} ticks, about ${(ticksToRide / 40).toFixed(0)} seconds of play`);

    // --- the needs loops ------------------------------------------------------
    //
    // The stalls are built the way the onboarding asks, through the ordinary game
    // actions, and paid for out of the park's cash.
    const build = async (object, x, y, direction, price) =>
      JSON.parse(await call('SunrisePlaceShop', 'string',
        ['string', 'number', 'number', 'number', 'number'], [object, x, y, direction, price]));
    const beforeBuild = (await scenario()).cash;
    const built = [
      await build('sunrise.ride.grill_stand', 13, 12, 2, 8),
      await build('sunrise.ride.refreshment_stand', 13, 16, 2, 6),
      await build('sunrise.ride.restroom', 19, 12, 0, 0),
    ];
    check('the opening build succeeds', built.every(r => r.ok && r.opened),
      built.map(r => r.ok ? `$${(r.cost / 10).toFixed(2)}` : r.error).join(', '));
    const spent = built.reduce((total, r) => total + (r.cost || 0), 0);
    check('the player can afford the opening build', spent < beforeBuild,
      `$${(spent / 10).toFixed(2)} of $${(beforeBuild / 10).toFixed(2)}`);

    const afterBuild = await scenario();
    check('the park now has food, drink and a restroom',
      afterBuild.hasFood && afterBuild.hasDrink && afterBuild.hasToilet);

    // Move the needs forward. The engine's own thresholds: a guest buys food below
    // hunger 75 and complains below 10, buys a drink below thirst 75 and complains
    // below 25, and wants a restroom above toilet 160.
    await call('SunriseSetGuestNeeds', 'number', ['number', 'number', 'number'], [8, 12, 210]);
    await run(180);

    const sold = await rides();
    const byType = Object.fromEntries(sold.map(r => [r.rideType, r]));
    console.log('rides:', JSON.stringify(sold.map(r => `${r.rideType}:${r.totalCustomers}@${r.price}`)));
    check('the food loop works in the scenario', (byType[28]?.totalCustomers ?? 0) > 0, String(byType[28]?.totalCustomers));
    check('the drink loop works in the scenario', (byType[30]?.totalCustomers ?? 0) > 0, String(byType[30]?.totalCustomers));
    check('the restroom loop works in the scenario', (byType[36]?.totalCustomers ?? 0) > 0, String(byType[36]?.totalCustomers));
    check('the stalls that charge take more than their stock cost',
      [28, 30].every(type => (byType[type]?.totalProfit ?? 0) > 0),
      [28, 30].map(t => `${t}:${byType[t]?.totalProfit}`).join(' '));

    // --- the litter loop ------------------------------------------------------
    //
    // Nothing here injects litter or the alert. Guests buy food, finish it, and drop
    // what is left where there is no bin.
    //
    // Guests are kept hungry through this phase. Litter comes from finished food, so
    // the rate of litter is the rate of eating, and at the engine's own pace a park
    // takes twenty minutes to get dirty enough to complain. Nothing about the litter,
    // the complaining or the alert is faked: only how often the guests get hungry.
    let litterPeak = 0;
    let litterAlert = null;
    for (let i = 0; i < 16; i++) {
      await call('SunriseSetGuestNeeds', 'number', ['number', 'number', 'number'], [8, 12, -1]);
      await run(30);
      const now = await scenario();
      litterPeak = Math.max(litterPeak, now.litter);
      const found = (await alerts()).find(a => a.kind === 'LITTER_BUILD_UP');
      if (found && litterAlert === null) litterAlert = found;
      if (litterAlert && litterPeak > 25) break;
    }
    check('normal play produces litter', litterPeak > 0, `${litterPeak} pieces at its worst`);
    check('the litter alert raises on its own', litterAlert !== null,
      litterAlert ? `${litterAlert.severity}: ${litterAlert.title}` : 'never raised');
    if (litterAlert) {
      check('the litter alert says what to do about it', /handyman|bin/i.test(litterAlert.advice), litterAlert.advice);
    }

    const beforeStaff = await scenario();
    check('hiring a handyman works', await call('SunriseHireHandyman', 'number', [], []) === 1);
    await run(240);
    const crew = await staff();
    console.log('staff:', JSON.stringify(crew.map(s => ({ state: s.state, orders: s.orders, swept: s.litterSwept, bins: s.binsEmptied }))));
    check('the handyman is hired with cleaning duties', crew.length === 1 && (crew[0].orders & 1) !== 0,
      `orders ${crew[0]?.orders}`);
    check('the handyman actually sweeps litter', crew.some(s => s.litterSwept > 0),
      `${crew[0]?.litterSwept} pieces swept`);

    const afterStaff = await scenario();
    check('the litter on the ground falls once a handyman is working',
      afterStaff.litter < beforeStaff.litter,
      `${beforeStaff.litter} before, ${afterStaff.litter} after`);

    await p.screenshot({ path: path.join(__dirname, 'results-visual', 'first-park-maintenance.png') });

    // --- save and resume ------------------------------------------------------
    const beforeSave = await scenario();
    check('the park saves', await call('SunriseSavePark', 'number', ['string'], ['/persistent/firstpark.park']) === 1);
    check('the park reloads', await call('SunriseLoadPark', 'number', ['string'], ['/persistent/firstpark.park']) === 1);
    await run(12);
    const resumed = await scenario();
    check('the rides survive the round trip', (await rides()).length === beforeSave.shopsOpen + 1);
    check('the benches and bins survive the round trip',
      resumed.benches === beforeSave.benches && resumed.bins === beforeSave.bins,
      `${resumed.benches} benches, ${resumed.bins} bins`);
    check('the staff survive the round trip', resumed.handymen === beforeSave.handymen);
    check('the money survives the round trip', Math.abs(resumed.cash - beforeSave.cash) < 2000,
      `$${(beforeSave.cash / 10).toFixed(2)} then $${(resumed.cash / 10).toFixed(2)}`);
    check('the onboarding can tell where the park is from the park alone',
      resumed.rideOpen && resumed.hasFood && resumed.hasDrink && resumed.hasToilet && resumed.handymen >= 1,
      'every step recomputes as complete');
    check('the camera is still on the park after reloading',
      (await render()).viewX > -4000 && (await render()).viewX < 4000);

    console.log(failures === 0 ? 'FIRST PARK OK' : `FIRST PARK FAILED (${failures})`);
  } finally {
    try { process.kill(-server.pid); } catch {}
    await b.close();
  }
  process.exit(failures === 0 ? 0 : 1);
})();
