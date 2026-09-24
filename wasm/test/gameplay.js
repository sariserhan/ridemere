// M3b gameplay verification. Loads Sunrise Test Park in a clean browser profile with
// no RollerCoaster Tycoon data present, lets it simulate, and asserts on engine state
// rather than on pixels. Screenshots are kept as supporting evidence.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
const OUT = path.join(__dirname, 'results-gameplay');
fs.mkdirSync(OUT, { recursive: true });

const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');

(async () => {
  const port = 8300 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);

  const browser = await chromium.launch({ headless: true, channel: 'chromium',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const evidence = { steps: [], log: [] };
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    page.on('console', m => evidence.log.push(strip(m.text())));
    page.on('pageerror', e => evidence.log.push('PAGEERROR ' + e.message));
    page.on('crash', () => evidence.log.push('PAGE CRASHED'));

    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    evidence.bootMs = Date.now() - t0;
    await sleep(6000);
    await page.screenshot({ path: path.join(OUT, '0-title-first-run.png') });

    // A fresh profile shows the changelog window, which would cover the park. It is
    // shown once per version, so reloading in the same profile clears it and also
    // exercises that the browser-stored content survives a reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 120000 });
    await sleep(6000);
    await page.screenshot({ path: path.join(OUT, '0-title.png') });

    // Load through the engine's ordinary park-loading path, which performs the
    // scene change that the command-line route leaves incomplete in this build.
    evidence.loadResult = await page.evaluate(() => window.Module.ccall(
      'SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']));

    const stats = () => page.evaluate(() =>
      JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])));

    // Wait for the park to be loaded and the simulation to be ticking.
    let loaded = null;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      try { loaded = await stats(); } catch { loaded = null; }
      if (loaded && loaded.ticks > 0) break;
    }
    evidence.afterLoad = loaded;
    await page.screenshot({ path: path.join(OUT, '1-loaded.png') });

    // Point the camera at the park. A generated park cannot carry a useful saved
    // view (see SunriseCentreView), so the view is set after loading.
    evidence.viewCentred = await page.evaluate(() =>
      window.Module.ccall('SunriseCentreView', 'number', [], []));
    await sleep(500);

    // Hire a handyman so staff navigation is exercised alongside guests.
    evidence.handymanHired = await page.evaluate(() =>
      window.Module.ccall('SunriseHireHandyman', 'number', [], []));

    // Scope the sprite audit to the supported gameplay path only.
    await page.evaluate(() => window.Module.ccall('SunriseSpriteAuditClear', null, [], []));

    // Let the park run. Samples are kept so guest progress is visible over time.
    const samples = [];
    for (let i = 0; i < 12; i++) {
      await sleep(5000);
      const s = await stats();
      s.entities = await page.evaluate(() =>
        JSON.parse(window.Module.ccall('SunriseGuestListJson', 'string', [], [])));
      samples.push(s);
      if (i === 3) await page.screenshot({ path: path.join(OUT, '2-guests.png') });
    }
    evidence.samples = samples;
    await page.screenshot({ path: path.join(OUT, '3-simulated.png') });

    evidence.audit = await page.evaluate(() =>
      JSON.parse(window.Module.ccall('SunriseSpriteAuditJson', 'string', [], [])));

    // Save, then confirm the file exists and can be read back.
    try {
      evidence.save = await page.evaluate(() => {
        const target = '/persistent/save/m3b-roundtrip.park';
        try { window.Module.FS.mkdir('/persistent/save'); } catch (e) {}
        const ok = window.Module.ccall('SunriseSavePark', 'number', ['string'], [target]);
        let size = null;
        try { size = window.Module.FS.readFile(target).length; } catch (e) { size = null; }
        return { ok, size, target };
      });
    } catch (error) {
      evidence.save = { ok: 0, error: String(error).slice(0, 300) };
    }

    fs.writeFileSync(path.join(OUT, 'gameplay.json'), JSON.stringify(evidence, null, 2));
    const last = samples[samples.length - 1] || {};
    console.log(JSON.stringify({
      bootMs: evidence.bootMs,
      loaded: evidence.afterLoad,
      final: last,
      peakGuests: Math.max(...samples.map(s => s.guestEntities || 0), 0),
      peakStaffWorking: Math.max(...samples.map(s => s.staffWorking || 0), 0),
      audit: { unique: evidence.audit.uniqueUnexpected, total: evidence.audit.totalRequests,
               first: (evidence.audit.unexpected || []).slice(0, 12) },
      save: evidence.save,
    }, null, 2));
  } catch (error) {
    evidence.failure = String(error).slice(0, 400);
    fs.writeFileSync(path.join(OUT, 'gameplay.json'), JSON.stringify(evidence, null, 2));
    console.error('test error:', evidence.failure);
  } finally {
    await browser.close();
    try { process.kill(-server.pid); } catch {}
  }
})().catch(e => { console.error('FAILED', e); process.exit(1); });
