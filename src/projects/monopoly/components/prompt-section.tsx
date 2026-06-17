"use client";

import type { CSSProperties, ReactNode } from "react";
import { SPACES } from "../data";
import { firstNegativePlayer, JAIL_FEE } from "../engine";
import { heldJailCard, ownablePrice } from "../logic";
import { useMonopolyStore } from "../store";
import type { GameState } from "../types";
import { AuctionPanel } from "./auction-panel";
import { SetContextChips } from "./holdings-grid";
import { ManagePanel } from "./manage-panel";
import { TradePanel } from "./trade-panel";

interface Props {
  state: GameState;
}

/** Contextual prompt that lives between the board and the event log. The
 *  synced-state panels (trade, auction, manage / raise-cash) are shown to
 *  EVERYONE — including spectators — as live views; the per-player decision
 *  prompts (jail, buy) are shown only to the player who must act. Rendering
 *  paths so far:
 *
 *  - Trade building / pending: shown to everyone (the proposal is synced).
 *  - Auction: shown to everyone (the auction is synced).
 *  - Must-raise-cash / Managing: shown to everyone — the staging is synced, so
 *    the table watches the actor sell / mortgage / build in real time; the panel
 *    gates its controls to the actor (debtor / manager, possibly off-turn).
 *  - Jail / Buy decision: only the active player who must act.
 *
 *  When none of the above is true, the section renders nothing and the log
 *  flows directly under the board. */
export function PromptSection({ state }: Props) {
  const myPlayerId = useMonopolyStore((s) => s.myPlayerId);
  const submit = useMonopolyStore((s) => s.submit);
  const step = useMonopolyStore((s) => s.step);
  const buyProperty = useMonopolyStore((s) => s.buyProperty);
  const raiseCash = useMonopolyStore((s) => s.raiseCash);

  const { phase, pendingBuy } = state.turn;

  // Trade building / pending is shown to EVERYONE — including a seatless
  // spectator — because the proposal lives in synced state and the footer
  // hides the log to make room for it. Interactivity inside the panel is gated
  // by role (proposer edits, named parties vote, everyone else watches).
  if (phase === "trade-building" || phase === "trade-pending") {
    return <TradePanel state={state} />;
  }

  // The auction is synced state shown to EVERYONE (including spectators): the
  // panel renders the standings live and gates the bid/drop buttons on whether
  // this client is the current bidder.
  if (phase === "auction") {
    return <AuctionPanel state={state} />;
  }

  // Manage / raising-cash / must-raise-cash staging lives in synced state, so the
  // panel is shown to EVERYONE as a live view — the actor (the manager, the
  // buyer, or the current debtor, possibly off-turn) drives it via the board's
  // two-zone tap + the commit / buy / pay buttons; everyone else watches it take
  // shape read-only. The panel gates its own interactivity on whether this client
  // is the actor.
  if (phase === "must-raise-cash") {
    const debtor = firstNegativePlayer(state);
    if (debtor === null) return null;
    return <ManagePanel state={state} playerId={debtor} />;
  }
  if (phase === "managing" && state.turn.managerId !== undefined) {
    return <ManagePanel state={state} playerId={state.turn.managerId} />;
  }
  if (phase === "raising-cash") {
    return <ManagePanel state={state} playerId={state.turn.playerId} />;
  }

  if (!myPlayerId) return null;

  // Everything below is the active player's own decision.
  if (state.turn.playerId !== myPlayerId) return null;

  // Jail: a per-turn prompt (a deliberate exception to "jail is a stance, not a
  // prompt" — see monopoly/CLAUDE.md). The player chooses each jail turn: roll
  // for doubles (the mechanical jail roll, fired via `step`), pay the $50 fine,
  // or play a held Get-Out-of-Jail-Free card.
  if (phase === "jail-decision") {
    return (
      <JailPrompt
        state={state}
        playerId={myPlayerId}
        onRoll={() => {
          step();
        }}
        onPay={() => {
          submit({ kind: "pay-to-leave-jail", playerId: myPlayerId });
        }}
        onCard={() => {
          submit({ kind: "use-jail-card", playerId: myPlayerId });
        }}
      />
    );
  }

  if (phase === "buy-decision" && pendingBuy !== undefined) {
    return (
      <BuyPrompt
        position={pendingBuy}
        playerId={myPlayerId}
        onBuy={() => {
          buyProperty();
        }}
        onRaise={() => {
          raiseCash();
        }}
        onPass={() => {
          submit({ kind: "decline-buy", playerId: myPlayerId });
        }}
      />
    );
  }

  return null;
}

