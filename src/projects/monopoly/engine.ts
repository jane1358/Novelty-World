import type {
  ApplyResult,
  GameEvent,
  GameState,
  Intent,
} from "./types";

/** Random number source for the engine. Every roll, deck shuffle, and
 *  card draw goes through this; `Math.random` may not be called directly
 *  from engine code. See `monopoly/CLAUDE.md` "RNG: always injected." */
export interface Rng {
  /** Next uniform value in [0, 1). */
  next(): number;
}

/** Construct an RNG from the game's seed. The state's `rngSeed` field is
 *  the source of truth; advancing the RNG over the course of a game makes
 *  the run deterministically replayable from the event log.
 *
 *  Implementation: xmur3 string-hash → mulberry32 PRNG. Tiny, deterministic,
 *  no dependencies. JavaScript intentionally does not let you seed
 *  `Math.random`, so any engine that needs reproducibility brings its own.
 *  See https://stackoverflow.com/a/47593316. */
export function createRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let state = (h ^ (h >>> 16)) >>> 0;
  return {
    next: () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Apply a single external intent. On success the caller should then run
 *  `autoStep` to drain mechanics until the next decision point. */
export function apply(
  state: GameState,
  intent: Intent,
  _rng: Rng,
): ApplyResult {
  void state;
  throw new Error(`apply: not yet implemented (intent ${intent.kind})`);
}

/** Run mechanical transitions (dice, movement, rent, card draws, …) until
 *  the state hits a phase that requires a decision or has `turn.paused`
 *  set. No-op when the state is already at a decision point. */
export function autoStep(
  _state: GameState,
  _rng: Rng,
): { state: GameState; newEvents: readonly GameEvent[] } {
  throw new Error("autoStep: not yet implemented");
}
