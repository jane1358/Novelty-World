import type { PlayerProfile } from "@/shared/lib/profile";
import type { GameState, Intent } from "./types";

/** Transport contract between the client store and the authoritative
 *  `/api/monopoly` route. Types only — shared by both sides so the request
 *  and response shapes can't drift. The route is the single writer; clients
 *  POST one of these actions and read the authoritative result. */
export type MonopolyAction =
  /** First open of a game id: seed a fresh game seating the caller and
   *  insert it. Fails (conflict) if the row already exists. */
  | { type: "create"; profile: PlayerProfile }
  /** Overwrite the row with a fresh game seating the caller. Dev-only
   *  ("restart" hotkey); resets the version counter. */
  | { type: "reset"; profile: PlayerProfile }
  /** Apply one or more intents in order, then drain mechanics once. Batched
   *  so a multi-step commit (e.g. staged mortgages) lands as one atomic,
   *  single-version write. */
  | { type: "submit"; intents: readonly Intent[]; fromVersion: number }
  /** Advance mechanics by one unit (the paced game loop's heartbeat). */
  | { type: "step"; fromVersion: number };

export interface MonopolyRequest {
  gameId: string;
  action: MonopolyAction;
}

/** Result of an action. `conflict` means the caller's `fromVersion` was
 *  stale (someone else advanced first) — not an error: the client should
 *  drop the attempt and let the realtime subscription deliver the winning
 *  state. `reason` carries a genuine rejection (illegal intent, write
 *  failure). */
export type MonopolyResult =
  | { ok: true; state: GameState; version: number }
  | { ok: false; conflict?: boolean; reason?: string };
