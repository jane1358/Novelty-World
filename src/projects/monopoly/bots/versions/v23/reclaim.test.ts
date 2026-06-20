import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState, Player } from "../../../types";
import { planBuild as v17Plan } from "../v17/valuation";
import { planBuild as v23Plan } from "./valuation";

// v23's one change: reclaim a dead (mortgaged) monopoly at a thinner cushion
// (floor + RECLAIM_CUSHION 200) instead of full "flush" (floor + HOTEL_CUSHION 600).
// p1 holds a full orange monopoly with one lot (16) mortgaged — a frozen set earning
// nothing. On a quiet board the reserve floor is BASE_FLOOR (120). With 500 cash
// (above floor+200=320 but below floor+600=720), v23 reclaims the set; v17 waits.

const base = freshGame();

function withMortgagedMonopoly(cash: number): GameState {
  return {
    ...base,
    players: base.players.map((p): Player => ({ ...p, cash: p.id === "p1" ? cash : 1500 })),
    ownership: { 16: "p1", 18: "p1", 19: "p1" },
    mortgaged: { 16: true },
  };
}

describe("v23 unmortgage-eagerness — reclaim a dead monopoly at a thinner cushion", () => {
  it("v23 reclaims (unmortgages) the frozen orange at 500 cash where v17 waits", () => {
    const state = withMortgagedMonopoly(500);
    const plan = v23Plan(state, "p1");
    expect(plan).not.toBeNull();
    expect(plan?.mortgage[16]).toBe(false); // lifts the mortgage to reactivate the set
    expect(v17Plan(state, "p1")).toBeNull(); // v17 isn't "flush" enough yet → waits
  });

  it("neither reclaims when genuinely thin (250 cash, below both cushions)", () => {
    const state = withMortgagedMonopoly(250);
    expect(v23Plan(state, "p1")).toBeNull();
    expect(v17Plan(state, "p1")).toBeNull();
  });
});
