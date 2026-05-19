"use client";

import { create } from "zustand";
import { apply, autoStep } from "./engine";
import { freshGame } from "./mocks";
import type { ApplyResult, GameState, Intent } from "./types";

/** "live": auto-pacing drives the game forward; this is the actual play
 *  loop. "demo": the state is a hand-picked snapshot for UI inspection;
 *  auto-pacing is suspended so nothing mutates the loaded snapshot. The
 *  field is a client-side concern, not part of `GameState` — the eventual
 *  DB row only stores the game itself. */
export type MonopolyMode = "live" | "demo";

interface MonopolyActions {
  /** Set this client's player id (assigned during lobby join). */
  setMyPlayer: (playerId: string) => void;

  /** Host: validate and apply an intent, then drain mechanics via autoStep
   *  until the next decision point. Returns the full result including the
   *  combined event stream so callers can drive animations or replay. */
  submit: (intent: Intent) => ApplyResult;

  /** Host: advance mechanics without an intent. Used to kick off the very
   *  first roll on game start and to step between phases the pacing layer
   *  drives in the UI. No-op when the state is already at a decision point. */
  step: () => void;

  /** Guest: replace local state with authoritative state from the host. */
  applyStateUpdate: (state: GameState) => void;

  /** Reset back to a fresh live game — dev-only. */
  reset: () => void;

  /** Load a hand-picked GameState for UI inspection and switch to "demo"
   *  mode. The auto-pacing layer is gated on `mode === "live"`, so the
   *  loaded snapshot stays frozen until `reset()` returns to a live game. */
  loadDemo: (state: GameState) => void;
}

export type MonopolyStore = {
  myPlayerId: string | null;
  /** Authoritative game state. Seeded with a fresh game; will be replaced
   *  by a Supabase-backed row once the multiplayer wiring lands. */
  state: GameState;
  mode: MonopolyMode;
} & MonopolyActions;

// First pass skips the lobby: the local client is always seated as p1.
const DEFAULT_PLAYER_ID = "p1";

export const useMonopolyStore = create<MonopolyStore>((set, get) => ({
  myPlayerId: DEFAULT_PLAYER_ID,
  state: freshGame(),
  mode: "live",

  setMyPlayer: (playerId) => set({ myPlayerId: playerId }),

  submit: (intent) => {
    const { state } = get();
    const result = apply(state, intent);
    if (!result.ok) return result;
    const stepped = autoStep(result.state);
    set({ state: stepped.state });
    return {
      ok: true,
      state: stepped.state,
      newEvents: [...result.newEvents, ...stepped.newEvents],
    };
  },

  step: () => {
    const { state } = get();
    const stepped = autoStep(state);
    if (stepped.state !== state) set({ state: stepped.state });
  },

  applyStateUpdate: (next) => set({ state: next }),

  reset: () =>
    set({
      state: freshGame(),
      myPlayerId: DEFAULT_PLAYER_ID,
      mode: "live",
    }),

  loadDemo: (next) => set({ state: next, mode: "demo" }),
}));
