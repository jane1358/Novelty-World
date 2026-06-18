import type { BotStrategy } from "../types";
import { claudeBot } from "./claude";
import type { Bot } from "./decision";
import { dumbBot } from "./dumb";

// The bot-decision contract lives in `decision.ts` (so policies can import it
// without a cycle through this registry). Re-exported here so existing call
// sites keep importing `Bot` / `BotDecision` / `move` from the registry.
export type { Bot, BotDecision } from "./decision";
export { move } from "./decision";

/** Every selectable bot policy, keyed by the seat's `botStrategy`. The pacer
 *  resolves a bot seat's policy through this map; adding a strategy is a new
 *  union member in `BotStrategy` plus an entry here. */
export const BOTS: Record<BotStrategy, Bot> = {
  dumb: dumbBot,
  claude: claudeBot,
};
