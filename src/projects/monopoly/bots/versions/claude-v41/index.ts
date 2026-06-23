// claude-v41 — Claude lineage, authored by Jane. Same as v40 (v39 substrate +
// Kyle's seller-side trade pricing thesis, CLAUDE.md Refinement #3) but with a
// LOWER rivalThreatFactor (0.4 instead of 0.6). v40 at 0.6 crushed denial-heavy
// bots but regressed vs jane-v2 (47.4%) and claude-v36 (47.9%) — 0.6 makes the
// bot refuse too many balanced trades. 0.4 is between v39's 0.317 (no decoupling)
// and v40's 0.6 (too aggressive). deployabilityDiscount stays at 0.5.
import { type ParamVector, makeParamBot } from "./bot";

/** The claude-v39 (opt-v4) vector, plus v41 trade params. */
const CLAUDE_V41_PARAMS: ParamVector = {
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
  // v41 trade params
  rivalThreatFactor: 0.4,
  deployabilityDiscount: 0.5,
};

export { CLAUDE_V41_PARAMS };

/** The frozen claude-v41 bot: v39 substrate + decoupled seller-side trade
 *  pricing (rivalThreatFactor 0.4) + deployability discount (0.5). */
export const claudeV41Bot = makeParamBot(CLAUDE_V41_PARAMS);
