// Do parks survive closing the browser, and can a damaged save be recovered?
//
//   node webshell-restart.js [baseUrl] [browser]
//
// Uses a persistent browser profile on disk, so the second run is a genuinely new
// browser session reading storage written by the first, rather than a second tab.
// A park that only survives a reload is not saved; it is cached.
const playwright = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EXPECTED_PARK_NAME = 'Sunrise Test Park';
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
}

const waitForPlaying = (page, timeout = 240000) =>
  page.waitForSelector('button:has-text("Save & exit")', { timeout });

async function session(browserName, profile, run) {
  const context = await playwright[browserName].launchPersistentContext(profile, {
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: browserName === 'chromium' ? ['--no-sandbox'] : [],
  });
  try {
    return await run(context.pages()[0] ?? (await context.newPage()));
  } finally {
    await context.close();
  }
}

(async () => {
  const base = process.argv[2] || 'http://localhost:3000';
  const browserName = process.argv[3] || 'chromium';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `sunrise-profile-${browserName}-`));

  try {
    // --- first session: make a park and let it autosave ---------------------
    const created = await session(browserName, profile, async (page) => {
      await page.goto(`${base}/play?scenario=sunrise-test`, { waitUntil: 'domcontentloaded' });
      await waitForPlaying(page);
      await page.waitForSelector('text=Autosaved', { timeout: 120000 });
      await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="import-label"][data-ready="true"]', { timeout: 60000 });
      await page.click('[data-testid="rename"]');
      await page.fill('[data-testid="rename-input"]', 'Persistent Park');
      await page.click('[data-testid="rename-confirm"]');
      await sleep(1500);
      return page.evaluate(() => ({
        id: document.querySelector('[data-testid="park-card"]')?.getAttribute('data-park-id') ?? null,
        backend: document.body.textContent.match(/using ([^.]+)\./)?.[1] ?? '?',
      }));
    });
    check('a park is created and autosaved in the first session', Boolean(created.id));
    check('the storage backend is known', created.backend !== '?', created.backend);

    // --- second session: a brand new browser on the same profile -----------
    const afterRestart = await session(browserName, profile, async (page) => {
      await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="park-card"]', { timeout: 60000 });
      const card = await page.evaluate(() => {
        const node = document.querySelector('[data-testid="park-card"]');
        return {
          id: node.getAttribute('data-park-id'),
          name: node.querySelector('[data-testid="park-name"]')?.textContent ?? '',
          hasImage: Boolean(node.querySelector('img')),
        };
      });
      await page.goto(`${base}/play?save=${card.id}`, { waitUntil: 'domcontentloaded' });
      await waitForPlaying(page);
      await sleep(5000);
      const meta = await page.evaluate(() =>
        JSON.parse(window.Module.ccall('SunriseParkMetadataJson', 'string', [], [])));
      return { card, meta };
    });

    check('the park card survives a browser restart', afterRestart.card.id === created.id,
      afterRestart.card.name);
    check('the thumbnail survives a browser restart', afterRestart.card.hasImage);
    check('the park name survives a browser restart', afterRestart.card.name === 'Persistent Park',
      afterRestart.card.name);
    check('the park loads after a browser restart', afterRestart.meta.parkName === EXPECTED_PARK_NAME,
      `name "${afterRestart.meta.parkName}"`);
    check('the restored park still has its ride', afterRestart.meta.rideCount >= 1,
      `${afterRestart.meta.rideCount} ride(s)`);

    // --- recovery: damage the current generation, keep the previous one -----
    const recovery = await session(browserName, profile, async (page) => {
      await page.goto(`${base}/play?save=${created.id}`, { waitUntil: 'domcontentloaded' });
      await waitForPlaying(page);
      // Force a second generation so a previous copy exists, then corrupt the current.
      await page.waitForSelector('text=Autosaved', { timeout: 180000 });
      await page.goto(`${base}/parks`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="import-label"][data-ready="true"]', { timeout: 60000 });
      // Damage the current generation through whichever backend this browser uses,
      // leaving the previous generation intact. WebKit here has no Origin Private File
      // System, which is the reason the IndexedDB fallback exists.
      return page.evaluate(async (id) => {
        const junk = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
        const root = await navigator.storage?.getDirectory?.().catch(() => null);
        if (root) {
          const dir = await root.getDirectoryHandle('parks', { create: true });
          const names = [];
          for await (const name of dir.keys()) names.push(name);
          if (!names.includes(`${id}.park.previous`)) return { damaged: false, backend: 'opfs', names };
          const handle = await dir.getFileHandle(`${id}.park`, { create: true });
          const writer = await handle.createWritable();
          await writer.write(junk);
          await writer.close();
          return { damaged: true, backend: 'opfs' };
        }
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('sunrise-parks');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const keys = await new Promise((resolve) => {
          const q = db.transaction('blobs', 'readonly').objectStore('blobs').getAllKeys();
          q.onsuccess = () => resolve(q.result.map(String));
        });
        if (!keys.includes(`${id}.park.previous`)) return { damaged: false, backend: 'indexeddb', names: keys };
        await new Promise((resolve, reject) => {
          const tx = db.transaction('blobs', 'readwrite');
          tx.objectStore('blobs').put(junk, `${id}.park`);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        return { damaged: true, backend: 'indexeddb' };
      }, created.id);
    });

    if (recovery.damaged) {
      const recovered = await session(browserName, profile, async (page) => {
        await page.goto(`${base}/play?save=${created.id}`, { waitUntil: 'domcontentloaded' });
        await waitForPlaying(page);
        await sleep(5000);
        const notice = await page.evaluate(() => document.body.innerText);
        const meta = await page.evaluate(() =>
          JSON.parse(window.Module.ccall('SunriseParkMetadataJson', 'string', [], [])));
        return { notice, meta };
      });
      check('a damaged save falls back to the previous generation',
        recovered.meta.parkName === EXPECTED_PARK_NAME, `name "${recovered.meta.parkName}"`);
      check('the player is told the park was recovered', /[Rr]ecovered/.test(recovered.notice));
    } else {
      check('recovery generation exists to fall back to', false,
        `could not damage the current save on ${recovery.backend}`);
    }
  } catch (error) {
    check('test run completed', false, String(error).split('\n')[0].slice(0, 200));
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }

  const failed = results.filter((r) => !r.ok);
  const out = path.join(__dirname, 'results-web');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `restart-${browserName}.json`), JSON.stringify(results, null, 1));
  console.log(`\n   ${results.length - failed.length}/${results.length} checks passed in ${browserName}`);
  process.exit(failed.length === 0 ? 0 : 1);
})();
