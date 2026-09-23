// M3 acceptance: the standalone build must boot with no RollerCoaster Tycoon data
// present and must never ask for any.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const { spawn } = require('child_process');
const OUT = path.join(__dirname, 'results-standalone'); fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // Serve the distribution itself so the test needs no external setup.
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8400 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const BASE = `http://localhost:${port}/`;

  const browser = await chromium.launch({ headless: true, channel: 'chromium',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const log = [];
  page.on('console', m => log.push(m.text()));
  page.on('pageerror', e => log.push('PAGEERROR ' + e.message));
  page.on('crash', () => log.push('PAGE CRASHED'));

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  // Wait for the engine to reach a running state: boot overlay gone, canvas shown.
  let booted = false;
  for (let i = 0; i < 180; i++) {
    booted = await page.evaluate(() => !document.getElementById('boot')
      && document.getElementById('canvas')?.style.display === '').catch(() => false);
    if (booted) break;
    await sleep(500);
  }
  const bootMs = Date.now() - t0;
  await sleep(12000);
  await page.screenshot({ path: path.join(OUT, 'standalone-boot.png') });

  // Ask the engine for its sprite audit. The in-game console renders to the canvas,
  // so the report is written to a file and read back out of the virtual filesystem.
  let auditReport = null;
  try {
    await page.click('#canvas', { position: { x: 640, y: 500 } });
    await page.keyboard.press('Backquote');
    await sleep(700);
    await page.keyboard.type('sprite_audit write', { delay: 12 });
    await page.keyboard.press('Enter');
    await sleep(2500);
    await page.keyboard.press('Backquote');
    await sleep(500);
    auditReport = await page.evaluate(() => {
      try { return window.Module.FS.readFile('/persistent/sprite-audit.txt', { encoding: 'utf8' }); }
      catch (e) { return 'unavailable: ' + e.message; }
    });
  } catch (e) { auditReport = 'console interaction failed: ' + e.message; }
  fs.writeFileSync(path.join(OUT, 'sprite-audit.txt'), auditReport || '');

  const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');
  const text = log.map(strip).join('\n');
  const state = await page.evaluate(() => {
    const M = window.Module;
    const ls = p => { try { return M.FS.readdir(p).filter(x => x !== '.' && x !== '..'); } catch { return null; } };
    return {
      objects: (ls('/OpenRCT2/object') || []).length,
      standalone: ls('/OpenRCT2/standalone'),
      standaloneData: ls('/OpenRCT2/standalone/Data'),
      persistent: ls('/persistent'),
      canvas: [document.getElementById('canvas').width, document.getElementById('canvas').height],
    };
  }).catch(e => ({ err: e.message }));

  const result = {
    baseUrl: BASE,
    bootMs, booted,
    promptShown: /select your RCT2|RCT2 assets|Locate RCT2/i.test(text),
    rct2Required: /RCT2 install directory must be specified/i.test(text),
    standaloneEnabled: /Standalone content enabled/i.test(text),
    spriteAuditArmed: /Sprite audit armed/i.test(text),
    objectIndex: (text.match(/Building object index \((\d+) items\)/) || [])[1],
    fatal: (text.match(/^.*FATAL.*$/gm) || []).slice(0, 5),
    errors: (text.match(/^.*ERROR.*$/gm) || []).slice(0, 10),
    state,
    auditHead: (auditReport || '').split('\n').slice(0, 6).join('\n'),
  };
  fs.writeFileSync(path.join(OUT, 'standalone.json'), JSON.stringify({ ...result, log: log.map(strip) }, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  try { process.kill(-server.pid); } catch {}
})().catch(e => { console.error('FAILED', e); process.exit(1); });
