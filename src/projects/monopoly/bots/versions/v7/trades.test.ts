import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../v5/trades";
import { proposeBestTrade as v7Propose } from "./trades";

// v7's one hypothesis: extend v5's trade-to-deny to block a rival who is TWO lots
// short of a 3-lot set, by taking one of the two missing lots from a holdout — an
// EARLY block v5 (one-short only) never proposes. The credit is discounted, so a
// real completion or a one-short block always outranks it, and 2-lot sets are
// excluded (their "two short" is "owns none"). Oranges = {16,18,19} ($180/$180/$200);
// reds = {21,23,24}; browns = {1,3}; freshGame seats p1..p4.

const base = freshGame();

function setCash(state: GameState, id: string, cash: number): GameState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, cash } : p)) };
}

describe("v7 proposeBestTrade — early (two-short) denial", () => {
  it("blocks a two-short rival from a holdout, where v5 proposes nothing", () => {
    // p2 owns one orange (16) — two short. The other two lots sit with holdouts
    // (18 at p3, 19 at p4). p1 owns no orange, so v5 (one-short only) proposes
    // nothing; v7 buys the cheaper missing lot (18, $180) to make the set
    // impossible for p2 while the lots are still distributed.
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p3", 19: "p4" } },
      "p1",
      3000,
    );
    expect(v5Propose(state, "p1")).toBeNull();

    const proposal = v7Propose(state, "p1");
    expect(proposal).not.toBeNull();
    if (!proposal) return;
    expect(proposal.terms.propertyTo[18]).toBe("p1");
    expect(proposal.reason).toContain("two short");
    expect(proposal.reason).toContain("orange");
  });

  it("prefers a one-short block (full credit) over a two-short block of the same set", () => {
    // p2 is one orange short (16, 18) with the completer at p3; p3, owning that one
    // orange (19), is itself two short. v7 must take v5's one-short block (buy 19,
    // full credit) over the discounted two-short block of p3 — and so propose
    // EXACTLY what v5 does here.
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } },
      "p1",
      3000,
    );
    const proposal = v7Propose(state, "p1");
    expect(proposal).not.toBeNull();
    if (!proposal) return;
    expect(proposal.terms.propertyTo[19]).toBe("p1");
    expect(proposal.reason).not.toContain("two short");
    expect(proposal).toEqual(v5Propose(state, "p1"));
  });

  it("adds nothing when I already hold one of the rival's two missing lots", () => {
    // p1 holds one orange (18), so every two-short rival is already blocked — no
    // early denial fires. p1's own one-short stake means v5's completion (buy 16,
    // 19) still applies, and v7 must propose exactly that.
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p1", 19: "p4" } },
      "p1",
      3000,
    );
    expect(v7Propose(state, "p1")).toEqual(v5Propose(state, "p1"));
  });

  it("does not early-deny a 2-lot set (its 'two short' is 'owns none')", () => {
    // p3 holds one brown (1); browns are a 2-lot set, so the other rivals owning no
    // brown are trivially 'two short' — but that's not a near-threat, and v7 skips
    // 2-lot sets. With nothing else to do, it proposes nothing.
    const state = setCash({ ...base, ownership: { 1: "p3" } }, "p1", 3000);
    expect(v7Propose(state, "p1")).toBeNull();
  });
});
