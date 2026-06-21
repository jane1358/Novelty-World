import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../claude-v5/trades";
import { proposeBestTrade as v17Propose } from "./trades";

// v14 fixes Finding 1 — the PHANTOM-DENIAL hot-potato. v5's Offer C books a denial
// premium for buying a rival's completer from a holdout, gated only on the rival
// owning N-1 of the set — never on whether the rival could ACTUALLY acquire it. So a
// worthless lot the rival is already blocked from (brown, held by a non-rival) gets
// re-denied forever, bot→bot. v14 gates on the rival's realistic ability to acquire
// the completer: weak sets self-gate (the rival's gain barely clears the cost to pry
// it loose), strong sets still fire. Browns = {1,3} (Mediterranean/Baltic, 60/60);
// oranges = {16,18,19} (180/180/200); freshGame seats p1..p4.

const base = freshGame();

function board(ownership: Record<number, string>, cash: Record<string, number>): GameState {
  return {
    ...base,
    ownership,
    players: base.players.map((p) => ({ ...p, cash: cash[p.id] ?? p.cash })),
  };
}

describe("v14 — phantom-denial gate (Finding 1)", () => {
  it("does NOT build the brown hot-potato denial that v5 builds", () => {
    // The observed ring: a rival (p2) one brown short holds Mediterranean (1); the
    // last brown (Baltic, 3) sits with a non-rival holdout (p4). Both are flush, so
    // it's not an affordability issue — completing a brown simply isn't worth the
    // threat-priced cost to pry Baltic loose, so the rival would never actually do
    // it. v5 still books the $50 denial premium and buys Baltic (the bug); v14 sees
    // the rival can't realistically acquire it and builds nothing.
    const ring = board(
      { 1: "p2", 3: "p4" },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    const v5Deal = v5Propose(ring, "p1");
    expect(v5Deal).not.toBeNull();
    expect(v5Deal?.reason).toContain("deny"); // v5: phantom denial
    expect(v17Propose(ring, "p1")).toBeNull(); // v14: no phantom buy
  });

  it("does NOT build a bot→bot denial off a HEALTHY holder (v35 prices the holder's position)", () => {
    // p2 one orange short (16,18); completer (19) at healthy holdout p3. v5/v14 fire a
    // denial buy here (p3 sells cheap) — the ring hop. v35 prices p3's held completer
    // at the premium it can extract, so the hop no longer clears: p3 keeps 19 (still
    // denying p2) and p1 builds nothing. The genuine, distress-holder grab is pinned
    // in denial-position.test.ts.
    const strong = board(
      { 16: "p2", 18: "p2", 19: "p3" },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v5Propose(strong, "p1")?.reason).toContain("deny"); // v5: the ring hop
    expect(v17Propose(strong, "p1")).toBeNull(); // v35: priced out
  });

  it("does NOT deny a strong set the rival is too cash-poor to acquire", () => {
    // Same orange board, but the rival p2 can't fund the extraction (needs ~$566 to
    // clear the holdout's threat-priced break-even) — so it's already blocked and the
    // denial is phantom. v5 still buys; v14 skips.
    const poorRival = board(
      { 16: "p2", 18: "p2", 19: "p3" },
      { p1: 3000, p2: 100, p3: 1000, p4: 1000 },
    );
    expect(v5Propose(poorRival, "p1")?.reason).toContain("deny");
    expect(v17Propose(poorRival, "p1")).toBeNull();
  });

  it("leaves completion construction untouched (matches v5)", () => {
    // p1 one orange short, completer at a holdout — a real completion, not a denial.
    // The phantom gate touches only Offer C, so v14 == v5 here.
    const completion = board(
      { 16: "p1", 18: "p1", 19: "p3" },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v17Propose(completion, "p1")).toEqual(v5Propose(completion, "p1"));
  });
});
