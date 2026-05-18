"use client";

import { useEffect, useState } from "react";
import { SPACES } from "../data";
import { MOCK_STATE } from "../mocks";
import { MONOPOLY_THEME } from "../theme";
import type { GameEvent, GameState, TurnGroup } from "../types";
import { Footer } from "./footer";
import { Header } from "./header";
import { Squares } from "./squares";

type PlayerCount = 2 | 4 | 8;

// Every board position whose ownership can be set (properties, railroads,
// utilities). Used by the debug ownership-shuffle keys.
const OWNABLE_POSITIONS = SPACES.flatMap((s, i) =>
  s.kind === "property" || s.kind === "railroad" || s.kind === "utility"
    ? [i]
    : [],
);

export function Monopoly() {
  // Debug keys for visual development:
  //   2 / 4 / 8 — reset to a sliced mock with that player count
  //   0 — give every ownable square to the first player
  //   1 — randomly assign every ownable square across the visible players
  // Remove once real lobby state lands.
  const [state, setState] = useState<GameState>(() => sliceState(MOCK_STATE, 4));
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "2") setState(sliceState(MOCK_STATE, 2));
      else if (e.key === "4") setState(sliceState(MOCK_STATE, 4));
      else if (e.key === "8") setState(sliceState(MOCK_STATE, 8));
      else if (e.key === "0") setState(withAllOwnedByFirst);
      else if (e.key === "1") setState(withRandomOwnership);
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{ ...MONOPOLY_THEME, backgroundColor: "var(--mono-frame)" }}
    >
      <Header state={state} />
      <Squares state={state} />
      <Footer state={state} />
    </div>
  );
}

// Trims the mock so only the first `count` players remain, dropping
// ownership/mortgage/houses entries that belonged to the removed players so
// the rest of the board stays internally consistent.
function sliceState(state: GameState, count: PlayerCount): GameState {
  const players = state.players.slice(0, count);
  const ids = new Set(players.map((p) => p.id));
  const ownership: Record<number, string> = {};
  const mortgaged: Record<number, boolean> = {};
  const houses: Record<number, number> = {};
  for (const [posStr, pid] of Object.entries(state.ownership)) {
    if (!ids.has(pid)) continue;
    const pos = Number(posStr);
    ownership[pos] = pid;
    if (state.mortgaged[pos]) mortgaged[pos] = true;
    const h = state.houses[pos];
    if (h) houses[pos] = h;
  }
  const jailFreeCards: { chance?: string; communityChest?: string } = {};
  if (state.jailFreeCards.chance && ids.has(state.jailFreeCards.chance)) {
    jailFreeCards.chance = state.jailFreeCards.chance;
  }
  if (
    state.jailFreeCards.communityChest &&
    ids.has(state.jailFreeCards.communityChest)
  ) {
    jailFreeCards.communityChest = state.jailFreeCards.communityChest;
  }
  const turns = filterTurns(state.turns, ids);
  return { players, ownership, mortgaged, houses, jailFreeCards, turns };
}

// Keep only turns whose active player survived the slice, and within those,
// drop events whose cross-player references (rent payee, trade partner,
// bankruptcy creditor) point at sliced-away players. Lets the EventLog
// assume every player id it sees is renderable.
function filterTurns(
  turns: readonly TurnGroup[],
  ids: ReadonlySet<string>,
): TurnGroup[] {
  const result: TurnGroup[] = [];
  for (const turn of turns) {
    if (!ids.has(turn.playerId)) continue;
    const events = turn.events.filter((e) => eventRefsValid(e, ids));
    if (events.length === 0) continue;
    result.push({ ...turn, events });
  }
  return result;
}

function eventRefsValid(
  event: GameEvent,
  ids: ReadonlySet<string>,
): boolean {
  switch (event.kind) {
    case "rent":
      return ids.has(event.ownerId);
    case "trade":
      return ids.has(event.withId);
    case "bankrupt":
      return event.creditorId === null || ids.has(event.creditorId);
    default:
      return true;
  }
}

function withAllOwnedByFirst(state: GameState): GameState {
  const firstId = state.players[0]?.id;
  if (!firstId) return state;
  const ownership: Record<number, string> = {};
  for (const pos of OWNABLE_POSITIONS) {
    ownership[pos] = firstId;
  }
  return {
    ...state,
    ownership,
    jailFreeCards: { chance: firstId, communityChest: firstId },
  };
}

function withRandomOwnership(state: GameState): GameState {
  const players = state.players;
  if (players.length === 0) return state;
  const pickId = () =>
    players[Math.floor(Math.random() * players.length)].id;
  const ownership: Record<number, string> = {};
  for (const pos of OWNABLE_POSITIONS) {
    ownership[pos] = pickId();
  }
  return {
    ...state,
    ownership,
    jailFreeCards: { chance: pickId(), communityChest: pickId() },
  };
}
