// A mechanic, and a broken ride, across a save and a reload.
//
//   node mechanicsave.js
//
// Two saves, because they prove different things:
//
//   normal      a mechanic employed and the ride working. The mechanic has to come
//               back with its duties intact, not just as an entity — orders are a
//               bitmask and a mechanic that reloads with zero is never dispatched
//               again, which looks like nothing at all until a ride breaks.
//   broken      saved mid-breakdown. The breakdown is ride state and has to survive,
//               and the alert has to come back *derived from that state*.
//
// Nothing serialises an alert. `SunriseLoadPark` calls `ResetGuestAlerts` before it
// loads, so the alert list is empty at the moment the park arrives; if
// RIDE_BROKEN_DOWN appears afterwards it can only have come from the next scan
// reading the ride.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BRAKES_FAILURE = 6;
const MECHANIC = 1;   // StaffType::mechanic

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8975;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/breakdown-test.park')}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
    await sleep(9000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
    const stats = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));
    const alerts = async () => JSON.parse(await call('SunriseGuestAlertsJson', 'string', [], []));
    const mechanics = async () => {
      const ids = JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
        .filter(p => p.kind === 'staff').map(p => p.id);
      const out = [];
      for (const id of ids) out.push(JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [id])));
      return out.filter(s => s.staffType === MECHANIC);
    };
    const run = async (seconds) => {
      for (let i = 0; i < seconds / 2; i++) { await page.mouse.move(640, 400); await sleep(2000); }
    };

    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    await call('SunriseGenerateGuests', 'number', ['number'], [40]);
    await call('SunriseHireMechanic', 'number', [], []);
    await run(20);

    // ---- a working park with a mechanic in it --------------------------------------
    const beforeCrew = await mechanics();
    check('a mechanic is employed before the save', beforeCrew.length === 1);
    check('the park saves', await call('SunriseSavePark', 'number', ['string'], ['/persistent/mech-ok.park']) === 1);
    check('the park reloads', await call('SunriseLoadPark', 'number', ['string'], ['/persistent/mech-ok.park']) === 1);
    await run(10);

    const afterCrew = await mechanics();
    check('the mechanic survives the round trip', afterCrew.length === 1, `${afterCrew.length} mechanic(s)`);
    check('the mechanic keeps its duties', afterCrew.length === 1 && (afterCrew[0].orders & 0b11) === 0b11,
      afterCrew.length ? `orders=0b${afterCrew[0].orders.toString(2)}` : 'none');
    check('the mechanic is in a working state after the reload',
      afterCrew.length === 1 && [5, 10, 15, 16, 22, 23].includes(afterCrew[0].state),
      afterCrew.length ? `state=${afterCrew[0].state}` : 'none');
    const resumed = await stats();
    await run(10);
    check('the simulation resumes', (await stats()).ticks > resumed.ticks);

    // ---- saved while genuinely broken ----------------------------------------------
    await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, BRAKES_FAILURE]);
    let broke = false;
    for (let i = 0; i < 30 && !broke; i++) { await run(2); broke = (await ride()).brokenDown; }
    check('the ride is genuinely broken before this save', broke);
    const brokenBefore = await ride();
    // The alert layer scans on an interval, so wait for it rather than assuming it has
    // already run.
    let alertBefore;
    for (let i = 0; i < 15 && !alertBefore; i++) {
      await run(2);
      alertBefore = (await alerts()).find(a => a.kind === 'RIDE_BROKEN_DOWN');
    }
    check('the alert is up before the save', alertBefore !== undefined, alertBefore?.title);

    check('the broken park saves',
      await call('SunriseSavePark', 'number', ['string'], ['/persistent/mech-broken.park']) === 1);
    check('the broken park reloads',
      await call('SunriseLoadPark', 'number', ['string'], ['/persistent/mech-broken.park']) === 1);

    // "Nothing is carried across the load" cannot be shown by looking for an empty
    // alert list: the engine keeps running between the load returning and the next
    // call, and a scan can raise the alert in that gap — it did, four ticks after the
    // load. What can be shown is that this is a *new* raise. `raisedAtTick` is stamped
    // when an alert goes from inactive to active, and loading restores the tick
    // counter to the saved value, so an alert restored with the park would still carry
    // the tick it was first raised at before the save.
    const tickAtLoad = (await stats()).ticks;
    const brokenAfter = await ride();
    check('the breakdown survives the round trip',
      brokenAfter.brokenDown === true && brokenAfter.breakdownReason === brokenBefore.breakdownReason,
      `brokenDown=${brokenAfter.brokenDown} reason=${brokenAfter.breakdownReason}`);

    await run(20);
    const rederived = (await alerts()).find(a => a.kind === 'RIDE_BROKEN_DOWN');
    check('RIDE_BROKEN_DOWN re-derives from the ride after loading', rederived !== undefined,
      rederived ? `${rederived.severity}: ${rederived.title}` : 'never appeared');
    check('the re-derived alert is still IMPORTANT and names the ride',
      rederived !== undefined && rederived.severity === 'IMPORTANT' && /Hybrid Coaster/.test(rederived.title),
      rederived ? `${rederived.severity}: ${rederived.title}` : '');
    check('the alert was raised again after the load, not restored with the park',
      rederived !== undefined && alertBefore !== undefined
        && rederived.raisedAtTick > alertBefore.raisedAtTick,
      rederived ? `first raised at ${alertBefore?.raisedAtTick} before the save,`
        + ` raised again at ${rederived.raisedAtTick} after loading at tick ${tickAtLoad}` : '');

    // And it can still be fixed after a reload.
    const crewAfterLoad = await mechanics();
    check('the mechanic is still employed in the reloaded broken park', crewAfterLoad.length === 1);
    let fixed = false;
    for (let i = 0; i < 60 && !fixed; i++) {
      await run(2);
      const state = await ride();
      fixed = !state.brokenDown && !state.breakdownPending;
    }
    check('the reloaded park can still be repaired', fixed);
    await run(20);
    check('the alert clears after the repair',
      (await alerts()).find(a => a.kind === 'RIDE_BROKEN_DOWN') === undefined);
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'MECHANIC SAVE OK' : `MECHANIC SAVE FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
