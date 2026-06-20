import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { acquisitionValue as v5Acq } from "../v5/valuation";
import { acquisitionValue as v10Acq, auctionValue } from "./valuation";

// v10's one change: AUCTION DENIAL AGGRESSION. The auction handler caps its bid at
// `auctionValue`, which prices a rival's pinpointed completer with AUCTION_DENY_FACTOR
// = 1.0 (the full bonus) instead of the 0.6 trade DENY_FACTOR — because in an auction
// the rival bids for the same lot at its full value, so 0.6 always drops out. On any
// lot that DOESN'T block a rival, `auctionValue` == `acquisitionValue` (no denial
// premium either way), so the change is surgically scoped to rival-completer auctions.
// Oranges = {16,18,19} (prices 180/180/200, bonus = 560). Browns = {1,3} (bonus = 84).
// freshGame seats p1..p4; p1 is the bidding bot.

const base = freshGame();

function owned(ownership: GameState["ownership"]): GameState {
  return { ...base, ownership };
}

describe("v10 auctionValue — auction denial aggression", () => {
  it("bids higher than v5 to deny a rival's completer (full bonus, not 0.6)", () => {
    // p2 is one orange short (owns 16, 18); the last orange (19) is up for auction.
    // p1 owns no orange, so the lot's only worth beyond its $200 base is the denial.
    // v5 caps at base + 0.6*560 = 200 + 336 = 536; v10 caps at base + 1.0*560 =
    // 200 + 560 = 760 — enough to contest the rival who values it at the full bonus.
    const state = owned({ 16: "p2", 18: "p2" });
    expect(v5Acq(state, "p1", 19)).toBe(536);
    expect(auctionValue(state, "p1", 19)).toBe(760);
    expect(auctionValue(state, "p1", 19)).toBeGreaterThan(v5Acq(state, "p1", 19));
  });

  it("equals acquisitionValue when the lot blocks no rival (no denial premium)", () => {
    // No opponent is one orange short, so 19 carries no denial premium for anyone —
    // v10's auction ceiling is exactly its (and v5's) acquisition value.
    const state = owned({});
    expect(auctionValue(state, "p1", 19)).toBe(v10Acq(state, "p1", 19));
    expect(auctionValue(state, "p1", 19)).toBe(v5Acq(state, "p1", 19));
  });

  it("equals acquisitionValue when the lot completes MY OWN set (denial premium is for rivals only)", () => {
    // p1 owns 16, 18 — winning 19 completes p1's own orange. The completion value is
    // in `mine` (the position-value delta); no opponent is one-short, so there is no
    // denial premium and v10 bids exactly as v5 would. v10 only diverges on a RIVAL's
    // completer, never inflating the bid for my own set-completion.
    const state = owned({ 16: "p1", 18: "p1" });
    expect(auctionValue(state, "p1", 19)).toBe(v10Acq(state, "p1", 19));
    expect(auctionValue(state, "p1", 19)).toBe(v5Acq(state, "p1", 19));
  });

  it("self-gates on a weak set — the brown denial ceiling stays small", () => {
    // p2 one brown short (owns Mediterranean, 1); Baltic (3, $60) up for auction.
    // Brown's bonus is only 84, so even at the full factor v10's ceiling is base(60)
    // + 1.0*84 = 144 — far below an orange completer's $760. v10 contests cheap sets
    // cheaply; the aggression scales with how much the set is worth denying.
    const brown = owned({ 1: "p2" });
    expect(auctionValue(brown, "p1", 3)).toBe(144);
    const orange = owned({ 16: "p2", 18: "p2" });
    expect(auctionValue(brown, "p1", 3)).toBeLessThan(auctionValue(orange, "p1", 19));
  });
});
