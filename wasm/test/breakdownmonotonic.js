// Does a more worn ride accept a breakdown no later than a less worn one, on the same seed?
//
//   node breakdownmonotonic.js [minutes] [seeds]
//
// This is a correctness check on the engine's breakdown process, not a measurement. The
// exploratory sweep produced a perfectly inverted ordering — r80 accepted at 1.9 minutes,
// r60 at 7.3, r40 at 25.1 — which is the opposite of what `RideBreakdownUpdate` reads
// like. A perfect inversion of three has a one-in-six chance of being luck, so the
// ordering proves nothing either way and no product decision should rest on it.
//
// Shared seeds turn the question from statistical into deterministic. Two parks that
// differ only in `ride.reliability` consume identical randomness until one of them
// accepts a breakdown: reliability is not an input to anything else in the simulation.
// The roll is therefore made at the same tick, against the same random value, and only
// the threshold differs:
//
//     ScenarioRand() & 0x2FFFFF <= 1 + kRideInitialReliability - ride.reliability
//
// The worn ride's threshold is strictly wider, so any value the less worn ride accepts,
// the more worn ride also accepts. Its first acceptance must come at the same 256-tick
// window or an earlier one. Not usually. Always. If that fails, something in the assumed
// process is wrong — hidden randomness consumed elsewhere, a different eligibility path,
// or `breakdownPending` not representing the accepted roll — and tuning should stop until
// it is understood.
//
// What is compared is acceptance, not visible breakdown. `RidePrepareBreakdown` sets
// `breakdownPending`, and for restraints, doors and vehicle malfunctions `brokenDown`
// waits until the affected car is next used. So this would be a perfectly correct result
// and an invalid failure if the visible state were compared instead:
//
//     r40  pending 6.0m  brokenDown 9.0m
//     r80  pending 7.0m  brokenDown 7.2m
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TICKS_PER_MINUTE = 40 * 60;
const TICKS_PER_WINDOW = 256;

//: The roll runs once per 256 ticks, so sampling only has to land inside the right
//: window. At 40 ticks a second, half a second is 20 ticks.
const POLL_MS = 500;
//: An acceptance seen at poll time happened somewhere in the preceding interval, so a
//: measured window can be one late but never early. One window of slack, stated rather
//: than hidden, is what that sampling costs. Raw ticks are reported so any violation can
//: be read directly instead of through the tolerance.
const WINDOW_SLACK = 1;

//: The worn park must accept first. Listed worn-first so the assertion reads in order.
const WORN = { label: 'r40', park: 'DevScenarios/tuning-r40.park', reliability: 40 };
const FRESH = { label: 'r80', park: 'DevScenarios/tuning-r80.park', reliability: 80 };

//: Breakdown (Ride.h), for reporting which kind was accepted: whether it is one of the
//: kinds whose visible state lags matters for reading the table.
const REASON = {
  0: 'safetyCutOut', 1: 'restraintsStuckClosed', 2: 'restraintsStuckOpen',
  3: 'doorsStuckClosed', 4: 'doorsStuckOpen', 5: 'vehicleMalfunction',
  6: 'brakesFailure', 7: 'controlFailure',
};
const LAGGING = new Set([1, 2, 3, 4, 5]);

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

