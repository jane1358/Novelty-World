import { SPACES } from "./data";
import type {
  ApplyResult,
  GameEvent,
  GameState,
  Intent,
  Player,
  TurnGroup,
  TurnState,
} from "./types";

/** Salary paid to a player whose move passes (or lands on) GO. */
const PASS_GO_SALARY = 200;

/** Random number source for the engine. Every roll, deck shuffle, and
 *  card draw goes through this; `Math.random` may not be called directly
 *  from engine code. See `monopoly/CLAUDE.md` "RNG: always injected."
 *
 *  `getState()` returns the current internal state — a value that can be
 *  passed back to `createRng` to resume the same stream. This is how the
 *  RNG round-trips through `GameState.rngState`, which is what makes a
 *  serialized game state alone sufficient to keep play deterministic
 *  across reloads, devices, or host hand-offs. */
export interface Rng {
  /** Next uniform value in [0, 1). */
  next(): number;
  /** Current internal state; passing this back to `createRng` resumes
   *  the same stream of values. */
  getState(): number;
}

/** Construct an RNG from either a string seed (for new games) or a
 *  numeric state (to resume a stream). String seeds are hashed with xmur3
 *  into a 32-bit mulberry32 state; numeric input is used directly so
 *  `createRng(prev.getState())` continues exactly where `prev` left off.
 *
 *  Implementation references:
 *  - xmur3 + mulberry32 from https://stackoverflow.com/a/47593316
 *  - Both are tiny, deterministic, dependency-free. JavaScript intentionally
 *    does not let you seed `Math.random`, so any engine that needs
 *    reproducibility brings its own. */
export function createRng(seedOrState: string | number): Rng {
  let state: number;
  if (typeof seedOrState === "number") {
    state = seedOrState >>> 0;
  } else {
    let h = 1779033703 ^ seedOrState.length;
    for (let i = 0; i < seedOrState.length; i++) {
      h = Math.imul(h ^ seedOrState.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    state = (h ^ (h >>> 16)) >>> 0;
  }
  return {
    next: () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getState: () => state >>> 0,
  };
}

/** Apply a single external intent. On success the caller should then run
 *  `autoStep` to drain mechanics until the next decision point.
 *
 *  Only `end-turn` is wired up so far; richer intents (buy, build, trade,
 *  …) are rejected until they're implemented. The surface deliberately
 *  stays small per `monopoly/CLAUDE.md`. No RNG argument — `end-turn` is
 *  deterministic; engine functions that need randomness read it out of
 *  `state.rngState` themselves. */
export function apply(state: GameState, intent: Intent): ApplyResult {
  if (intent.kind !== "end-turn") {
    return { ok: false, reason: `intent ${intent.kind} not yet implemented` };
  }
  if (intent.playerId !== state.turn.playerId) {
    return { ok: false, reason: "not your turn" };
  }
  if (state.turn.phase !== "post-roll") {
    return { ok: false, reason: `cannot end turn in phase ${state.turn.phase}` };
  }

  const currentIdx = state.players.findIndex((p) => p.id === intent.playerId);
  const nextIdx = (currentIdx + 1) % state.players.length;
  const nextPlayer = state.players[nextIdx];
  const lastTurn = state.turns[state.turns.length - 1];
  const nextTurnGroup: TurnGroup = {
    turn: lastTurn.turn + 1,
    playerId: nextPlayer.id,
    events: [],
  };
  const turn: TurnState = {
    playerId: nextPlayer.id,
    phase: "pre-roll",
    doublesStreak: 0,
    paused: false,
  };
  return {
    ok: true,
    state: {
      ...state,
      turns: [...state.turns, nextTurnGroup],
      turn,
    },
    newEvents: [],
  };
}

/** Run mechanical transitions (dice, movement, rent, card draws, …) until
 *  the state hits a phase that requires a decision or has `turn.paused`
 *  set. No-op when the state is already at a decision point.
 *
 *  First pass: rolls 2d6 in `pre-roll`, moves the active player, records
 *  the roll event, and stops at `post-roll`. Doubles, jail, passing-GO
 *  payouts, rent, and card draws are intentionally deferred — landing on a
 *  square is a no-op while we exercise the loop end-to-end. */
export function autoStep(
  state: GameState,
): { state: GameState; newEvents: readonly GameEvent[] } {
  if (state.turn.phase !== "pre-roll" || state.turn.paused) {
    return { state, newEvents: [] };
  }
  const rng = createRng(state.rngState);
  const playerIdx = state.players.findIndex(
    (p) => p.id === state.turn.playerId,
  );
  const player = state.players[playerIdx];

  const d1 = rollDie(rng);
  const d2 = rollDie(rng);
  const total = d1 + d2;
  const fromPos = player.position;
  const sum = fromPos + total;
  const toPos = sum % SPACES.length;
  const passedGo = sum >= SPACES.length;

  const movedPlayer: Player = {
    ...player,
    position: toPos,
    cash: passedGo ? player.cash + PASS_GO_SALARY : player.cash,
  };
  const players = state.players.map((p, i) =>
    i === playerIdx ? movedPlayer : p,
  );

  const rollEvent: GameEvent = {
    kind: "roll",
    dice: [d1, d2],
    doublesStreak: 0,
    toPosition: toPos,
    passedGo,
  };
  const turns = appendEventToActiveTurn(state.turns, rollEvent);
  const turn: TurnState = { ...state.turn, phase: "post-roll" };

  return {
    state: {
      ...state,
      players,
      turns,
      turn,
      rngState: rng.getState(),
    },
    newEvents: [rollEvent],
  };
}

function rollDie(rng: Rng): number {
  return Math.floor(rng.next() * 6) + 1;
}

// Append an event to the trailing TurnGroup, which is always the active
// player's: freshGame opens it for the starting player and apply(end-turn)
// opens a new one for the next player before autoStep runs again.
function appendEventToActiveTurn(
  turns: readonly TurnGroup[],
  event: GameEvent,
): readonly TurnGroup[] {
  const last = turns[turns.length - 1];
  const updated: TurnGroup = { ...last, events: [...last.events, event] };
  return [...turns.slice(0, -1), updated];
}
