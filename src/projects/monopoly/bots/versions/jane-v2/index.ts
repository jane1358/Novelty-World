// jane-v2 — the second version of the JANE lineage. Forked from jane-v1
// (which was v33). Adds SPREAD DEVELOPMENT: two-pass planBuild that gets all
// monopolies to 3 houses before pushing higher.
//
// Measured: BETTER vs jane-v1 AND vs Claude v29 (+19-27 Elo, SPRT confirmed
// on both training and held-out seeds). The first Jane lineage champion to
// beat BOTH its predecessor and the Claude champion.
export { claudeBot as janeV2Bot } from "./claude";
