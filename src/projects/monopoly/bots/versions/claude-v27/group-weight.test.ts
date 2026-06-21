import { describe, expect, it } from "vitest";
import { freshGame } from "../../../mocks";
import type { GameState } from "../../../types";
import {
  acquisitionValue as v17Acq,
  monopolyBonus as v17Bonus,
} from "../claude-v17/valuation";
import {
  acquisitionValue as v27Acq,
  monopolyBonus as v27Bonus,
} from "./valuation";

// v27's one change: dark-blue's GROUP_WEIGHT 0.55→0.62 (a SMALLER bump than v26's
// 0.73), lifting its monopolyBonus from 413 (round(750*0.55)=412.5→413) to 465
// (750*0.62) so it ranks ≈#4 — level with the other big sets, just above green (460)
// and below yellow (480) — rather than v26's leap to #2. Every other set's bonus is
// v17 verbatim. Dark-blue lots are Park Place (37) and Boardwalk (39); set price 750.

const base = freshGame();

describe("v27 dark-blue set weight — raised to ≈#4 (a smaller bump than v26)", () => {
  it("lifts ONLY dark-blue's monopolyBonus 413→465; other sets unchanged", () => {
    expect(v17Bonus("dark-blue")).toBe(413); // round(750 * 0.55) = round(412.5)
    expect(v27Bonus("dark-blue")).toBe(465); // 750 * 0.62
    // Sanity: 465 sits just above green (460) and below yellow (480) → rank ≈#4.
    expect(v27Bonus("dark-blue")).toBeGreaterThan(v27Bonus("green"));
    expect(v27Bonus("dark-blue")).toBeLessThan(v27Bonus("yellow"));
    // Untouched sets identical between v17 and v27.
    for (const color of ["orange", "red", "yellow", "green", "pink", "light-blue", "brown"] as const) {
      expect(v27Bonus(color)).toBe(v17Bonus(color));
    }
  });

  it("values completing a dark-blue monopoly higher (the bonus flows through acquisitionValue)", () => {
    // p1 owns Park Place (37); Boardwalk (39) is unowned. Buying Boardwalk completes
    // the dark-blue set, so its acquisitionValue carries the full monopolyBonus delta.
    const oneShort: GameState = { ...base, ownership: { 37: "p1" } };
    const gain = v27Acq(oneShort, "p1", 39) - v17Acq(oneShort, "p1", 39);
    expect(gain).toBe(465 - 413); // exactly the bonus increase
  });

  it("raises the denial premium for blocking a rival's dark-blue (DENY_FACTOR 0.6)", () => {
    // p2 owns Park Place (37) and is one short; Boardwalk (39) is the open completer.
    // Taking it denies p2 the dark-blue monopoly → acquisitionValue books
    // round(monopolyBonus * 0.6) more in v27 than v17.
    const rivalOneShort: GameState = { ...base, ownership: { 37: "p2" } };
    const v17Deny = v17Acq(rivalOneShort, "p1", 39);
    const v27Deny = v27Acq(rivalOneShort, "p1", 39);
    expect(v27Deny - v17Deny).toBe(Math.round(465 * 0.6) - Math.round(413 * 0.6));
  });
});
