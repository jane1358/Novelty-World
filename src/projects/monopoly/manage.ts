import {
  bankSupply,
  developmentLevel,
  planDevelopment,
} from "./development";
import { firstNegativePlayer } from "./engine";
import { mortgageValueAt, unmortgageCostAt } from "./logic";
import type { DevelopmentNote } from "./development";
import type { GameState } from "./types";

/** Local, client-only staging for a manage intermission (or the must-raise-cash
 *  forced settle). Never synced — mirrors the old mortgage-staging discipline.
 *
 *  - `build` maps a position to its STAGED development level (0 bare … 5 hotel).
 *    Only positions the actor is changing are present.
 *  - `mortgage` maps a position to its STAGED mortgaged flag. Only positions the
 *    actor is changing are present.
 *
 *  Both maps store only entries that differ from the live state's intent; the
 *  store prunes keys that fall back to the current value as the player cycles. */
export interface ManageStaged {
  build: Readonly<Record<number, number>>;
  mortgage: Readonly<Record<number, boolean>>;
}

/** Who the manage UI is acting as: the queued manager during `managing`, or the
 *  current debtor (`firstNegativePlayer`, possibly off-turn) during
 *  `must-raise-cash`. Null when neither phase is active. */
export function manageActorId(state: GameState): string | null {
  const { phase, managerId } = state.turn;
  if (phase === "managing") return managerId ?? null;
  if (phase === "must-raise-cash") return firstNegativePlayer(state);
  return null;
}

/** Apply a staged mortgage map to a copy of the state, so the build planner
 *  previews "unmortgage-then-build" / "mortgage-then-sell" against the world the
 *  player is staging — not the live one. Only the `mortgaged` map changes. */
export function withStagedMortgage(
  state: GameState,
  mortgage: Readonly<Record<number, boolean>>,
): GameState {
  if (Object.keys(mortgage).length === 0) return state;
  const mortgaged: Record<number, boolean> = { ...state.mortgaged };
  for (const [posStr, flag] of Object.entries(mortgage)) {
    if (flag) mortgaged[Number(posStr)] = true;
    else delete mortgaged[Number(posStr)];
  }
  return { ...state, mortgaged };
}

/** Net cash the mortgage side of a staged commit moves: +value for each newly
 *  mortgaged property, −unmortgage-cost for each newly unmortgaged one. Entries
 *  that match the live state are ignored (no-op flips). */
function mortgageNetCash(
  state: GameState,
  mortgage: Readonly<Record<number, boolean>>,
): number {
  let net = 0;
  for (const [posStr, flag] of Object.entries(mortgage)) {
    const pos = Number(posStr);
    const currentlyMortgaged = state.mortgaged[pos] === true;
    if (flag === currentlyMortgaged) continue;
    if (flag) {
      const value = mortgageValueAt(pos);
      if (value !== null) net += value;
    } else {
      const cost = unmortgageCostAt(pos);
      if (cost !== null) net -= cost;
    }
  }
  return net;
}

/** Combined preview of a staged manage commit: the build plan (run against the
 *  state with staged mortgages already applied, so unmortgage-then-build reads
 *  correctly), the combined net cash, and any shortage-liquidation notes.
 *
 *  `ok` is false when the build target itself is illegal (uneven, not a
 *  monopoly, bank short); the caller surfaces the reason and disables Commit. */
export type ManageSummary =
  | {
      ok: true;
      /** +refund / −spend across both build and mortgage sides. */
      netCash: number;
      notes: readonly DevelopmentNote[];
    }
  | { ok: false; reason: string };

export function manageSummary(
  state: GameState,
  playerId: string,
  staged: ManageStaged,
): ManageSummary {
  const previewState = withStagedMortgage(state, staged.mortgage);
  const plan = planDevelopment(previewState, playerId, staged.build);
  if (!plan.ok) return { ok: false, reason: plan.reason };
  const netCash = plan.netCash + mortgageNetCash(state, staged.mortgage);
  return { ok: true, netCash, notes: plan.notes };
}

/** Has the player staged anything that differs from the live state? Drives the
 *  Commit-enabled gate (combined with affordability + plan legality). */
export function hasStagedChanges(state: GameState, staged: ManageStaged): boolean {
  for (const [posStr, level] of Object.entries(staged.build)) {
    if (level !== developmentLevel(state, Number(posStr))) return true;
  }
  for (const [posStr, flag] of Object.entries(staged.mortgage)) {
    if (flag !== (state.mortgaged[Number(posStr)] === true)) return true;
  }
  return false;
}

/** Re-export so the panel reads bank supply from one place. */
export { bankSupply };
