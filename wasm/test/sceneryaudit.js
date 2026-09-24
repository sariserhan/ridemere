// Every scenery sprite the engine can ask for, and nothing it cannot find.
//
//   node sceneryaudit.js
//
// Two scenes cover the whole of it. The density scene draws all thirty-five objects on
// the map, which is every direction sprite and, since a build-menu preview is the
// direction-zero sprite, every preview too. The art scene with the scenery window open
// adds the one thing the map never draws: the group tab icons, which the window takes
// from each group's second image.
//
// A magenta marker on screen is the failure this exists to catch, and it is the one
// failure that looks deliberate.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8987;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    for (const scene of [
      { park: 'DevScenarios/scenery-density-test.park', name: 'every object on the map', windows: [] },
      { park: 'DevScenarios/world-art-test.park', name: 'the build menus', windows: ['scenery', 'footpath', 'ride-list'] },
      { park: 'first-park.park', name: 'First Park as it ships', windows: ['scenery'] },
    ]) {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(scene.park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
      await sleep(8000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);

      await call('SunriseSpriteAuditClear', null, [], []);
      // A window that opens and closes again a frame later, or that opens past the
      // edge of the screen, draws nothing and so passes a sprite audit perfectly.
      // The scenery window did exactly that: it is a tool window, and it closes
      // itself on the next update unless the scenery tool is active. So ask where
      // the window actually is, after it has had time to change its mind.
      for (const window of scene.windows) {
        const opened = await call('SunriseOpenWindow', 'number', ['string'], [window]);
        check(`${scene.name}: the ${window} window opens`, opened === 1);
        for (let i = 0; i < 2; i++) { await page.mouse.move(640, 400); await sleep(3000); }
        const info = JSON.parse(await call('SunriseWindowInfoJson', 'string', ['string'], [window]));
        check(`${scene.name}: the ${window} window is still open`, info.open === true, JSON.stringify(info));
        const onScreen = info.open && info.x + info.width > 0 && info.y + info.height > 0
          && info.x < info.screenWidth && info.y < info.screenHeight;
        check(`${scene.name}: the ${window} window is on screen`, onScreen === true, JSON.stringify(info));
        // The picture is the evidence that the menu has content in it, which neither
        // a sprite count nor a rectangle can show.
        await page.screenshot({ path: path.join(__dirname, 'results-visual', `menu-${scene.name.split(' ')[0]}-${window}.png`) });
      }
      for (let i = 0; i < 6; i++) { await page.mouse.move(640, 400); await sleep(3000); }

      const audit = JSON.parse(await call('SunriseSpriteAuditJson', 'string', [], []));
      check(`${scene.name}: no unexpected sprites`, audit.uniqueUnexpected === 0,
        audit.uniqueUnexpected === 0 ? `${audit.accounted} accounted`
          : JSON.stringify(audit.unexpected.slice(0, 6)));
      await page.screenshot({ path: path.join(__dirname, 'results-visual', `audit-${scene.name.split(' ')[0]}.png`) });
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'SCENERY AUDIT OK' : `SCENERY AUDIT FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
