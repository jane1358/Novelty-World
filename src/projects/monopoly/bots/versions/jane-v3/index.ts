// jane-v3 — the third version of the JANE lineage (see EVOLUTION.md "Bot
// lineages"). Branched from jane-v2, adds three improvements:
//
// DISCOVERY 1 — RAIL_SYNERGY [0,0,70,180,380] → [0,0,100,250,500]:
//   Railroads provide consistent income that funds aggressive development.
//   Valuing them higher means the bot acquires/buys more rails, creating a
//   cash-flow flywheel: rails → income → houses/hotels → more income.
//
// DISCOVERY 2 — ACCEPT_MARGIN 30 → 20:
//   Lower sweetening threshold means more trades complete, enabling faster
//   set completion through trade.
//
// DISCOVERY 3 — distressThreatScale backport from claude-v35:
//   Backports the v35 "seller half" of the symmetric pricing fix. When the bot
//   is genuinely distressed (one bad landing from bankruptcy), it discounts the
//   rival-monopoly threat premium to zero — immediate cash now outweighs the
//   future cost of an empowered rival.
//
// RAIL_SYNERGY sweep (all on jane-v2 config, tested vs v29):
//   [0,0,70,180,380] (jane-v2/original): +104.6 Elo
//   [0,0,85,215,440]: +51.1 Elo (too low)
//   [0,0,100,250,500] (jane-v3): +108.1 Elo ← PEAK
//   [0,0,100,250,550]: +82.5 Elo (over-values 4th rail)
//   [0,0,130,320,640]: ~54% (massive overpay)
//
// Also tested and REJECTED (all declined vs jane-v3's config):
//   - UTIL_PAIR_BONUS 40→80, LIQUIDITY_RISK_GAIN 250→150, HOUSE_SCARCE 6→10
//   - JAIL_DANGER_RENT 350→200, Wider sellerDistress ramp, ACCEPT_MIN 1→0
//   - GROUP_WEIGHT retune, Development priority reorder, SPREAD_FLOOR 3→4
//   - Auction denial premium, Early-game buy aggression, DIP_WORTH_MULT 1.4→1.2
//   - Position-aware development (opponent proximity sort)
//   - denialPositionCost backport from v35 (Jane's low DENY=0.3 makes it hurt)
export { claudeBot as janeV3Bot } from "./policy";
