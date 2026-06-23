import { describe, expect, it } from "vitest";
import { simulateGame, type Contender } from "../../simulate";
import { claudeV38Bot } from "../claude-v38";
import { DEFAULT_PARAMS, makeParamBot } from "./bot";
import { OPT_V3_PARAMS, optV3Bot } from "./index";

// opt-v3 fidelity — three guarantees that together prove the FIELDED bot is the
// bot the Evolutionary Strategy (7-panel maximin fitness) actually optimized:
//  1. The BAKED VECTOR equals the recorded search winner exactly.
//  2. The FACTORY is faithful: at DEFAULT_PARAMS it reproduces claude-v38
//     move-for-move, so opt-v3 differs from it ONLY by the vector.
//  3. opt-v3 is DETERMINISTIC: the same seed yields the same game twice.

/** The recorded SNES (7-panel maximin) seed-1 `bestParams` — kept verbatim here
 *  (not imported) so the test is an independent ground truth. */
const SEARCH_WINNER: typeof OPT_V3_PARAMS = {
  denyFactor: 0.29201629002124435,
  bonusScale: 24758.083425980785,
  railSynergyScale: 1.2590710072564122,
  utilPairBonus: 47.46128844789236,
  baseFloor: 30.84576166961448,
  floorRentFraction: 0.1691826784984239,
  floorCap: 100,
  hotelCushion: 177.41733334829428,
  houseScarce: 5.760702561046529,
  jailDangerRent: 183.5945651907561,
  acceptMargin: 5,
  survivalFactor: 1.8289194430382332,
  liquidityRiskGain: 176.84648922354438,
  dipWorthMult: 1.6114562025539851,
  raiseWorthMult: 1.3210940236042945,
};

function seatsAll(bot: Contender["bot"], label: string): Contender[] {
  return [0, 1, 2, 3].map((i) => ({ label: `${label}-${i.toString()}`, bot }));
}

describe("opt-v3 — baked vector pins the 7-panel maximin ES winner", () => {
  it("matches the recorded SNES seed-1 bestParams exactly", () => {
    expect(OPT_V3_PARAMS).toEqual(SEARCH_WINNER);
  });

  it("differs from claude-v38 defaults on the documented levers", () => {
    expect(OPT_V3_PARAMS.denyFactor).not.toBe(DEFAULT_PARAMS.denyFactor);
    expect(OPT_V3_PARAMS.bonusScale).not.toBe(DEFAULT_PARAMS.bonusScale);
    expect(OPT_V3_PARAMS.floorCap).not.toBe(DEFAULT_PARAMS.floorCap);
  });
});

describe("opt-v3 factory fidelity — DEFAULT_PARAMS reproduces claude-v38", () => {
  const seeds = ["sim-1", "fid-2", "fid-7"];
  const paramBot = makeParamBot(DEFAULT_PARAMS);

  for (const seed of seeds) {
    it(`default param bot is move-for-move identical to claude-v38 (seed ${seed})`, () => {
      const ref = simulateGame({
        seed,
        seats: seatsAll(claudeV38Bot, "v38"),
        maxTurns: 2000,
        includeLog: true,
      });
      const got = simulateGame({
        seed,
        seats: seatsAll(paramBot, "def"),
        maxTurns: 2000,
        includeLog: true,
      });

      expect(got.terminated).toBe(ref.terminated);
      expect(got.turns).toBe(ref.turns);
      expect(got.steps).toBe(ref.steps);
      expect(got.eventCounts).toEqual(ref.eventCounts);
      const refWinnerSeat = ref.standings.findIndex((s) => s.id === ref.winnerId);
      const gotWinnerSeat = got.standings.findIndex((s) => s.id === got.winnerId);
      expect(gotWinnerSeat).toBe(refWinnerSeat);
      expect(got.highlights.map((h) => ({ turn: h.turn, kind: h.event.kind }))).toEqual(
        ref.highlights.map((h) => ({ turn: h.turn, kind: h.event.kind })),
      );
      const notes = (r: typeof ref): string[] =>
        r.highlights
          .filter((h) => h.event.kind === "bot-note")
          .map((h) => (h.event.kind === "bot-note" ? h.event.text : ""));
      expect(notes(got)).toEqual(notes(ref));
    });
  }
});

describe("opt-v3 is deterministic", () => {
  it("plays the same game twice for a fixed seed", () => {
    const seed = "opt3-det-1";
    const a = simulateGame({ seed, seats: seatsAll(optV3Bot, "opt3"), maxTurns: 2000, includeLog: true });
    const b = simulateGame({ seed, seats: seatsAll(optV3Bot, "opt3"), maxTurns: 2000, includeLog: true });
    expect(b.turns).toBe(a.turns);
    expect(b.steps).toBe(a.steps);
    expect(b.eventCounts).toEqual(a.eventCounts);
    const winnerSeat = (r: typeof a): number => r.standings.findIndex((s) => s.id === r.winnerId);
    expect(winnerSeat(b)).toBe(winnerSeat(a));
  });

  it("plays DIFFERENTLY from claude-v38 — the vector actually changes decisions", () => {
    const seed = "opt3-vs-v38-1";
    const opt = simulateGame({ seed, seats: seatsAll(optV3Bot, "opt3"), maxTurns: 2000, includeLog: true });
    const v38 = simulateGame({ seed, seats: seatsAll(claudeV38Bot, "v38"), maxTurns: 2000, includeLog: true });
    const diverged =
      opt.turns !== v38.turns ||
      opt.steps !== v38.steps ||
      JSON.stringify(opt.eventCounts) !== JSON.stringify(v38.eventCounts);
    expect(diverged).toBe(true);
  });
});
