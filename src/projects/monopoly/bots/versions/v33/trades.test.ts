import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../v5/trades";
import { proposeBestTrade as v33Propose } from "./trades";

// v33 keeps v29's COMPLETION construction byte-for-byte; its only change is the
// Offer C MARGINAL-DENIAL gate. So on no-distress boards v33 still matches v5 on
// every COMPLETION, and DIVERGES from v5 only where v5 builds a phantom denial a
// cash-rich rival could just re-buy (the strong-set hot-potato). The genuine,
// sticky denial off a DISTRESSED holder lives in `phantom-denial.test.ts`.
// Oranges = {16,18,19}; pinks = {11,13,14}.

const base = freshGame();

function setCash(state: GameState, id: string, cash: number): GameState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, cash } : p)) };
}

describe("v33 proposeBestTrade — completions match v5, phantom denials don't", () => {
  it("does NOT build the strong-set denial v5 builds — phantom on a no-distress board", () => {
    // p2 one orange short with the completer (19) at a NON-DISTRESSED holdout p3; p1
    // rich. v5 (and v14/v29) book the denial premium and buy 19. But against a firm
    // holder a cash-rich rival can re-extract 19 from whoever holds it — including
    // from p1 after the buy — so the denial is futile churn (the dark-blue ring).
    // v33 skips it; p1 owns nothing else, so it proposes nothing.
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } },
      "p1",
      3000,
    );
    expect(v5Propose(state, "p1")?.reason).toContain("deny"); // v5: phantom denial
    expect(v33Propose(state, "p1")).toBeNull(); // v33: no churn
  });

  it("proposes the same completion v5 does", () => {
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p1" } },
      "p1",
      3000,
    );
    expect(v33Propose(state, "p1")).toEqual(v5Propose(state, "p1"));
  });

  it("prefers completing my own strong set over denying a rival's — as v5", () => {
    // p1 one orange short (completer 19 at p3) AND p2 one pink short (completer 14 at
    // p3). The orange COMPLETION outranks any pink denial, so both pick it — v33's
    // denial gate never changes the winner here.
    const state = setCash(
      {
        ...base,
        ownership: {
          16: "p1", 18: "p1", 19: "p3", // p1 one orange short
          11: "p2", 13: "p2", 14: "p3", // p2 one pink short, p3 holds completer
        },
      },
      "p1",
      3000,
    );
    const proposal = v33Propose(state, "p1");
    expect(proposal).toEqual(v5Propose(state, "p1"));
    expect(proposal?.terms.propertyTo[19]).toBe("p1");
  });

  it("proposes nothing where v5 proposes nothing (unowned completer / unfundable)", () => {
    const unowned = setCash({ ...base, ownership: { 16: "p2", 18: "p2" } }, "p1", 3000);
    expect(v33Propose(unowned, "p1")).toEqual(v5Propose(unowned, "p1"));
    const broke = setCash({ ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } }, "p1", 10);
    expect(v33Propose(broke, "p1")).toEqual(v5Propose(broke, "p1"));
  });
});
