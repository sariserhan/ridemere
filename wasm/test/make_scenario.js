// Drive the engine's exported park builder and copy the result out of the
// virtual filesystem. Usage: node make_scenario.js '<descriptionJson>' <outPath>
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const description = process.argv[2];
const outPath = process.argv[3];
const dist = path.join(__dirname, '../../engine/openrct2/build/www-standalone');

(async () => {
  const port = 8200 + Math.floor(Math.random() * 300);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dist, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext()).newPage();
    const log = [];
    page.on('console', m => log.push(m.text().replace(/\x1b\[[0-9;]*m/g, '')));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(6000);

    const result = await page.evaluate(({ desc, target }) => {
      const out = window.Module.ccall('SunriseBuildPark', 'string', ['string', 'string'], [desc, target]);
      let data = null;
      try { data = window.Module.FS.readFile(target); } catch (e) { data = null; }
      return { status: out, bytes: data ? Array.from(data) : null };
    }, { desc: description, target: '/persistent/generated.park' });

    const status = JSON.parse(result.status);
    console.log('engine:', result.status);
    for (const line of log.filter(l => /Built standalone park|could not|error|ERROR/i.test(l)).slice(0, 12)) {
      console.log('  log:', line.slice(0, 200));
    }
    if (!status.success || !result.bytes) {
      console.error('park generation failed');
      process.exitCode = 1;
    } else {
      fs.writeFileSync(outPath, Buffer.from(result.bytes));
    }
  } finally {
    await browser.close();
    try { process.kill(-server.pid); } catch {}
  }
})();
