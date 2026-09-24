// Scenery survives a save and a reload, in the same place and facing the same way.
//
//   node scenerysave.js
//
// A park file that kept the objects but lost their orientation would look almost
// right: a tree is a tree from any angle. It is the asymmetric pieces — the direction
// sign, the arch, the sloped run of fence — that would be silently wrong, and the
// only way to see it is to read the direction back rather than count elements.
//
// The art scene is used because it is the one park with an example of every object
// in it, and because its description says exactly which tile each one is on, so the
// test asks about tiles the scenario meant to fill rather than tiles it found full.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const description = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../assets/scenarios/world-art-test/scenario.json'), 'utf8'));

  // Every tile the description asks for scenery or a wall on, without duplicates.
  const tiles = new Map();
  for (const group of [...(description.scenery ?? []), ...(description.walls ?? [])])
    for (const [x, y] of group.tiles) tiles.set(`${x},${y}`, [x, y]);
  const probes = [...tiles.values()];

  const port = 8986;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await page.goto(`http://localhost:${port}/?park=${encodeURIComponent('DevScenarios/world-art-test.park')}`, { waitUntil: 'domcontentloaded' });
    await page.mouse.move(640, 400);
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    await sleep(8000); await page.mouse.move(640, 400);
    const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);

    const survey = async () => {
      const out = {};
      for (const [x, y] of probes) {
        const tile = JSON.parse(await call('SunriseTileDebugJson', 'string', ['number', 'number'], [x, y]));
        if (tile.scenery && tile.scenery.length) out[`${x},${y}`] = tile.scenery;
      }
      return out;
    };

    const before = await survey();
    const pieces = Object.values(before).reduce((n, list) => n + list.length, 0);
    const kinds = new Set(Object.values(before).flat().map(p => p.id));
    check('the art scene has scenery on the tiles its description names',
      pieces > 0, `${pieces} pieces across ${Object.keys(before).length} tiles`);
    check('every kind of object the description places is on the map',
      kinds.size >= 30, `${kinds.size} distinct objects`);
    const directions = new Set(Object.values(before).flat().map(p => p.direction));
    check('the scene uses more than one direction, so orientation can be lost',
      directions.size > 1, `directions ${[...directions].sort().join(', ')}`);

    check('the park saves', await call('SunriseSavePark', 'number', ['string'], ['/persistent/scenery.park']) === 1);
    check('the park reloads', await call('SunriseLoadPark', 'number', ['string'], ['/persistent/scenery.park']) === 1);
    for (let i = 0; i < 4; i++) { await page.mouse.move(640, 400); await sleep(2000); }

    const after = await survey();
    const differences = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const a = JSON.stringify(before[key] ?? null);
      const b = JSON.stringify(after[key] ?? null);
      if (a !== b) differences.push(`${key}: ${a} became ${b}`);
    }
    check('every piece comes back on the same tile, facing the same way, at the same height',
      differences.length === 0, differences.slice(0, 4).join(' | ') || `${pieces} pieces unchanged`);

    await page.screenshot({ path: path.join(__dirname, 'results-visual', 'scenery-reloaded.png') });
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }
  console.log(failures === 0 ? 'SCENERY SAVE OK' : `SCENERY SAVE FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
