import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState, TradeTerms } from "../../../types";
import { evaluateTrade as v17Eval, proposeBestTrade as v17Propose } from "../v17/trades";
import { evaluateTrade as v25Eval, proposeBestTrade as v25Propose } from "./trades";

// v25's only change is DEFENSIVE: `rivalThreatCost` now prices HANDING a rival their
// 4th railroad / 2nd utility (the synergy analog of a color monopoly), so the bot
// won't SELL a rival a rail/utility-set completer for face value. Construction is
// v17 verbatim — proactive rail denial was deliberately NOT added (it hot-potatoes).
// Railroads = {5,15,25,35}; utilities = {12,28}.

const base = freshGame();

function setCash(state: GameState, cash: Record<string, number>): GameState {
  return { ...state, players: state.players.map((p) => ({ ...p, cash: cash[p.id] ?? p.cash })) };
}

describe("v25 — defensive railroad / utility threat pricing", () => {
  it("won't sell a rival their 4th railroad for face value (v17 would)", () => {
    // p1 holds Short Line (35); p2 owns the other three rails. An offer of $250 for
    // 35 clears the deed ($200) but not the threat of completing p2's railroad set.
    const state = setCash(
      { ...base, ownership: { 35: "p1", 5: "p2", 15: "p2", 25: "p2" } },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    const terms: TradeTerms = {
      propertyTo: { 35: "p2" },
      gojfTo: {},
      cashDelta: { p1: 250, p2: -250 },
    };
    expect(v17Eval(state, "p1", terms).accept).toBe(true);
    expect(v25Eval(state, "p1", terms).accept).toBe(false);
  });

  it("won't sell a rival their 2nd utility for face value (v17 would)", () => {
    // p1 holds Water Works (28); p2 owns Electric Company (12). $160 clears the deed
    // ($150) but not the (small) utility-pair threat.
    const state = setCash(
      { ...base, ownership: { 28: "p1", 12: "p2" } },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    const terms: TradeTerms = {
      propertyTo: { 28: "p2" },
      gojfTo: {},
      cashDelta: { p1: 160, p2: -160 },
    };
    expect(v17Eval(state, "p1", terms).accept).toBe(true);
    expect(v25Eval(state, "p1", terms).accept).toBe(false);
  });

  it("does NOT proactively deny a rival's rail completer (no hot-potato) — matches v17", () => {
    // p2 one rail short, completer (Short Line, 35) at holdout p4. v25 leaves Offer C
    // color-only on purpose (a proactive rail denial would hot-potato), so it proposes
    // exactly what v17 does here — nothing of the sort.
    const state = setCash(
      { ...base, ownership: { 5: "p2", 15: "p2", 25: "p2", 35: "p4" } },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v25Propose(state, "p1")).toEqual(v17Propose(state, "p1"));
  });

  it("leaves color trade construction unchanged — matches v17 on a color board", () => {
    // Oranges {16,18,19}: p2 one short, completer at holdout p3 — a real color denial.
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } },
      { p1: 3000, p2: 1000, p3: 1000, p4: 1000 },
    );
    expect(v25Propose(state, "p1")).toEqual(v17Propose(state, "p1"));
  });
});
