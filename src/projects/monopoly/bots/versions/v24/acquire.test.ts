import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v17Propose } from "../v17/trades";
import { proposeBestTrade as v24Propose } from "./trades";

// v24's one change: `proposeBestTrade` will ASSEMBLE A MONOPOLY FROM SCRATCH — buy
// the whole of a high-value color the bot holds NONE of, off its opponent owners.
// Gated to real prizes that keep the bot above its rent reserve. Oranges =
// {16,18,19} (a prize); light-blue = {6,8,9} (too cheap to clear the bar).

const base = freshGame();

function setCash(state: GameState, id: string, cash: number): GameState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, cash } : p)) };
}

describe("v24 proposeBestTrade — from-scratch monopoly acquisition", () => {
  it("grabs a prize set the bot holds NONE of, off its split owners (v17 proposes nothing)", () => {
    // Oranges split 1-1-1 across p2/p3/p4 — no opponent is one-short, so there's
    // no denial to make; p1 holds none, so v17's construction does nothing. v24
    // buys the whole set to seize the monopoly outright.
    const state = setCash({ ...base, ownership: { 16: "p2", 18: "p3", 19: "p4" } }, "p1", 3000);
    expect(v17Propose(state, "p1")).toBeNull();
    const proposal = v24Propose(state, "p1");
    expect(proposal).not.toBeNull();
    expect(proposal?.terms.propertyTo[16]).toBe("p1");
    expect(proposal?.terms.propertyTo[18]).toBe("p1");
    expect(proposal?.terms.propertyTo[19]).toBe("p1");
    expect(proposal?.reason).toContain("orange");
    expect(proposal?.reason).toContain("seize");
  });

  it("self-gates a cheap set below the prize bar (light-blue nets too little)", () => {
    // light-blue split 1-1-1: the grab nets only ~+$38, under ACQUIRE_MIN_GAIN, so
    // it isn't worth sinking the capital — no proposal.
    const state = setCash({ ...base, ownership: { 6: "p2", 8: "p3", 9: "p4" } }, "p1", 3000);
    expect(v24Propose(state, "p1")).toBeNull();
  });

  it("won't grab a prize it can't afford above its rent reserve (thin bankroll)", () => {
    // $1000 funds the ~$986 orange buy but would leave the bot at ~$14, below its
    // reserve — the bare-set-it-can't-develop trap the liquidity guard prevents.
    const state = setCash({ ...base, ownership: { 16: "p2", 18: "p3", 19: "p4" } }, "p1", 1000);
    expect(v24Propose(state, "p1")).toBeNull();
  });

  it("won't buy an INTACT monopoly off a single owner (they charge for the bonus → -EV)", () => {
    // p2 owns all three oranges: parting with them costs p2 the monopoly bonus, so
    // it prices the buy out of reach — the deal self-rejects on value.
    const state = setCash({ ...base, ownership: { 16: "p2", 18: "p2", 19: "p2" } }, "p1", 3000);
    expect(v24Propose(state, "p1")).toBeNull();
  });
});
