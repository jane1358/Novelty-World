import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../v5/trades";
import { proposeBestTrade as v24Propose } from "./trades";

// v24 inherits v14's phantom-denial gate and adds from-scratch acquisition (pinned
// separately in `acquire.test.ts`). On these COMPLETION / DENIAL boards the new grab
// either loses to the higher-scoring denial/completion or self-gates, so v24's chosen
// proposal must still match v5 exactly. This re-pins that. Oranges = {16,18,19};
// pinks = {11,13,14}.

const base = freshGame();

function setCash(state: GameState, id: string, cash: number): GameState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, cash } : p)) };
}

describe("v24 proposeBestTrade — matches v5 where the denial is real / absent", () => {
  it("builds the same strong-set denial v5 does (rival can acquire it)", () => {
    // p2 one orange short with the completer (19) at holdout p3; default cash leaves
    // p2 able to extract it, so the denial is real and outscores the grab — v24 == v5.
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } },
      "p1",
      3000,
    );
    const proposal = v24Propose(state, "p1");
    expect(proposal).toEqual(v5Propose(state, "p1"));
    expect(proposal?.terms.propertyTo[19]).toBe("p1");
    expect(proposal?.reason).toContain("deny");
  });

  it("proposes the same completion v5 does", () => {
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p1" } },
      "p1",
      3000,
    );
    expect(v24Propose(state, "p1")).toEqual(v5Propose(state, "p1"));
  });

  it("prefers completing my own strong set over denying a rival's — as v5", () => {
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
    const proposal = v24Propose(state, "p1");
    expect(proposal).toEqual(v5Propose(state, "p1"));
    expect(proposal?.terms.propertyTo[19]).toBe("p1");
  });

  it("proposes nothing where v5 proposes nothing (unowned completer / unfundable)", () => {
    const unowned = setCash({ ...base, ownership: { 16: "p2", 18: "p2" } }, "p1", 3000);
    expect(v24Propose(unowned, "p1")).toEqual(v5Propose(unowned, "p1"));
    const broke = setCash({ ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } }, "p1", 10);
    expect(v24Propose(broke, "p1")).toEqual(v5Propose(broke, "p1"));
  });
});
