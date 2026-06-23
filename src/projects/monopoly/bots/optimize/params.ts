// ===========================================================================
// OFFLINE OPTIMIZATION TOOLING — the tunable parameter vector for a
// claude-v38-shaped bot.
//
// This is NOT a registry bot and NOT a frozen version. It exists only so the
// Evolutionary Strategy (`snes.ts`) can jointly optimize claude-v38's tuning
// constants — something the hand-tuned archive never did (every prior version
// moved ONE or TWO constants at a time, gated by SPRT). The ES produces a new
// constants VECTOR; the WINNER is then frozen back into a normal static rule
// bot (`versions/opt-v1/`) with no config indirection.
//
// INVARIANT: `DEFAULT_PARAMS` reproduces claude-v38 EXACTLY. `param-fidelity.test.ts`
// pins this (a game with the default vector is byte-identical to claude-v38), so
// the parameterization is faithful and the ES is optimizing the real bot.
// ===========================================================================

/** The tunable constants of a claude-v38-shaped bot. Each field corresponds to a
 *  hand-tuned constant in claude-v38's valuation/policy/trades; the defaults
 *  below are claude-v38 verbatim. The ES optimizes these jointly. */
export interface ParamVector {
  /** Denial premium as a fraction of the rival set's monopoly bonus
   *  (`DENY_FACTOR`). Also drives the SELLER-side `RIVAL_THREAT_FACTOR` (kept in
   *  lockstep per bots/CLAUDE.md "price BOTH sides of denial"). v38 = 0.15. */
  denyFactor: number;
  /** Scales the from-first-principles monopoly bonus (`BONUS_SCALE`). v38 pins
   *  orange to 560; this scales ALL set bonuses together, so it scales the whole
   *  monopoly-vs-cash tradeoff. v38 = 16489. */
  bonusScale: number;
  /** Multiplier on the railroad synergy table [0,0,70,180,380] (`RAIL_SYNERGY`).
   *  1.0 = v38. */
  railSynergyScale: number;
  /** Both-utilities pair bonus (`UTIL_PAIR_BONUS`). v38 = 40. */
  utilPairBonus: number;
  /** Bare voluntary-spend reserve floor (`BASE_FLOOR`). v38 = 60. */
  baseFloor: number;
  /** Fraction of worst board rent kept as voluntary-spend reserve
   *  (`FLOOR_RENT_FRACTION`). v38 = 0.3. */
  floorRentFraction: number;
  /** Cap on the rent-fraction reserve (`FLOOR_CAP`). v38 = 300. */
  floorCap: number;
  /** Spare cash above the floor that signals "flush" → push to hotels
   *  (`HOTEL_CUSHION`). v38 = 300. */
  hotelCushion: number;
  /** House-bank level below which houses are hoarded (`HOUSE_SCARCE`). v38 = 6. */
  houseScarce: number;
  /** Opponent rent that marks the board dangerous enough to sit in jail
   *  (`JAIL_DANGER_RENT`). v38 = 350. */
  jailDangerRent: number;
  /** Cushion (in opponent position-value) past break-even when sweetening a trade
   *  (`ACCEPT_MARGIN`). v38 = 30. */
  acceptMargin: number;
  /** Extra value per dollar of cash to a fully-distressed seller
   *  (`SURVIVAL_FACTOR`). v38 = 1.5. */
  survivalFactor: number;
  /** A cash-negative trade is only stomached for a gain this large
   *  (`LIQUIDITY_RISK_GAIN`). v38 = 250. */
  liquidityRiskGain: number;
  /** Worth/price multiple to dip below the reserve for a buy (`DIP_WORTH_MULT`).
   *  v38 = 1.4. */
  dipWorthMult: number;
  /** Worth/price multiple to MORTGAGE to fund a buy (`RAISE_WORTH_MULT`).
   *  v38 = 1.25. */
  raiseWorthMult: number;

  // --- EXTENDED dimensions (appended at the END so older saved vectors still
  //     unpack the original 15 correctly). All default to a NO-CHANGE value so
  //     DEFAULT_PARAMS still reproduces claude-v38 exactly. ---

  /** Per-color MULTIPLIER on that set's first-principles `MONOPOLY_BONUS`. Lets
   *  the ES RE-SHAPE the set-value ranking (the strategic axis hand-tuning barely
   *  touched). 1.0 = v38 (no change). One field per color. */
  monoMultOrange: number;
  monoMultRed: number;
  monoMultLightBlue: number;
  monoMultPink: number;
  monoMultYellow: number;
  monoMultDarkBlue: number;
  monoMultGreen: number;
  monoMultBrown: number;

  /** Per-count railroad synergy values (`RAIL_SYNERGY[2..4]`), giving the ES
   *  freedom over the synergy SHAPE that the single `railSynergyScale` could only
   *  scale uniformly. Still multiplied by `railSynergyScale`. Defaults are the
   *  v38 table: [70, 180, 380]. */
  railSynergy2: number;
  railSynergy3: number;
  railSynergy4: number;

  /** Liquid-to-worst-rent ratio at which `sellerDistress` reaches 0 (the "safe"
   *  cushion above worst rent). v38 = 1.5. Shaping the distress ramp tunes how
   *  much survival cash a distressed seller will pay for. */
  distressSafeRatio: number;

  /** The develop-floor every monopoly is brought to first in `planBuild`
   *  (`SPREAD_FLOOR`). v38 = 3 (the best rent-per-dollar jump). */
  spreadFloor: number;
}

