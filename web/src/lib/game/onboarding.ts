/**
 * The First Park onboarding.
 *
 * One instruction at a time, and every instruction decided from the park itself.
 *
 * Two rules shape this, and both are here because the alternatives fail a player:
 *
 * **A step completes when the player has done the thing, not when they have looked at
 * the menu for it.** "Open your coaster" is complete when a coaster is open, not when
 * the ride window was clicked. That is more work to check and it is the only version
 * worth having.
 *
 * **Progress is recomputed, never stored.** Every step is a pure function of scenario
 * state, so closing the tab and coming back lands on the same step, and importing
 * someone else's park lands on the step that park is actually at. Nothing about
 * onboarding goes into the park file, and the only thing kept on the save record is
 * whether the player has dismissed the panel, which is not derivable from anything.
 *
 * Progress runs forwards only: everything before the furthest step the park shows
 * evidence of counts as done. That matters for the one step whose evidence does not
 * survive a reload — see `furthestComplete`.
 *
 * A step also says when it is *ready*. Teaching restrooms before anyone needs one is
 * how a tutorial becomes noise, so the needs steps wait for the simulation to produce
 * the problem and for the alert layer to say so.
 */
import type { GuestAlertMessage } from "@/lib/bridge/messages";

/** The summary the engine sends for exactly these decisions. */
export interface ScenarioState {
  guests: number;
  rating: number;
  cash: number;
  rideOpen: boolean;
  rideCustomers: number;
  shopsOpen: number;
  hasFood: boolean;
  hasDrink: boolean;
  hasToilet: boolean;
  benches: number;
  bins: number;
  scenery: number;
  walls: number;
  handymen: number;
  mechanics: number;
  rideBroken: boolean;
  litter: number;
  viewX: number;
  viewY: number;
  /** How far the camera has moved from where the scenario opened, in world units. */
  viewMoved: number;
  objectiveGuests: number;
  objectiveRating: number;
  scenarioComplete: boolean;
  scenarioFailed?: boolean;
}

