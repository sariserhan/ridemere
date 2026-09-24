// What decoration actually does to the simulation, measured rather than assumed.
//
//   node scenerygameplay.js
//
// The engine has exactly one scenery term in it, and it is not in the park rating.
// `Park::CalculateParkRating` counts guests, rides, litter and casualties and never
// looks at scenery. Scenery reaches the game through `GuestAssessSurroundings`
// (Guest.cpp), which a walking or sitting guest runs every 18 ticks: forty or more
// small or large scenery elements within five tiles, with fewer than eight pieces of
// rubbish nearby, produce the "Great scenery!" thought and add 45 to the guest's
// happiness target. Walls do not count. Neither do path additions, unless they are
// jumping fountains, which we do not ship.
//
// Forty pieces within five tiles is a dense planting, not a decorated path. This
// measures both ends of that: First Park as it ships, and the density scene.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCENERY_THOUGHT = 34; // PeepThoughtType::scenery, Guest.h

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8985;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const measured = {};
  try {
    for (const scene of [
      { park: 'first-park.park', name: 'First Park, as it ships' },
      { park: 'DevScenarios/scenery-density-test.park', name: 'the density scene' },
    ]) {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(scene.park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
      await sleep(8000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);

      const state = JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
      await call('SunriseGenerateGuests', 'number', ['number'], [80]);
      for (let i = 0; i < 40; i++) { await page.mouse.move(640, 400); await sleep(3000); }

      const people = JSON.parse(await call('SunriseGuestListJson', 'string', [], []));
      const guests = people.filter(p => p.kind === 'guest');
      const thinking = guests.filter(g => (g.thoughts ?? []).includes(SCENERY_THOUGHT));
      const happiness = guests.length
        ? guests.reduce((sum, g) => sum + g.happiness, 0) / guests.length : 0;
      const stats = JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));
      measured[scene.name] = {
        scenery: state.scenery, walls: state.walls, guests: guests.length,
        greatScenery: thinking.length, happiness: Math.round(happiness),
        rating: stats.parkRating,
      };
      console.log(`${scene.name}: ${JSON.stringify(measured[scene.name])}`);
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  const first = measured['First Park, as it ships'];
  const dense = measured['the density scene'];
  check('First Park is decorated well below the threshold the engine rewards',
    first.scenery > 0 && first.scenery < 40, `${first.scenery} pieces, the thought needs 40 within five tiles`);
  check('no guest in First Park gets the "Great scenery!" thought',
    first.greatScenery === 0, `${first.greatScenery} of ${first.guests} guests`);
  check('guests in a densely planted park do get it',
    dense.greatScenery > 0, `${dense.greatScenery} of ${dense.guests} guests`);
  check('and they are happier for it',
    dense.happiness > first.happiness, `${dense.happiness} against ${first.happiness}`);

  console.log('\n park                        scenery  walls  guests  "great scenery"  happiness  rating');
  for (const [name, m] of Object.entries(measured)) {
    console.log(` ${name.padEnd(26)} ${String(m.scenery).padStart(6)} ${String(m.walls).padStart(6)} `
      + `${String(m.guests).padStart(7)} ${String(m.greatScenery).padStart(16)} `
      + `${String(m.happiness).padStart(10)} ${String(m.rating).padStart(7)}`);
  }
  console.log(failures === 0 ? '\nSCENERY GAMEPLAY OK' : `\nSCENERY GAMEPLAY FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