(async () => {
  const minutes = Number(process.argv[2] || 20);
  const seedCount = Number(process.argv[3] || 4);
  // Same generator as breakdownseeds.js, so a seed index means the same run in both.
  const seedFor = (i) => [0x1234567 + i * 7919, 0x89abcdef + i * 104729];

  const DIST = path.join(__dirname, '../../engine/openrct2/build/www-standalone');
  const port = 8974;
  const server = spawn('python3', [path.join(__dirname, '../scripts/serve.py'), DIST, String(port)], { stdio: 'ignore', detached: true });
  await sleep(1200);
  const browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox'] });

  // Nothing is done here beyond seeding and opening the ride. Every extra action — a
  // shop, a hire — is more randomness consumed, and the whole argument rests on both
  // parks consuming the same randomness in the same order.
  const runOne = async (candidate, seed, index) => {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    try {
      await page.goto(`http://localhost:${port}/?park=${encodeURIComponent(candidate.park)}`, { waitUntil: 'domcontentloaded' });
      await page.mouse.move(640, 400);
      await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 300000 });
      await sleep(9000); await page.mouse.move(640, 400);
      const call = (n, r, t, a) => page.evaluate(([n, r, t, a]) => window.Module.ccall(n, r, t, a), [n, r, t, a]);
      const ride = async () => JSON.parse(await call('SunriseRideBreakdownDebugJson', 'string', ['number'], [0]));
      const stats = async () => JSON.parse(await call('SunriseParkStatsJson', 'string', [], []));

      await call('SunriseSetRandomSeed', null, ['number', 'number'], seed);
      await call('SunriseSetRideStatus', 'number', ['number', 'number'], [0, 1]);

      const start = (await stats()).ticks;
      const target = start + minutes * TICKS_PER_MINUTE;
      let acceptedTick = null, acceptedReason = null, brokenTick = null;

      while (true) {
        await page.mouse.move(640, 400); await sleep(POLL_MS);
        const now = await stats();
        const state = await ride();
        // Acceptance is the roll passing, which is what sets breakdownPending. An
        // immediate kind sets brokenDown in the same breath, so either one means the
        // roll has been accepted.
        if (acceptedTick === null && (state.breakdownPending || state.brokenDown)) {
          acceptedTick = now.ticks;
          acceptedReason = state.breakdownPending
            ? state.breakdownReasonPending : state.breakdownReason;
        }
        if (brokenTick === null && state.brokenDown) brokenTick = now.ticks;
        if (now.ticks >= target) break;
      }

      const row = {
        label: candidate.label, seed: index, reliability: candidate.reliability,
        acceptedTick, acceptedReason, brokenTick,
        // Absolute window index: the gate is on the engine's own tick counter, and both
        // parks start from the same one, so these are directly comparable.
        acceptedWindow: acceptedTick === null ? null : Math.floor(acceptedTick / TICKS_PER_WINDOW),
        acceptedMin: acceptedTick === null ? null
          : Math.round((acceptedTick - start) / TICKS_PER_MINUTE * 100) / 100,
        brokenMin: brokenTick === null ? null
          : Math.round((brokenTick - start) / TICKS_PER_MINUTE * 100) / 100,
      };
      console.log(JSON.stringify(row));
      return row;
    } finally { await page.close(); }
  };

  const rows = [];
  try {
    for (let index = 0; index < seedCount; index++) {
      const seed = seedFor(index);
      const pair = await Promise.all([runOne(WORN, seed, index), runOne(FRESH, seed, index)]);
      rows.push(...pair);
    }
  } finally { try { process.kill(-server.pid); } catch {} await browser.close(); }

  console.log('\n seed  candidate  accepted            type                    brokenDown   pending->broken');
  for (const row of rows.sort((a, b) => a.seed - b.seed || a.label.localeCompare(b.label))) {
    const type = row.acceptedReason === null ? '-'
      : `${REASON[row.acceptedReason] ?? row.acceptedReason}${LAGGING.has(row.acceptedReason) ? ' (lags)' : ''}`;
    console.log(` ${String(row.seed).padStart(4)}  ${row.label.padEnd(9)}`
      + ` ${(row.acceptedMin === null ? 'none' : `${row.acceptedMin} min`).padEnd(19)}`
      + ` ${type.padEnd(23)}`
      + ` ${(row.brokenMin === null ? 'none' : `${row.brokenMin} min`).padEnd(12)}`
      + ` ${row.acceptedMin !== null && row.brokenMin !== null
          ? `${Math.round((row.brokenMin - row.acceptedMin) * 100) / 100} min` : '-'}`);
  }

  console.log('');
  let comparable = 0;
  for (let index = 0; index < seedCount; index++) {
    const worn = rows.find(r => r.seed === index && r.label === WORN.label);
    const fresh = rows.find(r => r.seed === index && r.label === FRESH.label);
    if (!worn || !fresh) continue;
    // A park that never accepted is infinitely late, which keeps the comparison valid
    // in the one direction that matters.
    const wornWindow = worn.acceptedWindow ?? Infinity;
    const freshWindow = fresh.acceptedWindow ?? Infinity;
    if (wornWindow === Infinity && freshWindow === Infinity) {
      console.log(`  seed ${index}: neither accepted a breakdown, nothing to compare`);
      continue;
    }
    comparable++;
    check(`seed ${index}: the worn ride accepts no later than the fresh one`,
      wornWindow <= freshWindow + WINDOW_SLACK,
      `${WORN.label} window ${wornWindow === Infinity ? 'none' : wornWindow}`
      + ` (tick ${worn.acceptedTick}), ${FRESH.label} window`
      + ` ${freshWindow === Infinity ? 'none' : freshWindow} (tick ${fresh.acceptedTick})`
      + `, slack ${WINDOW_SLACK} window`);
  }

  check('at least one seed produced a comparison', comparable > 0, `${comparable} of ${seedCount}`);
  if (failures > 0) {
    console.log('\nThe breakdown process does not behave the way the tuning assumes.'
      + ' Stop tuning wear and find out why before choosing any reliability value.');
  }
  console.log(failures === 0 ? 'BREAKDOWN MONOTONIC OK' : `BREAKDOWN MONOTONIC FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
