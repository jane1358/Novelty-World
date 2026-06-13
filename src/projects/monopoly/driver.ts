import type { GameState } from "./types";

/** "local" = in-memory game, no DB. "online" = connected to a Supabase row.
 *  Kept in sync with the store's `MonopolyConnection`; declared here too so
 *  this pure module doesn't import the (window-touching) store. */
export type Connection = "local" | "online";

/** Which role this client plays in advancing the current turn:
 *
 *  - "self":  the active player IS this client's seated human — drive their
 *             own turn (auto-roll, auto-end), but leave their real decisions
 *             (buy, raise-cash) to the UI.
 *  - "proxy": the active seat is a bot or a disconnected human — drive it on
 *             their behalf, decisions included, via bot policy. Any connected
 *             client may proxy the same seat; the route's version guard
 *             collapses the redundant writes to no-ops.
 *  - "none":  the active seat is another connected human — do nothing and
 *             wait for their client to drive it.
 */
export type DriverRole = "self" | "proxy" | "none";

/** Decide this client's driver role for the current state. Pure: it reads
 *  only the authoritative state, this client's seat id, and the connection
 *  kind — no presence, no timers, no globals. That's the whole point of the
 *  "any client may drive a bot, the CAS dedupes" model: each client can reach
 *  the same decision from state alone.
 *
 *  In local (single-client) mode there is no "none" — this client is the only
 *  driver, so it plays itself and proxies every bot. */
export function driverRole(
  connection: Connection,
  state: GameState,
  myPlayerId: string | null,
): DriverRole {
  const activeId = state.turn.playerId;
  const active = state.players.find((p) => p.id === activeId);
  if (!active) return "none";

  if (connection === "local") {
    return activeId === myPlayerId ? "self" : "proxy";
  }

  // Online: a bot seat may be proxied by anyone; a human seat is owned by
  // exactly one client (or, if they're offline, nobody — the turn waits).
  if (active.isBot) return "proxy";
  return activeId === myPlayerId ? "self" : "none";
}
