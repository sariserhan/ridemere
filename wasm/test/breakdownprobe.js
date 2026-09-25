// Watch one real engine breakdown from start to finish.
//
//   node breakdownprobe.js [breakdownReason]
//
// Reasons are the Breakdown enum in Ride.h: 0 safetyCutOut, 1 restraintsStuckClosed,
// 2 restraintsStuckOpen, 5 vehicleMalfunction, 6 brakesFailure — the five the hybrid
// coaster can have. Nothing here fakes a state: SunriseTriggerBreakdown calls the
// engine's own RidePrepareBreakdown and everything after it is the ordinary lifecycle.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REASONS = { 0: 'safetyCutOut', 1: 'restraintsStuckClosed', 2: 'restraintsStuckOpen',
  3: 'doorsStuckClosed', 4: 'doorsStuckOpen', 5: 'vehicleMalfunction', 6: 'brakesFailure',
  7: 'controlFailure', 255: 'none' };
const MECHANIC_STATUS = ['undefined', 'calling', 'heading', 'fixing', 'hasFixedStationBrakes'];
const PEEP_STATE = { 5: 'walking', 10: 'patrolling', 15: 'answering', 16: 'fixing',
  22: 'headingToInspection', 23: 'inspecting' };

(async () => {
  const reason = Number(process.argv[2] ?? 6);
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8971;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/breakdown-test.park')}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(8000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const ticks = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], [])).ticks;

    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    await call('SunriseGenerateGuests', 'number', ['number'], [40]);
    for (let i = 0; i < 6; i++) { await page.mouse.move(640, 400); await sleep(3000); }

    console.log(`triggering ${REASONS[reason]} (${reason})`);
    console.log('trigger returned:', await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, reason]));
    // Look at the alert before anybody is employed, then hire.
    for (let i = 0; i < 4; i++) { await page.mouse.move(640, 400); await sleep(2000); }
    console.log('alert with no mechanic:', await call('SunriseGuestAlertsJson', 'string', [], []));
    const hired = process.argv.includes('--no-mechanic') ? 0
      : await call('SunriseHireMechanic', 'number', [], []);
    console.log('hire mechanic:', hired);

    let last = '';
    for (let i = 0; i < 90; i++) {
      await page.mouse.move(640, 400); await sleep(2000);
      const ride = JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const staffList = JSON.parse(await call('SunriseGuestListJson', 'string', [], [])).filter(p => p.kind === 'staff');
      let staff = {};
      if (staffList.length) staff = JSON.parse(await call('SunriseStaffDebugJson', 'string', ['number'], [staffList[0].id]));
      const line = `pending=${ride.breakdownPending} broken=${ride.brokenDown} `
        + `reason=${REASONS[ride.breakdownReason]} mech=${MECHANIC_STATUS[ride.mechanicStatus]} `
        + `assigned=${ride.mechanic} carBroken=${ride.carIsBroken} status=${ride.status} `
        + `| staff ${PEEP_STATE[staff.state] ?? staff.state}/${staff.subState} `
        + `action=${staff.action} frame=${staff.animationFrameNum} tile=${staff.tile}`;
      if (line !== last) { console.log(`t=${String(await ticks()).padStart(6)} ${line}`); last = line; }
      if (!ride.brokenDown && !ride.breakdownPending && i > 8) { console.log('repaired'); break; }
    }
    console.log('final ride:', await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
    console.log('alerts:', await call('SunriseGuestAlertsJson', 'string', [], []));
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
})();
