import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState, Player } from "../../../types";
import { desiredLevel } from "./valuation";

// v22's one change: a HOUSE-FAMINE DENIAL lever. While the 32-house bank is drawing down
// (≤ HOUSE_RACE = 12) and a rival could use houses, the bot holds at 4-and-hold rather
// than hoteling (which frees 4 houses back to the bank), to win the race to starve rivals'
// development — foregoing its own hotel rent. v17 has no race branch, so a flush bot would
// hotel (level 5) in this same spot; v22 caps at 4. With a FULL bank the famine is off and
// v22 hotels exactly like v17.

const base = freshGame();

/** p1 is flush (2500 cash) and p2 holds a bare (level-0) orange monopoly — a rival who
 *  "wants houses". `houses` consumes the bank to `housesLeft` via non-orange lots, so
 *  p2's oranges stay at level 0 (still wanting houses). */
function state(houses: Record<number, number>): GameState {
  return {
    ...base,
    players: base.players.map((p): Player => ({ ...p, cash: p.id === "p1" ? 2500 : 1500 })),
    ownership: { 16: "p2", 18: "p2", 19: "p2" },
    houses,
  };
}

describe("v22 house-famine — hold at 4 to starve the bank while it draws down", () => {
  it("holds at 4 (not hotel) in the race zone: bank ≈10 left, a rival wants houses, I'm flush", () => {
    // 22 house-levels placed on non-orange lots → 32-22 = 10 left (6 < 10 ≤ 12, race zone).
    const s = state({ 21: 4, 23: 4, 24: 4, 26: 4, 27: 4, 29: 2 });
    expect(desiredLevel(s, "p1").level).toBe(4); // v17 would hotel (5) here — no race branch
  });

  it("hotels (level 5) with a full bank — the famine is off, exactly like v17", () => {
    const s = state({}); // 32 houses left, well above HOUSE_RACE
    expect(desiredLevel(s, "p1").level).toBe(5);
  });

  it("hotels (level 5) when no rival could use houses, even with a drawn-down bank", () => {
    // p2 owns only ONE orange → no rival monopoly → famine doesn't apply.
    const s: GameState = {
      ...state({ 21: 4, 23: 4, 24: 4, 26: 4, 27: 4, 29: 2 }),
      ownership: { 16: "p2" },
    };
    expect(desiredLevel(s, "p1").level).toBe(5);
  });
});
