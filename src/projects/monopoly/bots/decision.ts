import type { GameState, Intent } from "../types";

/** A bot's move: the intent its seat should submit now, plus optional reasoning
 *  the policy wants surfaced in the log as a "BOT" note. The pacer prepends the
 *  note as a `bot-note` intent in the same atomic submit as `intent`, so the
 *  explanation always lands immediately before the action it describes. The
 *  dumb baseline omits the note; the Claude policy sets it on every decision. */
export interface BotDecision {
  intent: Intent;
  /** Human-readable reasoning, logged as a `bot-note` before `intent`. Omitted
   *  = no note. Keep it to one tight sentence — it renders as a log row. */
  note?: string;
}

/** A bot policy: given the full game state (Monopoly is open-information) and
 *  the bot's seat id, the move that seat should make right now, or null when it
 *  has nothing to do (the pacer then rolls / moves on). One pure function covers
 *  every phase a bot is consulted in:
 *  - the reactive decision phases (`buy-decision`, `auction`, `raising-cash`,
 *    `must-raise-cash`, `trade-pending`, `jail-decision`);
 *  - `pre-roll`, where it may return a `set-queue` arm to PROACTIVELY open a
 *    build / trade intermission (its own turn or off-turn), or null to just roll;
 *  - `managing` / `trade-building`, where it drives the intermission it armed to
 *    a `manage` / `propose-trade` commit (or a cancel).
 *
 *  The same shape works for the dumb baseline, a strong rule-based policy, and a
 *  future learned policy. See `monopoly/CLAUDE.md` "Bots".
 *
 *  Lives in its own module (not `registry.ts`) so the policies can import `move`
 *  without a cycle through the registry that imports them. */
export type Bot = (state: GameState, playerId: string) => BotDecision | null;

/** Wrap a bare intent (or null) as a note-less `BotDecision`. The dumb baseline
 *  uses this; the Claude policy builds decisions with notes directly. */
export function move(intent: Intent | null): BotDecision | null {
  return intent === null ? null : { intent };
}
