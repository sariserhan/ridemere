// Regression cases for maintenance interrupting the guided opening. Node 22.18+.
const assert = require('node:assert/strict');
const { currentStep, progress } = require('../../web/src/lib/game/onboarding.ts');
const initial = {
  guests: 0, rating: 0, cash: 120000, rideOpen: false, rideCustomers: 0,
  shopsOpen: 0, hasFood: false, hasDrink: false, hasToilet: false,
  benches: 4, bins: 3, scenery: 44, walls: 2, handymen: 0, mechanics: 0,
  rideBroken: false, litter: 0, viewX: 0, viewY: 0, viewMoved: 0,
  objectiveGuests: 180, objectiveRating: 700, scenarioComplete: false,
};
const context = (state = {}, alerts = []) => ({ state: { ...initial, ...state }, alerts });
assert.equal(currentStep(context({ mechanics: 1 })).id, 'camera', 'early hiring must not skip the opening');
assert.equal(progress(context({ mechanics: 1 })).done, 0);
assert.equal(currentStep(context({ rideOpen: true, rideCustomers: 10, mechanics: 1 },
  [{ kind: 'GUESTS_HUNGRY' }])).id, 'food', 'preventive maintenance must not skip guest needs');
assert.equal(currentStep(context({ rideBroken: true })).id, 'mechanic', 'breakdown interrupts earlier lessons');
assert.match(currentStep(context({ rideBroken: true, mechanics: 1 })).title, /on the job/);
assert.equal(currentStep(context({ rideBroken: true, scenarioComplete: true })).id, 'mechanic');
assert.equal(currentStep(context({ mechanics: 1 }, [{ kind: 'RIDE_BROKEN_DOWN' }])).id,
  'camera', 'a stale alert must not claim a repaired ride is broken');
const operating = { rideOpen: true, rideCustomers: 50, guests: 100, hasFood: true,
  hasDrink: true, hasToilet: true, benches: 6, bins: 4, handymen: 1, mechanics: 1 };
assert.equal(currentStep(context({ ...operating, rideBroken: true })).id, 'mechanic');
assert.equal(currentStep(context(operating)).id, 'grow', 'repair restores the normal lesson');
assert.equal(progress(context(operating)).done, 10, 'completed maintenance counts after the opening lessons');
assert.equal(currentStep(context({ ...operating, scenarioComplete: true })), null);
assert.equal(currentStep(context({scenarioFailed:true})),null);
assert.equal(currentStep(context({scenarioFailed:true}),'small-footprint'),null);
console.log('ONBOARDING LOGIC OK (13 regression checks)');