export interface OnboardingContext {
  state: ScenarioState;
  alerts: GuestAlertMessage[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  body: string;
  /** Is this step worth showing yet? */
  isReady: (context: OnboardingContext) => boolean;
  /** Has the player actually done it? */
  isComplete: (context: OnboardingContext) => boolean;
}

/** Two tiles, in world units. Less than this is the engine settling, not the player. */
const CAMERA_MOVED_UNITS = 64;

const alertOf = (context: OnboardingContext, kind: string) =>
  context.alerts.find((alert) => alert.kind === kind);

export const FIRST_PARK_STEPS: OnboardingStep[] = [
  {
    id: "camera",
    title: "Look around your park",
    body:
      "Choose Move view to drag the park, or use the camera arrows. Scroll or use + / − to zoom. " +
      "Everything you need is on screen: the entrance, the path, and a coaster waiting to open.",
    isReady: () => true,
    // Completed by actually moving the camera, measured against the view the scenario
    // opened on rather than against the first sample the shell happened to take: the
    // viewport settles for a second or two after a park loads, so "it changed since I
    // last looked" completes this step before the player has touched anything.
    isComplete: ({ state }) => state.viewMoved > CAMERA_MOVED_UNITS,
  },
  {
    id: "open-ride",
    title: "Open the coaster",
    body:
      "The coaster is built but closed. Click it, then press the green Open button in its window. " +
      "Guests will start queueing as soon as it opens.",
    isReady: () => true,
    isComplete: ({ state }) => state.rideOpen,
  },
  {
    id: "guests",
    title: "Watch your guests",
    body:
      "Guests arrive on their own now that something is open. Click one to see what they are thinking — " +
      "that is where every problem in the park shows up first.",
    isReady: ({ state }) => state.rideOpen,
    isComplete: ({ state }) => state.guests >= 15,
  },
  {
    id: "money",
    title: "Earn your first fares",
    body:
      "Entry to the park is free, so rides are what pay for it. Every guest who rides the coaster pays " +
      "its ticket price. Watch the cash in the bottom-left corner.",
    isReady: ({ state }) => state.rideOpen,
    isComplete: ({ state }) => state.rideCustomers >= 10,
  },
  {
    id: "food",
    title: "Your guests are hungry",
    body:
      "Open the rides menu and build a food stall beside a busy path. Stalls are built the same way as " +
      "rides, and you set the price when you open them.",
    isReady: (context) => alertOf(context, "GUESTS_HUNGRY") !== undefined,
    isComplete: ({ state }) => state.hasFood,
  },
  {
    id: "drink",
    title: "Your guests are thirsty",
    body: "A drink stall works the same way. Put it where guests already gather, not where there is room.",
    isReady: (context) => alertOf(context, "GUESTS_THIRSTY") !== undefined,
    isComplete: ({ state }) => state.hasDrink,
  },
  {
    id: "toilet",
    title: "Your guests need a restroom",
    body: "Build a restroom. It earns nothing, and a park without one loses guests and park rating quickly.",
    isReady: (context) => alertOf(context, "GUESTS_NEED_TOILET") !== undefined,
    isComplete: ({ state }) => state.hasToilet,
  },
  {
    id: "bench",
    title: "Give them somewhere to sit",
    body:
      "Benches are in the footpath menu. A guest who sits down rests, finishes their food and gets thirsty — " +
      "which is how a park with benches sells more drinks than one without.",
    isReady: ({ state }) => state.hasFood && state.guests >= 25,
    isComplete: ({ state }) => state.benches >= 6,
  },
  {
    id: "litter",
    title: "Keep the paths clean",
    body:
      "Guests drop what they have finished with. Put litter bins on the busy paths, and hire a handyman " +
      "from the staff menu to sweep up what misses them.",
    isReady: (context) => alertOf(context, "LITTER_BUILD_UP") !== undefined || context.state.litter >= 20,
    isComplete: ({ state }) => state.handymen >= 1 && state.bins >= 4,
  },
  {
    id: "mechanic",
    title: "A ride has broken down",
    body:
      "Hire a mechanic from the staff menu. Mechanics repair rides that break down and inspect the ones " +
      "that have not. Keep the ride exit connected to a path so the mechanic can reach it.",
    // Taught from the breakdown itself, not from a timer: the player has already seen
    // the ride stop and the alert appear before this says anything.
    isReady: ({ state }) => state.rideBroken,
    // Hiring is not the lesson. The lesson is that hiring fixes it, so this waits for
    // the ride to be working again — which the engine does by itself once the mechanic
    // arrives, with no reopening for the player to do.
    isComplete: ({ state }) => state.mechanics >= 1 && !state.rideBroken,
  },
  {
    id: "grow",
    title: "Grow the park",
    body:
      "That is everything you need. Keep your guests fed, watered and comfortable, keep the park rating up, " +
      "and grow until you reach the objective.",
    isReady: ({ state }) =>
      state.hasFood && state.hasDrink && state.hasToilet && state.handymen >= 1 && !state.rideBroken,
    // The last step is the scenario itself. It completes when the scenario does.
    isComplete: ({ state }) => state.scenarioComplete,
  },
];

/**
 * The furthest step the park shows evidence of, or -1 for none.
 *
 * Everything before it counts as done, whether or not its own test still passes. Most
 * of the tests are about lasting facts — a ride is open, a restroom exists — but one
 * is not: "you moved the camera" is measured from where the park opened, and a
 * resumed save opens exactly where the player left it, so that evidence is gone. A
 * player who has a coaster running has unquestionably worked out how to look around,
 * and a tutorial that asked them again would be reading its own notes rather than the
 * park.
 */
function furthestComplete(context: OnboardingContext): number {
  let furthest = -1;
  FIRST_PARK_STEPS.forEach((step, index) => {
    // Preventive maintenance is not evidence that the earlier lessons were learned.
    if (step.id === "mechanic") return;
    if (step.isComplete(context)) furthest = index;
  });
  return furthest;
}

/**
 * The one instruction to show, or null when there is nothing to say.
 *
 * The first step after the furthest evidence of progress that is ready and not yet
 * complete. A step that is not ready is skipped rather than blocking the ones behind
 * it, so a player who builds a restroom before being asked never sees that
 * instruction, and a park between the guided opening and its first real problem is
 * told nothing at all — which is the tutorial getting out of the way, not a fault.
 */
export function currentStep(context: OnboardingContext, scenarioId = "first-park"): OnboardingStep | null {
  // An active breakdown takes priority, even after completing the scenario.
  const mechanic = FIRST_PARK_STEPS.find((step) => step.id === "mechanic")!;
  if (context.state.scenarioFailed) return null;
  if (mechanic.isReady(context)) {
    return context.state.mechanics > 0
      ? {
          ...mechanic,
          title: "Your mechanic is on the job",
          body:
            "Your mechanic will repair the ride automatically. Check their status in the staff menu, " +
            "and keep the ride exit connected to a path. If you closed the ride, reopen it after the repair.",
        }
      : mechanic;
  }
  if (scenarioId !== "first-park") {
    if (context.state.scenarioComplete) return null;
    if (context.state.handymen === 0) return {
      id: "keep-clean", title: "Keep the paths clean",
      body: "Hire a handyman from the staff menu. Benches and bins help guests stay comfortable as the park fills up.",
      isReady: () => true, isComplete: ({ state }) => state.handymen > 0,
    };
    if (context.state.mechanics === 0) return {
      id: "prevent-breakdowns", title: "Plan for maintenance",
      body: "Hire a mechanic and keep each ride exit connected to a path. Inspections reduce wear; repairs keep guests riding.",
      isReady: () => true, isComplete: ({ state }) => state.mechanics > 0,
    };
    return {
      id: "scenario-grow",
      title: scenarioId === "small-footprint" ? "Make the most of your space" : "Build a destination",
      body: scenarioId === "small-footprint"
        ? "Add compact rides and short queues around the garden. Keep food, drinks and toilets easy to reach. Aim for 300 guests and a 700 park rating."
        : "Entry is $15 and rides are free. Add a mix of gentle and thrilling rides, spread facilities along the paths, and aim for 750 guests with a 700 rating.",
      isReady: () => true, isComplete: ({ state }) => state.scenarioComplete,
    };
  }
  const furthest = furthestComplete(context);
  for (let index = furthest + 1; index < FIRST_PARK_STEPS.length; index++) {
    const step = FIRST_PARK_STEPS[index];
    if (!step.isReady(context)) continue;
    if (step.isComplete(context)) continue;
    return step;
  }
  return null;
}

/** How far through the guided opening the park is, for a quiet progress line. */
export function progress(context: OnboardingContext, scenarioId = "first-park"): { done: number; total: number } {
  if (scenarioId !== "first-park") return { done: Number(context.state.handymen > 0) + Number(context.state.mechanics > 0) + Number(context.state.scenarioComplete), total: 3 };
  let done = furthestComplete(context) + 1;
  const mechanicIndex = FIRST_PARK_STEPS.findIndex((step) => step.id === "mechanic");
  // Count maintenance once the opening lessons are done, without letting an early
  // hire act as evidence that those lessons were completed.
  if (done === mechanicIndex && FIRST_PARK_STEPS[mechanicIndex].isComplete(context)) done++;
  return { done, total: FIRST_PARK_STEPS.length };
}
