// The mechanic repairs the ride, through every repair animation the coaster can need.
//
//   node mechaniccheck.js
//
// Two things are proven separately, because they are different claims and the first
// one passing does not mean the second one did:
//
//   the animation reached the frame the engine reads the repair from
//   the repair actually happened — the broken car flag cleared, or the brakes did
//
// That distinction is the whole milestone. `Staff::updateFixingFixVehicle` does
//
//     if (isActionWalking()) return true;        // animation over: substate "done"
//     if (animationFrameNum != actionFrame) return false;
//     vehicle->flags.unset(VehicleFlag::carIsBroken);
//
// so an animation shorter than `actionFrame` plays to its end, reports success, and
// never clears the flag. The handyman did exactly this for four milestones. See
// docs/mechanic-engine-audit.md.
//
// All four animations are reachable on the one coaster we ship, and a restraints
// failure picks between staffFix and staffFix2 on a coin flip (Staff.cpp), so that
// breakdown is repeated until both branches have been seen rather than assumed.
// Sampling. The simulation runs at 40 ticks a second and an animation advances one
// frame per tick, so a poll every POLL_MS observes roughly one frame in every
// POLL_MS/25. The frame counter is therefore evidence that the animation is running
// long, not proof that a particular frame was hit — the proof that the engine's event
// fired is the consequence, which only happens on that frame. Both are asserted.
const POLL_MS = 150;
const SAMPLE_SLACK = Math.ceil(POLL_MS / 25) + 2;

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

