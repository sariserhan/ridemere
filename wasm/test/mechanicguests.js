// What guests actually do when the ride they are queuing for breaks.
//
//   node mechanicguests.js
//
// Recorded rather than designed. The question is whether the engine's own behaviour is
// coherent — nobody stuck on a broken ride, nobody in an impossible state, and the
// queue working again afterwards — not whether it matches something we imagined.
//
// Both phases are covered because they are different events: a brakes failure breaks
// the ride immediately, a restraints failure waits for the affected car to come round.
// See docs/mechanic-engine-audit.md.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

//: Breakdown semantics differ by class, and the regression keeps them apart rather
//: than asserting one generic "broken ride" behaviour:
//:
//:   restraints (vehicle side)  the ride drains — the affected car is what breaks, and
//:                              the engine waits for it to come round, by which time it
//:                              has unloaded
//:   brakes (station side)      riders can stay aboard and keep circulating, because a
//:                              brakes failure is exactly "this train cannot be stopped
//:                              at the station"
//:
//: Both must end the same way: everybody who was aboard gets off.
const BREAKDOWNS = {
  restraintsStuckClosed: { reason: 1, drainsRide: true },
  brakesFailure: { reason: 6, drainsRide: false },
};

//: PeepState::onRide (Peep.h).
const ON_RIDE = 3;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8973;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const recorded = {};
  try {
    for (const [kind, spec] of Object.entries(BREAKDOWNS)) {
      const reason = spec.reason;
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/breakdown-test.park')}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
      await sleep(9000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const stats = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));
      const guests = async () => JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
        .filter(p => p.kind === 'guest');
      const rideState = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const rideList = async () => JSON.parse(await call('SunriseRideListJson', 'string', [], []))[0];

      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
      await call('SunriseGenerateGuests', 'number', ['number'], [90]);
      // Long enough for a queue to form and the coaster to be carrying people.
      for (let i = 0; i < 24; i++) { await page.mouse.move(640, 400); await sleep(2500); }

      const sample = async () => {
        const [s, r, l] = [await stats(), await rideState(), await rideList()];
        return { ticks: s.ticks, queuing: s.guestsQueuing, onRide: s.guestsOnRide,
                 walking: s.guestsWalking, inPark: s.guestsInPark, queueLength: l.queueLength,
                 riders: l.numRiders, customers: l.totalCustomers, status: l.status,
                 broken: r.brokenDown, pending: r.breakdownPending };
      };

      const before = await sample();
      // In use, not "has completed a circuit": totalCustomers counts guests who have
      // finished the ride, and a coaster circuit is long enough that a park a minute
      // old has people aboard and none of them off yet.
      check(`${kind}: the coaster is in use before it breaks`,
        before.queuing > 0 || before.onRide > 0,
        `${before.queuing} queuing, ${before.onRide} on the ride, ${before.customers} carried`);

      await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, reason]);

      // Watch until it is genuinely broken, which for a vehicle failure means waiting
      // for the affected car to come round.
      let becameBroken = false;
      let minOnRideWhileBroken = Number.MAX_SAFE_INTEGER;
      // The individual guests aboard the moment it becomes broken. Counts can hide a
      // guest who never gets off while others board and leave around them; following
      // the actual ids cannot.
      let aboardAtBreak = [];
      for (let i = 0; i < 60; i++) {
        await page.mouse.move(640, 400); await sleep(2000);
        const now = await sample();
        if (now.broken && !becameBroken) {
          becameBroken = true;
          aboardAtBreak = (await guests()).filter(g => g.state === ON_RIDE).map(g => g.id);
        }
        if (becameBroken) {
          minOnRideWhileBroken = Math.min(minOnRideWhileBroken, now.onRide);
          if (i > 10) break;
        }
      }
      check(`${kind}: the ride reaches the engine's broken state`, becameBroken);
      const during = await sample();

      check(`${kind}: the ride stays open rather than closing itself`, during.status === 1,
        `status=${during.status}`);
      // Measured, not assumed, and it differs by breakdown: a restraints failure
      // empties the ride, while a brakes failure leaves the train going round with
      // its riders aboard until somebody fixes the brakes. The second is the engine
      // working as designed — a brakes failure is precisely "this train cannot be
      // stopped at the station" — so the safety claim is not "the ride is empty" but
      // "everybody who was aboard got off", which is checked after the repair below.
      console.log(`  ${kind}: fewest aboard at any point while broken: ${minOnRideWhileBroken},`
        + ` ${aboardAtBreak.length} aboard at the moment it broke`);
      if (spec.drainsRide) {
        check(`${kind}: the ride empties while it is broken`, minOnRideWhileBroken === 0,
          `fewest aboard: ${minOnRideWhileBroken}`);
      }
      check(`${kind}: guests are not lost from the park`, during.inPark > before.inPark * 0.5,
        `${before.inPark} before, ${during.inPark} while broken`);
      check(`${kind}: the ride stops carrying guests while broken`,
        during.customers - before.customers < Math.max(6, before.customers * 0.25),
        `${before.customers} carried before, ${during.customers} while broken`);

      // Hire and let it be fixed.
      await call('SunriseHireMechanic', 'number', [], []);
      let fixedAt = null;
      for (let i = 0; i < 90; i++) {
        await page.mouse.move(640, 400); await sleep(2000);
        const now = await sample();
        if (!now.broken && !now.pending) { fixedAt = now; break; }
      }
      check(`${kind}: the mechanic repairs it`, fixedAt !== null);

      for (let i = 0; i < 20; i++) { await page.mouse.move(640, 400); await sleep(2500); }
      const after = await sample();
      check(`${kind}: guests ride it again once it is fixed`,
        after.customers > during.customers,
        `${during.customers} carried when broken, ${after.customers} after the repair`);
      // Every guest that was aboard, by id, observed off the ride afterwards. A guest
      // who boards again later is fine; one that is never seen off it is not. A guest
      // who has left the park is also released — that is a valid end state.
      const released = new Set();
      for (let i = 0; i < 16 && released.size < aboardAtBreak.length; i++) {
        await page.mouse.move(640, 400); await sleep(2000);
        const present = new Map((await guests()).map(g => [g.id, g.state]));
        for (const id of aboardAtBreak) {
          const state = present.get(id);
          if (state === undefined || state !== ON_RIDE) released.add(id);
        }
      }
      check(`${kind}: every guest aboard when it broke got off the ride`,
        released.size === aboardAtBreak.length,
        `${released.size} of ${aboardAtBreak.length} released`);

      recorded[kind] = { before, during, after };
      console.log(`  ${kind}: before ${JSON.stringify(before)}`);
      console.log(`  ${kind}: broken ${JSON.stringify(during)}`);
      console.log(`  ${kind}: after  ${JSON.stringify(after)}`);
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  console.log('\n breakdown                queuing        on ride       carried');
  for (const [kind, r] of Object.entries(recorded)) {
    console.log(` ${kind.padEnd(22)} ${String(r.before.queuing).padStart(3)}→${String(r.during.queuing).padStart(3)}→${String(r.after.queuing).padStart(3)}`
      + `   ${String(r.before.onRide).padStart(3)}→${String(r.during.onRide).padStart(3)}→${String(r.after.onRide).padStart(3)}`
      + `   ${String(r.before.customers).padStart(4)}→${String(r.during.customers).padStart(4)}→${String(r.after.customers).padStart(4)}`);
  }
  console.log(failures === 0 ? '\nGUEST REACTION OK' : `\nGUEST REACTION FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
