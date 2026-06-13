import { firstNegativePlayer } from "../engine";
import { mortgageValueAt, ownablePrice } from "../logic";
import type { GameState, Intent } from "../types";

/** Baseline bot policy: the decision a bot `playerId` should submit right now,
 *  or null if it isn't this bot's move. The store's auto-pacer iterates the bot
 *  seats and submits the first non-null intent; any connected client may proxy
 *  a bot (the route's version guard dedupes the redundant writes). A live
 *  human's own decisions are left to their UI — never to this policy.
 *
 *  Pure, same shape as the `Bot` interface sketched in `monopoly/CLAUDE.md`, so
 *  a smarter rule-based or learned policy can drop in later. Covers the
 *  proxy-driven decision phases:
 *  - `buy-decision`: buy whenever affordable, otherwise decline.
 *  - `must-raise-cash`: if this bot is the current debtor (whoever is in the
 *    red, possibly out of turn after a trade), mortgage the cheapest
 *    un-mortgaged, building-free property — one per call until back to ≥ 0.
 *  - `trade-pending`: if this bot is an un-voted party, accept. v1 placeholder
 *    — permissive, no valuation. TODO: weigh the trade before accepting.
 *
 *  Mechanical phases (`pre-roll` → step, `post-roll` → end-turn) are handled by
 *  the pacer itself, not here. */
export function botIntent(state: GameState, playerId: string): Intent | null {
  const { phase, pendingBuy, pendingTrade } = state.turn;

  if (phase === "buy-decision" && pendingBuy !== undefined) {
    if (state.turn.playerId !== playerId) return null;
    const player = state.players.find((p) => p.id === playerId);
    const price = ownablePrice(pendingBuy);
    if (!player || price === null) return null;
    return player.cash >= price
      ? { kind: "buy", playerId }
      : { kind: "decline-buy", playerId };
  }

  if (phase === "must-raise-cash") {
    if (firstNegativePlayer(state) !== playerId) return null;
    const cheapest = cheapestMortgageable(state, playerId);
    if (cheapest === null) return null;
    return { kind: "mortgage", playerId, position: cheapest };
  }

  if (phase === "trade-pending" && pendingTrade) {
    if (!(playerId in pendingTrade.approvals)) return null;
    if (pendingTrade.approvals[playerId]) return null;
    return { kind: "accept-trade", playerId, tradeId: pendingTrade.id };
  }

  return null;
}

/** Position of the cheapest un-mortgaged, building-free property the player
 *  owns, or null if none can be mortgaged. Cheapest first preserves the more
 *  valuable assets for as long as possible — pure heuristic, swap in a real
 *  policy when bots learn. */
function cheapestMortgageable(
  state: GameState,
  playerId: string,
): number | null {
  let best: { pos: number; value: number } | null = null;
  for (const [posStr, ownerId] of Object.entries(state.ownership)) {
    if (ownerId !== playerId) continue;
    const pos = Number(posStr);
    if (state.mortgaged[pos]) continue;
    if (state.houses[pos]) continue;
    const value = mortgageValueAt(pos);
    if (value === null) continue;
    if (!best || value < best.value) best = { pos, value };
  }
  return best?.pos ?? null;
}
