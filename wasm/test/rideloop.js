// M3e: observe one guest through the complete ride lifecycle, from engine state.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
const OUT = path.join(__dirname, 'results-ride'); fs.mkdirSync(OUT, { recursive: true });

const STATE = { 0:'falling',1:'one',2:'queuingFront',3:'onRide',4:'leavingRide',5:'walking',
  6:'queuing',7:'enteringRide',8:'sitting',9:'picked',10:'patrolling',11:'mowing',12:'sweeping',
  13:'enteringPark',14:'leavingPark',15:'answering',16:'fixing' };

(async () => {
  const port = 8900 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const evidence = { samples: [], log: [] };
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    page.on('console', m => evidence.log.push(m.text().replace(/\x1b\[[0-9;]*m/g, '')));
    page.on('crash', () => evidence.log.push('PAGE CRASHED'));

    // Park the cursor in the middle of the canvas. OpenRCT2 scrolls the view when the
    // pointer rests against a screen edge, and Playwright's default pointer position
    // is (0, 0), which drags the camera off the park and ruins every screenshot.
    const centreCursor = () => page.mouse.move(640, 400);

    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(5000);
    await page.reload({ waitUntil: 'domcontentloaded' });          // clears the first-run changelog
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 120000 });
    await sleep(5000);

    await page.evaluate(() => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/DevScenarios/sunrise-test.park']));
    await sleep(4000);
    await centreCursor();
    await page.evaluate(() => window.Module.ccall('SunriseCentreView', 'number', [], []));
    evidence.handyman = await page.evaluate(() => window.Module.ccall('SunriseHireHandyman', 'number', [], []));
    await page.evaluate(() => window.Module.ccall('SunriseSpriteAuditClear', null, [], []));

    const snapshot = () => page.evaluate(() => ({
      stats: JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])),
      peeps: JSON.parse(window.Module.ccall('SunriseGuestListJson', 'string', [], [])),
      rides: JSON.parse(window.Module.ccall('SunriseRideListJson', 'string', [], [])),
    }));

    const history = {};          // guest id -> [{tick,state}]
    let shots = 0;
    for (let i = 0; i < 110; i++) {
      const s = await snapshot();
      evidence.samples.push(s);
      for (const p of s.peeps) {
        if (p.kind !== 'guest') continue;
        const seq = history[p.id] || (history[p.id] = []);
        const name = STATE[p.state] || String(p.state);
        if (!seq.length || seq[seq.length - 1].state !== name) seq.push({ tick: s.stats.ticks, state: name });
      }
      if (s.stats.guestsQueuing > 0 && shots === 0) { await page.screenshot({ path: path.join(OUT, '2-queue.png') }); shots = 1; }
      if (s.stats.guestsOnRide > 0 && shots === 1) { await page.screenshot({ path: path.join(OUT, '3-riding.png') }); shots = 2; }
      await sleep(2000);
    }
    await page.screenshot({ path: path.join(OUT, '1-park.png') });

    evidence.history = history;
    evidence.audit = await page.evaluate(() => JSON.parse(window.Module.ccall('SunriseSpriteAuditJson', 'string', [], [])));
    evidence.save = await page.evaluate(() => {
      const target = '/persistent/save/m3e.park';
      try { window.Module.FS.mkdir('/persistent/save'); } catch (e) {}
      const ok = window.Module.ccall('SunriseSavePark', 'number', ['string'], [target]);
      let size = null; try { size = window.Module.FS.readFile(target).length; } catch (e) {}
      return { ok, size, target };
    });
    evidence.reload = await page.evaluate(() => {
      const ok = window.Module.ccall('SunriseLoadPark', 'number', ['string'], ['/persistent/save/m3e.park']);
      return { ok, stats: JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])),
               rides: JSON.parse(window.Module.ccall('SunriseRideListJson', 'string', [], [])) };
    });

    fs.writeFileSync(path.join(OUT, 'ride.json'), JSON.stringify(evidence, null, 2));
    const last = evidence.samples[evidence.samples.length - 1];
    console.log('final stats:', JSON.stringify(last.stats));
    console.log('final ride:', JSON.stringify(last.rides));
    for (const [id, seq] of Object.entries(history)) {
      console.log(`guest ${id}: ` + seq.map(e => `${e.tick}:${e.state}`).join(' -> '));
    }
    console.log('audit:', evidence.audit.uniqueUnexpected, 'unique', evidence.audit.totalRequests, 'hits');
    console.log('save:', JSON.stringify(evidence.save), 'reload ok:', evidence.reload.ok);
  } finally { await browser.close(); try { process.kill(-server.pid); } catch {} }
})().catch(e => { console.error('FAILED', e); process.exit(1); });
