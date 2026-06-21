import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import { proposeBestTrade as v5Propose } from "../v5/trades";
import { proposeBestTrade as v28Propose } from "./trades";

// v28's distress discount is INERT on a board with no DEVELOPED rents (no seat can
// be distressed), so its construction must still match v5 (via v17/v14) exactly on
// these boards — the no-distress regression. The distress behavior itself is pinned
// in `distress.test.ts`. Oranges = {16,18,19}; pinks = {11,13,14}.

const base = freshGame();

function setCash(state: GameState, id: string, cash: number): GameState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, cash } : p)) };
}

describe("v35 proposeBestTrade — completions match v5, healthy-holder denials don't", () => {
  it("does NOT build the bot→bot strong-set denial v5 builds (healthy holder is priced out)", () => {
    // p2 one orange short, completer (19) at healthy holdout p3. v5 fires the denial
    // hop (p3 sells cheap); v35 prices p3's held completer at the premium it extracts,
    // so the hop can't clear and p1 builds nothing. (The distress-holder grab still
    // fires — see denial-position.test.ts.)
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } },
      "p1",
      3000,
    );
    expect(v5Propose(state, "p1")?.reason).toContain("deny");
    expect(v28Propose(state, "p1")).toBeNull();
  });

  it("proposes the same completion v5 does", () => {
    const state = setCash(
      { ...base, ownership: { 16: "p2", 18: "p2", 19: "p1" } },
      "p1",
      3000,
    );
    expect(v28Propose(state, "p1")).toEqual(v5Propose(state, "p1"));
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
    const proposal = v28Propose(state, "p1");
    expect(proposal).toEqual(v5Propose(state, "p1"));
    expect(proposal?.terms.propertyTo[19]).toBe("p1");
  });

  it("proposes nothing where v5 proposes nothing (unowned completer / unfundable)", () => {
    const unowned = setCash({ ...base, ownership: { 16: "p2", 18: "p2" } }, "p1", 3000);
    expect(v28Propose(unowned, "p1")).toEqual(v5Propose(unowned, "p1"));
    const broke = setCash({ ...base, ownership: { 16: "p2", 18: "p2", 19: "p3" } }, "p1", 10);
    expect(v28Propose(broke, "p1")).toEqual(v5Propose(broke, "p1"));
  });
});
