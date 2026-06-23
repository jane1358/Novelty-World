// claude-v40 — Claude lineage, authored by Jane. The claude-v39 substrate (opt-v4
// champion + denialPositionCost) with Kyle's seller-side trade pricing thesis
// (bots/CLAUDE.md Refinement #3, 2026-06-23):
//
// (b) DECOUPLE rivalThreatFactor from denyFactor and raise it. In v39,
//   RIVAL_THREAT_FACTOR = denyFactor (0.317), so the bot prices its own harm at
//   ~32% of what the rival gains. v40 raises it to 0.6 (early sweep signal:
//   ~45%→~51% win share vs opt-v4 on a 130-seed stream). Must stay < 1.0 or
//   trades deadlock.
//
// (c) DEPLOYABILITY DISCOUNT on incoming cash. When a bot receives cash in a
//   set-handover trade (threatCost > 0) but has no productive outlet — no near-
//   monopoly to complete, no buildable set, no mortgages to redeem — the cash is
//   worth below face because idle cash earns nothing. v40 discounts incoming cash
//   by deployabilityDiscount (0.5) in that scenario.
//
// The thesis: make sellers properly reluctant to gift completers, so the
// completer never reaches the market. Denial (buyer-side + holder-side) becomes a
// patch for a disease that no longer exists.
//
// FIDELITY: same factory in `./bot.ts` with two logical additions; pure,
// deterministic, self-contained. `policy.test.ts` pins the vector and the
// divergence-from-v39.
import { type ParamVector, makeParamBot } from "./bot";

/** The claude-v39 (opt-v4) vector, plus the two new v40 params. */
const CLAUDE_V40_PARAMS: ParamVector = {
  // opt-v4 champion vector (unchanged from v39)
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
  // v40 new params
  rivalThreatFactor: 0.6,
  deployabilityDiscount: 0.5,
};

export { CLAUDE_V40_PARAMS };

/** The frozen claude-v40 bot: v39 substrate + decoupled seller-side trade
 *  pricing, bound to the opt-v4 vector with the new trade params. */
export const claudeV40Bot = makeParamBot(CLAUDE_V40_PARAMS);