const SECTION_STYLE: CSSProperties = {
  backgroundColor: "var(--mono-card)",
  color: "var(--mono-ink)",
  // Top divider only — the EventLog directly below has its own inset top
  // line, so we don't double up on the boundary.
  boxShadow: "inset 0 1px 0 var(--mono-frame)",
};

/** Buy / Auction prompt for a landed-on property. The board is INERT here — a
 *  plain buy-decision is just a quick choice. If the buyer can pay outright, the
 *  primary green Buy commits. If they're short, that green Buy gives way to a
 *  neutral "Raise cash" doorway (equal weight with Auction) that steps into the
 *  `raising-cash` phase, where the board becomes a sell / mortgage surface and
 *  Buy returns — green and enabled — once the staged raise covers the price.
 *
 *  The "Raise cash" doorway is always reachable when shown: a buyer who can't
 *  afford the lot even after raising everything never reaches this prompt — the
 *  engine forces that landing straight to auction (see `openBuyDecision`). */
function BuyPrompt({
  position,
  playerId,
  onBuy,
  onRaise,
  onPass,
}: {
  position: number;
  playerId: string;
  onBuy: () => void;
  onRaise: () => void;
  onPass: () => void;
}) {
  const player = useMonopolyStore((s) =>
    s.state.players.find((p) => p.id === playerId),
  );
  const price = ownablePrice(position);
  if (price === null || !player) return null;

  const canAfford = player.cash >= price;
  const shortfall = price - player.cash;

  return (
    <div className="relative z-10 flex shrink-0" style={SECTION_STYLE}>
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
        style={{ minHeight: "56px", fontSize: "clamp(0.75rem, 2.2vmin, 0.95rem)" }}
      >
        <SpaceTag position={position} />
        <span
          className="font-semibold"
          style={{ color: "var(--mono-red)", fontVariantNumeric: "tabular-nums" }}
        >
          −${price.toLocaleString("en-US")}
        </span>
        <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
          ${player.cash.toLocaleString("en-US")}
        </span>
        {!canAfford && (
          <span
            className="truncate tabular-nums"
            style={{ color: "var(--mono-orange)" }}
          >
            Short ${shortfall.toLocaleString("en-US")}
          </span>
        )}
      </div>
      <PromptButton label="Auction" onClick={onPass} />
      {canAfford ? (
        <PromptButton label="Buy" onClick={onBuy} variant="primary" />
      ) : (
        <PromptButton label="Raise cash" onClick={onRaise} />
      )}
    </div>
  );
}

function JailPrompt({
  state,
  playerId,
  onRoll,
  onPay,
  onCard,
}: {
  state: GameState;
  playerId: string;
  onRoll: () => void;
  onPay: () => void;
  onCard: () => void;
}) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  const canPay = player.cash >= JAIL_FEE;
  const hasCard = heldJailCard(state, playerId) !== null;

  return (
    <div className="relative z-10 flex shrink-0" style={SECTION_STYLE}>
      <div
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 font-semibold uppercase tracking-wide"
        style={{ minHeight: "56px", fontSize: "clamp(0.75rem, 2.2vmin, 0.95rem)" }}
      >
        <span className="truncate" style={{ color: "var(--mono-orange)" }}>
          In Jail
        </span>
        <span style={{ opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
          {player.jailTurns}/3
        </span>
      </div>
      {hasCard && <PromptButton label="Card" onClick={onCard} />}
      <PromptButton label={`Pay $${JAIL_FEE.toString()}`} onClick={onPay} disabled={!canPay} />
      <PromptButton label="Roll" onClick={onRoll} />
    </div>
  );
}

function PromptButton({
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  const background =
    variant === "primary" ? "var(--mono-green)" : "var(--mono-board)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Width is locked so prompt buttons land in the same column as the
      // action-bar cells directly below, even though this row's left half
      // is a flexible info area instead of three equal flex-1 cells.
      className="flex shrink-0 items-center justify-center px-3 py-3 font-semibold uppercase tracking-wide disabled:opacity-40"
      style={{
        backgroundColor: background,
        // Dark ink on the bright green primary (white-on-green is too low
        // contrast); near-white on the dark default.
        color: variant === "primary" ? "var(--mono-frame)" : "var(--mono-ink)",
        fontSize: "clamp(0.875rem, 2.5vmin, 1.125rem)",
        minHeight: "56px",
        minWidth: "5.5rem",
      }}
    >
      {label}
    </button>
  );
}

function SpaceTag({ position }: { position: number }): ReactNode {
  const space = SPACES[position];
  if (
    space.kind !== "property" &&
    space.kind !== "railroad" &&
    space.kind !== "utility"
  ) {
    return null;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <SetContextChips position={position} />
      <span className="truncate font-semibold">{space.name}</span>
    </span>
  );
}
