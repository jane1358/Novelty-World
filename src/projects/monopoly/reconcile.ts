import { apply } from "./engine";
import { type LobbyOp, lobbyReduce } from "./lobby";
import type { GameState, Intent } from "./types";

/** A pure reducer over `GameState`: applies one pending op, succeeding with the
 *  next state or failing (so the caller can drop the op). Both the engine's
 *  `apply` (intents) and `lobbyReduce` (lobby ops) satisfy this shape — the
 *  extra fields they each return (`newEvents`, `reason`) are ignored here. */
type Reducer<Op> = (
  state: GameState,
  op: Op,
) => { ok: true; state: GameState } | { ok: false };

/** Replay a client's pending local ops on top of an authoritative head to
 *  produce the optimistic display state.
 *
 *  Every local op is optimistically predicted and then REBASED: re-applied onto
 *  the latest confirmed head until the route confirms it. There is no per-op
 *  policy — legality on the current head is the single arbiter:
 *
 *  - An op that still applies is folded in and kept. Replaying an absolute op on
 *    a head that already reflects it is an idempotent no-op (an armed
 *    `set-queue`, a re-recorded `bid`, a `setColor` to the same hue), so it's
 *    never toggled back off.
 *  - An op that no longer applies is dropped, and the display falls back to
 *    authoritative truth for it — a `cancel-trade` whose trade already closed, a
 *    `setColor` whose hue a racing seat just claimed.
 *
 *  Returns the rebuilt display state and the SURVIVING ops (dropped ones
 *  removed) so the caller can prune what it re-flushes. Pure — no React, no I/O,
 *  no globals. */
export function replay<Op>(
  head: GameState,
  ops: readonly Op[],
  reduce: Reducer<Op>,
): { state: GameState; ops: readonly Op[] } {
  let state = head;
  const kept: Op[] = [];
  for (const op of ops) {
    const res = reduce(state, op);
    if (!res.ok) continue; // no longer applies on this head — drop it
    state = res.state;
    kept.push(op);
  }
  return { state, ops: kept };
}

/** Rebase the pending play intents (buy, bid, staging snapshots, …) onto a
 *  head via the engine. See `replay` for the rebase invariant. */
export function rebuildOverlay(
  head: GameState,
  outbox: readonly Intent[],
): { state: GameState; outbox: readonly Intent[] } {
  const rebuilt = replay(head, outbox, apply);
  return { state: rebuilt.state, outbox: rebuilt.ops };
}

/** Rebase the pending lobby ops (join, seat edits, …) onto a head via the pure
 *  lobby dispatcher — the lobby's lighter counterpart to `rebuildOverlay`.
 *  A pick that lost a color/icon race fails to re-apply and is silently
 *  pruned, so the loser's display reverts to their confirmed seat. */
export function rebuildLobbyOverlay(
  head: GameState,
  outbox: readonly LobbyOp[],
): { state: GameState; outbox: readonly LobbyOp[] } {
  const rebuilt = replay(head, outbox, lobbyReduce);
  return { state: rebuilt.state, outbox: rebuilt.ops };
}
