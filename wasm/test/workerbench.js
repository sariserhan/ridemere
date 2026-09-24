// Measure one pthread worker-pool configuration under loaded gameplay.
//
//   node workerbench.js <dist dir> [label]
//
// Records, for each workload stage: live and peak Web Workers, resident and private
// dirty memory, frame rate, engine tick rate and main-thread stalls. Then checks that
// the park is still correct: guests walking, queue moving, riders boarding, the train
// running, the handyman patrolling, the sprite audit clean, and save and reload
// working. A configuration that is fast but occasionally wrong is a failure.
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// A stuck page must show up as a recorded failure, never as a hung benchmark: every
// call into the page is bounded, and each configuration has an overall deadline.
const CALL_TIMEOUT_MS = 90000;
const CONFIG_DEADLINE_MS = 16 * 60 * 1000;
let deadline = Infinity;

function withTimeout(promise, ms, what) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms: ${what}`)), ms); }),
  ]);
}

const callPage = (page, fn, what, arg) =>
  withTimeout(page.evaluate(fn, arg), CALL_TIMEOUT_MS, what);

function checkDeadline(where) {
  if (Date.now() > deadline) throw new Error(`configuration deadline exceeded at ${where}`);
}

const OUT = path.join(__dirname, 'results-workers');
fs.mkdirSync(OUT, { recursive: true });

const STATE = { 0:'falling',1:'one',2:'queuingFront',3:'onRide',4:'leavingRide',5:'walking',
  6:'queuing',7:'enteringRide',8:'sitting',9:'picked',10:'patrolling',11:'mowing',12:'sweeping',
  13:'enteringPark',14:'leavingPark',15:'answering',16:'fixing' };

function rssSnapshot() {
  const pids = execSync("pgrep -f 'chrome-linux64/chrom[e]' || true").toString().trim().split('\n').filter(Boolean);
  let rss = 0, pss = 0, priv = 0;
  for (const pid of pids) {
    try {
      const s = fs.readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
      const g = k => +(s.match(new RegExp(k + ':\\s+(\\d+) kB')) || [0, 0])[1];
      rss += g('Rss'); pss += g('Pss'); priv += g('Private_Dirty');
    } catch {}
  }
  const mb = v => Math.round(v / 1024);
  return { rssMB: mb(rss), pssMB: mb(pss), privDirtyMB: mb(priv), processes: pids.length };
}

// Counts every Worker the page constructs, before any page script runs, so the tally
// does not depend on when the harness happens to look.
const WORKER_PROBE = `
  (() => {
    const log = { created: 0, terminated: 0, events: [], peak: 0, live: 0 };
    window.__workerProbe = log;
    const Native = window.Worker;
    window.Worker = function (url, opts) {
      const w = new Native(url, opts);
      log.created++; log.live++; log.peak = Math.max(log.peak, log.live);
      log.events.push({ t: Math.round(performance.now()), kind: 'create', live: log.live });
      const terminate = w.terminate.bind(w);
      w.terminate = function () {
        log.terminated++; log.live--;
        log.events.push({ t: Math.round(performance.now()), kind: 'terminate', live: log.live });
        return terminate();
      };
      return w;
    };
    window.Worker.prototype = Native.prototype;
  })();
