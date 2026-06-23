// opt-v3 — the OPT lineage (paradigm-named: the METHOD that produced it). The
// crown-aligned MAXIMIN ES (like opt-v2), but re-run with the previous champion
// **opt-v2 ITSELF added to the panel** (a 7-member field). So the ES was forced
// to find a 15-param claude-v38 vector whose WORST matchup — now potentially the
// opt-v2 matchup — is still high. It found one: train maximin 57.3% over the
// 7-member panel (baseline claude-v38 only 35.5%, since claude-v38 loses to
// opt-v2). That this is >50% means the optimizer found a vector that beats even
// opt-v2 on the train seeds — i.e. the 15-param space was NOT exhausted by opt-v2.
//
// The winning profile is DISTINCT from opt-v2's: more moderate denial (0.29 vs
// opt-v2's 0.41) but a much higher monopoly-vs-cash weight (bonusScale 24.8k vs
// 16.4k) and a slammed liquidity cap (floorCap 300→100). A different corner of
// the same aggressive basin.
//
// The honest verdict is the held-out crown gauntlet vs base opt-v2, owned by the
// orchestrator — maximin overfits the binding (opt-v2) matchup, so the held-out
// per-member result is what decides whether opt-v3 actually supersedes opt-v2.
//
// FIDELITY: opt-v3 binds the SAME proven factory (`bot.ts`, pinned byte-identical
// to claude-v38 at DEFAULT_PARAMS) to its winning vector — not a hand-transcription.
// Pure, deterministic, self-contained — no cross-version imports, no `optimize/`
// imports, no Math.random/Date.
//
// NOTABLE PARAM DELTAS vs claude-v38 (default → opt-v3):
//   - denyFactor        0.15  → 0.292   (denial up, but less than opt-v2's 0.408)
//   - bonusScale        16489 → 24758   (monopolies weighted MUCH higher vs cash)
//   - floorCap          300   → 100     (tiny cap on the rent-fraction reserve)
//   - jailDangerRent    350   → 184     (leaves jail on far less developed boards)
//   - acceptMargin      30    → 5       (sweetens trades to a tiny acceptance cushion)
//   - baseFloor         60    → 31 ; floorRentFraction 0.3 → 0.169 (thin reserves)
//   (railSynergyScale, utilPairBonus, hotelCushion, survivalFactor, liquidityRiskGain,
//    dipWorthMult, raiseWorthMult, houseScarce moved by smaller amounts — full vector below.)
import { type ParamVector, makeParamBot } from "./bot";

/** The ES-winning parameter vector (SNES, MAXIMIN fitness, 7-member panel incl
 *  opt-v2, seed-1 `bestParams`). Frozen as plain static numbers — the single
 *  source of truth for what opt-v3 IS; `policy.test.ts` pins these. */
const OPT_V3_PARAMS: ParamVector = {
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

export { OPT_V3_PARAMS };

/** The frozen opt-v3 bot: the parameterized claude-v38 factory bound to the
 *  7-panel maximin ES-winning vector. */
export const optV3Bot = makeParamBot(OPT_V3_PARAMS);
