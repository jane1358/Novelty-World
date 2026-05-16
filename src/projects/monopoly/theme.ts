import type { CSSProperties } from "react";
import type { PlayerColor, PropertyColor } from "./types";

/** Monopoly-specific palette. Applied as CSS custom properties on the board
 *  root, so every descendant can reference them via `var(--mono-*)` without
 *  polluting global tokens. */
export const MONOPOLY_THEME = {
  "--mono-brown": "#955436",
  "--mono-light-blue": "#aae0fa",
  "--mono-pink": "#d93a96",
  "--mono-orange": "#f7941d",
  "--mono-red": "#ed1b24",
  "--mono-yellow": "#fef200",
  "--mono-green": "#1fb25a",
  "--mono-dark-blue": "#0072bb",
  "--mono-board": "#1e1e1e",
  "--mono-card": "#141414",
  "--mono-ink": "#f5f5f5",
  "--mono-frame": "#000000",
  // Mid-gray for railroad/utility chips and icons that need to read against
  // the dark card without taking on a property-color identity.
  "--mono-neutral": "#525252",
  "--mono-player-crimson": "#b91c1c",
  "--mono-player-violet": "#7c3aed",
  "--mono-player-teal": "#0d9488",
  "--mono-player-amber": "#d97706",
  "--mono-player-emerald": "#059669",
  "--mono-player-indigo": "#4338ca",
  "--mono-player-magenta": "#c026d3",
  "--mono-player-slate": "#475569",
} as CSSProperties;

export const PROPERTY_COLOR_VAR: Record<PropertyColor, string> = {
  brown: "var(--mono-brown)",
  "light-blue": "var(--mono-light-blue)",
  pink: "var(--mono-pink)",
  orange: "var(--mono-orange)",
  red: "var(--mono-red)",
  yellow: "var(--mono-yellow)",
  green: "var(--mono-green)",
  "dark-blue": "var(--mono-dark-blue)",
};

export const PLAYER_COLOR_VAR: Record<PlayerColor, string> = {
  crimson: "var(--mono-player-crimson)",
  violet: "var(--mono-player-violet)",
  teal: "var(--mono-player-teal)",
  amber: "var(--mono-player-amber)",
  emerald: "var(--mono-player-emerald)",
  indigo: "var(--mono-player-indigo)",
  magenta: "var(--mono-player-magenta)",
  slate: "var(--mono-player-slate)",
};
