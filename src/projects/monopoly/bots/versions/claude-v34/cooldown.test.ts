import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameEvent, GameState, TurnGroup } from "../../../types";
import { proposeBestTrade as v29Propose } from "../claude-v29/trades";
import { proposeBestTrade as v34Propose } from "./trades";

// v34 anti-churn cooldown (DENY_COOLDOWN_TURNS = 8). A completer that was traded
// within the cooldown is already parked with a non-rival who blocks the rival, so a
// fresh DENIAL buy of it is the no-progress hot-potato and is suppressed. The FIRST
// denial (nothing has traded it yet) still fires, and COMPLETIONS are never gated.
// Oranges = {16,18,19}. freshGame seats p1..p4.

const base = freshGame();

/** A trade-log entry that moved `pos` (identities don't matter to the detector;
 *  use a believable holder→holder denial hop). */
function tradeOf(pos: number, from: string, to: string): GameEvent {
  return {
    kind: "trade",
    proposerId: to,
    propertyTo: { [pos]: to },
    propertyFrom: { [pos]: from },
    gojfTo: {},
    gojfFrom: {},
    cashDelta: { [to]: -230, [from]: 230 },
  };
}

/** Build a board with the given ownership/cash and a trade log where `pos` was last
 *  traded `gap` turns ago (undefined = never traded). Current turn is fixed at 40. */
function withHistory(
  ownership: Record<number, string>,
  cash: Record<string, number>,
  pos: number,
  gap: number | undefined,
): GameState {
  const N = 40;
  const turns: TurnGroup[] = [];
  if (gap !== undefined) {
    turns.push({ turn: N - gap, playerId: "p4", events: [tradeOf(pos, "p4", "p3")] });
  }
  turns.push({ turn: N, playerId: "p1", events: [] });
  return {
    ...base,
    ownership,
    players: base.players.map((p) => ({ ...p, cash: cash[p.id] ?? p.cash })),
    turns,
  };
}

const RIVAL_THREAT = { 16: "p2", 18: "p2", 19: "p3" }; // p2 one orange short, 19 at p3
const CASH = { p1: 3000, p2: 1000, p3: 1000, p4: 1000 };

describe("v34 — anti-churn denial cooldown", () => {
  it("SUPPRESSES the re-denial of a completer traded within the cooldown (breaks the ring)", () => {
    // 19 was denial-traded last turn → it's already parked with a non-rival blocking
    // p2. v29 re-books the denial (the hot-potato hop); v34 lets it settle.
    const state = withHistory(RIVAL_THREAT, CASH, 19, 1);
    expect(v29Propose(state, "p1")?.reason).toContain("deny"); // v29: another hop
    expect(v34Propose(state, "p1")).toBeNull(); // v34: no re-hop
  });

  it("STILL fires the FIRST denial (completer never traded) — identical to v29", () => {
    const state = withHistory(RIVAL_THREAT, CASH, 19, undefined);
    const deal = v34Propose(state, "p1");
    expect(deal).not.toBeNull();
    expect(deal?.terms.propertyTo[19]).toBe("p1");
    expect(deal?.reason).toContain("deny");
    expect(deal).toEqual(v29Propose(state, "p1"));
  });

  it("fires again once the cooldown has expired (board has moved on)", () => {
    // Last traded 10 turns ago, past the 8-turn cooldown → the denial is live again.
    const state = withHistory(RIVAL_THREAT, CASH, 19, 10);
    expect(v34Propose(state, "p1")?.reason).toContain("deny");
    expect(v34Propose(state, "p1")).toEqual(v29Propose(state, "p1"));
  });

  it("only watches the SAME lot — a recent trade of a different property doesn't gate", () => {
    // 11 (a pink) traded last turn; the orange completer 19 is untouched → denial fires.
    const state: GameState = {
      ...withHistory(RIVAL_THREAT, CASH, 19, undefined),
      turns: [
        { turn: 39, playerId: "p4", events: [tradeOf(11, "p4", "p3")] },
        { turn: 40, playerId: "p1", events: [] },
      ],
    };
    expect(v34Propose(state, "p1")?.reason).toContain("deny");
  });

  it("NEVER gates a COMPLETION, even when the completer was just traded", () => {
    // p1 (not p2) is one orange short; 19 at p3 was traded last turn. Buying 19 here
    // COMPLETES p1's set (Offer B), not a denial — the cooldown must not touch it.
    const state = withHistory({ 16: "p1", 18: "p1", 19: "p3" }, CASH, 19, 1);
    const deal = v34Propose(state, "p1");
    expect(deal?.terms.propertyTo[19]).toBe("p1");
    expect(deal?.reason).not.toContain("deny");
    expect(deal).toEqual(v29Propose(state, "p1"));
  });
});
