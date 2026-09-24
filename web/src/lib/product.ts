/**
 * Every player-visible name for the product comes from here.
 *
 * "Ridemere" is a working product name, not a cleared trademark. Keeping it in one
 * place means a rename is a one-line change: it deliberately does not appear in engine
 * namespaces, object identifiers, standalone content identifiers or repository
 * history, all of which keep the original `sunrise` development prefix. Renaming the
 * product must never mean renaming the content.
 */
export const PRODUCT = {
  name: "Ridemere",
  shortName: "Ridemere",
  tagline: "Build a theme park in your browser.",
  /** Used for exported file names, so it must stay filesystem-safe. */
  fileSlug: "ridemere",
  /** True while the name is a working title rather than a cleared one. */
  workingName: true,
} as const;