//: PeepActionType (Peep.h), and the frame the engine reads out of each, from
//: docs/mechanic-engine-audit.md. check_staff_animations.py reads the same numbers
//: out of the engine and asserts the shipped art can reach them.
const REPAIR_ACTIONS = {
  15: { name: 'staffFix', event: 37 },
  16: { name: 'staffFix2', event: 80 },
  17: { name: 'staffFixGround', event: 40 },
  18: { name: 'staffFix3', event: 101 },
};
const BREAKDOWNS = {
  safetyCutOut: 0, restraintsStuckClosed: 1, restraintsStuckOpen: 2,
  vehicleMalfunction: 5, brakesFailure: 6,
};

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8972;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });

  // What was seen across the whole run, per repair animation.
  const seen = {};
  for (const action of Object.keys(REPAIR_ACTIONS)) seen[action] = { maxFrame: -1, repaired: false };

  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/breakdown-test.park')}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
    await sleep(9000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
    const staffIds = async () => JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
      .filter(p => p.kind === 'staff').map(p => p.id);
    const alerts = async () => JSON.parse(await call('SunriseGuestAlertsJson', 'string', [], []));

    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    await call('SunriseGenerateGuests', 'number', ['number'], [40]);
    for (let i = 0; i < 5; i++) { await page.mouse.move(640, 400); await sleep(3000); }

    const access = (await ride()).access;
    check('the coaster has the access point the engine sends a mechanic to',
      access && access.x !== undefined, JSON.stringify(access));

    // --- the no-mechanic case, before anybody is employed ------------------------
    check('a real engine breakdown can be triggered',
      await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, BREAKDOWNS.brakesFailure]) === 1);
    for (let i = 0; i < 8; i++) { await page.mouse.move(640, 400); await sleep(2000); }

    const broken = await ride();
    check('the ride is in the engine\'s broken state', broken.brokenDown === true,
      `breakdownPending=${broken.breakdownPending} brokenDown=${broken.brokenDown}`);
    const first = (await alerts()).find(a => a.kind === 'RIDE_BROKEN_DOWN');
    check('a RIDE_BROKEN_DOWN alert is raised', first !== undefined);
    if (first) {
      check('the alert is IMPORTANT', first.severity === 'IMPORTANT', first.severity);
      check('the alert names the ride', /Hybrid Coaster/.test(first.title), first.title);
      check('with no mechanic the alert says to hire one', /[Hh]ire a mechanic/.test(first.advice), first.advice);
    }
    check('with nobody employed the ride stays broken', (await ride()).brokenDown === true);

    // --- hire, and watch this one through -----------------------------------------
    check('a mechanic can be hired', await call('SunriseHireMechanic', 'number', [], []) === 1);
    const crew = await staffIds();
    const mechanic = JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [crew[crew.length - 1]]));
    check('the mechanic is hired with both mechanic duties', (mechanic.orders & 0b11) === 0b11,
      `orders=0b${mechanic.orders.toString(2)} (bit 0 inspect, bit 1 fix)`);

    // --- every breakdown, watching the frames -------------------------------------
    // staffFix and staffFix2 are a coin flip on a restraints failure, so restraints
    // failures repeat until both have been seen.
    const queue = ['brakesFailure', 'vehicleMalfunction', 'safetyCutOut'];
    for (let extra = 0; extra < 8; extra++) queue.push('restraintsStuckClosed');

    let firstRepair = null;
    for (const kind of queue) {
      if (seen[15].repaired && seen[16].repaired && seen[17].repaired && seen[18].repaired) break;

      const before = await ride();
      if (!before.brokenDown && !before.breakdownPending)
        await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, BREAKDOWNS[kind]]);

      console.log(`observing ${kind} through completed repair`);
      let active = null;
      let recovered = false;
      // Dispatch plus walking can outlast the old 39-second sampling window. That
      // window stopped at frame 58 of staffFix3, then let its event happen unseen
      // during the patrol sleep. Observe the whole repair, with a bounded deadline.
      const deadline = Date.now() + 180000;
      while (Date.now() < deadline) {
        await page.mouse.move(640, 400); await sleep(POLL_MS);
        const state = await ride();
        for (const id of crew) {
          const staff = JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [id]));
          const repair = REPAIR_ACTIONS[staff.action];
          if (!repair) continue;
          active = staff.action;
          seen[staff.action].maxFrame = Math.max(seen[staff.action].maxFrame, staff.animationFrameNum);
        }
        // The consequence, recorded against whichever animation was running.
        if (active !== null) {
          if (active === 17 && state.mechanicStatus === 4) seen[17].repaired = true;
          if (active !== 17 && state.carIsBroken === false && before.carIsBroken !== false) seen[active].repaired = true;
        }
        if (!state.brokenDown && !state.breakdownPending) {
          if (active !== null) seen[active].repaired = true;
          if (firstRepair === null) firstRepair = { kind, ride: state };
          recovered = true;
          break;
        }
      }
      check(`${kind} finishes within the repair deadline`, recovered);
      if (!recovered) break;
      // Let the mechanic get back to patrolling before the next one.
      for (let i = 0; i < 6; i++) { await page.mouse.move(640, 400); await sleep(2000); }
    }

    for (const [action, repair] of Object.entries(REPAIR_ACTIONS)) {
      const record = seen[action];
      // Runs to within a sampling window of the event frame: an animation that ended
      // early would stop far short of this, which is the failure being guarded.
      check(`${repair.name} runs to the frame the engine reads from it`,
        record.maxFrame >= repair.event - SAMPLE_SLACK,
        `highest frame seen ${record.maxFrame}, engine reads ${repair.event}`
        + ` (sampling can miss the last ${SAMPLE_SLACK})`);
      // And the event itself, which the engine only does on that exact frame.
      check(`${repair.name} actually repairs, not merely animates`, record.repaired === true);
    }

    // --- the ride comes back, and the alert goes ----------------------------------
    const after = await ride();
    check('the ride leaves the broken state',
      after.brokenDown === false && after.breakdownPending === false);
    check('the ride is open again without the player reopening it', after.status === 1,
      `status=${after.status}`);
    for (let i = 0; i < 8; i++) { await page.mouse.move(640, 400); await sleep(2000); }
    check('the alert clears once the ride is fixed',
      (await alerts()).find(a => a.kind === 'RIDE_BROKEN_DOWN') === undefined);

    await page.screenshot({ path: path.join(__dirname, 'results-visual', 'mechanic-repaired.png') });
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'MECHANIC OK' : `MECHANIC FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
