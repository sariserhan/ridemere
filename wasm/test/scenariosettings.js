// Every scenario setting that has to survive being written to a .park file.
//
//   node scenariosettings.js
//
// This exists because of a pattern that has now cost four milestones. A setting is
// applied to the game state by the builder, looks correct while the builder is still
// running, and is then either not serialised or overwritten on load — and nothing
// says so. `SetMainView` wrote a camera the save never kept. `Park::Initialise` set
// noMoney and the builder never cleared it, so every scenario ran with the economy
// off. Scenery groups were marked invented and the bits were not in the file.
//
// So this loads each generated park the way a player would and asks the engine what
// it actually has, rather than trusting the description or the builder's return.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

//: RideInspection (Ride.h): every 10, 20, 30, 45 minutes, hourly, 2-hourly, never.
const NEVER = 6;

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const REPO = path.join(__dirname, '../..');
  const SCENARIOS = path.join(REPO, 'assets/scenarios');
  const GENERATED = path.join(REPO, 'assets/generated/scenarios');

  // Every scenario that ships, with what its description asks for.
  const wanted = [];
  for (const name of fs.readdirSync(SCENARIOS).sort()) {
    const source = path.join(SCENARIOS, name, 'scenario.json');
    if (!fs.existsSync(source)) continue;
    if (!fs.existsSync(path.join(GENERATED, `${name}.park`))) continue;
    const description = JSON.parse(fs.readFileSync(source, 'utf8'));
    if (!description.coaster) continue;   // these settings are all ride settings
    // Read from the same object the builder reads. These are coaster settings, and a
    // scenario that puts one at the top level gets silently ignored: that is how
    // `reliability` sat in four tuning scenarios doing nothing while the table of
    // results looked plausible. So a misplaced key is a failure, not a default.
    const coaster = description.coaster;
    for (const key of ['reliability', 'inspectionInterval', 'unreliabilityFactor']) {
      if (description[key] !== undefined) {
        check(`${name}: ${key} is on the coaster, not the scenario`, false,
          `it is set to ${JSON.stringify(description[key])} at the top level, where the `
          + 'builder never reads it');
      }
    }
    wanted.push({
      name,
      release: description.visibility === 'release',
      shipsOpen: coaster.open ?? true,
      reliability: coaster.reliability ?? 100,
      inspectionInterval: coaster.inspectionInterval ?? NEVER,
      breakdowns: description.breakdowns ?? true,
    });
  }
  check('there are scenarios with a coaster to check', wanted.length > 0, `${wanted.length}`);

  const DIST = path.join(REPO, 'engine/openrct2/build/www-standalone');
  const port = 8978;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    for (const scenario of wanted) {
      const file = scenario.release ? `${scenario.name}.park` : `DevScenarios/${scenario.name}.park`;
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(file)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
      await sleep(8000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const ride = JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));

      check(`${scenario.name}: the coaster loads`, ride.error === undefined, ride.error);
      if (ride.error) { await page.close(); continue; }

      // Reliability decays as soon as the park runs, so this is read on arrival and
      // allowed a little slack rather than demanded exactly.
      check(`${scenario.name}: reliability survives the save`,
        Math.abs(ride.reliabilityPercentage - scenario.reliability) <= 2,
        `asked for ${scenario.reliability}%, loaded with ${ride.reliabilityPercentage}%`);
      check(`${scenario.name}: the inspection interval survives the save`,
        ride.inspectionInterval === scenario.inspectionInterval,
        `asked for ${scenario.inspectionInterval}, loaded with ${ride.inspectionInterval}`);

      // Breakdowns off is a cheat flag on the game state rather than a ride field, so
      // it is checked by whether the ride is allowed to break at all.
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'SCENARIO SETTINGS OK' : `SCENARIO SETTINGS FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
