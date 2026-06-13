import {
  Bird,
  Car,
  Cat,
  Crown,
  Dog,
  Plane,
  Rocket,
  Ship,
  type LucideIcon,
} from "lucide-react";
import type { Player, PlayerIcon } from "../types";
import { PLAYER_COLOR_VAR } from "../theme";

/** Maps each player icon token to its lucide component. Shared so the board
 *  token and the lobby icon picker render the same glyph for a given icon. */
export const PLAYER_ICON_COMPONENTS: Record<PlayerIcon, LucideIcon> = {
  dog: Dog,
  car: Car,
  ship: Ship,
  crown: Crown,
  cat: Cat,
  plane: Plane,
  rocket: Rocket,
  bird: Bird,
};

interface Props {
  player: Player;
  /** Tailwind classes for sizing — callers supply width/height to control
   *  the token's size in their layout context (e.g. `h-6 w-6` or
   *  `h-[70%] aspect-square`). */
  className?: string;
}

export function PlayerToken({ player, className = "" }: Props) {
  const Icon = PLAYER_ICON_COMPONENTS[player.icon];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        backgroundColor: PLAYER_COLOR_VAR[player.color],
        color: "white",
        boxShadow: "0 0 0 1px var(--mono-frame)",
      }}
    >
      <Icon strokeWidth={2.5} style={{ width: "60%", height: "60%" }} />
    </div>
  );
}
