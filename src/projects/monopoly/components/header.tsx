import { Droplets, KeyRound, Train, Zap, type LucideIcon } from "lucide-react";
import { SPACES } from "../data";
import { PROPERTY_COLOR_VAR } from "../theme";
import type { GameState, Player, PropertyColor } from "../types";
import { PlayerToken } from "./player-token";

interface Props {
  state: GameState;
}

type ChipSlot =
  | { kind: "property"; position: number; color: PropertyColor }
  | { kind: "railroad"; position: number }
  | { kind: "utility"; position: number; icon: LucideIcon }
  | { kind: "gojf"; source: "chance" | "communityChest" };

const COLOR_ORDER: readonly PropertyColor[] = [
  "brown",
  "light-blue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "dark-blue",
];

/** Fixed slot order across every player row: properties grouped by color set
 *  (board order within each set), then railroads, utilities, and the two
 *  GOJF cards. Every row renders every slot — owned slots fill, unowned
 *  slots show their outline only. Identical column positions across rows
 *  let players scan vertically to see who controls a given set. */
const ALL_SLOTS: readonly ChipSlot[] = (() => {
  const byColor: Record<PropertyColor, ChipSlot[]> = {
    brown: [],
    "light-blue": [],
    pink: [],
    orange: [],
    red: [],
    yellow: [],
    green: [],
    "dark-blue": [],
  };
  const railroads: ChipSlot[] = [];
  const utilities: ChipSlot[] = [];
  SPACES.forEach((space, position) => {
    if (space.kind === "property") {
      byColor[space.color].push({
        kind: "property",
        position,
        color: space.color,
      });
    } else if (space.kind === "railroad") {
      railroads.push({ kind: "railroad", position });
    } else if (space.kind === "utility") {
      utilities.push({
        kind: "utility",
        position,
        icon: space.name === "Electric Company" ? Zap : Droplets,
      });
    }
  });
  return [
    ...COLOR_ORDER.flatMap((c) => byColor[c]),
    ...railroads,
    ...utilities,
    { kind: "gojf", source: "chance" },
    { kind: "gojf", source: "communityChest" },
  ];
})();

/** Pre-chunked slot list: contiguous slots that share a set key form one
 *  flush sub-strip with no internal gap. */
const SLOT_GROUPS: readonly { key: string; slots: readonly ChipSlot[] }[] =
  (() => {
    const groups: { key: string; slots: ChipSlot[] }[] = [];
    let current: { key: string; slots: ChipSlot[] } | null = null;
    for (const slot of ALL_SLOTS) {
      const key = slotSetKey(slot);
      if (!current || current.key !== key) {
        current = { key, slots: [] };
        groups.push(current);
      }
      current.slots.push(slot);
    }
    return groups;
  })();

export function Header({ state }: Props) {
  // When five or more players are present the header would crowd the board
  // off-screen, so cap it at 4.5 rows (each row is h-11) and scroll the
  // overflow. The half-row peek signals there's more below.
  const scrollable = state.players.length > 4;
  return (
    <div
      className={`relative z-10 flex shrink-0 flex-col ${
        scrollable ? "max-h-[12.375rem] overflow-y-auto" : ""
      }`}
      // Sharp 1px frame line acts as the section divider; the soft shadow
      // below makes the header read as elevated above the scrolling board.
      // Box-shadow renders outside the box without changing layout, so the
      // flex math (header + flex-1 squares + footer = 100dvh) is unaffected.
      style={{
        boxShadow:
          "0 1px 0 var(--mono-frame), 0 6px 12px rgba(0, 0, 0, 0.75)",
      }}
    >
      {state.players.map((player) => (
        <PlayerRow key={player.id} player={player} state={state} />
      ))}
    </div>
  );
}

