// @vitest-environment node
//
// Store-level reproduction of the CAS-conflict handling in the route-result
// pipeline. A stale-version conflict carries the WINNING state + version (see
// protocol.ts MonopolyResult). The client must fold that winner in so play
// advances; if it drops it, the pump's `drivenFrom === version` guard latches
// and the game freezes waiting for a realtime echo that may never come.
//
// Two paths handle a route result:
//   - PACER-DRIVEN ops (`step`, proxied bot intents via `driveIntent`) → handleResult
//   - OPTIMISTIC ops (the human's own `submit`)                         → handlePrediction
//
// These tests assert BOTH fold the conflict winner. The pacer-driven case is a
// regression guard for the stuck `dev` auction: bot bids are driven via the
// pacer path, and dropping the winner there latched the pump's drive guard.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./sync", () => ({
  submitAction: vi.fn(),
  loadGame: vi.fn(),
  subscribeGame: vi.fn(() => () => {}),
  listGames: vi.fn(),
  deleteGame: vi.fn(),
}));

import { freshGame } from "./mocks";
import { useMonopolyStore } from "./store";
import { submitAction } from "./sync";
import type { GameState } from "./types";

// Flush the fire-and-forget `submitAction(...).then(...)` chains. A few macro-
// task ticks cover the optimistic path's conflict→rebase→reflush round trips.
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

const HEAD: GameState = freshGame("conflict-seed", undefined, 4);
const HUMAN = HEAD.turn.playerId; // freshGame seats the human at slot 0 (active)

/** A distinguishable "winning" state the route hands back on a conflict. */
function winnerState(): GameState {
  return { ...HEAD, rngState: HEAD.rngState + 1 };
}

/** Park the store as a connected, caught-up client at `version`, mid-game. */
function setupConnected(version: number): void {
  useMonopolyStore.setState({
    gameId: "test-game",
    version,
    headState: HEAD,
    state: HEAD,
    buffer: [],
    optimistic: null,
    outbox: [],
    lobbyOutbox: [],
    connecting: false,
    myPlayerId: HUMAN,
    syncError: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("route-result conflict handling folds the winning state", () => {
  it("optimistic submit folds the conflict winner (control)", async () => {
    setupConnected(5);
    const winner = winnerState();
    // First flush conflicts (handing back the winner); the rebase re-flush then
    // succeeds so the round trip settles instead of looping on the conflict.
    vi.mocked(submitAction)
      .mockResolvedValueOnce({ ok: false, conflict: true, state: winner, version: 6 })
      .mockResolvedValue({ ok: true, state: winner, version: 6 });

    useMonopolyStore
      .getState()
      .submit({ kind: "set-queue", playerId: HUMAN, queue: "manage", armed: true });
    await settle();

    // In active play the folded winner lands in the playback buffer (the pump
    // animates it). The client has the v6 truth either way.
    const { buffer } = useMonopolyStore.getState();
    expect(buffer.map((s) => s.version)).toContain(6);
  });

  it("pacer-driven op folds the conflict winner (stuck-auction regression)", async () => {
    setupConnected(5);
    const winner = winnerState();
    vi.mocked(submitAction).mockResolvedValue({
      ok: false,
      conflict: true,
      state: winner,
      version: 6,
    });

    // A proxied bot decision / mechanical beat — exactly how the pump advances a
    // bot's auction bid. The route says "you're stale, here's the v6 winner."
    useMonopolyStore.getState().driveIntent({ kind: "end-turn", playerId: HUMAN });
    await settle();

    // The client must fold the winner so the head can advance off v5 and the
    // pump's once-per-version guard releases. Dropping it = permanent freeze.
    const { buffer } = useMonopolyStore.getState();
    expect(buffer.map((s) => s.version)).toContain(6);
  });
});
