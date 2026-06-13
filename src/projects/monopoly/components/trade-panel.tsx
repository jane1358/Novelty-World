"use client";

import { KeyRound, Minus, Plus } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { SPACES } from "../data";
import { tradeParticipants } from "../engine";
import { useMonopolyStore } from "../store";
import { PLAYER_COLOR_VAR, PROPERTY_COLOR_VAR } from "../theme";
import type { CardSource, GameState, Player, TradeTerms } from "../types";

interface Props {
  state: GameState;
}

// Cash step per +/- tap. Coarse on purpose — most trade cash is round
// hundreds; a finer entry can come later if it's ever wanted.
const CASH_STEP = 50;

/** The trade UI, shown to EVERY player while a trade is being built or voted
 *  on — the proposal lives in synced state, so this is a live view, not just
 *  the proposer's. Two phases:
 *
 *  - `trade-building`: the proposer reassigns properties on the board and sets
 *    cash / cards here; everyone else watches it take shape read-only.
 *  - `trade-pending`: the finalized proposal; each named party approves or
 *    declines. All approvals execute it; any decline cancels it.
 *
 *  The log is hidden by the footer while this is up to make room. */
export function TradePanel({ state }: Props) {
  const myPlayerId = useMonopolyStore((s) => s.myPlayerId);
  const bumpTradeCash = useMonopolyStore((s) => s.bumpTradeCash);
  const cycleTradeGojf = useMonopolyStore((s) => s.cycleTradeGojf);
  const proposeTrade = useMonopolyStore((s) => s.proposeTrade);
  const cancelTrade = useMonopolyStore((s) => s.cancelTrade);
  const acceptTrade = useMonopolyStore((s) => s.acceptTrade);
  const declineTrade = useMonopolyStore((s) => s.declineTrade);

  const turn = state.turn;
  const isPending = turn.phase === "trade-pending";
  const terms: (TradeTerms & { proposerId: string }) | undefined = isPending
    ? turn.pendingTrade
    : turn.tradeDraft;
  if (!terms) return null;

  const byId = new Map(state.players.map((p) => [p.id, p]));
  const proposer = byId.get(terms.proposerId) ?? null;
  const isProposer = myPlayerId !== null && myPlayerId === terms.proposerId;
  const canEdit = !isPending && isProposer;

  const cashSum = Object.values(terms.cashDelta).reduce((a, b) => a + b, 0);
  const balanced = cashSum === 0;
  const movesSomething =
    Object.keys(terms.propertyTo).length > 0 ||
    Object.keys(terms.gojfTo).length > 0 ||
    Object.values(terms.cashDelta).some((v) => v !== 0);
  const partyCount = tradeParticipants(state, terms).size;
  const canPropose = movesSomething && balanced && partyCount >= 2;

  const approvals = isPending ? (turn.pendingTrade?.approvals ?? {}) : null;
  const myApproval = approvals && myPlayerId !== null ? approvals[myPlayerId] : undefined;
  const canVote = isPending && myApproval === false;

  const heldCards = (["chance", "communityChest"] as const).filter(
    (src) => state.jailFreeCards[src] !== undefined,
  );

  return (
    <div className="relative z-10 flex shrink-0 flex-col" style={SECTION_STYLE}>
      <div
        className="flex min-w-0 flex-col gap-2 overflow-y-auto px-3 py-2"
        style={{ maxHeight: "44vh", fontSize: "clamp(0.7rem, 2vmin, 0.85rem)" }}
      >
        <Heading
          isPending={isPending}
          isProposer={isProposer}
          proposerName={proposer?.name ?? "Someone"}
        />

        <MovementSummary terms={terms} byId={byId} />

        {heldCards.length > 0 && (
          <div className="flex flex-col gap-1">
            {heldCards.map((src) => (
              <CardRow
                key={src}
                source={src}
                state={state}
                terms={terms}
                byId={byId}
                canEdit={canEdit}
                onCycle={() => {
                  cycleTradeGojf(src);
                }}
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {state.players
            .filter((p) => !p.bankrupt)
            .map((p) => (
              <CashRow
                key={p.id}
                player={p}
                amount={terms.cashDelta[p.id] ?? 0}
                canEdit={canEdit}
                onBump={(step) => {
                  bumpTradeCash(p.id, step);
                }}
              />
            ))}
          <BalanceLine balanced={balanced} off={Math.abs(cashSum)} />
        </div>

        {isPending && approvals && (
          <ApprovalStatus approvals={approvals} byId={byId} />
        )}
      </div>

      <div className="flex">
        {canEdit && (
          <>
            <PanelButton
              label="Cancel"
              onClick={() => {
                cancelTrade();
              }}
            />
            <PanelButton
              label="Propose"
              variant="primary"
              disabled={!canPropose}
              onClick={() => {
                proposeTrade();
              }}
            />
          </>
        )}
        {isPending && isProposer && (
          <PanelButton
            label="Withdraw"
            onClick={() => {
              cancelTrade();
            }}
          />
        )}
        {canVote && (
          <>
            <PanelButton
              label="Decline"
              onClick={() => {
                declineTrade();
              }}
            />
            <PanelButton
              label="Approve"
              variant="primary"
              onClick={() => {
                acceptTrade();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

const SECTION_STYLE: CSSProperties = {
  backgroundColor: "var(--mono-card)",
  color: "var(--mono-ink)",
  boxShadow: "inset 0 1px 0 var(--mono-frame)",
};

function Heading({
  isPending,
  isProposer,
  proposerName,
}: {
  isPending: boolean;
  isProposer: boolean;
  proposerName: string;
}) {
  let text: string;
  if (isPending) text = `Proposed by ${proposerName} — vote`;
  else if (isProposer) text = "Trade — tap squares to reassign";
  else text = `${proposerName} is building a trade`;
  return (
    <span className="truncate font-semibold uppercase tracking-wide">
      {text}
    </span>
  );
}

// "who ends up with what" — property and card movements as compact chips.
function MovementSummary({
  terms,
  byId,
}: {
  terms: TradeTerms;
  byId: ReadonlyMap<string, Player>;
}) {
  const chips: ReactNode[] = [];
  for (const [posStr, ownerId] of Object.entries(terms.propertyTo)) {
    const owner = byId.get(ownerId);
    if (!owner) continue;
    chips.push(
      <span key={`p-${posStr}`} className="inline-flex items-center gap-1">
        <SpaceName position={Number(posStr)} />
        <span style={{ opacity: 0.4 }}>→</span>
        <PlayerTag player={owner} />
      </span>,
    );
  }
  for (const [src, holderId] of Object.entries(terms.gojfTo)) {
    const holder = holderId ? (byId.get(holderId) ?? null) : null;
    if (!holder) continue;
    chips.push(
      <span key={`g-${src}`} className="inline-flex items-center gap-1">
        <CardTag source={src as CardSource} />
        <span style={{ opacity: 0.4 }}>→</span>
        <PlayerTag player={holder} />
      </span>,
    );
  }
  if (chips.length === 0) {
    return (
      <span style={{ opacity: 0.5 }}>No properties or cards moved yet.</span>
    );
  }
  return <div className="flex flex-wrap gap-x-3 gap-y-1">{chips}</div>;
}

function CardRow({
  source,
  state,
  terms,
  byId,
  canEdit,
  onCycle,
}: {
  source: CardSource;
  state: GameState;
  terms: TradeTerms;
  byId: ReadonlyMap<string, Player>;
  canEdit: boolean;
  onCycle: () => void;
}) {
  const base = state.jailFreeCards[source];
  const holderId = terms.gojfTo[source] ?? base;
  const holder = holderId ? (byId.get(holderId) ?? null) : null;
  const body = (
    <>
      <span className="inline-flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5" style={{ color: "var(--mono-orange)" }} />
        <span className="font-medium">
          {source === "chance" ? "Chance" : "Chest"} card
        </span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span style={{ opacity: 0.4 }}>→</span>
        {holder ? <PlayerTag player={holder} /> : <span>—</span>}
      </span>
    </>
  );
  if (!canEdit) {
    return (
      <div className="flex items-center justify-between rounded px-2 py-1" style={ROW_STYLE}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onCycle}
      className="flex items-center justify-between rounded px-2 py-1 text-left"
      style={{ ...ROW_STYLE, cursor: "pointer" }}
    >
      {body}
    </button>
  );
}

function CashRow({
  player,
  amount,
  canEdit,
  onBump,
}: {
  player: Player;
  amount: number;
  canEdit: boolean;
  onBump: (step: number) => void;
}) {
  const color =
    amount > 0
      ? "var(--mono-green)"
      : amount < 0
        ? "var(--mono-red)"
        : "var(--mono-ink)";
  const text =
    amount === 0
      ? "$0"
      : `${amount > 0 ? "+" : "−"}$${Math.abs(amount).toLocaleString("en-US")}`;
  return (
    <div className="flex items-center justify-between rounded px-2 py-1" style={ROW_STYLE}>
      <PlayerTag player={player} />
      <div className="flex items-center gap-2">
        {canEdit && (
          <StepButton
            ariaLabel={`Less cash for ${player.name}`}
            onClick={() => {
              onBump(-CASH_STEP);
            }}
          >
            <Minus className="h-3.5 w-3.5" />
          </StepButton>
        )}
        <span
          className="w-16 text-right font-semibold tabular-nums"
          style={{ color }}
        >
          {text}
        </span>
        {canEdit && (
          <StepButton
            ariaLabel={`More cash for ${player.name}`}
            onClick={() => {
              onBump(CASH_STEP);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </StepButton>
        )}
      </div>
    </div>
  );
}

function BalanceLine({ balanced, off }: { balanced: boolean; off: number }) {
  return (
    <span
      className="px-2 text-right text-xs font-semibold tabular-nums"
      style={{ color: balanced ? "var(--mono-green)" : "var(--mono-red)" }}
    >
      {balanced
        ? "⚖ cash balanced"
        : `off by $${off.toLocaleString("en-US")}`}
    </span>
  );
}

function ApprovalStatus({
  approvals,
  byId,
}: {
  approvals: Readonly<Record<string, boolean>>;
  byId: ReadonlyMap<string, Player>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {Object.entries(approvals).map(([id, ok]) => {
        const p = byId.get(id);
        if (!p) return null;
        return (
          <span key={id} className="inline-flex items-center gap-1">
            <span style={{ color: ok ? "var(--mono-green)" : "var(--mono-ink)", opacity: ok ? 1 : 0.5 }}>
              {ok ? "✓" : "○"}
            </span>
            <PlayerTag player={p} />
          </span>
        );
      })}
    </div>
  );
}

const ROW_STYLE: CSSProperties = {
  backgroundColor: "var(--mono-board)",
};

function PlayerTag({ player }: { player: Player }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          backgroundColor: PLAYER_COLOR_VAR[player.color],
          boxShadow: "0 0 0 1px var(--mono-frame)",
        }}
      />
      <span className="truncate font-semibold">{player.name}</span>
    </span>
  );
}

function SpaceName({ position }: { position: number }) {
  const space = SPACES[position];
  if (space.kind === "property") {
    return (
      <span className="inline-flex min-w-0 items-center gap-1">
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-sm"
          style={{
            backgroundColor: PROPERTY_COLOR_VAR[space.color],
            boxShadow: "0 0 0 1px var(--mono-frame)",
          }}
        />
        <span className="truncate font-medium">{space.name}</span>
      </span>
    );
  }
  if (space.kind === "railroad" || space.kind === "utility") {
    return <span className="truncate font-medium">{space.name}</span>;
  }
  return null;
}

function CardTag({ source }: { source: CardSource }) {
  return (
    <span className="inline-flex items-center gap-1">
      <KeyRound className="h-3.5 w-3.5" style={{ color: "var(--mono-orange)" }} />
      <span className="font-medium">{source === "chance" ? "Chance" : "Chest"}</span>
    </span>
  );
}

function StepButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
      style={{
        backgroundColor: "var(--mono-card)",
        color: "var(--mono-ink)",
        boxShadow: "inset 0 0 0 1px var(--mono-frame)",
      }}
    >
      {children}
    </button>
  );
}

function PanelButton({
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
      className="flex flex-1 items-center justify-center px-3 py-3 font-semibold uppercase tracking-wide disabled:opacity-40"
      style={{
        backgroundColor: background,
        color: "var(--mono-ink)",
        fontSize: "clamp(0.875rem, 2.5vmin, 1.125rem)",
        minHeight: "56px",
      }}
    >
      {label}
    </button>
  );
}
