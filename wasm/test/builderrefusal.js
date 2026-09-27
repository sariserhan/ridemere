// The builder's refusal contract: a description the engine will not honour must not
// produce a scenario.
//
//   node builderrefusal.js
//
// This exists because every refusal in the park builder was inert and looked like it
// worked. `BuildParkFromDescription` ended with an unconditional `outcome.success =
// true`, which overwrote the `success = false` written when a bad setting was found
// while the ride was being built. The refusal message came back attached to a
// *successful* result, the .park was written, and `make_scenario.js` — which does check
// `success` — saw true and exited zero. Two guards printed exactly the right sentence
// and shipped the park anyway.
//
// A message is not a refusal. So this asserts the whole contract, both halves:
//
//   builder state      success=false, refused=true, and a message saying why
//   artifact effect    no .park on disk, and the caller exits non-zero
//
// and the positive companion, so the test cannot pass by refusing everything:
//
//   valid description  success=true, refused=false, a .park that exists and is non-empty
//
// The remaining half of the positive case — that the settings in the file are the
// settings the description asked for once the engine has loaded it — is asserted by
// scenariosettings.js against every shipped scenario, and that a shipped reliability
// then survives being played is asserted by reliabilitylever.js. Both need a park loaded
// through the player's path, which is those tests' harness rather than this one's.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.join(__dirname, '../..');
const DRIVER = path.join(__dirname, 'make_scenario.js');
const SCENARIOS = path.join(REPO, 'assets/scenarios');

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const load = (name) =>
  JSON.parse(fs.readFileSync(path.join(SCENARIOS, name, 'scenario.json'), 'utf8'));

// Each case is a real description with one thing wrong, so what is being tested is the
// guard and not a description the builder would have rejected for some other reason.
function cases() {
  const outOfRangeInterval = load('tuning-r60');
  outOfRangeInterval.coaster.inspectionInterval = 99;

  // Not a range error: the factor is derived by SetUnreliabilityFactor from the ride
  // type and its design and recomputed whenever the ratings are, so no value is
  // settable. A scenario asking for one has misunderstood the engine, and being told
  // that is more use than having the value silently replaced when the ride opens.
  const derivedFactor = load('tuning-r60');
  derivedFactor.coaster.unreliabilityFactor = 96;

  const outOfRangeReliability = load('tuning-r60');
  outOfRangeReliability.coaster.reliability = 0;

  // first-park's entrance is at 16,4 facing direction 1, so guests approach across
  // 16,3 — outside the owned land, which starts at y=5. Turning it around makes them
  // approach across 16,5, which is inside it.
  const badEntrance = load('first-park');
  badEntrance.entrance.direction = 3;

  const missingRide = load('carousel-test');
  missingRide.rides[0].object = 'sunrise.ride.does_not_exist';
  const disconnectedExit = load('carousel-test');
  disconnectedExit.rides[0].rideExit.x = 1;
  const invalidTower = load('drop-tower-test');
  invalidTower.rides[0].towerSections = 0;

  return [
    { name: 'an unavailable flat ride object', description: missingRide, expect: 'is not loaded' },
    { name: 'a flat ride exit with no adjacent station', description: disconnectedExit, expect: 'ride exit refused' },
    { name: 'a tower without any vertical sections', description: invalidTower, expect: 'towerSections' },
    { name: 'an inspection interval outside the engine\'s range',
      description: outOfRangeInterval, expect: 'inspectionInterval' },
    { name: 'an unreliability factor, which the engine derives and no scenario can set',
      description: derivedFactor, expect: 'SetUnreliabilityFactor' },
    { name: 'a starting reliability outside 1-100',
      description: outOfRangeReliability, expect: 'reliability 0 is outside' },
    { name: 'a park entrance guests approach from inside the park',
      description: badEntrance, expect: 'park entrance' },
  ];
}

function build(description, destination) {
  return new Promise((resolve) => {
    const child = spawn('node', [DRIVER, JSON.stringify(description), destination],
      { cwd: __dirname });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', (code) => {
      // make_scenario.js prints the engine's own result as `engine: {...}`.
      const line = out.split('\n').find(l => l.trim().startsWith('engine:'));
      let result = null;
      if (line) { try { result = JSON.parse(line.slice(line.indexOf('{'))); } catch {} }
      resolve({ code, result, out });
    });
  });
}

(async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'builderrefusal-'));
  try {
    for (const item of cases()) {
      const destination = path.join(scratch, 'refused.park');
      if (fs.existsSync(destination)) fs.unlinkSync(destination);
      const { code, result, out } = await build(item.description, destination);

      if (result === null) {
        check(`${item.name}: the engine returned a result`, false, out.slice(-400));
        continue;
      }
      check(`${item.name}: success is false`, result.success === false,
        `success=${result.success}`);
      check(`${item.name}: refused is true`, result.refused === true,
        `refused=${result.refused}`);
      check(`${item.name}: the message says why`,
        typeof result.message === 'string' && result.message.includes(item.expect),
        JSON.stringify(result.message ?? null).slice(0, 220));
      check(`${item.name}: no park was written`, !fs.existsSync(destination),
        fs.existsSync(destination) ? `${fs.statSync(destination).size} bytes were written`
          : undefined);
      check(`${item.name}: the caller exits non-zero`, code !== 0, `exit=${code}`);
    }

    // The positive companion. Without it every assertion above would pass on a builder
    // that refused every description it was given.
    const destination = path.join(scratch, 'accepted.park');
    const { code, result, out } = await build(load('tuning-r60'), destination);
    if (result === null) {
      check('a valid description: the engine returned a result', false, out.slice(-400));
    } else {
      check('a valid description: success is true', result.success === true,
        `success=${result.success}`);
      check('a valid description: refused is false', result.refused === false,
        `refused=${result.refused}`);
      check('a valid description: a park was written', fs.existsSync(destination));
      check('a valid description: the park is not empty',
        fs.existsSync(destination) && fs.statSync(destination).size > 1024,
        fs.existsSync(destination) ? `${fs.statSync(destination).size} bytes` : 'missing');
      check('a valid description: the caller exits zero', code === 0, `exit=${code}`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  console.log(failures === 0 ? 'BUILDER REFUSAL OK' : `BUILDER REFUSAL FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
})();
