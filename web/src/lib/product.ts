/**
 * Every player-visible name for the product comes from here.
 *
 * "Project Sunrise" is a development codename and is not the name the game ships
 * under. Final naming happens before the interface milestone; keeping it in one place
 * means that rename is a one-line change and never a search through the engine.
 */
export const PRODUCT = {
  name: "Project Sunrise",
  shortName: "Sunrise",
  tagline: "Build a theme park in your browser.",
  /** Used for exported file names, so it must stay filesystem-safe. */
  fileSlug: "sunrise",
  codename: true,
} as const;
