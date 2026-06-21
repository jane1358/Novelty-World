import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../v5/trades";
import { proposeBestTrade as v29Propose } from "../v29/trades";
import { proposeBestTrade as v33Propose } from "./trades";
import { isDistressed } from "./valuation";

// v33 fixes Finding 2 — the STRONG-set phantom-denial hot-potato that v14's gate
// left open. v14 gated Offer C on whether the rival could acquire the completer
// from its CURRENT HOLDER, which self-gates WEAK sets (a poor rival can't pry a
// cheap set loose) but PASSES for a strong set + cash-rich rival — so the completer
// still hot-potatoes bot→bot (the observed dark-blue ring) until the rival buys in
// anyway. The miss: v14 priced the ABSOLUTE denial, not the MARGINAL one. v33 adds
// the destination check — a denial fires only if my buy makes the completer
// unacquirable to the rival (the holder is SOFTER than me: a distressed seat that
// would feed it cheap). A firm holder already blocks as well as I would, so moving
// the lot holder→me is futile churn.
//
// Browns = {1,3}; oranges = {16,18,19}; dark blues = {37 Park Place, 39 Boardwalk};
// greens = {31,32,34}. freshGame seats p1..p4.

const base = freshGame();

function board(ownership: Record<number, string>, cash: Record<string, number>): GameState {
  return {
    ...base,
    ownership,
    players: base.players.map((p) => ({ ...p, cash: cash[p.id] ?? p.cash })),
  };
}

/** p3 owns a hoteled green monopoly → a deadly developed rent on the board, so a
 *  thin holder of the completer can be genuinely distressed (cf. distress.test.ts). */
function withDeadlyBoard(
  ownership: Record<number, string>,
  cash: Record<string, number>,
): GameState {
  const s = board({ 31: "p3", 32: "p3", 34: "p3", ...ownership }, cash);
  return { ...s, houses: { 31: 5, 32: 5, 34: 5 } };
}

describe("v33 — marginal-denial gate (Finding 2: strong-set hot-potato)", () => {
  it("does NOT build the dark-blue denial v29 builds — the EXACT observed ring", () => {
    // The live game: a cash-rich rival (p2) one dark-blue short holds Park Place
    // (37); the completer Boardwalk (39) sits with a NON-DISTRESSED bot holdout
    // (p3). v29 (v14's gate) sees the rival could extract 39 and books the denial —
    // and since p2 can re-buy 39 from whoever holds it, the lot hot-potatoes. v33
    // sees that buying 39 doesn't make it unacquirable (p2 could just pry it back
    // from p1 too), so it builds nothing — the ring never forms.
    const ring = board(
      { 37: "p2", 39: "p3" },
      { p1: 3000, p2: 3000, p3: 1000, p4: 1000 },
    );
    expect(v29Propose(ring, "p1")?.reason).toContain("deny"); // champion: still rings
    expect(v33Propose(ring, "p1")).toBeNull(); // v33: no churn
  });

  it("does NOT build the strong-set (orange) denial v5/v29 build against a firm holder", () => {
    // p2 one orange short (16,18); completer (19) at a non-distressed holdout p3; p2
    // flush. v14 called this a "real" denial and fired it — but it is the same
    // phantom: p2 can re-extract 19 from p1 after the buy, so it churns. v33 skips.
    const strong = board(
      { 16: "p2", 18: "p2", 19: "p3" },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v5Propose(strong, "p1")?.reason).toContain("deny");
    expect(v29Propose(strong, "p1")?.reason).toContain("deny");
    expect(v33Propose(strong, "p1")).toBeNull();
  });

  it("STILL fires a real denial off a DISTRESSED holder — surgical, not a blanket disable", () => {
    // Same orange threat, but the completer (19) sits with a genuinely DISTRESSED
    // holdout p4 (thin cash under the hoteled-green board), who would shed it to the
    // rival cheap (its threat premium is discounted to zero). The rival p2 can afford
    // that cheap price (~$230) but NOT p1's firm price (~$566). So taking 19 into
    // firm hands lifts it out of p2's reach — a denial that actually STICKS. v33
    // fires it, identical to the champion v29 (which also fires here).
    const distressed = withDeadlyBoard(
      { 16: "p2", 18: "p2", 19: "p4" },
      { p1: 3000, p2: 300, p3: 1000, p4: 5 },
    );
    expect(isDistressed(distressed, "p4")).toBe(true);
    const deal = v33Propose(distressed, "p1");
    expect(deal).not.toBeNull();
    expect(deal?.terms.propertyTo[19]).toBe("p1");
    expect(deal?.reason).toContain("deny");
    expect(deal).toEqual(v29Propose(distressed, "p1")); // v33 keeps the genuine denial
  });

  it("still skips the brown hot-potato (v14's weak-set case, inherited)", () => {
    // p2 one brown short holds Mediterranean (1); last brown Baltic (3) at non-rival
    // p4. Completing a brown isn't worth the threat-priced cost — v14's holder gate
    // already blocks it, before v33's destination gate is even reached.
    const ring = board(
      { 1: "p2", 3: "p4" },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v5Propose(ring, "p1")?.reason).toContain("deny");
    expect(v33Propose(ring, "p1")).toBeNull();
  });

  it("still skips a strong set the rival is too cash-poor to acquire (v14, inherited)", () => {
    const poorRival = board(
      { 16: "p2", 18: "p2", 19: "p3" },
      { p1: 3000, p2: 100, p3: 1000, p4: 1000 },
    );
    expect(v5Propose(poorRival, "p1")?.reason).toContain("deny");
    expect(v33Propose(poorRival, "p1")).toBeNull();
  });

  it("leaves completion construction untouched (matches v5)", () => {
    // p1 one orange short, completer at a holdout — a real completion, not a denial.
    // v33's gate touches only Offer C, so completion is byte-identical to v5.
    const completion = board(
      { 16: "p1", 18: "p1", 19: "p3" },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v33Propose(completion, "p1")).toEqual(v5Propose(completion, "p1"));
  });
});
