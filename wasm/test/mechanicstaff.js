// A mechanic already on the payroll, and two of them at once.
//
//   node mechanicstaff.js
//
// Two cases the player will hit and one invariant that matters:
//
//   already hired   the ride breaks and nobody has to do anything. The mechanic is
//                   dispatched, walks, repairs, and the alert never asks for another
//                   one to be hired.
//   two mechanics   both eligible, one breakdown. Exactly one owns the repair at any
//                   moment; the other stays available. Which one wins is the engine's
//                   business — `FindClosestMechanic` picks by Manhattan distance — and
//                   is not asserted.
//
// The invariant is not "mechanic A wins". It is that one and only one mechanic is
// servicing a given breakdown, that neither gets stuck, and that the ride state is not
// corrupted by having two candidates.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BRAKES_FAILURE = 6;
//: PeepState (Peep.h). The states a mechanic is allowed to be in.
const PEEP_STATE = { 5: 'walking', 10: 'patrolling', 15: 'answering', 16: 'fixing',
  22: 'headingToInspection', 23: 'inspecting' };
//: Servicing this breakdown: walking to it or working on it.
const SERVICING = new Set([15, 16]);

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function openPark(browser, port) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/breakdown-test.park')}`, { waitUntil: 'domcontentloaded' });
  await page.mouse.move(640, 400);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
  await sleep(9000); await page.mouse.move(640, 400);
  return page;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8974;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    // ---- already hired -----------------------------------------------------------
    {
      const page = await openPark(browser, port);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const staff = async () => {
        const ids = JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
          .filter(p => p.kind === 'staff').map(p => p.id);
        const out = [];
        for (const id of ids) out.push(JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [id])));
        return out.filter(s => s.staffType === 1);   // StaffType::mechanic
      };

      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
      await call('SunriseGenerateGuests', 'number', ['number'], [40]);
      check('a mechanic can be hired before anything breaks',
        await call('SunriseHireMechanic', 'number', [], []) === 1);
      for (let i = 0; i < 8; i++) { await page.mouse.move(640, 400); await sleep(2500); }

      const idle = await staff();
      check('the mechanic is on the payroll and idle', idle.length === 1 && idle[0].state === 10,
        `${idle.length} mechanic(s), state ${PEEP_STATE[idle[0]?.state] ?? idle[0]?.state}`);

      await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, BRAKES_FAILURE]);

      let dispatched = false;
      let alertWhileBroken = null;
      for (let i = 0; i < 60; i++) {
        await page.mouse.move(640, 400); await sleep(2000);
        const crew = await staff();
        if (crew.some(m => SERVICING.has(m.state))) dispatched = true;
        if (alertWhileBroken === null) {
          const found = JSON.parse(await call('SunriseGuestAlertsJson', 'string', [], []))
            .find(a => a.kind === 'RIDE_BROKEN_DOWN');
          if (found) alertWhileBroken = found;
        }
        const state = await ride();
        if (!state.brokenDown && !state.breakdownPending && dispatched) break;
      }
      check('the existing mechanic is dispatched with no player action', dispatched);
      check('the alert does not ask for another mechanic to be hired',
        alertWhileBroken !== null && !/[Hh]ire a mechanic/.test(alertWhileBroken.advice),
        alertWhileBroken?.advice);
      const fixed = await ride();
      check('the ride recovers', fixed.brokenDown === false && fixed.breakdownPending === false);
      check('only one mechanic was ever needed', (await staff()).length === 1);
      await page.close();
    }

    // ---- two mechanics -------------------------------------------------------------
    {
      const page = await openPark(browser, port);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const staff = async () => {
        const ids = JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
          .filter(p => p.kind === 'staff').map(p => p.id);
        const out = [];
        for (const id of ids) out.push(JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [id])));
        return out.filter(s => s.staffType === 1);
      };

      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
      await call('SunriseGenerateGuests', 'number', ['number'], [40]);
      await call('SunriseHireMechanic', 'number', [], []);
      await call('SunriseHireMechanic', 'number', [], []);
      for (let i = 0; i < 8; i++) { await page.mouse.move(640, 400); await sleep(2500); }

      const crew = await staff();
      check('two mechanics are employed', crew.length === 2, `${crew.length}`);
      check('both have the mechanic duties', crew.every(m => (m.orders & 0b11) === 0b11),
        crew.map(m => `0b${m.orders.toString(2)}`).join(', '));

      await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, BRAKES_FAILURE]);

      let maxServicing = 0;
      let owners = new Set();
      let assignedIds = new Set();
      const trace = [];
      for (let i = 0; i < 70; i++) {
        await page.mouse.move(640, 400); await sleep(1500);
        const state = await ride();
        const both = await staff();
        const servicing = both.filter(m => SERVICING.has(m.state));
        maxServicing = Math.max(maxServicing, servicing.length);
        for (const m of servicing) owners.add(m.id);
        if (state.mechanic >= 0) assignedIds.add(state.mechanic);
        if (servicing.length) {
          trace.push(both.map(m => `${m.id}:${PEEP_STATE[m.state] ?? m.state}/${m.subState}`
            + `@${m.tile} ride=${m.currentRide}`).join('  ') + `  | assigned=${state.mechanic}`);
        }
        if (!state.brokenDown && !state.breakdownPending && owners.size) break;
      }

      console.log('  trace while one of them was servicing:');
      for (const line of trace.slice(0, 6)) console.log(`    ${line}`);
      check('exactly one mechanic services the breakdown at a time', maxServicing === 1,
        `most servicing at once: ${maxServicing}`);
      check('the ride records a single assigned mechanic', assignedIds.size === 1,
        `assigned ids seen: ${[...assignedIds].join(', ')}`);
      check('the mechanic that did the work is the one the ride assigned',
        owners.size === 1 && assignedIds.has([...owners][0]),
        `serviced by ${[...owners].join(', ')}, assigned ${[...assignedIds].join(', ')}`);

      const done = await ride();
      check('the ride recovers with two mechanics employed',
        done.brokenDown === false && done.breakdownPending === false);

      for (let i = 0; i < 8; i++) { await page.mouse.move(640, 400); await sleep(2000); }
      const settled = await staff();
      check('both mechanics end in a valid staff state',
        settled.length === 2 && settled.every(m => PEEP_STATE[m.state] !== undefined),
        settled.map(m => `${m.id}:${PEEP_STATE[m.state] ?? m.state}`).join(', '));
      check('neither mechanic is left holding the repaired ride',
        settled.every(m => !SERVICING.has(m.state)),
        settled.map(m => `${m.id}:${PEEP_STATE[m.state] ?? m.state}`).join(', '));
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'MECHANIC STAFF OK' : `MECHANIC STAFF FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