`;

async function probe(page) {
  return page.evaluate(() => {
    const p = window.__workerProbe || { created: 0, terminated: 0, peak: 0, live: 0, events: [] };
    const M = window.Module || {};
    const T = M.PThread;
    return {
      created: p.created, terminated: p.terminated, peak: p.peak, live: p.live,
      unusedWorkers: T && T.unusedWorkers ? T.unusedWorkers.length : null,
      runningWorkers: T && T.runningWorkers ? T.runningWorkers.length : null,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };
  });
}

const stats = page => callPage(page, () =>
  JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])), 'park stats');
const rides = page => callPage(page, () =>
  JSON.parse(window.Module.ccall('SunriseRideListJson', 'string', [], [])), 'ride list');
const peeps = page => callPage(page, () =>
  JSON.parse(window.Module.ccall('SunriseGuestListJson', 'string', [], [])), 'guest list');

// Frame rate plus the worst gap between animation frames, which is what a blocked
// main thread looks like from inside the page.
async function pace(page, ms) {
  return withTimeout(page.evaluate(duration => new Promise(resolve => {
    let frames = 0, worst = 0, last = performance.now();
    const start = last;
    const tick = () => {
      const now = performance.now();
      worst = Math.max(worst, now - last); last = now; frames++;
      if (now - start < duration) requestAnimationFrame(tick);
      else resolve({ fps: Math.round(frames / ((now - start) / 1000)), worstFrameGapMs: Math.round(worst) });
    };
    requestAnimationFrame(tick);
  }), ms), ms + CALL_TIMEOUT_MS, 'frame pacing').catch(() => ({ fps: null, worstFrameGapMs: null }));
}

async function stage(page, name, targetGuests, reached, zoom) {
  checkDeadline(name);
  const started = Date.now();
  if (targetGuests > reached) {
    await callPage(page, n => window.Module.ccall('SunriseGenerateGuests', 'number', ['number'], [n]),
      'generate guests', targetGuests - reached);
  }
  if (zoom !== undefined) {
    await callPage(page, z => window.Module.ccall('SunriseSetZoom', 'number', ['number'], [z]), 'set zoom', zoom);
  }
  await sleep(8000);
  const before = await stats(page);
  const t0 = Date.now();
  const pacing = await pace(page, 4000);
  const after = await stats(page);
  const seconds = (Date.now() - t0) / 1000;
  return {
    wallClockMs: Date.now() - started,
    stage: name, targetGuests, zoom: zoom === undefined ? 0 : zoom,
    guestEntities: after.guestEntities, guestsInPark: after.guestsInPark,
    fps: pacing.fps, worstFrameGapMs: pacing.worstFrameGapMs,
    ticksPerSecond: +((after.ticks - before.ticks) / seconds).toFixed(1),
    memory: rssSnapshot(), workers: await probe(page),
  };
}

(async () => {
  const dir = path.resolve(process.argv[2]);
  const config = JSON.parse(fs.readFileSync(path.join(dir, 'build-config.json'), 'utf8'));
  const label = process.argv[3] || config.label;
  const port = 8400 + Math.floor(Math.random() * 400);
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), dir, String(port)],
    { stdio: 'ignore', detached: true });
  await sleep(1200);

  const result = { label, config, stages: [], console: [], pageErrors: [],
    crashed: false, deadlock: false };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(WORKER_PROBE);
    const page = await context.newPage();
    page.on('crash', () => { result.crashed = true; });
    page.on('pageerror', e => result.pageErrors.push(String(e).slice(0, 300)));
    page.on('console', m => {
      const text = m.text();
      if (/exhaust|EAGAIN|deadlock|pthread|worker/i.test(text)) result.console.push(text.slice(0, 300));
    });

    deadline = Date.now() + CONFIG_DEADLINE_MS;
    await page.goto('about:blank'); await sleep(1500);
    result.idle = rssSnapshot();

    const t0 = Date.now();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 180000 });
    } catch {
      result.deadlock = true;                      // never reached a running state
      result.afterBoot = await probe(page).catch(() => null);
      throw new Error('boot did not complete: the engine never reached a running state');
    }
    result.bootMs = Date.now() - t0;
    await sleep(6000);
    // The engine scrolls the view when the pointer rests on a screen edge.
    await page.mouse.move(640, 400);
    result.afterBoot = await probe(page);

    const tLoad = Date.now();
    await callPage(page, () => window.Module.ccall('SunriseLoadPark', 'number', ['string'],
      ['/OpenRCT2/standalone/Scenarios/sunrise-test.park']), 'load park');
    await sleep(4000);
    await callPage(page, () => window.Module.ccall('SunriseCentreView', 'number', [], []), 'centre view');
    result.gameReadyMs = Date.now() - tLoad + result.bootMs;
    await callPage(page, () => window.Module.ccall('SunriseHireHandyman', 'number', [], []), 'hire handyman');
    await callPage(page, () => window.Module.ccall('SunriseSpriteAuditClear', null, [], []), 'clear audit');

    // --- correctness: watch a full ride lifecycle at this worker configuration ---
    const history = {};
    const staffPositions = new Set();
    const rideSamples = [];
    // Sample until guests have been seen through the whole lifecycle, or until the
    // window closes. A fixed number of samples would fail a healthy configuration
    // simply for covering a shorter stretch of park time than the first ride takes,
    // so the window ends on the evidence rather than on a count.
    const ordered = ['walking', 'queuing', 'enteringRide', 'onRide', 'leavingRide', 'walking'];
    const fullLoops = () => Object.entries(history).filter(([, seq]) => {
      let at = 0;
      for (const step of seq) if (step.state === ordered[at]) { at++; if (at === ordered.length) return true; }
      return false;
    });
    let samples = 0;
    const CORRECTNESS_MAX_SAMPLES = 140;
    while (samples < CORRECTNESS_MAX_SAMPLES) {
      checkDeadline('correctness sampling');
      samples++;
      const [s, p, r] = [await stats(page), await peeps(page), await rides(page)];
      rideSamples.push({ ticks: s.ticks, ride: r[0] || null, stats: s });
      for (const entity of p) {
        if (entity.kind === 'guest') {
          const seq = history[entity.id] || (history[entity.id] = []);
          const name = STATE[entity.state] || String(entity.state);
          if (!seq.length || seq[seq.length - 1].state !== name) seq.push({ tick: s.ticks, state: name });
        } else {
          staffPositions.add(`${entity.x},${entity.y}`);
        }
      }
      if (fullLoops().length >= 2 && staffPositions.size >= 20) break;
      await sleep(1600);
    }
    const completed = fullLoops();
    result.correctness = {
      samples,
      guestsSeen: Object.keys(history).length,
      guestsCompletingFullLoop: completed.length,
      exampleTrace: completed.length
        ? { id: +completed[0][0], sequence: history[completed[0][0]].map(s => `${s.tick}:${s.state}`) }
        : null,
      peakQueue: Math.max(...rideSamples.map(s => (s.ride && s.ride.queueLength) || 0)),
      peakRiders: Math.max(...rideSamples.map(s => (s.ride && s.ride.numRiders) || 0)),
      totalCustomers: rideSamples[rideSamples.length - 1].ride?.totalCustomers ?? 0,
      distinctTrainPositions: new Set(rideSamples
        .filter(s => s.ride && s.ride.vehicleFound)
        .map(s => `${s.ride.vehicleX},${s.ride.vehicleY},${s.ride.vehicleZ}`)).size,
      peakTrainVelocity: Math.max(...rideSamples.map(s => (s.ride && s.ride.velocity) || 0)),
      rideOpenThroughout: rideSamples.every(s => s.ride && s.ride.status === 1),
      handymanDistinctPositions: staffPositions.size,
      ticksAdvanced: rideSamples[rideSamples.length - 1].ticks - rideSamples[0].ticks,
    };

    // --- workloads ---
    let reached = (await stats(page)).guestEntities;
    result.stages.push(await stage(page, 'W0 loaded park', reached, reached));
    for (const [name, target] of [['W1 100 guests', 100], ['W2 500 guests', 500], ['W3 1000 guests', 1000]]) {
      result.stages.push(await stage(page, name, target, reached));
      reached = Math.max(reached, target);
      if (result.crashed) break;
    }
    // Render stress: the same park zoomed out, which splits the viewport into many
    // more paint columns over many more tiles, at the highest population.
    if (!result.crashed) {
      result.stages.push(await stage(page, 'W4 render stress (zoom 3)', reached, reached, 3));
      await callPage(page, () => window.Module.ccall('SunriseSetZoom', 'number', ['number'], [0]), 'reset zoom');
    }

    // --- save and reload at this configuration ---
    result.audit = await callPage(page, () =>
      JSON.parse(window.Module.ccall('SunriseSpriteAuditJson', 'string', [], [])), 'sprite audit');
    result.save = await callPage(page, () => {
      try { window.Module.FS.mkdir('/persistent/save'); } catch {}
      const ok = window.Module.ccall('SunriseSavePark', 'number', ['string'], ['/persistent/save/m3f.park']);
      let size = 0;
      try { size = window.Module.FS.stat('/persistent/save/m3f.park').size; } catch {}
      return { ok, size };
    }, 'save park');
    await sleep(1500);
    result.reload = await callPage(page, () => {
      const ok = window.Module.ccall('SunriseLoadPark', 'number', ['string'], ['/persistent/save/m3f.park']);
      return { ok, stats: JSON.parse(window.Module.ccall('SunriseParkStatsJson', 'string', [], [])),
        rides: JSON.parse(window.Module.ccall('SunriseRideListJson', 'string', [], [])) };
    }, 'reload park');
    result.finalWorkers = await probe(page);
    result.survived = !result.crashed;
  } catch (e) {
    result.fatal = String(e).slice(0, 500);
  } finally {
    try { process.kill(-server.pid); } catch {}
    if (browser) await browser.close().catch(() => {});
  }
  fs.writeFileSync(path.join(OUT, `${label}.json`), JSON.stringify(result, null, 1));
  const c = result.correctness || {};
  console.log(JSON.stringify({
    label, boot: result.bootMs, peakWorkers: result.finalWorkers?.peak ?? result.afterBoot?.peak,
    liveWorkers: result.finalWorkers?.live, fullLoops: c.guestsCompletingFullLoop,
    audit: result.audit?.uniqueUnexpected, save: result.save?.ok, reload: result.reload?.ok,
    crashed: result.crashed, deadlock: result.deadlock, fatal: result.fatal,
  }));
})();
