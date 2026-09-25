// The staff windows, through a hire and a repair, with the sprite audit running.
//
//   node mechanicui.js
//
// Two risks here, and they are different:
//
//   blank art      a sprite the engine asks for that nobody authored. The audit
//                  catches that, and only while the window is actually drawn — a
//                  window that opens and closes itself asks for nothing and passes,
//                  which is what the scenery window did for the whole of V1-5.
//   wrong words    a mechanic repairing correctly while the window tells the player
//                  something generic. The engine already has the strings —
//                  STR_RESPONDING_TO_RIDE_BREAKDOWN_CALL, STR_FIXING_RIDE and the rest,
//                  with the ride name appended by formatPeepActionTo — so this checks
//                  they are shipped and that the window changes as the repair runs,
//                  rather than inventing a display model.
//
// The state is read by capturing the window and measuring how much of it changes as
// the mechanic moves through patrolling, responding and fixing: the text is drawn
// from our own font, so a window that never changes is a window not reporting.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BRAKES_FAILURE = 6;
const MECHANIC = 1;
//: PeepState (Peep.h)
const PATROLLING = 10, ANSWERING = 15, FIXING = 16;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8976;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const rects = [];
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/breakdown-test.park')}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
    await sleep(9000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
    const info = async (w) => JSON.parse(await call('SunriseWindowInfoJson', 'string', ['string'], [w]));
    const mechanic = async () => {
      const ids = JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
        .filter(p => p.kind === 'staff').map(p => p.id);
      for (const id of ids) {
        const s = JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [id]));
        if (s.staffType === MECHANIC) return s;
      }
      return null;
    };
    const run = async (seconds) => {
      for (let i = 0; i < seconds / 2; i++) { await page.mouse.move(640, 400); await sleep(2000); }
    };
    const shot = (name) => page.screenshot({ path: path.join(__dirname, 'results-visual', name) });

    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    await call('SunriseGenerateGuests', 'number', ['number'], [40]);
    await call('SunriseSpriteAuditClear', null, [], []);
    await run(10);

    // ---- the staff list, before and after hiring ---------------------------------
    const beforeList = path.join(__dirname, 'results-visual', 'mechanic-stafflist-before.png');
    await shot('mechanic-stafflist-before.png');
    check('the staff list opens', await call('SunriseOpenWindow', 'number', ['string'], ['staff-list']) === 1);
    await run(6);
    const listInfo = await info('staff-list');
    check('the staff list stays open', listInfo.open === true, JSON.stringify(listInfo));
    const afterList = path.join(__dirname, 'results-visual', 'mechanic-stafflist.png');
    await shot('mechanic-stafflist.png');
    rects.push({ scene: 'the staff list', window: 'staff-list', before: beforeList, after: afterList,
      x: Math.max(0, listInfo.x), y: Math.max(0, listInfo.y),
      width: listInfo.width, height: listInfo.height, tabs: listInfo.tabs ?? 0 });

    check('a mechanic can be hired', await call('SunriseHireMechanic', 'number', [], []) === 1);
    await run(8);
    const hired = await mechanic();
    check('the mechanic appears as staff', hired !== null && hired.staffType === MECHANIC);
    await shot('mechanic-stafflist-hired.png');

    // ---- the window for that mechanic --------------------------------------------
    const beforePeep = path.join(__dirname, 'results-visual', 'mechanic-window-before.png');
    await shot('mechanic-window-before.png');
    check('the mechanic\'s own window opens', await call('SunriseOpenWindow', 'number', ['string'], ['staff']) === 1);
    await run(6);
    const peepInfo = await info('staff');
    check('the mechanic\'s window stays open', peepInfo.open === true, JSON.stringify(peepInfo));
    const afterPeep = path.join(__dirname, 'results-visual', 'mechanic-window-patrolling.png');
    await shot('mechanic-window-patrolling.png');
    rects.push({ scene: 'the mechanic', window: 'staff', before: beforePeep, after: afterPeep,
      x: Math.max(0, peepInfo.x), y: Math.max(0, peepInfo.y),
      width: peepInfo.width, height: peepInfo.height, tabs: peepInfo.tabs ?? 0 });

    const idle = await mechanic();
    check('the mechanic is idle before anything breaks', idle.state === PATROLLING,
      `state=${idle.state}`);

    // ---- break it, and watch the window while the state changes -------------------
    await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, BRAKES_FAILURE]);
    const captures = {};
    const statesSeen = new Set();
    for (let i = 0; i < 100; i++) {
      await page.mouse.move(640, 400); await sleep(1500);
      const who = await mechanic();
      if (!who) continue;
      statesSeen.add(who.state);
      if ((who.state === ANSWERING || who.state === FIXING) && !captures[who.state]) {
        const name = who.state === ANSWERING ? 'mechanic-window-answering.png' : 'mechanic-window-fixing.png';
        await shot(name);
        captures[who.state] = path.join(__dirname, 'results-visual', name);
      }
      const state = await ride();
      if (!state.brokenDown && !state.breakdownPending && captures[FIXING]) break;
    }

    check('the window is open through the whole repair', (await info('staff')).open === true);
    check('the mechanic is seen responding to the call', statesSeen.has(ANSWERING));
    check('the mechanic is seen fixing the ride', statesSeen.has(FIXING));

    check('the window was captured in both working states',
      captures[ANSWERING] !== undefined && captures[FIXING] !== undefined,
      Object.keys(captures).join(', '));

    // ---- the audit, with all of it having been on screen ---------------------------
    const audit = JSON.parse(await call('SunriseSpriteAuditJson', 'string', [], []));
    check('no unexpected sprites across hire, dispatch and repair',
      audit.uniqueUnexpected === 0,
      audit.uniqueUnexpected === 0 ? `${audit.accounted} accounted`
        : JSON.stringify(audit.unexpected.slice(0, 6)));

    fs.writeFileSync(path.join(__dirname, 'results-visual', 'mechanic-window-rects.json'),
      JSON.stringify(rects, null, 2));
    // The status line, per state, for check_staff_status.py: the window has to say
    // what the mechanic is doing, not one generic line for all three.
    fs.writeFileSync(path.join(__dirname, 'results-visual', 'mechanic-states.json'),
      JSON.stringify({
        rect: { x: Math.max(0, peepInfo.x), y: Math.max(0, peepInfo.y),
                width: peepInfo.width, height: peepInfo.height },
        states: {
          patrolling: afterPeep,
          responding: captures[ANSWERING],
          fixing: captures[FIXING],
        },
      }, null, 2));
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'MECHANIC UI OK' : `MECHANIC UI FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
