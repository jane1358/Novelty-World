import { describe, expect, it } from "vitest";
import { type Contender, simulateGame } from "../../simulate";
import { dumbBot } from "../../dumb";
import { OPT_V4_PARAMS, optV4Bot } from "../opt-v4";
import { CLAUDE_V39_PARAMS, claudeV39Bot } from "./index";

// claude-v39 = the opt-v4 champion factory PLUS the holder-side denial price
// (`denialPositionCost`). It binds the OPT-V4 vector unchanged, so it differs from
// opt-v4 by EXACTLY the symmetric holder-side denial pricing. These tests pin that
// (a) the vector is opt-v4's verbatim and (b) the fix is LIVE — it kills the
// denial hot-potato ring that opt-v4 exhibits in the accumulator-vs-deniers config
// (real game 514j43; reproduced here deterministically).

/** The ring TRIGGER configuration: three identical deniers + one passive
 *  accumulator (`dumb`, which buys-and-holds like the non-trading human that
 *  surfaced this in 514j43). A one-short accumulator holding two lots of a strong
 *  set creates a persistent denial target the deniers rotate the completer over. */
function ringSeats(bot: Contender["bot"], label: string): Contender[] {
  return [
    { label: `${label}-0`, bot },
    { label: "acc", bot: dumbBot },
    { label: `${label}-2`, bot },
    { label: `${label}-3`, bot },
  ];
}

function tradeCount(bot: Contender["bot"], label: string, seed: string): number {
  const r = simulateGame({ seed, seats: ringSeats(bot, label), maxTurns: 2000, includeLog: true });
  return r.eventCounts.trade;
}

describe("claude-v39 binds the opt-v4 champion vector verbatim", () => {
  it("is the opt-v4 vector (differs from opt-v4 only by the holder-side denial price)", () => {
    expect(CLAUDE_V39_PARAMS).toEqual(OPT_V4_PARAMS);
  });
});

describe("claude-v39 — the holder-side denial price KILLS the hot-potato ring", () => {
  // Seeds where opt-v4 rings hard in the accumulator config (measured): the same
  // completer rotates 90+ times between non-rival deniers at break-even prices.
  const ringingSeeds = ["mix-4", "mix-5"];

  for (const seed of ringingSeeds) {
    it(`executes far fewer trades than opt-v4 (seed ${seed})`, () => {
      const opt = tradeCount(optV4Bot, "opt4", seed);
      const v39 = tradeCount(claudeV39Bot, "v39", seed);
      // The seed must genuinely ring for the base, or the test proves nothing.
      expect(opt).toBeGreaterThan(40);
      // The symmetric holder price collapses the ring: v39 trades a fraction as much.
      expect(v39).toBeLessThan(opt / 2);
    });
  }
});

describe("claude-v39 is deterministic", () => {
  it("plays the same game twice for a fixed seed", () => {
    const seed = "v39-det-1";
    const seats = ringSeats(claudeV39Bot, "v39");
    const a = simulateGame({ seed, seats, maxTurns: 2000, includeLog: true });
    const b = simulateGame({ seed, seats, maxTurns: 2000, includeLog: true });
    expect(b.turns).toBe(a.turns);
    expect(b.steps).toBe(a.steps);
    expect(b.eventCounts).toEqual(a.eventCounts);
  });
});
