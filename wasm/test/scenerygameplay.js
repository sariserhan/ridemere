// What decoration actually does to the simulation, measured rather than assumed.
//
//   node scenerygameplay.js
//
// The engine has no scenery term in the park rating at all: `Park::CalculateParkRating`
// counts guests, rides, litter and casualties and never looks at scenery. The one place
// scenery reaches the simulation is `GuestAssessSurroundings` (Guest.cpp), which a
// walking or sitting guest runs on every eighteenth `tick128UpdateGuest` — about once a
// minute of play. Forty or more small or large scenery elements within five tiles, with
// fewer than eight pieces of rubbish nearby, give the guest the "Great scenery!" thought
// and 45 on its happiness target. Walls do not count. Path additions do not count unless
// they are jumping fountains, which we do not ship.
//
// The comparison is First Park against itself: `first-park-bare` is the same scenario
// with the decoration removed and nothing else changed, generated from the same source.
// Two different parks would differ in a dozen ways at once.
//
// The density scene is here as the other end of the range: a park with three hundred and
// sixty scenery elements within five tiles of every guest on its path.
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
      { park: 'DevScenarios/first-park-bare.park', name: 'the same park, undecorated' },
      { park: 'DevScenarios/scenery-density-test.park', name: 'the density scene' },
    ]) {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(scene.park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
      await sleep(8000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);

      const state = JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
      await call('SunriseGenerateGuests', 'number', ['number'], [30]);

      // Two reasons this has to run for minutes and sample throughout. A guest
      // assesses its surroundings in `tick128UpdateGuest`, every eighteenth call, so
      // once every 2,304 ticks — very nearly a minute of play. And the thought then
      // fades, so a single read at the end counts only whoever is holding it at that
      // instant. Both of those read zero in a park with a thousand trees in it.
      //
      // Thirty guests, not eighty: the assessment also wants fewer than eight pieces
      // of litter nearby, and a crowd on a one-tile-wide path produces plenty.
      const everThought = new Set();
      let guests = [];
      for (let i = 0; i < 60; i++) {
        await page.mouse.move(640, 400); await sleep(3000);
        guests = JSON.parse(await call('SunriseGuestListJson', 'string', [], []))
          .filter(p => p.kind === 'guest');
        for (const guest of guests)
          if ((guest.thoughts ?? []).includes(SCENERY_THOUGHT)) everThought.add(guest.id);
      }
      const thinking = [...everThought];
      const happiness = guests.length
        ? guests.reduce((sum, g) => sum + g.happiness, 0) / guests.length : 0;
      const after = JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
      measured[scene.name] = {
        scenery: state.scenery, walls: state.walls, guests: guests.length,
        greatScenery: thinking.length, happiness: Math.round(happiness),
        rating: after.rating,
      };
      console.log(`${scene.name}: ${JSON.stringify(measured[scene.name])}`);
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  const first = measured['First Park, as it ships'];
  const bare = measured['the same park, undecorated'];
  const dense = measured['the density scene'];

  check('the decoration is in the park it is supposed to be in',
    first.scenery > 0 && bare.scenery === 0, `${first.scenery} pieces against ${bare.scenery}`);
  check('decorating does not move the park rating',
    Math.abs(first.rating - bare.rating) < 40, `${first.rating} against ${bare.rating}`);
  check('decorating does not move guest happiness at this density',
    Math.abs(first.happiness - bare.happiness) < 20, `${first.happiness} against ${bare.happiness}`);
  // The positive case is recorded rather than asserted. In a three-minute run with
  // three hundred and sixty scenery elements around every guest, no guest was ever
  // observed holding the thought, so this reports what happened instead of claiming
  // a behaviour the measurement does not support. See docs/first-park.md.
  console.log(`\n"Great scenery!" thoughts observed: First Park ${first.greatScenery}, `
    + `undecorated ${bare.greatScenery}, density scene ${dense.greatScenery}`);

  console.log('\n park                        scenery  walls  guests  "great scenery"  happiness  rating');
  for (const [name, m] of Object.entries(measured)) {
    console.log(` ${name.padEnd(26)} ${String(m.scenery).padStart(6)} ${String(m.walls).padStart(6)} `
      + `${String(m.guests).padStart(7)} ${String(m.greatScenery).padStart(16)} `
      + `${String(m.happiness).padStart(10)} ${String(m.rating).padStart(7)}`);
  }
  console.log(failures === 0 ? '\nSCENERY GAMEPLAY OK' : `\nSCENERY GAMEPLAY FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
