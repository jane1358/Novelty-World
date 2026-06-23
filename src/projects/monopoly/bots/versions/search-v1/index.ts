// search-v1 — the SEARCH / LOOKAHEAD paradigm. The first bot in the archive that
// is NOT a greedy 1-ply value-maximizer: it plays the champion-substrate
// claude-v38 policy everywhere EXCEPT a few high-leverage discrete decisions
// (buy-decision, incoming trade votes), where it runs a TRUNCATED-ROLLOUT search
// and plays the candidate with the best mean rollout value — with claude-v38's
// own greedy move always a candidate, so it can only match or beat it (Tesauro's
// TD-Gammon rollout policy improvement).
//
// LINEAGE NOTE: `search-v` is a PARADIGM-named family (like `trade-v`) — it
// namespaces the SYSTEM its versions explore (rollout / lookahead search), not an
// authoring machine. It was authored by Claude Code but filed under the idea it's
// about. See EVOLUTION.md "Bot lineages".
//
// PARAMS: R=12 seeded rollouts × horizon=30 turns × ≤4 candidates per searched
// decision. The horizon is LOAD-BEARING: at 10–20 turns the position-share leaf
// is myopic (buying lowers my share before the rent lands, so search wrongly
// prefers hoarding cash and LOSES to greedy); at ~30 turns the payoff registers
// and the verdict flips. See search.ts ROLLOUT_HORIZON + the FINDINGS report.
// All rollout randomness derives deterministically from `state.rngState` (no
// Math.random), so the played move is a pure function of state — replay intact.
//
// Acceptance: crown only on a confident SPRT win (gauntlet BETTER vs claude-v38
// on BOTH streams). A wash is a real, valuable finding — that greedy claude-v38
// is already near-optimal on these decisions, or that cheap shallow rollouts
// can't beat a strongly-tuned base policy. See the FINDINGS report.
export { searchBot as searchV1Bot } from "./policy";
