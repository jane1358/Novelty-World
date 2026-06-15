import { ownablePrice } from "../logic";
import type { GameState } from "../types";
import { ActionBar } from "./action-bar";
import { EventLog } from "./event-log";
import { PromptSection } from "./prompt-section";

interface Props {
  state: GameState;
}

export function Footer({ state }: Props) {
  // A trade panel needs the vertical room the log occupies (cash steppers for
  // every player, card rows, the movement summary), so the log is hidden while
  // a trade is being built or voted on. The manage intermission and the auction
  // panel reuse the same space, so they hide the log too.
  //
  // A buy-decision hides the log ONLY when the buyer is short on cash and must
  // raise it — then the board becomes a sell / mortgage staging surface and
  // needs the room (everyone watches it take shape). An affordable buy keeps
  // the log: it's just the quick Buy / Auction decision, no board staging.
  const buyer = state.players.find((p) => p.id === state.turn.playerId);
  const buyPrice =
    state.turn.phase === "buy-decision" && state.turn.pendingBuy !== undefined
      ? ownablePrice(state.turn.pendingBuy)
      : null;
  const buyNeedsRaise =
    buyPrice !== null && buyer !== undefined && buyer.cash < buyPrice;
  const intermissionOpen =
    state.turn.phase === "trade-building" ||
    state.turn.phase === "trade-pending" ||
    state.turn.phase === "managing" ||
    state.turn.phase === "auction" ||
    buyNeedsRaise;
  return (
    <div
      className="relative z-10 flex shrink-0 flex-col"
      // Mirror of the header treatment: sharp 1px divider plus a soft
      // upward shadow so the footer reads as elevated above the board.
      style={{
        boxShadow:
          "0 -1px 0 var(--mono-frame), 0 -6px 12px rgba(0, 0, 0, 0.75)",
      }}
    >
      <PromptSection state={state} />
      {!intermissionOpen && <EventLog state={state} />}
      <ActionBar state={state} />
    </div>
  );
}
