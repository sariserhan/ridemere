/** Enter a new document so /play's COOP/COEP headers can enable WASM pthreads. */
export function enterGame(query: { scenario: string } | { save: string }): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Client routing cannot enable cross-origin isolation on the current document.
  window.location.assign(`/play?${new URLSearchParams(query)}`);
}
