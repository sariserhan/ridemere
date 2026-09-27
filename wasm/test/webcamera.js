// Camera controls must move the real viewport without editing the park.
// Run against the web shell: node wasm/test/webcamera.js http://localhost:3210
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.argv[2] || 'http://localhost:3210';
const out = process.env.QA_OUTPUT || '/tmp/ridemere-camera-qa';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chromium', args: ['--no-sandbox'] });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('dialog', d => d.accept());
      await page.goto(base + '/play?scenario=small-footprint');
      await page.getByRole('button', { name: 'Build park', exact: true }).click({ timeout: 180000 });
      if (!(await page.getByRole('button', { name: 'Advanced editor (2D)', exact: true }).isVisible())) await page.getByRole('button', { name: 'Hide build catalog', exact: true }).click();
      await page.getByRole('button', { name: 'Advanced editor (2D)', exact: true }).click();
      await page.getByRole('button', { name: 'Move view', exact: true }).waitFor({ timeout: 180000 });
      await page.waitForTimeout(2500);
      const read = name => page.evaluate(name => JSON.parse(Module.ccall(name, 'string', [], [])), name);
      const view = () => read('SunriseScenarioStateJson');
      const park = await read('SunriseParkStatsJson');
      const before = await view();
      await page.getByRole('button', { name: 'Pan right', exact: true }).click();
      await page.waitForTimeout(250);
      assert.ok((await view()).viewX > before.viewX, 'right arrow moves viewport right');
      await page.getByRole('button', { name: 'Pan left', exact: true }).click();
      await page.waitForTimeout(250);
      assert.equal((await view()).viewX, before.viewX, 'left reverses right');
      await page.getByRole('button', { name: 'Pan down', exact: true }).click();
      await page.waitForTimeout(250);
      assert.ok((await view()).viewY > before.viewY);
      await page.getByRole('button', { name: 'Pan up', exact: true }).click();
      await page.waitForTimeout(250);
      assert.equal((await view()).viewY, before.viewY);
      await page.getByRole('button', { name: 'Move view', exact: true }).click();
      const priorDrag = await view();
      if (mobile) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 80, y: 450 }] });
        for (let i = 1; i <= 8; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 80 + i * 10, y: 450 + i * 4 }] });
          await page.waitForTimeout(30);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(600, 350);
        await page.mouse.down();
        await page.mouse.move(740, 410, { steps: 12 });
        await page.mouse.up();
      }
      await page.waitForTimeout(350);
      const afterDrag = await view();
      assert.ok(afterDrag.viewX < priorDrag.viewX && afterDrag.viewY < priorDrag.viewY, 'drag follows mouse or finger');
      await page.locator('[data-testid="camera-drag-surface"]').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(250);
      assert.ok((await view()).viewX > afterDrag.viewX, 'keyboard movement');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Move view', exact: true }).waitFor();
      assert.equal(await page.locator('[data-testid="camera-drag-surface"]').count(), 0, 'normal interaction restored');
      const normal = await view();
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await page.waitForTimeout(300);
      assert.notEqual((await view()).viewX, normal.viewX, 'zoom changes viewport');
      await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await page.getByRole('button', { name: 'Rotate park view', exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Return to park centre', exact: true }).click();
      await page.waitForTimeout(300);
      const centred = await view();
      await page.getByRole('button', { name: 'Pan right', exact: true }).click();
      await page.getByRole('button', { name: 'Return to park centre', exact: true }).click();
      await page.waitForTimeout(300);
      assert.equal((await view()).viewX, centred.viewX, 'home recovers camera');
      assert.equal((await read('SunriseParkStatsJson')).rides, park.rides, 'camera gestures do not edit rides');
      assert.equal(await page.evaluate(() => document.elementFromPoint(42, 12)?.id), 'canvas', 'native toolbar remains accessible');
      assert.deepEqual(errors, []);
      assert.ok((await page.title()).length > 0);
      assert.equal(await page.locator('nextjs-portal').count(), 0);
      const bounds = await page.getByRole('region', { name: 'Camera controls', exact: true }).boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= (mobile ? 390 : 1280));
      await page.getByRole('button', { name: 'Hide camera controls', exact: true }).click();
      assert.equal(await page.getByRole('region', { name: 'Camera controls', exact: true }).count(), 0);
      await page.getByRole('button', { name: 'Camera', exact: true }).click();
      await page.getByRole('button', { name: 'Move view', exact: true }).waitFor();
      await page.screenshot({ path: `${out}/${mobile ? 'touch' : 'desktop'}.png` });
      await page.getByRole('button', { name: 'Save & exit', exact: true }).click();
      await page.waitForURL('**/parks');
      await page.locator('[data-testid="park-card"]').first().getByRole('button', { name: 'Play', exact: true }).click();
      await page.getByRole('button', { name: 'Build park', exact: true }).click({ timeout: 180000 });
      if (!(await page.getByRole('button', { name: 'Advanced editor (2D)', exact: true }).isVisible())) await page.getByRole('button', { name: 'Hide build catalog', exact: true }).click();
      await page.getByRole('button', { name: 'Advanced editor (2D)', exact: true }).click();
      await page.getByRole('button', { name: 'Move view', exact: true }).waitFor({ timeout: 180000 });
      assert.equal((await read('SunriseParkStatsJson')).parkName, park.parkName);
      console.log('CAMERA PASS', mobile ? '390x844 touch' : '1280x800 mouse', 'arrows, drag, keyboard, zoom, rotate, home, save/reload');
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
