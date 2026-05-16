import type { CSSProperties, ReactNode } from "react";
import { Diamond, Dice5, Droplets, Package, Train, Zap } from "lucide-react";
import { SPACES } from "../data";
import { rentAt, type RentDisplay } from "../logic";
import { PLAYER_COLOR_VAR, PROPERTY_COLOR_VAR } from "../theme";
import type { GameState, Player, Space } from "../types";
import { PlayerToken } from "./player-token";

interface Props {
  state: GameState;
  position: number;
}

export function SquareRow({ state, position }: Props) {
  const space = SPACES[position];
  const ownerId = state.ownership[position];
  const owner = ownerId
    ? state.players.find((p) => p.id === ownerId)
    : undefined;
  const mortgaged = state.mortgaged[position] ?? false;
  const houses = state.houses[position] ?? 0;
  const tokens = state.players.filter((p) => p.position === position);
  const rent = rentAt(state, position);

  // Two zones: a left identity panel (property color full-bleed, or card bg
  // for non-properties) and a right context panel tinted with the owner's
  // hue so ownership reads across the rest of the row.
  const isProperty = space.kind === "property";
  const leftBackground = isProperty
    ? PROPERTY_COLOR_VAR[space.color]
    : "var(--mono-card)";
  const leftStyle: CSSProperties = {
    width: "72px",
    backgroundColor: leftBackground,
    ...(mortgaged && isProperty
      ? {
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent 0 3px, var(--mono-frame) 3px 4px)",
        }
      : {}),
  };
  const contextTint = owner
    ? `color-mix(in srgb, ${PLAYER_COLOR_VAR[owner.color]} 28%, var(--mono-card))`
    : "var(--mono-card)";

  return (
    <div
      className="flex h-11 shrink-0 overflow-hidden"
      style={{ color: "var(--mono-ink)" }}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={leftStyle}
      >
        {isProperty ? (
          <Development houses={houses} />
        ) : (
          <SpaceIcon space={space} mortgaged={mortgaged} />
        )}
      </div>
      <div
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2"
        style={{ background: contextTint }}
      >
        <NameCell space={space} mortgaged={mortgaged} />
        <TokenStrip tokens={tokens} />
        <div className="flex-1" />
        <CostCell space={space} owned={Boolean(owner)} rent={rent} />
      </div>
    </div>
  );
}

function Development({ houses }: { houses: number }) {
  if (houses === 0) return null;
  if (houses === 5) {
    return (
      <div className="flex w-full items-center justify-center">
        <div
          className="rounded-sm border-2 border-black"
          style={{
            width: "36px",
            height: "24px",
            backgroundColor: "var(--mono-red)",
          }}
        />
      </div>
    );
  }
  return (
    <div className="flex w-full items-center px-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-1 items-center justify-center"
        >
          {i < houses && (
            <div
              className="rounded-sm border-2 border-black"
              style={{
                width: "12px",
                height: "24px",
                backgroundColor: "var(--mono-green)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SpaceIcon({
  space,
  mortgaged,
}: {
  space: Space;
  mortgaged: boolean;
}) {
  const iconStyle: CSSProperties = {
    height: "1.1rem",
    width: "auto",
    opacity: mortgaged ? 0.4 : 1,
  };
  switch (space.kind) {
    case "railroad":
      return <Train strokeWidth={1.75} style={iconStyle} />;
    case "utility": {
      const Icon = space.name === "Electric Company" ? Zap : Droplets;
      return (
        <Icon
          strokeWidth={1.75}
          style={{ ...iconStyle, color: "var(--mono-neutral)" }}
        />
      );
    }
    case "community-chest":
      return (
        <Package
          strokeWidth={1.5}
          style={{ ...iconStyle, color: "var(--mono-dark-blue)" }}
        />
      );
    case "chance":
      return (
        <span
          className="text-lg font-extrabold italic"
          style={{ color: "var(--mono-orange)" }}
        >
          ?
        </span>
      );
    case "tax":
      return (
        <Diamond fill="currentColor" strokeWidth={1.5} style={iconStyle} />
      );
    case "go":
      return (
        <span
          className="text-[10px] font-bold"
          style={{ color: "var(--mono-red)" }}
        >
          GO
        </span>
      );
    case "jail":
      return <span className="text-[10px] font-bold">JAIL</span>;
    case "free-parking":
      return <span className="text-[10px] font-bold">FREE</span>;
    case "go-to-jail":
      return (
        <span
          className="text-[10px] font-bold"
          style={{ color: "var(--mono-red)" }}
        >
          JAIL→
        </span>
      );
    case "property":
      return null;
  }
}

function NameCell({
  space,
  mortgaged,
}: {
  space: Space;
  mortgaged: boolean;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 overflow-hidden"
      style={{ width: "150px" }}
    >
      <span className="truncate text-xs font-semibold">
        {displayName(space)}
      </span>
      {mortgaged && (
        <span
          className="shrink-0 text-[10px] font-bold"
          style={{ color: "var(--mono-red)" }}
        >
          MTG
        </span>
      )}
    </div>
  );
}

function displayName(space: Space): string {
  switch (space.kind) {
    case "go":
      return "Go";
    case "jail":
      return "Jail";
    case "free-parking":
      return "Free Parking";
    case "go-to-jail":
      return "Go to Jail";
    case "chance":
      return "Chance";
    case "community-chest":
      return "Community Chest";
    case "tax":
      return space.name;
    case "railroad":
      return space.name;
    case "utility":
      return space.name;
    case "property":
      return space.name;
  }
}

function TokenStrip({ tokens }: { tokens: readonly Player[] }) {
  if (tokens.length === 0) return null;
  return (
    <div className="flex h-full shrink-0 items-center gap-px">
      {tokens.map((p) =>
        p.inJail ? (
          <JailedToken key={p.id} player={p} />
        ) : (
          <PlayerToken
            key={p.id}
            player={p}
            className="aspect-square h-[70%]"
          />
        ),
      )}
    </div>
  );
}

function JailedToken({ player }: { player: Player }) {
  return (
    <div className="relative aspect-square h-[70%]">
      <PlayerToken player={player} className="h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--mono-frame) 0 1.5px, transparent 1.5px 4px)",
        }}
      />
    </div>
  );
}

function CostCell({
  space,
  owned,
  rent,
}: {
  space: Space;
  owned: boolean;
  rent: RentDisplay | null;
}) {
  const content = costContent(space, owned, rent);
  if (!content) return <div style={{ width: "60px" }} />;
  return (
    <div
      className={`shrink-0 text-right font-mono text-xs ${
        content.muted ? "opacity-50" : "font-semibold"
      }`}
      style={{ minWidth: "60px" }}
    >
      {content.node}
    </div>
  );
}

function costContent(
  space: Space,
  owned: boolean,
  rent: RentDisplay | null,
): { node: ReactNode; muted: boolean } | null {
  if (rent) {
    if (rent.kind === "dollars") {
      return { node: `$${rent.amount.toLocaleString("en-US")}`, muted: false };
    }
    return {
      node: (
        <span className="inline-flex items-center justify-end gap-0.5">
          <span>×{rent.multiplier}</span>
          <Dice5 className="h-3 w-3" strokeWidth={2} />
        </span>
      ),
      muted: false,
    };
  }
  if (
    !owned &&
    (space.kind === "property" ||
      space.kind === "railroad" ||
      space.kind === "utility")
  ) {
    return { node: `$${space.price.toLocaleString("en-US")}`, muted: true };
  }
  if (space.kind === "tax") {
    return { node: `$${space.amount.toLocaleString("en-US")}`, muted: false };
  }
  return null;
}
