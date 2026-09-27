// How often does First Park break down, per starting reliability, across the same seeds?
//
//   node breakdownseeds.js [minutes] [seeds] [parks...]
//
// The first tuning round compared one 25-minute run per candidate and said a shorter
// inspection interval caused *more* breakdowns. It was one sample of a rare event: at
// a hundred per cent reliability the chance of breaking inside 25 minutes is about one
// in seven, so three runs measure luck.
//
// So every candidate is run against the *same* seeds. `SunriseSetRandomSeed` seeds the
// scenario's random engine, which `ScenarioReset` otherwise takes from the wall clock.
// Paired that way, a difference between two candidates is the candidate.
//
// What is reported is a distribution, not a time: the point is that most players meet
// a breakdown during a normal run, not that it happens at any particular minute.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TICKS_PER_MINUTE = 40 * 60;

(async () => {
  const minutes = Number(process.argv[2] || 35);
  //: Seeds are added in batches until the candidates stop overlapping on the measures
  //: the decision turns on, or until the cap. Choosing a count in advance either wastes
  //: an hour of simulation or produces a table too wide to decide from.
  const FIRST_BATCH = Number(process.argv[3] || 6);
  const EXTRA_BATCH = 4;
  const MAX_SEEDS = Number(process.env.MAX_SEEDS || 18);
  const parks = process.argv.slice(4);
  const candidates = parks.length ? parks : [
    'DevScenarios/tuning-r80.park',
    'DevScenarios/tuning-r100.park',
  ];
  // Fixed and generated from the index, so seed 7 is the same run every time and a
  // later batch extends the set rather than replacing it.
  const seedFor = (i) => [0x1234567 + i * 7919, 0x89abcdef + i * 104729];

  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8979;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });
  const samples = [];

  const runOne = async (park, seed, index) => {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    try {
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 300000 });
      await sleep(9000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const stats = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));
      const scenario = async () => JSON.parse(await call('SunriseScenarioStateJson', 'string', [], []));

      // Optional acceleration uses the toolbar's click-to-cycle speed control. Timing stays in ticks.
      if (process.env.FAST === '1') {
        for (let i = 0; i < 3; i++) {
          await page.mouse.click(42, 12);
          await sleep(300);
        }
        await page.mouse.move(640, 400);
      }
      await call('SunriseSetRandomSeed', null, ['number', 'number'], seed);
      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);
      for (const [shop, x, y, dir, price] of [
        ['sunrise.ride.grill_stand', 13, 12, 2, 8],
        ['sunrise.ride.refreshment_stand', 13, 16, 2, 6],
        ['sunrise.ride.restroom', 19, 12, 0, 0]]) {
        const placed = JSON.parse(await call('SunrisePlaceShop', 'string', ['string', 'number', 'number', 'number', 'number'],
          [shop, x, y, dir, price]));
        if (!placed.ok) throw new Error(`Could not build ${shop}: ${JSON.stringify(placed)}`);
      }
      await call('SunriseHireHandyman', 'number', [], []);

      const start = (await stats()).ticks;
      const target = start + minutes * TICKS_PER_MINUTE;
      const breakTicks = [];
      let wasBroken = false;
      let brokenTicks = 0;
      let lastTick = start;
      // Diagnostic only. `RidePrepareBreakdown` sets breakdownPending when the roll is
      // accepted, and for restraints, doors and vehicle malfunctions `brokenDown` waits
      // until the affected car is next used. The product metric is brokenDown — that is
      // when the player sees the ride stop — but if a paired result looks wrong, this is
      // what says whether the reliability mechanism misbehaved or only the visible timing
      // lagged. Without it, an odd row looks like another reliability bug.
      let acceptedTick = null;
      let reportedAt = Date.now();

      while (true) {
        await page.mouse.move(640, 400); await sleep(2000);
        const now = await stats();
        const state = await ride();
        if (acceptedTick === null && (state.breakdownPending || state.brokenDown))
          acceptedTick = now.ticks - start;
        if (state.brokenDown && !wasBroken) breakTicks.push(now.ticks - start);
        if (state.brokenDown) brokenTicks += now.ticks - lastTick;
        wasBroken = state.brokenDown;
        lastTick = now.ticks;
        if (Date.now() - reportedAt > 30000) {
          console.log(`progress ${park} seed ${index}: ${((now.ticks - start) / TICKS_PER_MINUTE).toFixed(1)} game minutes`);
          reportedAt = Date.now();
        }
        if (now.ticks >= target) break;
      }

      const end = await scenario();
      const sample = {
        park: park.replace('DevScenarios/tuning-', '').replace('.park', ''),
        seed: index,
        firstMin: breakTicks.length ? Math.round(breakTicks[0] / TICKS_PER_MINUTE * 10) / 10 : null,
        acceptedMin: acceptedTick === null ? null
          : Math.round(acceptedTick / TICKS_PER_MINUTE * 10) / 10,
        breakdowns: breakTicks.length,
        downtimeMin: Math.round(brokenTicks / TICKS_PER_MINUTE * 10) / 10,
        guests: end.guests, rating: end.rating,
      };
      samples.push(sample);
      console.log(JSON.stringify(sample));
    } finally { await page.close(); }
  };

  const wilson = (successes, total) => {
    if (total === 0) return [0, 0];
    const z = 1.96;
    const p = successes / total;
    const denominator = 1 + z * z / total;
    const centre = (p + z * z / (2 * total)) / denominator;
    const half = z / denominator * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total));
    return [Math.max(0, centre - half), Math.min(1, centre + half)];
  };
  const withCI = (successes, total) => {
    const [low, high] = wilson(successes, total);
    return `${Math.round(successes / total * 100)}% (${Math.round(low * 100)}-${Math.round(high * 100)})`;
  };
  const percentile = (rows, fraction) => {
    const sorted = rows.map(r => r.firstMin === null ? Infinity : r.firstMin).sort((a, b) => a - b);
    const value = sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];
    return value === Infinity ? 'none' : value;
  };
  const shortName = (park) => park.replace('DevScenarios/tuning-', '').replace('.park', '');
  //: Keyed in the order the candidates were asked for, not the order their runs
  //: happened to finish: `Promise.all` resolves in whatever order the browsers get
  //: there, and "adjacent candidates" has to mean adjacent in reliability.
  const group = () => {
    const out = {};
    for (const park of candidates) out[shortName(park)] = [];
    for (const sample of samples) (out[sample.park] ??= []).push(sample);
    return out;
  };
  const before = (rows, limit) => rows.filter(r => r.firstMin !== null && r.firstMin < limit).length;

  //: Every candidate runs the same seeds, so the comparison between two of them is
  //: paired and the evidence lives in the seeds where they disagreed. Two Wilson
  //: intervals overlapping ignores that pairing entirely: candidates can look noisy
  //: apart and be perfectly consistent seed for seed.
  const discordance = (parkA, parkB, limit) => {
    const byPark = group();
    const seedsOf = (park) => new Map((byPark[park] ?? []).map(r => [r.seed, r]));
    const a = seedsOf(parkA), b = seedsOf(parkB);
    const shared = [...a.keys()].filter(seed => b.has(seed));
    const broke = (row) => row.firstMin !== null && row.firstMin < limit;
    let onlyA = 0, onlyB = 0, both = 0, neither = 0;
    for (const seed of shared) {
      const x = broke(a.get(seed)), y = broke(b.get(seed));
      if (x && y) both++;
      else if (x) onlyA++;
      else if (y) onlyB++;
      else neither++;
    }
    return { shared: shared.length, onlyA, onlyB, both, neither };
  };

  //: The decision turns on these two, so the seed count is driven by whether the
  //: candidates can be told apart on them.
  const DECIDING = [10, 20];
  //: The two deciding horizons plus the run's own length, so the last column
  //: always says what was actually observed rather than a fixed 35 that a
  //: shorter run cannot have measured.
  const HORIZONS = [...DECIDING, minutes];
  const stillOverlapping = () => {
    const byPark = group();
    //: A candidate with no samples has an interval of [0,0] that overlaps everything,
    //: which would spend the whole seed budget waiting for a run that is never coming.
    const parks = Object.keys(byPark).filter(p => byPark[p].length > 0);
    if (parks.length < 2) return false;
    for (const limit of DECIDING) {
      for (let a = 0; a < parks.length; a++) {
        for (let b = a + 1; b < parks.length; b++) {
          const rowsA = byPark[parks[a]], rowsB = byPark[parks[b]];
          const [lowA, highA] = wilson(before(rowsA, limit), rowsA.length);
          const [lowB, highB] = wilson(before(rowsB, limit), rowsB.length);
          if (lowA <= highB && lowB <= highA) return true;
        }
      }
    }
    return false;
  };

  let used = 0;
  let stopped = 'the cap';
  try {
    // One seed at a time, all candidates together: the candidates share the machine
    // equally, and ticks are what is measured so sharing does not move the numbers.
    while (used < MAX_SEEDS) {
      const batch = used === 0 ? FIRST_BATCH : EXTRA_BATCH;
      for (let index = used; index < Math.min(used + batch, MAX_SEEDS); index++) {
        await Promise.all(candidates.map(park => runOne(park, seedFor(index), index)));
      }
      used = Math.min(used + batch, MAX_SEEDS);
      if (!stillOverlapping()) { stopped = 'the candidates separated'; break; }
      if (used < MAX_SEEDS) console.log(`  candidates still overlap after ${used} seeds; adding ${EXTRA_BATCH} more`);
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  const byPark = group();
  console.log(`\n${used} seeds per candidate, ${minutes} minutes each`);
  console.log(`stopped because ${stopped}`);
  // Said plainly because it would be easy to over-read: seeds were added after looking
  // at the intervals, so these describe the spread of what was measured. They are not
  // fixed-sample 95% coverage and non-overlap here is not a significance test.
  console.log('intervals are 95% Wilson, descriptive only — the seed count was chosen'
    + ' adaptively, and the candidates share seeds so the comparison is paired');
  console.log(' reliability' + HORIZONS.map(h => `P(<${h}m)`.padStart(15)).join('')
    + '    p10   median    p90  mean breaks  no-break');
  for (const [park, rows] of Object.entries(byPark)) {
    const n = rows.length;
    if (n === 0) { console.log(` ${park.padEnd(12)} no runs completed`); continue; }
    const mean = Math.round(rows.reduce((total, r) => total + r.breakdowns, 0) / n * 100) / 100;
    console.log(` ${park.padEnd(12)}`
      + HORIZONS.map(h => withCI(before(rows, h), n).padStart(15)).join('')
      + ` ${String(percentile(rows, 0.1)).padStart(6)} ${String(percentile(rows, 0.5)).padStart(8)}`
      + ` ${String(percentile(rows, 0.9)).padStart(6)} ${String(mean).padStart(12)}`
      + ` ${String(rows.filter(r => r.firstMin === null).length + '/' + n).padStart(9)}`);
  }

  // The paired view: where two candidates disagreed on the same seed. This is where
  // the evidence that one breaks earlier than another actually is.
  const measured = Object.keys(byPark).filter(p => byPark[p].length > 0);
  if (measured.length >= 2) {
    console.log('\npaired, on shared seeds:');
    for (let i = 0; i + 1 < measured.length; i++) {
      const [a, b] = [measured[i], measured[i + 1]];
      for (const limit of DECIDING) {
        const d = discordance(a, b, limit);
        console.log(` ${a} vs ${b} at <${limit}m: ${a}-only ${d.onlyA}, ${b}-only ${d.onlyB},`
          + ` both ${d.both}, neither ${d.neither} (of ${d.shared} shared seeds)`);
      }
    }
  }

  // Against the product targets, so the choice is legible rather than eyeballed.
  // These are aims, not thresholds: a candidate missing one narrowly may still be the
  // best of those measured.
  console.log(`\ntargets: P(<10m) <= 15%, P(<20m) >= 60%, P(<${minutes}m) >= 85%, p10 >= 8 min,`
    + ' median 12-20 min, mean breaks <= ~1.5');
  for (const [park, rows] of Object.entries(byPark)) {
    const n = rows.length;
    if (n === 0) { console.log(` ${park.padEnd(12)} cannot be scored, no runs completed`); continue; }
    const p10 = percentile(rows, 0.1), median = percentile(rows, 0.5);
    const mean = rows.reduce((total, r) => total + r.breakdowns, 0) / n;
    const met = [
      ['P(<10m)', before(rows, 10) / n <= 0.15],
      ['P(<20m)', before(rows, 20) / n >= 0.60],
      [`P(<${minutes}m)`, before(rows, minutes) / n >= 0.85],
      ['p10', p10 !== 'none' && p10 >= 8],
      ['median', median !== 'none' && median >= 12 && median <= 20],
      ['mean breaks', mean <= 1.5],
    ];
    const missed = met.filter(([, ok]) => !ok).map(([name]) => name);
    console.log(` ${park.padEnd(12)} ${missed.length === 0 ? 'meets every target'
      : `misses ${missed.join(', ')}`}`);
  }
})();
