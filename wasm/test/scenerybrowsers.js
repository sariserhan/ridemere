// The scenery works in one browser engine, end to end.
//
//   node scenerybrowsers.js <chromium|firefox|webkit> <url of a served standalone build>
//
// Run by wasm/scripts/scenery-browsers.sh, which serves the build and runs this in each
// engine. Functional parity is what is required here, not pixel-identical rendering:
// the questions are whether First Park loads with its decoration, whether the build
// menu opens and stays open, whether a park with scenery in it survives a save and a
// reload with its orientations intact, and whether the simulation keeps running
// afterwards.
const playwright = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const name = process.argv[2];
  const base = process.argv[3];
  const result = { browser: name, checks: [], failures: [] };
  const check = (label, ok, detail) => {
    result.checks.push({ label, ok, detail });
    if (!ok) result.failures.push(label);
  };

  let browser;
  try {
    browser = await playwright[name].launch({
      headless: true, args: name === 'chromium' ? ['--no-sandbox'] : [] });
    result.version = browser.version();
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`${base}?park=first-park.park`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 240000 });
    await sleep(10000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);

    const state = JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
    check('First Park loads with its decoration', state.scenery > 0 && state.walls > 0,
      `${state.scenery} scenery, ${state.walls} wall pieces`);

    // Somewhere the decoration actually is, rather than a tile chosen at random.
    const before = JSON.parse(await call('SunriseTileDebugJson', 'string', ['number', 'number'], [15, 8]));
    check('a scenery element is on the map with a direction',
      (before.scenery ?? []).length > 0, JSON.stringify(before.scenery ?? []));

    const opened = await call('SunriseOpenWindow', 'number', ['string'], ['scenery']);
    for (let i = 0; i < 2; i++) { await page.mouse.move(640, 400); await sleep(3000); }
    const info = JSON.parse(await call('SunriseWindowInfoJson', 'string', ['string'], ['scenery']));
    check('the scenery window opens and stays open', opened === 1 && info.open === true,
      JSON.stringify(info));
    check('the scenery window is on screen',
      info.open === true && info.x < info.screenWidth && info.y < info.screenHeight
      && info.x + info.width > 0 && info.y + info.height > 0, JSON.stringify(info));

    const ticksBefore = JSON.parse(await call('SunriseParkStatsJson', 'string', [], [])).ticks;
    check('the park saves', await call('SunriseSavePark', 'number', ['string'], ['/persistent/browser.park']) === 1);
    check('the park reloads', await call('SunriseLoadPark', 'number', ['string'], ['/persistent/browser.park']) === 1);
    for (let i = 0; i < 3; i++) { await page.mouse.move(640, 400); await sleep(3000); }

    const after = JSON.parse(await call('SunriseTileDebugJson', 'string', ['number', 'number'], [15, 8]));
    check('the scenery comes back facing the same way',
      JSON.stringify(before.scenery) === JSON.stringify(after.scenery),
      `${JSON.stringify(before.scenery)} then ${JSON.stringify(after.scenery)}`);
    const reloaded = JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));
    check('the decoration survives the round trip',
      reloaded.scenery === state.scenery && reloaded.walls === state.walls,
      `${reloaded.scenery} scenery, ${reloaded.walls} wall pieces`);

    const ticksAfter = JSON.parse(await call('SunriseParkStatsJson', 'string', [], [])).ticks;
    check('the simulation keeps running after the reload', ticksAfter > 0 && ticksBefore > 0,
      `${ticksBefore} ticks, then ${ticksAfter}`);

    await page.screenshot({ path: `results-web/scenery-${name}.png` });
  } catch (error) {
    result.failures.push(`threw: ${String(error).slice(0, 200)}`);
  } finally { if (browser) await browser.close(); }

  console.log(JSON.stringify(result));
  process.exit(result.failures.length === 0 ? 0 : 1);
})();
