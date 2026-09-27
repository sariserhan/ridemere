/** Local milestones survive deleting a save; the running engine decides completion. */
const KEY = "ridemere.completed-scenarios.v1";
export const SCENARIO_ORDER = ["first-park", "small-footprint", "growing-destination", "coaster-frontier"] as const;
export function completedScenarios(): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data.filter((id): id is string => typeof id === "string" && SCENARIO_ORDER.some(known => known === id)) : [];
  } catch { return []; }
}
export function markScenarioComplete(id: string): void {
  if (!SCENARIO_ORDER.some(known => known === id)) return;
  const completed = completedScenarios();
  if (completed.includes(id)) return;
  try { localStorage.setItem(KEY, JSON.stringify([...completed, id])); } catch { /* Playing remains possible when storage is unavailable. */ }
}
