// End-to-end acceptance test for the V1-0 product shell.
//
//   node webshell.js [baseUrl] [browser]
//
// Walks the whole journey a player takes and asserts the things that make it a
// product rather than a demo: the game route is isolated, the engine boots there, a
// park is created, autosaved, listed with a thumbnail, survives a reload, can be
// renamed, exported, deleted and imported again, and several parks stay independent.
//
// Assumes a server is already running at baseUrl (the wrapper script starts one).
const playwright = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUT = path.join(__dirname, 'results-web');
fs.mkdirSync(OUT, { recursive: true });

/** The scenario V1-0 ships. A park that is not this one has not really loaded. */
const EXPECTED_PARK_NAME = 'Sunrise Test Park';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
}

/** Wait for the game to reach the playing state, which the Save & exit button marks. */
async function waitForPlaying(page, timeout = 240000) {
  await page.waitForSelector('button:has-text("Save & exit")', { timeout });
}

async function waitForCards(page, count, timeout = 60000) {
  await page.waitForFunction(
    (expected) => document.querySelectorAll('[data-testid="park-card"]').length >= expected,
    count,
    { timeout },
  );
  // The card list renders before thumbnails and the storage estimate arrive, both of
  // which are asynchronous. Wait for the page to finish settling, or the test measures
  // a half-drawn screen.
  await page.waitForSelector('[data-testid="import-label"][data-ready="true"]', { timeout });
  await page.waitForFunction(() => /Stored in this browser/.test(document.body.textContent), null, { timeout });
}