function PlayerRow({ player, state }: { player: Player; state: GameState }) {
  return (
    <div
      className="flex h-11 shrink-0 items-center gap-2 px-1.5"
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
        {SLOT_GROUPS.map((group) => {
          // GOJF is special-cased: the card has no notion of a "set" the way
          // properties / rails / utilities do, so we just render an orange
          // key for each card the player actually holds (or nothing).
          if (group.key === "gojf") {
            const ownedKeys = group.slots.filter((slot) =>
              isOwnedBy(slot, player.id, state),
            );
            if (ownedKeys.length === 0) return null;
            return (
              <div key={group.key} className="flex">
                {ownedKeys.map((slot) => (
                  <GojfIcon key={slotKey(slot)} />
                ))}
              </div>
            );
          }
          // Property / railroad / utility sets: only render the set's chips
          // if the player owns at least one member; otherwise the slots stay
          // invisible but still hold their physical space so each column
          // lines up across player rows.
          const setRelevant = group.slots.some((slot) =>
            isOwnedBy(slot, player.id, state),
          );
          return (
            <div key={group.key} className="flex">
              {group.slots.map((slot) => {
                // GOJF is filtered out by the early-return above; this group
                // is guaranteed to contain only board-position slots.
                if (slot.kind === "gojf") return null;
                return (
                  <Chip
                    key={slotKey(slot)}
                    slot={slot}
                    owned={isOwnedBy(slot, player.id, state)}
                    mortgaged={state.mortgaged[slot.position] ?? false}
                    visible={setRelevant}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function slotSetKey(slot: ChipSlot): string {
  if (slot.kind === "property") return `color:${slot.color}`;
  return slot.kind;
}

function slotKey(slot: ChipSlot): string {
  return slot.kind === "gojf" ? `gojf:${slot.source}` : `pos:${slot.position}`;
}

function isOwnedBy(
  slot: ChipSlot,
  playerId: string,
  state: GameState,
): boolean {
  if (slot.kind === "gojf") {
    return state.jailFreeCards[slot.source] === playerId;
  }
  return state.ownership[slot.position] === playerId;
}

function Chip({
  slot,
  owned,
  mortgaged,
  visible,
}: {
  slot: Exclude<ChipSlot, { kind: "gojf" }>;
  owned: boolean;
  mortgaged: boolean;
  visible: boolean;
}) {
  const baseClasses =
    "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-sm";

  if (!visible) return <div className={baseClasses} />;

  if (slot.kind === "property") {
    const color = PROPERTY_COLOR_VAR[slot.color];
    return (
      <div
        className={baseClasses}
        style={
          owned
            ? {
                backgroundColor: color,
                boxShadow: "inset 0 0 0 1px var(--mono-frame)",
              }
            : { boxShadow: `inset 0 0 0 1px ${color}` }
        }
      >
        {owned && mortgaged && <MortgageMarker />}
      </div>
    );
  }

  const { Icon, chipColor, iconColor } = iconChipPalette(slot);
  return (
    <div
      className={baseClasses}
      style={
        owned
          ? {
              backgroundColor: chipColor,
              boxShadow: "inset 0 0 0 1px var(--mono-frame)",
            }
          : { boxShadow: `inset 0 0 0 1px ${chipColor}` }
      }
    >
      <Icon
        strokeWidth={2}
        style={{
          width: "70%",
          height: "70%",
          color: owned ? iconColor : "rgba(255, 255, 255, 0.35)",
        }}
      />
      {owned && mortgaged && <MortgageMarker />}
    </div>
  );
}

function GojfIcon() {
  return (
    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
      <KeyRound
        strokeWidth={2}
        style={{
          width: "70%",
          height: "70%",
          color: "var(--mono-orange)",
        }}
      />
    </div>
  );
}

function iconChipPalette(
  slot: Extract<ChipSlot, { kind: "railroad" | "utility" }>,
): { Icon: LucideIcon; chipColor: string; iconColor: string } {
  if (slot.kind === "railroad") {
    return {
      Icon: Train,
      chipColor: "var(--mono-rail)",
      iconColor: "white",
    };
  }
  return {
    Icon: slot.icon,
    chipColor: "var(--mono-utility)",
    iconColor: "white",
  };
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
