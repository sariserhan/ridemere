// First Park -> breakdown -> save/resume -> hire -> repair -> guests ride again.
// The fixture triggers a real engine breakdown; it never patches UI or repair state.
// Usage: node webmechanic.js [url] [chromium|firefox|webkit]
const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const base = process.argv[2] || 'http://localhost:3210';
  const engine = process.argv[3] || 'chromium';
  const out = process.env.QA_OUTPUT || '/tmp/ridemere-v16-qa';
  fs.mkdirSync(out, { recursive: true });
  const browser = await ({ chromium, firefox, webkit })[engine].launch({
    headless: process.env.HEADED !== '1',
    ...(engine === 'firefox' ? { firefoxUserPrefs: { 'webgl.force-enabled': true, 'gfx.webrender.software': true } } : {}),
    ...(engine === 'chromium' ? { channel: 'chromium', args: ['--no-sandbox'] } : {}),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    let contentRequests = 0;
    page.on('request', request => { if (request.url().endsWith('/game/assets.zip')) contentRequests++; });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error' || /Failed to create WebGL context|HWDisplayDrawingEngine::Resize error/.test(msg.text())) {
        errors.push(msg.text());
      }
    });
    page.on('dialog', dialog => dialog.accept());
    const call = (n, r = 'string', t = [], a = []) =>
      page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
    const state = async () => JSON.parse(await call('SunriseScenarioStateJson'));
    const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
    const wait = async (name, predicate, timeout = 120000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        await page.mouse.move(640, 400);
        if (await predicate()) { console.log('ok  ' + name); return; }
        await sleep(1000);
      }
      await page.screenshot({ path: path.join(out, `${engine}-failure.png`) });
      console.log(await page.locator('body').innerText());
      console.log(await state());
      throw new Error('Timed out: ' + name);
    };
    const tip = page.locator('[data-testid="onboarding"]');
    const boot = async () => {
      await page.getByRole('button', { name: 'Save & exit', exact: true }).waitFor({ timeout: 240000 });
      await sleep(8000);
      await wait('scenario state reaches shell', async () => (await state()).objectiveGuests === 180);
    };
    await page.goto(`${base}/play?scenario=first-park`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await boot();
    console.log('checking page identity');
    assert.match(page.url(), /play\?scenario=first-park/);
    assert.match(await page.title(), /Ridemere/i);
    assert.equal(await page.locator('[data-testid="objective"]').count(), 1);
    assert.equal(await page.locator('nextjs-portal').count(), 0);
    console.log('checking starting ride');
    assert.equal((await state()).rideOpen, false);
    assert.equal((await ride()).reliabilityPercentage, 80);
    assert.equal((await ride()).inspectionInterval, 0);
    console.log('checking opening instruction');
    await wait('opening instruction visible', async () => await tip.count() > 0 && await tip.getAttribute('data-step') === 'camera');
    await page.screenshot({ path: path.join(out, `${engine}-opening.png`) });
    assert.equal(await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]), 1);
    await wait('first guests ride', async () => (await state()).rideCustomers > 0, 300000);
    const customers = (await state()).rideCustomers;
    assert.equal(await call('SunriseTriggerBreakdown', 'number', ['number', 'number'], [0, 0]), 1);
    await wait('real breakdown displayed', async () => (await state()).rideBroken &&
      await tip.getAttribute('data-step') === 'mechanic');
    assert.match(await tip.textContent(), /Hire a mechanic/);
    await page.screenshot({ path: path.join(out, `${engine}-broken.png`) });

    console.log('checking closed breakdown');
    // Closing a broken ride is not a repair and must not dismiss the guidance.
    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 0]);
    await sleep(6000);
    assert.equal((await state()).rideBroken, true);
    assert.equal(await tip.getAttribute('data-step'), 'mechanic');
    await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);

    console.log('checking old content cache');
    // Reproduce an existing browser cache from before content had its own version.
    await page.evaluate(async () => {
      window.Module.FS.writeFile('/OpenRCT2/version', 'old-engine-only-version');
      await Promise.race([
        new Promise((resolve, reject) => window.Module.FS.syncfs(false, error => error ? reject(error) : resolve())),
        new Promise((_, reject) => setTimeout(() => reject(new Error('cache sync timed out')), 30000)),
      ]);
    });
    // Keep a test-only reference so shutdown can be checked after the canvas unmounts.
    await page.evaluate(() => { window.retiredGame = window.Module; });
    console.log('saving broken park');
    const requestsBeforeResume = contentRequests;
    await page.getByRole('button', { name: 'Save & exit', exact: true }).click();
    await page.waitForURL('**/parks', { timeout: 60000 });
    assert.equal(await page.evaluate(() => window.Module === undefined), true, 'exiting releases the live module');
    assert.equal(await page.evaluate(() =>
      window.retiredGame.PThread.runningWorkers.length + window.retiredGame.PThread.unusedWorkers.length),
      0, 'exiting terminates the worker pool');
    await page.waitForFunction(() => !window.retiredGame.SDL2?.audioContext || window.retiredGame.SDL2.audioContext.state === 'closed');
    const stoppedTick = await page.evaluate(() => JSON.parse(window.retiredGame.ccall('SunriseParkStatsJson', 'string', [], [])).ticks);
    await sleep(1000);
    assert.equal(await page.evaluate(() => JSON.parse(window.retiredGame.ccall('SunriseParkStatsJson', 'string', [], [])).ticks),
      stoppedTick, 'the engine no longer simulates after leaving the game');
    await page.evaluate(() => { delete window.retiredGame; });
    console.log('saved broken park; engine loop and workers stopped');
    const card = page.locator('[data-testid="park-card"]').first();
    await card.waitFor();
    const id = await card.getAttribute('data-park-id');
    await page.goto(`${base}/play?save=${id}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await boot();
    await wait('broken save restores maintenance guidance', async () => (await state()).rideBroken &&
      await tip.getAttribute('data-step') === 'mechanic');
    assert.equal((await state()).mechanics, 0);
    assert.ok(contentRequests > requestsBeforeResume, 'stale content is downloaded again');
    const installedVersion = await page.evaluate(() => window.Module.FS.readFile('/OpenRCT2/version', { encoding: 'utf8' }));
    assert.match(installedVersion, /^[a-f0-9]{64}$/);
    assert.equal(await call('SunriseHireMechanic', 'number'), 1);
    await wait('hiring keeps the lesson until repair', async () =>
      (await state()).mechanics === 1 && /on the job/.test(await tip.textContent()));
    assert.equal((await state()).rideBroken, true);
    await call('SunriseOpenWindow', 'number', ['string'], ['staff']);
    await page.screenshot({ path: path.join(out, `${engine}-repairing.png`) });
    await wait('mechanic repairs automatically', async () => !(await state()).rideBroken, 240000);
    await wait('repair dismisses the maintenance lesson', async () =>
      await tip.count() === 0 || await tip.getAttribute('data-step') !== 'mechanic');
    await wait('guests ride after repair', async () => (await state()).rideCustomers > customers, 180000);
    assert.equal((await state()).mechanics, 1);
    await page.screenshot({ path: path.join(out, `${engine}-repaired.png`) });
    const requestsBeforeSecondResume = contentRequests;
    await page.getByRole('button', { name: 'Save & exit', exact: true }).click();
    await page.waitForURL('**/parks', { timeout: 60000 });
    await page.goto(`${base}/play?save=${id}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await boot();
    assert.equal((await state()).mechanics, 1, 'hired mechanic survives product save/resume');
    assert.equal((await state()).rideBroken, false, 'repaired state survives product save/resume');
    assert.equal(contentRequests, requestsBeforeSecondResume, 'unchanged content is reused');
    console.log('ok  repaired park resumes with its mechanic and reuses current content');
    assert.deepEqual([...new Set(errors)], [], 'no browser or console errors');
    console.log(`WEB MECHANIC OK (${engine}); evidence: ${out}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
