import { Droplets, Train, Zap } from "lucide-react";
import { SPACES } from "../data";
import { PROPERTY_COLOR_VAR } from "../theme";
import type { GameState, Player } from "../types";
import { PlayerToken } from "./player-token";

interface Props {
  state: GameState;
}

export function Header({ state }: Props) {
  // When five or more players are present the header would crowd the board
  // off-screen, so cap it at 4.5 rows (each row is h-11) and scroll the
  // overflow. The half-row peek signals there's more below.
  const scrollable = state.players.length > 4;
  return (
    <div
      className={`flex shrink-0 flex-col ${
        scrollable ? "max-h-[12.375rem] overflow-y-auto" : ""
      }`}
    >
      {state.players.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          ownership={state.ownership}
          mortgaged={state.mortgaged}
        />
      ))}
    </div>
  );
}

function PlayerRow({
  player,
  ownership,
  mortgaged,
}: {
  player: Player;
  ownership: Readonly<Record<number, string>>;
  mortgaged: Readonly<Record<number, boolean>>;
}) {
  const owned = Object.entries(ownership)
    .filter(([, pid]) => pid === player.id)
    .map(([pos]) => Number(pos))
    .sort((a, b) => a - b);
  return (
    <div
      className="flex h-11 shrink-0 items-center gap-2 px-2"
      style={{
        backgroundColor: "var(--mono-board)",
        color: "var(--mono-ink)",
        boxShadow: "inset 0 -1px 0 var(--mono-frame)",
      }}
    >
      <PlayerToken player={player} className="h-7 w-7" />
      <div
        className="flex shrink-0 flex-col leading-tight"
        style={{ minWidth: "3.5rem" }}
      >
        <span className="truncate text-sm font-semibold">{player.name}</span>
        <span className="font-mono text-xs">
          ${player.cash.toLocaleString("en-US")}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {owned.map((pos) => (
          <OwnedChip
            key={pos}
            position={pos}
            mortgaged={mortgaged[pos] ?? false}
          />
        ))}
      </div>
    </div>
  );
}

function OwnedChip({
  position,
  mortgaged,
}: {
  position: number;
  mortgaged: boolean;
}) {
  const space = SPACES[position];
  const baseClasses =
    "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-sm";

  switch (space.kind) {
    case "property":
      return (
        <div
          className={baseClasses}
          style={{
            backgroundColor: PROPERTY_COLOR_VAR[space.color],
            boxShadow: "inset 0 0 0 1px var(--mono-frame)",
          }}
        >
          {mortgaged && <MortgageMarker />}
        </div>
      );
    case "railroad":
      return (
        <div
          className={baseClasses}
          style={{ backgroundColor: "var(--mono-neutral)" }}
        >
          <Train
            strokeWidth={2}
            style={{ width: "70%", height: "70%", color: "white" }}
          />
          {mortgaged && <MortgageMarker />}
        </div>
      );
    case "utility": {
      const Icon = space.name === "Electric Company" ? Zap : Droplets;
      return (
        <div
          className={baseClasses}
          style={{ backgroundColor: "var(--mono-neutral)" }}
        >
          <Icon
            strokeWidth={2}
            style={{ width: "70%", height: "70%", color: "white" }}
          />
          {mortgaged && <MortgageMarker />}
        </div>
      );
    }
    default:
      // Non-ownable spaces won't appear in the ownership map. This branch is
      // unreachable in practice but keeps the switch exhaustive.
      return null;
  }
}

function MortgageMarker() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        x1="0"
        y1="0"
        x2="100"
        y2="100"
        stroke="white"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="100"
        y1="0"
        x2="0"
        y2="100"
        stroke="white"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
