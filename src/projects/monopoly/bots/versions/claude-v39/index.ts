// claude-v39 — Claude lineage, authored by Claude Code. The opt-v4 champion with
// ONE logical change: the holder-side denial price (`denialPositionCost`) is back
// in the trade engine (see `./bot.ts` header). Borrowing across lineages is free
// (bots/CLAUDE.md): this binds the OPT-V4 vector verbatim to a factory that differs
// from opt-v4's by exactly the symmetric holder-side denial pricing.
//
// WHY. Real 4-player game 514j43 (human beat three bots): two claude-v38 seats
// hot-potatoed Marvin Gardens 18× trying to deny the human a strong set, burning
// the mid-game on net-zero rotations instead of developing. Root cause: the
// opt/jane trade engine prices denial only on the BUYER side, so a held completer
// of a strong set rotates for free between non-rival deniers. opt-v4 (this base)
// shares the gap AND raised `denyFactor` 0.15 → 0.317, which makes the ring WORSE
// (reproduced at up to 99 hops of one lot in the accumulator-vs-deniers config).
// `denialPositionCost` (proven in claude-v35, lost when v36 adopted the jane base)
// prices the holder symmetrically and kills the ring at its economic root.
//
// ACCEPTANCE: this is the "fix the hot-potato WITHOUT regressing" version, so the
// bar is a clean SPRT NON-regression vs opt-v4 (the base) AND no regression against
// the panel — plus the ring measurably dying in the accumulator config. It is NOT
// expected to be a big Elo jump (the ring is net-cash-zero rotation, not a direct
// bleed); its value is removing a degenerate behavior a human can exploit, and
// being the clean substrate for the "play-like-the-human" follow-up.
//
// FIDELITY: binds the SAME factory in `./bot.ts` to the opt-v4 vector below; pure,
// deterministic, self-contained (no cross-version / `optimize/` imports, no
// Math.random / Date). `policy.test.ts` pins the vector and the divergence-from-opt-v4.
import { type ParamVector, makeParamBot } from "./bot";

/** The opt-v4 champion vector (8-panel maximin ES winner), bound here UNCHANGED so
 *  claude-v39 differs from opt-v4 by exactly the holder-side denial price. */
const CLAUDE_V39_PARAMS: ParamVector = {
  denyFactor: 0.3173335904752713,
  bonusScale: 21995.472785370766,
  railSynergyScale: 0.9770818630368011,
  utilPairBonus: 73.96170330608032,
  baseFloor: 16.18002489726024,
  floorRentFraction: 0.2507072265465841,
  floorCap: 107.3670759562972,
  hotelCushion: 0,
  houseScarce: 6.236526313557662,
  jailDangerRent: 344.60283894208476,
  acceptMargin: 5,
  survivalFactor: 2.4072701326399173,
  liquidityRiskGain: 239.51454037558878,
  dipWorthMult: 2.01122889280204,
  raiseWorthMult: 1.6502849141314595,
};

export { CLAUDE_V39_PARAMS };

/** The frozen claude-v39 bot: the opt-v4 factory + holder-side denial pricing,
 *  bound to the opt-v4 champion vector. */
export const claudeV39Bot = makeParamBot(CLAUDE_V39_PARAMS);