/** The DEFAULT vector — claude-v38 verbatim. The parameterized bot built from
 *  this must be byte-identical to claude-v38 (pinned by param-fidelity.test.ts). */
export const DEFAULT_PARAMS: ParamVector = {
  denyFactor: 0.15,
  bonusScale: 16489,
  railSynergyScale: 1.0,
  utilPairBonus: 40,
  baseFloor: 60,
  floorRentFraction: 0.3,
  floorCap: 300,
  hotelCushion: 300,
  houseScarce: 6,
  jailDangerRent: 350,
  acceptMargin: 30,
  survivalFactor: 1.5,
  liquidityRiskGain: 250,
  dipWorthMult: 1.4,
  raiseWorthMult: 1.25,
  monoMultOrange: 1.0,
  monoMultRed: 1.0,
  monoMultLightBlue: 1.0,
  monoMultPink: 1.0,
  monoMultYellow: 1.0,
  monoMultDarkBlue: 1.0,
  monoMultGreen: 1.0,
  monoMultBrown: 1.0,
  railSynergy2: 70,
  railSynergy3: 180,
  railSynergy4: 380,
  distressSafeRatio: 1.5,
  spreadFloor: 3,
};

/** Inclusive [min, max] bounds for each parameter — SANE ranges the ES respects.
 *  Bounds bracket the v38 default with room to move in both directions, staying
 *  within behavior the bot's logic was designed for (e.g. a fraction stays a
 *  fraction; a reserve stays a moderate buffer, not the full worst-case rent). */
export const PARAM_BOUNDS: Readonly<Record<keyof ParamVector, readonly [number, number]>> = {
  denyFactor: [0.0, 0.6], // 0 (no denial) … 0.6 (claude-v5's denial-maximizer)
  bonusScale: [8000, 28000], // ~half … ~1.7× the v38 monopoly weight
  railSynergyScale: [0.4, 2.0],
  utilPairBonus: [0, 120],
  baseFloor: [0, 200],
  floorRentFraction: [0.1, 0.8], // aggressive … cautious reserve
  floorCap: [100, 700],
  hotelCushion: [0, 700],
  houseScarce: [0, 16], // 0 (never hoard) … half the 32-house bank
  jailDangerRent: [150, 700],
  acceptMargin: [5, 120],
  survivalFactor: [0.0, 3.0],
  liquidityRiskGain: [50, 600],
  dipWorthMult: [1.0, 2.5],
  raiseWorthMult: [1.0, 2.5],
  // Per-color bonus multipliers: 0.3 (heavily discount a set) … 3.0 (treble it),
  // wide enough to fully re-rank the eight sets in either direction.
  monoMultOrange: [0.3, 3.0],
  monoMultRed: [0.3, 3.0],
  monoMultLightBlue: [0.3, 3.0],
  monoMultPink: [0.3, 3.0],
  monoMultYellow: [0.3, 3.0],
  monoMultDarkBlue: [0.3, 3.0],
  monoMultGreen: [0.3, 3.0],
  monoMultBrown: [0.3, 3.0],
  // Rail synergy values, bracketing the v38 table [70,180,380] with room to grow
  // the compounding either way, kept monotone-friendly by overlapping ranges.
  railSynergy2: [0, 200],
  railSynergy3: [40, 450],
  railSynergy4: [100, 800],
  distressSafeRatio: [1.0, 3.0], // 1.0 (no safe cushion) … 3.0 (very cautious)
  spreadFloor: [2, 4], // 2 (lean) … 4 (push every set higher before spreading)
};

/** The parameter names in a FIXED order — the canonical vector layout the ES
 *  packs/unpacks and the worker serializes. Never reorder (it would silently
 *  remap a saved mean/sigma). */
export const PARAM_KEYS: readonly (keyof ParamVector)[] = [
  "denyFactor",
  "bonusScale",
  "railSynergyScale",
  "utilPairBonus",
  "baseFloor",
  "floorRentFraction",
  "floorCap",
  "hotelCushion",
  "houseScarce",
  "jailDangerRent",
  "acceptMargin",
  "survivalFactor",
  "liquidityRiskGain",
  "dipWorthMult",
  "raiseWorthMult",
  "monoMultOrange",
  "monoMultRed",
  "monoMultLightBlue",
  "monoMultPink",
  "monoMultYellow",
  "monoMultDarkBlue",
  "monoMultGreen",
  "monoMultBrown",
  "railSynergy2",
  "railSynergy3",
  "railSynergy4",
  "distressSafeRatio",
  "spreadFloor",
];

/** Pack a vector into the fixed-order number array the ES operates on. */
export function packParams(p: ParamVector): number[] {
  return PARAM_KEYS.map((k) => p[k]);
}

/** Unpack a fixed-order array back into a named vector. */
export function unpackParams(v: readonly number[]): ParamVector {
  const out = {} as ParamVector;
  PARAM_KEYS.forEach((k, i) => {
    out[k] = v[i];
  });
  return out;
}

/** Clamp every field to its bound — the ES respects bounds by clamping samples. */
export function clampParams(p: ParamVector): ParamVector {
  const out = {} as ParamVector;
  for (const k of PARAM_KEYS) {
    const [lo, hi] = PARAM_BOUNDS[k];
    out[k] = Math.min(hi, Math.max(lo, p[k]));
  }
  return out;
}
