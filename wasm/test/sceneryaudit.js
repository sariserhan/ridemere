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
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

//: Four scenery groups ship, plus the window's own "misc" and "all" tabs.
const EXPECTED_SCENERY_TABS = 4;

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
  const rects = [];
  try {
    for (const scene of [
      { park: 'DevScenarios/scenery-density-test.park', name: 'every object on the map', windows: [] },
      { park: 'DevScenarios/world-art-test.park', name: 'the build menus', windows: ['scenery', 'footpath', 'ride-list'] },
      { park: 'first-park.park', name: 'First Park as it ships', windows: ['scenery'] },
    ]) {
      const short = scene.name.split(' ')[0];
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(scene.park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
      await sleep(8000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);

      await call('SunriseSpriteAuditClear', null, [], []);
      // "It opened" and "it is on screen" are both answerable from the window manager,
      // and both were answered yes for a whole milestone while the screen showed
      // grass: the scenery window is a tool window and closed itself on the next
      // update. So capture the same frame with the window closed and with it open,
      // and let check_window_drawn.py ask the picture whether anything happened.
      for (const window of scene.windows) {
        const beforePath = path.join(__dirname, 'results-visual', `menu-${short}-${window}-before.png`);
        const afterPath = path.join(__dirname, 'results-visual', `menu-${short}-${window}.png`);
        await page.screenshot({ path: beforePath });

        const opened = await call('SunriseOpenWindow', 'number', ['string'], [window]);
        check(`${scene.name}: the ${window} window opens`, opened === 1);
        for (let i = 0; i < 2; i++) { await page.mouse.move(640, 400); await sleep(3000); }

        const info = JSON.parse(await call('SunriseWindowInfoJson', 'string', ['string'], [window]));
        check(`${scene.name}: the ${window} window is still open`, info.open === true, JSON.stringify(info));
        const onScreen = info.open && info.x + info.width > 0 && info.y + info.height > 0
          && info.x < info.screenWidth && info.y < info.screenHeight;
        check(`${scene.name}: the ${window} window is on screen`, onScreen === true, JSON.stringify(info));
        // A scenery window with no tabs is a window with nothing in it, which is the
        // state a scenario with no research arrives in.
        if (window === 'scenery') {
          check(`${scene.name}: the scenery window has a tab for every group`,
            (info.tabs ?? 0) >= EXPECTED_SCENERY_TABS,
            `${info.tabs} tabs, expected at least ${EXPECTED_SCENERY_TABS}`);
        }

        await page.screenshot({ path: afterPath });
        if (info.open) rects.push({
          scene: scene.name, window, before: beforePath, after: afterPath,
          x: Math.max(0, info.x), y: Math.max(0, info.y),
          width: info.width, height: info.height, tabs: info.tabs ?? 0,
        });
      }
      for (let i = 0; i < 6; i++) { await page.mouse.move(640, 400); await sleep(3000); }

      const audit = JSON.parse(await call('SunriseSpriteAuditJson', 'string', [], []));
      check(`${scene.name}: no unexpected sprites`, audit.uniqueUnexpected === 0,
        audit.uniqueUnexpected === 0 ? `${audit.accounted} accounted`
          : JSON.stringify(audit.unexpected.slice(0, 6)));
      await page.screenshot({ path: path.join(__dirname, 'results-visual', `audit-${short}.png`) });
      await page.close();
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  // The picture evidence, for check_window_drawn.py to read.
  fs.writeFileSync(path.join(__dirname, 'results-visual', 'menu-rects.json'), JSON.stringify(rects, null, 2));
  console.log(failures === 0 ? 'SCENERY AUDIT OK' : `SCENERY AUDIT FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
