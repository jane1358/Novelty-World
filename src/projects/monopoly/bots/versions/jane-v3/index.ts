// jane-v3 — the third version of the JANE lineage (see EVOLUTION.md "Bot
// lineages"). Branched from jane-v2, adds two improvements:
//
// DISCOVERY 1 — RAIL_SYNERGY [0,0,70,180,380] → [0,0,100,250,500]:
//   Railroads provide consistent income that funds aggressive development.
//   Valuing them higher means the bot acquires/buys more rails, creating a
//   cash-flow flywheel: rails → income → houses/hotels → more income.
//
// DISCOVERY 2 — distressThreatScale backport from claude-v35:
//   Backports the v35 "seller half" of the symmetric pricing fix. When the bot
//   is genuinely distressed (one bad landing from bankruptcy), it discounts the
//   rival-monopoly threat premium to zero — immediate cash now outweighs the
//   future cost of an empowered rival. Non-distressed seats are unaffected.
//
// vs claude-v35 (the new champion): 53.8% win rate, +26.6 Elo, SPRT passed.
//
// RAIL_SYNERGY sweep (all on jane-v2 config, tested vs v29):
//   [0,0,70,180,380] (jane-v2/original): +104.6 Elo
//   [0,0,85,215,440]: +51.1 Elo (too low — under-values rails)
//   [0,0,100,250,500] (jane-v3): +108.1 Elo ← PEAK
//   [0,0,100,250,550]: +82.5 Elo (over-values 4th rail)
//   [0,0,130,320,640]: ~54% (massive overpay)
//
// Also tested and REJECTED (all declined vs jane-v3):
//   - UTIL_PAIR_BONUS 40→80 (utilities overvalued)
//   - LIQUIDITY_RISK_GAIN 250→150 (tighter trade liquidity gate)
//   - HOUSE_SCARCE 6→10 (different scarcity threshold)
//   - JAIL_DANGER_RENT 350→200 (more conservative jail stays)
//   - Wider sellerDistress ramp (1.5x→2.0x threshold)
//   - ACCEPT_MIN 1→0 (accept marginal trades)
//   - GROUP_WEIGHT retune (dark-blue/green higher)
//   - Development priority reorder (cheap sets first)
//   - Auction denial premium (+100 to bid cap)
//   - Early-game buy aggression (buy everything pre-monopoly)
//
// All constants on the jane-v2 config have been swept.
export { claudeBot as janeV3Bot } from "./policy";
