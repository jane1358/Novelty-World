import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../v5/trades";
import { proposeBestTrade as v11Propose, threatWeight } from "./trades";

// v11's one change: THREAT-WEIGHTED DENIAL. The denial premium is scaled by the
// denied rival's position value relative to the strongest opponent
// (`threatWeight`, clamped to [0.5, 1]): the leading opponent gets v5's full
// premium, a laggard's block is trimmed toward the floor. So when two rivals are
// each one-short of a comparably-valuable set, v11 spends its denial on the LEADER
// where v5 (threat-blind) goes by raw set bonus alone. Oranges = {16,18,19}
// (bonus 560); reds = {21,23,24} (bonus 544). freshGame seats p1..p4.

const base = freshGame();

function world(over: Partial<GameState>, cash: Record<string, number>): GameState {
  return {
    ...base,
    ...over,
    players: base.players.map((p) => (p.id in cash ? { ...p, cash: cash[p.id] } : p)),
  };
}

describe("v11 threatWeight — denial focus on the strongest rival", () => {
  it("gives the leading opponent full weight and floors a laggard", () => {
    // p2 rich (4000), p3 poor (1000), p4 mid (1500). Strongest opponent of p1 is
    // p2, so p2 → 1.0; p3's 0.25 ratio and p4's 0.375 both clamp up to the 0.5 floor.
    const state = world({}, { p1: 1500, p2: 4000, p3: 1000, p4: 1500 });
    expect(threatWeight(state, "p1", "p2")).toBe(1);
    expect(threatWeight(state, "p1", "p3")).toBe(0.5);
    expect(threatWeight(state, "p1", "p4")).toBe(0.5);
  });

  it("is 1.0 for every rival on an equal-wealth field (so v11 == v5 there)", () => {
    const state = world({}, { p1: 1500, p2: 1500, p3: 1500, p4: 1500 });
    expect(threatWeight(state, "p1", "p2")).toBe(1);
    expect(threatWeight(state, "p1", "p3")).toBe(1);
    expect(threatWeight(state, "p1", "p4")).toBe(1);
  });
});

describe("v11 proposeBestTrade — denies the leader, not the richest set", () => {
  it("flips denial from a trailing rival's bigger set to the leader's", () => {
    // Two denial targets, both completers at holdout p4:
    //  - p2 (BEHIND, cash 100) is one ORANGE short (560 bonus) — the bigger set.
    //  - p3 (LEADER, cash 4000) is one RED short (544 bonus) — slightly smaller.
    // v5 is threat-blind: it denies the larger orange (premium 336 > red's 326).
    // v11 weights by threat: p2 floors to 0.5 (orange premium → 168) while the
    // leader p3 keeps full weight (red premium 326), so v11 denies the RED — the
    // set the player who's actually winning is about to complete.
    const state = world(
      {
        ownership: {
          16: "p2", 18: "p2", 19: "p4", // p2 one orange short, completer at p4
          21: "p3", 23: "p3", 24: "p4", // p3 one red short, completer at p4
        },
      },
      { p1: 5000, p2: 100, p3: 4000, p4: 1500 },
    );

    const v5 = v5Propose(state, "p1");
    expect(v5).not.toBeNull();
    if (!v5) return;
    expect(v5.terms.propertyTo[19]).toBe("p1"); // v5 denies the trailer's orange
    expect(v5.terms.propertyTo[24]).toBeUndefined();

    const v11 = v11Propose(state, "p1");
    expect(v11).not.toBeNull();
    if (!v11) return;
    expect(v11.terms.propertyTo[24]).toBe("p1"); // v11 denies the LEADER's red
    expect(v11.terms.propertyTo[19]).toBeUndefined();
  });
});