(async () => {
  const base = process.argv[2] || 'http://localhost:3000';
  const browserName = process.argv[3] || 'chromium';
  const browser = await playwright[browserName].launch({
    headless: true,
    args: browserName === 'chromium' ? ['--no-sandbox'] : [],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));

  let exported = null;
  try {
    // --- the marketing shell is not isolated -------------------------------
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const shellIsolated = await page.evaluate(() => self.crossOriginIsolated === true);
    check('product shell is not cross-origin isolated', shellIsolated === false);

    // --- the game route is isolated ----------------------------------------
    await page.goto(`${base}/play?scenario=sunrise-test`, { waitUntil: 'domcontentloaded' });
    // Park the cursor in the middle of the map. A cursor left at (0, 0) sits on the
    // screen edge, which makes the game scroll continuously, and on the first toolbar
    // button, which shows its tooltip. The two together drag a trail of interface
    // across the park, and every frame after that is unreadable.
    await page.mouse.move(640, 400);
    const isolation = await page.evaluate(() => ({
      isolated: self.crossOriginIsolated === true,
      sab: typeof SharedArrayBuffer !== 'undefined',
    }));
    check('game route is cross-origin isolated', isolation.isolated);
    check('SharedArrayBuffer is available in the game route', isolation.sab);

    await waitForPlaying(page);
    await sleep(5000);
    const started = await page.evaluate(() =>
      JSON.parse(window.Module.ccall('SunriseParkMetadataJson', 'string', [], [])));
    check('the game boots in the product shell', true);
    check('a new park opens the chosen scenario', started.parkName === EXPECTED_PARK_NAME,
      `name "${started.parkName}", ${started.rideCount} ride(s)`);

    const noPrompt = await page.evaluate(() =>
      !document.body.textContent.match(/RollerCoaster|RCT2|locate your|install/i));
    check('no original-game import prompt appears', noPrompt);

    // A picture of the park as a player sees it in the shell, checked afterwards by
    // check_visual_smoke.py. Every assertion above passes on a park that has loaded
    // but is not on screen, which is exactly what the shell did from V1-0 until V1-3:
    // the camera opened off the map and the player saw a working toolbar over an empty
    // screen. Nothing programmatic noticed, because nothing programmatic looked.
    await page.mouse.move(640, 400);
    await sleep(4000);
    await page.screenshot({ path: path.join(OUT, `play-park-${browserName}.png`) });

    // --- first autosave -----------------------------------------------------
    await page.waitForSelector('text=Autosaved', { timeout: 120000 });
    check('the park autosaves without being asked', true);

    // --- it appears on the parks screen -------------------------------------
    await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
    await waitForCards(page, 1);
    await page.waitForSelector('[data-testid="park-card"] img', { timeout: 30000 }).catch(() => {});
    const firstCard = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="park-card"]');
      return {
        name: card.querySelector('[data-testid="park-name"]')?.textContent ?? '',
        hasImage: Boolean(card.querySelector('img')),
        text: card.textContent,
      };
    });
    check('the park is listed after autosave', firstCard.name.length > 0, firstCard.name);
    check('the card shows a thumbnail captured by the engine', firstCard.hasImage);
    check('the card shows park metadata', /guests/.test(firstCard.text));

    const backend = await page.evaluate(() => document.body.textContent.match(/using ([^.]+)\./)?.[1] ?? '?');
    check('the storage backend is reported', backend !== '?', backend);
    fs.writeFileSync(path.join(OUT, `backend-${browserName}.txt`), backend);

    // --- refresh and continue ----------------------------------------------
    const parkId = await page.getAttribute('[data-testid="park-card"]', 'data-park-id');
    await page.goto(`${base}/play?save=${parkId}`, { waitUntil: 'domcontentloaded' });
    await waitForPlaying(page);
    await sleep(5000);
    const resumed = await page.evaluate(() =>
      JSON.parse(window.Module.ccall('SunriseParkMetadataJson', 'string', [], [])));
    // Assert the park's actual content, not merely that something loaded. An engine
    // that silently falls back to an empty default park reports a ticking clock too.
    check('a saved park reopens with its own contents', resumed.parkName === EXPECTED_PARK_NAME,
      `name "${resumed.parkName}"`);
    check('the reopened park still has its ride', resumed.rideCount >= 1, `${resumed.rideCount} ride(s)`);
    check('the reopened park is simulating', resumed.ticks > 0, `tick ${resumed.ticks}`);

    // --- save and exit ------------------------------------------------------
    await page.click('button:has-text("Save & exit")');
    await page.waitForURL('**/parks', { timeout: 120000 });
    check('Save & exit returns to the parks screen', page.url().includes('/parks'));

    // --- rename -------------------------------------------------------------
    await waitForCards(page, 1);
    await page.click('[data-testid="rename"]');
    await page.fill('[data-testid="rename-input"]', 'Sunrise Grove');
    await page.click('[data-testid="rename-confirm"]');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="park-name"]')?.textContent === 'Sunrise Grove',
      null, { timeout: 15000 });
    // Reload before believing it: a rename that only changed the screen has not been
    // saved, and that difference is invisible until something reads storage again.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForCards(page, 1);
    const renamed = await page.evaluate(() =>
      document.querySelector('[data-testid="park-name"]')?.textContent ?? '');
    check('a park can be renamed', renamed === 'Sunrise Grove', renamed);

    // --- export -------------------------------------------------------------
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click('[data-testid="export"]'),
    ]);
    exported = path.join(os.tmpdir(), `webshell-${Date.now()}.park`);
    await download.saveAs(exported);
    const bytes = fs.readFileSync(exported);
    const magic = bytes.subarray(0, 4).toString('latin1');
    check('export downloads a park file', magic === 'PARK', `${download.suggestedFilename()}, ${bytes.length} bytes`);
    check('the exported filename uses the park name', /Sunrise-Grove/.test(download.suggestedFilename()),
      download.suggestedFilename());

    // --- multiple independent parks ----------------------------------------
    for (const label of ['Park B', 'Park C']) {
      await page.goto(`${base}/play?scenario=sunrise-test`, { waitUntil: 'domcontentloaded' });
      await waitForPlaying(page);
      await page.waitForSelector('text=Autosaved', { timeout: 120000 });
      await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
      await waitForCards(page, 1);
      await page.click('[data-testid="park-card"] [data-testid="rename"]');
      await page.fill('[data-testid="rename-input"]', label);
      await page.click('[data-testid="rename-confirm"]');
      await sleep(1000);
    }
    await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
    await waitForCards(page, 3);
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="park-name"]')].map(n => n.textContent));
    check('three parks exist side by side', names.length === 3, names.join(', '));
    check('renaming one park does not rename another', new Set(names).size === 3);

    const ids = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="park-card"]')].map(c => c.getAttribute('data-park-id')));
    check('each park has its own identifier', new Set(ids).size === 3);

    // --- delete affects only the chosen park --------------------------------
    page.once('dialog', d => d.accept());
    await page.click('[data-testid="park-card"] [data-testid="delete"]');
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="park-card"]').length === 2,
      null, { timeout: 20000 });
    const remaining = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="park-name"]')].map(n => n.textContent));
    check('delete removes exactly one park', remaining.length === 2, remaining.join(', '));

    // --- import the exported file back --------------------------------------
    await page.setInputFiles('[data-testid="import-input"]', exported);
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="park-card"]').length === 3,
      null, { timeout: 30000 });
    check('an exported park can be imported again', true);

    const importedId = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-testid="park-card"]')];
      const match = cards.find(c => c.querySelector('[data-testid="park-name"]').textContent.includes('Sunrise-Grove')
        || c.querySelector('[data-testid="park-name"]').textContent.includes('Sunrise Grove'));
      return (match ?? cards[0]).getAttribute('data-park-id');
    });
    await page.goto(`${base}/play?save=${importedId}`, { waitUntil: 'domcontentloaded' });
    await waitForPlaying(page);
    await sleep(5000);
    const importedMeta = await page.evaluate(() =>
      JSON.parse(window.Module.ccall('SunriseParkMetadataJson', 'string', [], [])));
    check('the imported park is the park that was exported', importedMeta.parkName === EXPECTED_PARK_NAME,
      `name "${importedMeta.parkName}"`);
    check('the imported park keeps its ride', importedMeta.rideCount >= 1,
      `${importedMeta.rideCount} ride(s)`);

    // --- rejecting rubbish ---------------------------------------------------
    await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
    await waitForCards(page, 1);
    const junk = path.join(os.tmpdir(), `webshell-junk-${Date.now()}.park`);
    fs.writeFileSync(junk, Buffer.from('this is not a park file, it is a sentence.'));
    await page.setInputFiles('[data-testid="import-input"]', junk);
    await page.waitForSelector('text=does not look like a park file', { timeout: 20000 });
    check('a file that is not a park is refused', true);
    fs.unlinkSync(junk);

    check('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  } catch (error) {
    check('test run completed', false, String(error).split('\n')[0].slice(0, 200));
    await page.screenshot({ path: path.join(OUT, `failure-${browserName}.png`) }).catch(() => {});
  } finally {
    if (exported && fs.existsSync(exported)) fs.unlinkSync(exported);
    await browser.close().catch(() => {});
  }

  const failed = results.filter(r => !r.ok);
  fs.writeFileSync(path.join(OUT, `webshell-${browserName}.json`), JSON.stringify(results, null, 1));
  console.log(`\n   ${results.length - failed.length}/${results.length} checks passed in ${browserName}`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
