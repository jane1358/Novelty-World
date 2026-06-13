"use client";

import type { CSSProperties, ReactNode } from "react";
import { mortgageValueAt, unmortgageCostAt } from "../logic";
import { useMonopolyStore } from "../store";
import type { GameState } from "../types";

interface Props {
  state: GameState;
  playerId: string;
}

/** Slim summary bar that pairs with the board to form the mortgage UI.
 *  The list of properties IS the board itself — SquareRows become tap
 *  targets that stage toggles. This bar just shows the running cash delta
 *  (and debt status, in forced mode) plus Cancel / Commit.
 *
 *  Two entry paths share the same UI:
 *
 *  - Voluntary: the player paused and opened the panel. Cancel discards
 *    staged changes; Commit fires intents and closes the panel.
 *  - Forced: the engine routed the turn to `must-raise-cash`. Cancel is
 *    hidden — they have to settle. Pay is disabled until staged mortgages
 *    would bring cash to the debt threshold, at which point the engine
 *    auto-settles and the phase exits. */
export function MortgagePanel({ state, playerId }: Props) {
  const staged = useMonopolyStore((s) => s.mortgageStaged) ?? EMPTY_STAGED;
  const closeMortgagePanel = useMonopolyStore((s) => s.closeMortgagePanel);
  const commitMortgageStaging = useMonopolyStore(
    (s) => s.commitMortgageStaging,
  );

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;

  const isForced = state.turn.phase === "must-raise-cash";
  const debt = isForced ? (state.turn.pendingDebt?.amount ?? 0) : 0;
  const creditorId = isForced
    ? (state.turn.pendingDebt?.creditorId ?? null)
    : null;
  const creditor = creditorId
    ? (state.players.find((p) => p.id === creditorId) ?? null)
    : null;

  let netDelta = 0;
  for (const [posStr, target] of Object.entries(staged)) {
    const pos = Number(posStr);
    if (target) {
      const value = mortgageValueAt(pos);
      if (value !== null) netDelta += value;
    } else {
      const cost = unmortgageCostAt(pos);
      if (cost !== null) netDelta -= cost;
    }
  }
  const cashAfter = player.cash + netDelta;
  const coversDebt = !isForced || cashAfter >= debt;
  const hasStaged = Object.keys(staged).length > 0;
  const canCommit = cashAfter >= 0 && coversDebt && (isForced || hasStaged);

  return (
    <div className="relative z-10 flex shrink-0" style={SECTION_STYLE}>
      <div
        className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2"
        style={{
          fontSize: "clamp(0.7rem, 2vmin, 0.85rem)",
          minHeight: "56px",
        }}
      >
        <Header
          isForced={isForced}
          debt={debt}
          creditor={creditor?.name ?? null}
        />
        <CashLine
          cashBefore={player.cash}
          cashAfter={cashAfter}
          netDelta={netDelta}
        />
        {isForced && (
          <span
            className="truncate tabular-nums"
            style={{
              color: coversDebt ? "var(--mono-green)" : "var(--mono-red)",
            }}
          >
            {coversDebt
              ? `Covers $${debt.toLocaleString("en-US")} debt`
              : `Need $${(debt - cashAfter).toLocaleString("en-US")} more`}
          </span>
        )}
      </div>
      {!isForced && (
        <PanelButton
          label="Cancel"
          onClick={() => {
            closeMortgagePanel();
          }}
        />
      )}
      <PanelButton
        label={isForced ? "Pay" : "Commit"}
        onClick={() => {
          commitMortgageStaging();
        }}
        disabled={!canCommit}
        variant="primary"
      />
    </div>
  );
}

const EMPTY_STAGED: Readonly<Record<number, boolean>> = {};

const SECTION_STYLE: CSSProperties = {
  backgroundColor: "var(--mono-card)",
  color: "var(--mono-ink)",
  boxShadow: "inset 0 1px 0 var(--mono-frame)",
};

function Header({
  isForced,
  debt,
  creditor,
}: {
  isForced: boolean;
  debt: number;
  creditor: string | null;
}) {
  if (isForced) {
    return (
      <span
        className="truncate font-semibold uppercase tracking-wide"
        style={{ color: "var(--mono-red)" }}
      >
        Raise ${debt.toLocaleString("en-US")}
        {creditor !== null && ` for ${creditor}`}
      </span>
    );
  }
  return (
    <span className="truncate font-semibold uppercase tracking-wide">
      Mortgage — tap squares to stage
    </span>
  );
}

function CashLine({
  cashBefore,
  cashAfter,
  netDelta,
}: {
  cashBefore: number;
  cashAfter: number;
  netDelta: number;
}) {
  const deltaSign = netDelta > 0 ? "+" : netDelta < 0 ? "−" : "";
  const deltaColor =
    netDelta > 0
      ? "var(--mono-green)"
      : netDelta < 0
        ? "var(--mono-red)"
        : "var(--mono-ink)";
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 truncate tabular-nums"
      style={{
        color: "color-mix(in srgb, var(--mono-ink) 70%, transparent)",
      }}
    >
      <span>${cashBefore.toLocaleString("en-US")}</span>
      <span style={{ opacity: 0.5 }}>→</span>
      <span style={{ color: "var(--mono-ink)", fontWeight: 600 }}>
        ${cashAfter.toLocaleString("en-US")}
      </span>
      {netDelta !== 0 && (
        <span style={{ color: deltaColor, fontWeight: 600 }}>
          ({deltaSign}${Math.abs(netDelta).toLocaleString("en-US")})
        </span>
      )}
    </span>
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
}): ReactNode {
  const background =
    variant === "primary" ? "var(--mono-green)" : "var(--mono-board)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex shrink-0 items-center justify-center px-3 py-3 font-semibold uppercase tracking-wide disabled:opacity-40"
      style={{
        backgroundColor: background,
        color: "var(--mono-ink)",
        fontSize: "clamp(0.875rem, 2.5vmin, 1.125rem)",
        minHeight: "56px",
        minWidth: "5.5rem",
      }}
    >
      {label}
    </button>
  );
}
