import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState, TradeTerms } from "../../../types";
import { evaluateTrade as v29Eval, proposeBestTrade as v29Propose } from "../claude-v29/trades";
import { evaluateTrade as v35Eval, proposeBestTrade as v35Propose } from "./trades";
import { DENY_FACTOR, isDistressed, monopolyBonus } from "./valuation";

// v35 prices the DENIAL-POSITION OPTION VALUE: a holder of a completer (a lot that
// would complete a one-short rival's set) values it at the premium it can extract,
// so it won't sell its position cheap to ANOTHER denier — which is what makes the
// hot-potato hop stop clearing. Selling TO the rival is the cash-out (unchanged);
// a distressed holder still sheds it cheap (protective grab preserved).
// Oranges = {16,18,19}; greens = {31,32,34}. freshGame seats p1..p4.

const base = freshGame();

function board(ownership: Record<number, string>, cash: Record<string, number>): GameState {
  return {
    ...base,
    ownership,
    players: base.players.map((p) => ({ ...p, cash: cash[p.id] ?? p.cash })),
  };
}

/** p3 owns a hoteled green monopoly → a deadly developed rent, so a thin holder of
 *  the completer can be genuinely distressed. */
function withDeadlyBoard(ownership: Record<number, string>, cash: Record<string, number>): GameState {
  const s = board({ 31: "p3", 32: "p3", 34: "p3", ...ownership }, cash);
  return { ...s, houses: { 31: 5, 32: 5, 34: 5 } };
}

const ORANGE_PREMIUM = Math.round(monopolyBonus("orange") * DENY_FACTOR); // the held-completer option value

describe("v35 — denial-position option value (symmetric ring pricing)", () => {
  it("a HEALTHY holder won't sell its completer cheap to another denier — the ring won't start", () => {
    // p2 one orange short (16,18); completer 19 at healthy holdout p3. v29: p1 books
    // the deny premium and p3 sells at break-even → the hop clears (a ring hop). v35:
    // p3 now prices 19 at the premium it can extract, so p1's deny can't clear.
    const st = board({ 16: "p2", 18: "p2", 19: "p3" }, { p1: 3000, p2: 1000, p3: 1000, p4: 1000 });
    expect(v29Propose(st, "p1")?.reason).toContain("deny"); // v29: ring hop
    expect(v35Propose(st, "p1")).toBeNull(); // v35: no hop
  });

  it("prices the forfeited premium exactly: giving a held completer to a non-rival costs the DENY premium", () => {
    const st = board({ 16: "p2", 18: "p2", 19: "p3" }, { p1: 3000, p2: 1000, p3: 1000, p4: 1000 });
    const giveToDenier: TradeTerms = { propertyTo: { 19: "p1" }, gojfTo: {}, cashDelta: {} };
    const d29 = v29Eval(st, "p3", giveToDenier).delta;
    const d35 = v35Eval(st, "p3", giveToDenier).delta;
    expect(d35).toBeLessThan(d29); // v35 values keeping the position
    expect(d29 - d35).toBe(ORANGE_PREMIUM); // exactly the orange option value
  });

  it("selling TO the one-short rival is the cash-out — priced identically to v29 (no double-count)", () => {
    const st = board({ 16: "p2", 18: "p2", 19: "p3" }, { p1: 3000, p2: 1000, p3: 1000, p4: 1000 });
    const giveToRival: TradeTerms = { propertyTo: { 19: "p2" }, gojfTo: {}, cashDelta: {} };
    expect(v35Eval(st, "p3", giveToRival).delta).toBe(v29Eval(st, "p3", giveToRival).delta);
  });

  it("a DISTRESSED holder still sheds it cheap — the protective grab off a near-bust seat is preserved", () => {
    // Completer 19 at thin, distressed p4 (under the hoteled-green board). p4 forfeits
    // the premium cheap, so p1's protective deny still clears — v35 fires it.
    const st = withDeadlyBoard({ 16: "p2", 18: "p2", 19: "p4" }, { p1: 3000, p2: 1000, p3: 1000, p4: 5 });
    expect(isDistressed(st, "p4")).toBe(true);
    const deal = v35Propose(st, "p1");
    expect(deal?.terms.propertyTo[19]).toBe("p1");
    expect(deal?.reason).toContain("deny");
  });

  it("leaves COMPLETION construction untouched (the rival caving / cash-out is unchanged)", () => {
    // p1 is the one-short owner; buying 19 from p3 completes p1's set — the cash-out,
    // not a denier hop, so v35 must match v29.
    const st = board({ 16: "p1", 18: "p1", 19: "p3" }, { p1: 3000, p2: 1000, p3: 1000, p4: 1000 });
    expect(v35Propose(st, "p1")).toEqual(v29Propose(st, "p1"));
  });
});
