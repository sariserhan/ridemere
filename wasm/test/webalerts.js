// The alert panel in the product shell, driven by the real simulation.
//
//   node webalerts.js [baseUrl] [browser]
//
// alertcheck.js proves the engine's alert model on a development scene. This proves
// the other half, on the scenario a player actually starts: that the model reaches the
// screen, says something useful, and goes away when the park is fixed.
//
// The park it uses ships with its stalls open, which is the point: to see an alert the
// test has to break the park first, by closing them. That is also a situation a player
// creates for themselves, so it is worth asserting rather than contriving around.
//
// Assumes a server is already running at baseUrl.
const playwright = require('playwright');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = path.join(__dirname, 'results-web');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
}

(async () => {
  const base = process.argv[2] || 'http://localhost:3210';
  const engine = process.argv[3] || 'chromium';
  const browser = await playwright[engine].launch({
    headless: true,
    ...(engine === 'chromium' ? { channel: 'chromium', args: ['--no-sandbox'] } : {}),
  });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`${base}/play?scenario=sunrise-test`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForSelector('button:has-text("Save & exit")', { timeout: 240000 });
    await sleep(6000);

    const call = (name, ret, types, args) =>
      page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [name, ret, types, args]);
    const settle = async (seconds) => {
      for (let i = 0; i < Math.ceil(seconds / 3); i++) { await page.mouse.move(640, 400); await sleep(3000); }
    };
    const panel = page.locator('[data-testid="guest-alerts"]');
    const rows = () => page.locator('[data-testid="guest-alert"]').evaluateAll(
      nodes => nodes.map(n => ({
        kind: n.getAttribute('data-kind'),
        severity: n.getAttribute('data-severity'),
        text: n.textContent,
      })));

    // A park with nothing wrong says nothing. This is the assertion that keeps the
    // panel worth reading: if it is always there, a player stops seeing it.
    check('the panel is absent while the park is fine', await panel.count() === 0);

    // Break the park: close every stall, the way a player does by accident.
    const rides = JSON.parse(await call('SunriseRideListJson', 'string', [], []));
    for (const ride of rides) {
      if (ride.rideType !== 96) await call('SunriseSetRideStatus', 'number', ['number', 'number'], [ride.id, 0]);
    }
    const closed = JSON.parse(await call('SunriseRideListJson', 'string', [], []));
    check('every stall was closed', closed.filter(r => r.rideType !== 96).every(r => r.status !== 1));

    // Generated guests spawn OUTSIDE the park and walk in, and the need setter skips
    // guests who are not inside yet. Let them in first or almost none are reached.
    await call('SunriseGenerateGuests', 'number', ['number'], [120]);
    await settle(30);
    // The engine's own thresholds for forming the complaint: hunger below 10, thirst
    // below 25. See Guest.cpp, the tick-128 thought block.
    const moved = await call('SunriseSetGuestNeeds', 'number', ['number', 'number', 'number'], [5, 10, -1]);
    check('guests are inside the park and their needs were set', moved > 20, `${moved} guests`);

    await page.waitForSelector('[data-testid="guest-alerts"]', { timeout: 120000 }).catch(() => {});
    await settle(45);

    check('the panel appeared once guests had unmet needs', await panel.count() === 1);
    const raised = await rows();
    console.log('   panel:', JSON.stringify(raised));
    check('it names the hungry guests', raised.some(r => r.kind === 'GUESTS_HUNGRY'));
    check('it names the thirsty guests', raised.some(r => r.kind === 'GUESTS_THIRSTY'));
    check('every alert carries an instruction, not just a count',
      raised.length > 0 && raised.every(r => /build|check|hire|mechanic/i.test(r.text || '')));
    check('severity reaches the panel', raised.length > 0
      && raised.every(r => ['INFO', 'WARNING', 'IMPORTANT'].includes(r.severity)));
    check('a closed stall does not count as somewhere to go',
      raised.filter(r => ['GUESTS_HUNGRY', 'GUESTS_THIRSTY'].includes(r.kind))
        .every(r => /there is (nowhere|nothing)/i.test(r.text || '')),
      raised.map(r => r.text).join(' | ').slice(0, 160));

    await page.screenshot({ path: path.join(OUT, 'alert-panel.png') });

    // Collapsing is the player's only control over the panel, and it must not lose it.
    await page.locator('[data-testid="guest-alerts-toggle"]').click();
    await sleep(500);
    check('the panel collapses to its header', await page.locator('[data-testid="guest-alert"]').count() === 0);
    check('the header still reports how many there are',
      await panel.getAttribute('data-alert-count') !== null, await panel.getAttribute('data-alert-count'));
    await page.screenshot({ path: path.join(OUT, 'alert-panel-collapsed.png') });
    await page.locator('[data-testid="guest-alerts-toggle"]').click();
    await sleep(500);
    check('the panel expands again', await page.locator('[data-testid="guest-alert"]').count() > 0);

    // Fix the park the way a player would, and require the panel to notice.
    for (const ride of rides) {
      if (ride.rideType !== 96) await call('SunriseSetRideStatus', 'number', ['number', 'number'], [ride.id, 1]);
    }
    await settle(90);
    const after = await rows();
    console.log('   after:', JSON.stringify(after));
    const stillNowhere = after.filter(r => ['GUESTS_HUNGRY', 'GUESTS_THIRSTY'].includes(r.kind))
      .filter(r => /there is (nowhere|nothing)/i.test(r.text || ''));
    check('reopening the stalls changes what the panel says', stillNowhere.length === 0,
      after.map(r => r.text).join(' | ').slice(0, 160));

    await page.screenshot({ path: path.join(OUT, 'alert-panel-after.png') });
  } finally {
    await browser.close().catch(() => {});
  }
  const failed = results.filter(r => !r.ok);
  console.log(failed.length === 0 ? '\n   ALERT PANEL OK' : `\n   ALERT PANEL FAILED (${failed.length})`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
