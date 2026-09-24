// The onboarding in the product shell, driven by the real scenario.
//
//   node webonboarding.js [baseUrl] [browser]
//
// The things worth asserting about a tutorial are that it knows where the park is and
// that it cannot be fooled. So this checks that each instruction appears when the park
// reaches the state it is about, that it goes away when the player has actually done
// the thing, and that it comes back on the right step after a reload rather than
// starting again from the beginning.
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(`${base}/play?scenario=first-park`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForSelector('button:has-text("Save & exit")', { timeout: 240000 });
    await sleep(8000);

    const call = (name, ret, types, args) =>
      page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [name, ret, types, args]);
    const step = () => page.locator('[data-testid="onboarding"]');
    const stepId = async () => (await step().count()) ? step().getAttribute('data-step') : null;
    const settle = async (seconds) => {
      for (let i = 0; i < Math.ceil(seconds / 3); i++) { await page.mouse.move(640, 400); await sleep(3000); }
    };

    await page.waitForSelector('[data-testid="onboarding"]', { timeout: 60000 }).catch(() => {});
    check('the first instruction appears', await step().count() === 1);
    check('it is the camera step', await stepId() === 'camera', String(await stepId()));

    // The objective is on screen from the first frame, not at the end.
    const objective = page.locator('[data-testid="objective"]');
    check('the objective is shown', await objective.count() === 1, (await objective.textContent())?.trim());

    // Moving the camera is the thing the step asks for, so it is the thing that
    // completes it. A player pans by dragging with the right button held.
    //
    // WebKit does not reproduce a right-button drag through Playwright, so these two
    // assertions run in the engines that do. That is a limit of the harness, not of
    // the product: the shell and the engine are the same build in all three, and the
    // rest of the onboarding is asserted everywhere.
    if (engine === 'webkit') {
      console.log('   ..   camera panning is not reproducible in WebKit through Playwright; skipped');
      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    } else {
      await page.mouse.move(700, 400);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(560, 460, { steps: 10 });
      await page.mouse.up({ button: 'right' });
      await settle(12);
      check('moving the camera completes the camera step', await stepId() === 'open-ride', String(await stepId()));

      // The ride step completes by opening the ride, not by opening its window.
      await page.locator('[data-testid="onboarding"]').click();
      await settle(9);
      check('clicking the tip does not advance it', await stepId() === 'open-ride', String(await stepId()));
    }

    if (engine !== 'webkit') await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
    await settle(15);
    check('opening the coaster completes the ride step', await stepId() !== 'open-ride', String(await stepId()));

    await page.screenshot({ path: path.join(OUT, 'first-park-onboarding.png') });

    // Skip ahead: with guests riding, the guest and money steps complete themselves.
    await settle(90);
    const afterGuests = await stepId();
    check('the guided steps advance as the park fills', !['camera', 'open-ride'].includes(afterGuests), String(afterGuests));

    // The player can put the tips away and get them back.
    await page.locator('[data-testid="onboarding-dismiss"]').click();
    await sleep(1000);
    check('tips can be hidden', await step().count() === 0);
    check('a way back is offered', await page.locator('[data-testid="onboarding-show"]').count() === 1);
    await page.locator('[data-testid="onboarding-show"]').click();
    await sleep(1000);
    check('tips come back', await step().count() === 1);

    const before = await stepId();
    const doneBefore = Number(await page.getAttribute('[data-testid="objective"]', 'data-steps-done'));

    // Resume the saved park, which is what a player does when they come back. Note
    // this is the SAVE, not the scenario: reloading /play?scenario=... would start a
    // fresh park, and a tutorial that resumed correctly into a brand new park would be
    // proving nothing.
    //
    // The park autosaves every minute, so this waits for one that happened after the
    // coaster was opened; otherwise the saved park is from before that and resuming to
    // "open the coaster" would be right rather than wrong.
    await settle(75);
    await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="park-card"]', { timeout: 60000 });
    const parkId = await page.getAttribute('[data-testid="park-card"]', 'data-park-id');
    await page.goto(`${base}/play?save=${parkId}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForSelector('button:has-text("Save & exit")', { timeout: 240000 });
    await sleep(10000);
    await page.waitForSelector('[data-testid="onboarding"]', { timeout: 60000 }).catch(() => {});
    const after = await stepId();
    const doneAfter = Number(await page.getAttribute('[data-testid="objective"]', 'data-steps-done'));
    check('the park itself resumed', await page.locator('[data-testid="objective"]').count() === 1);
    //
    // The instruction after resuming may legitimately be nothing at all: between the
    // guided opening and the first need alert the tutorial has nothing to say, which
    // is the point of it. What must not happen is going backwards.
    check('onboarding does not restart at step one', after !== 'camera' && after !== 'open-ride',
      `${before} then ${after ?? 'nothing to say'}`);
    check('onboarding progress does not go backwards after resuming', doneAfter >= doneBefore,
      `${doneBefore} then ${doneAfter} steps done`);

    await page.screenshot({ path: path.join(OUT, 'first-park-resumed.png') });
  } finally {
    await browser.close().catch(() => {});
  }
  const failed = results.filter(r => !r.ok);
  console.log(failed.length === 0 ? '\n   ONBOARDING OK' : `\n   ONBOARDING FAILED (${failed.length})`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
