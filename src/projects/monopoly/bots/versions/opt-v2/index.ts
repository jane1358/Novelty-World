// opt-v2 — the OPT lineage (paradigm-named: the METHOD that produced it). Like
// opt-v1, it is claude-v38's policy VERBATIM with its full 15-constant tuning
// vector JOINTLY optimized by an Evolutionary Strategy (SNES). The difference is
// the FITNESS: opt-v1 maximized AGGREGATE win-share vs the anchor panel, which
// rewarded crushing the WEAK members and left it only EVEN vs the strongest
// (claude-v36, jane-v2) — misaligned with the crown, which requires beating the
// base with NO regression vs any member.
//
// opt-v2 fixes that with a CROWN-ALIGNED MAXIMIN fitness: it maximizes the
// MINIMUM, over the six panel members, of the candidate's win-share vs that
// single member — measured in the SAME 2v2 pairing shape as the crown gauntlet.
// So the ES was forced to lift its WORST matchup (the hardest opponent) rather
// than pad against the easy ones. Train maximin: 60.0% (baseline claude-v38
// 51.3%) — i.e. on the train seeds the worst panel matchup was lifted to ~60%.
// The honest verdict is the held-out crown gauntlet, owned by the orchestrator,
// NOT this header: maximin is especially prone to overfitting the train seeds in
// exactly the binding matchup, so the held-out per-member result is what counts.
//
// FIDELITY: opt-v2 binds the SAME proven factory (`bot.ts`, pinned byte-identical
// to claude-v38 at DEFAULT_PARAMS) to its winning vector — not a hand-transcription
// of 15 constants. So the fielded bot is provably the bot the ES scored. Pure,
// deterministic, self-contained — no cross-version imports, no `optimize/` imports,
// no Math.random/Date.
//
// NOTABLE PARAM DELTAS vs claude-v38 (default → opt-v2):
//   - denyFactor        0.15  → 0.408   (denial pushed UP — against the hand-tuned
//                                         trend, like opt-v1; also raises
//                                         RIVAL_THREAT_FACTOR in lockstep)
//   - floorRentFraction 0.3   → 0.126   (very thin voluntary-spend reserve)
//   - acceptMargin      30    → 5       (sweetens trades to a tiny acceptance cushion)
//   - houseScarce       6     → 0       (never hoards houses to starve the bank)
//   - survivalFactor    1.5   → 2.556   (much more weight on a distressed seller's cash)
//   - utilPairBonus     40    → 72.6    (values the utility pair higher)
//   - raiseWorthMult    1.25  → 1.787 ; dipWorthMult 1.4 → 1.851 (deploys cash harder)
//   (bonusScale, railSynergyScale, baseFloor, floorCap, hotelCushion, jailDangerRent,
//    liquidityRiskGain moved by smaller amounts — full vector below.)
import { type ParamVector, makeParamBot } from "./bot";

/** The ES-winning parameter vector (SNES, MAXIMIN fitness, seed-1 `bestParams`).
 *  Frozen as plain static numbers — the single source of truth for what opt-v2 IS.
 *  Every field is the optimizer's exact output; `policy.test.ts` pins these against
 *  the recorded search result so a stray edit can't silently change the bot. */
const OPT_V2_PARAMS: ParamVector = {
  denyFactor: 0.4077865202089374,
  bonusScale: 16445.344286753978,
  railSynergyScale: 1.0097635130054328,
  utilPairBonus: 72.64042699522366,
  baseFloor: 45.13399032273108,
  floorRentFraction: 0.12619316909714123,
  floorCap: 351.9653844143328,
  hotelCushion: 201.1938408133869,
  houseScarce: 0,
  jailDangerRent: 289.7154580600488,
  acceptMargin: 5,
  survivalFactor: 2.555873116250935,
  liquidityRiskGain: 195.01891918549356,
  dipWorthMult: 1.850819704440693,
  raiseWorthMult: 1.787002692643207,
};

export { OPT_V2_PARAMS };

/** The frozen opt-v2 bot: the parameterized claude-v38 factory bound to the
 *  maximin ES-winning vector. */
export const optV2Bot = makeParamBot(OPT_V2_PARAMS);
