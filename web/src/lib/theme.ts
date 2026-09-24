/**
 * The semantic colour tokens, shared with the game.
 *
 * Controls pick a role, never a colour. The game cannot use these hex values directly,
 * because it draws from a fixed palette, so it expresses the same roles through the
 * engine's named colour table. See docs/ui-design-system.md.
 */
export const COLOURS = {
  bg: "#131a24",
  raised: "#1e2836",
  sunken: "#0d131b",
  line: "#2c3a4d",
  accent: "#f2a341",
  accentQuiet: "#c07d24",
  secondary: "#4ea3c4",
  positive: "#5bb66a",
  warning: "#e0a92e",
  danger: "#d1573f",
  text: "#eef2f7",
  textQuiet: "#9aa8bd",
  disabled: "#55637a",
} as const;

export type ColourToken = keyof typeof COLOURS;
