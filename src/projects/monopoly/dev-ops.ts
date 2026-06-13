import { SPACES } from "./data";
import { createRng } from "./engine";
import { freshGame } from "./mocks";
import type { DevCommand } from "./protocol";
import type { GameState } from "./types";

// Pure debug-only state transforms behind the `dev` hotkeys. The authoritative
// route applies these (gated to the reserved `dev` game id), so they stay free
// of side effects and `Math.random` just like the engine — randomness is
// derived from the game's injected `rngState`. See monopoly/CLAUDE.md.

/** Every board position that can be owned (properties, railroads, utilities). */
const OWNABLE_POSITIONS = SPACES.flatMap((space, i) =>
  space.kind === "property" || space.kind === "railroad" || space.kind === "utility"
    ? [i]
    : [],
);

/** Give every ownable square (and both Get Out of Jail Free cards) to the
 *  first player — a quick way to populate an owner-heavy board for UI work. */
export function ownAllByFirst(state: GameState): GameState {
  if (state.players.length === 0) return state;
  const firstId = state.players[0].id;
  const ownership: Record<number, string> = {};
  for (const pos of OWNABLE_POSITIONS) ownership[pos] = firstId;
  return {
    ...state,
    ownership,
    jailFreeCards: { chance: firstId, communityChest: firstId },
  };
}

/** Randomly distribute every ownable square (and both GOJF cards) across the
 *  seated players. Deterministic given the game's `rngState`, which it advances
 *  so a repeat press reshuffles. */
export function randomOwnership(state: GameState): GameState {
  if (state.players.length === 0) return state;
  const rng = createRng(state.rngState);
  const pickId = () =>
    state.players[Math.floor(rng.next() * state.players.length)].id;
  const ownership: Record<number, string> = {};
  for (const pos of OWNABLE_POSITIONS) ownership[pos] = pickId();
  const jailFreeCards = { chance: pickId(), communityChest: pickId() };
  return { ...state, ownership, jailFreeCards, rngState: rng.getState() };
}

/** Apply a dev command, returning the new state. `rngSeed` is injected (the
 *  route stamps a timestamped seed) so a `restart` gets a fresh RNG stream
 *  while this stays pure. */
export function applyDevCommand(
  state: GameState,
  command: DevCommand,
  rngSeed: string,
): GameState {
  switch (command.kind) {
    case "restart": {
      // Keep the human seat's identity across the restart.
      const seat =
        state.players.length > 0
          ? { id: state.players[0].id, name: state.players[0].name }
          : undefined;
      return freshGame(rngSeed, seat, command.players);
    }
    case "own-all":
      return ownAllByFirst(state);
    case "random-own":
      return randomOwnership(state);
  }
}
