import type { GameState, TradeTerms, GameEvent, CardSource } from "../../../types";
import { positionValue } from "./valuation";

/**
 * Observation-based opponent model for trade-v2.
 *
 * Kyle's principle: "We don't care what eval THEY use, we just know OURS is
 * the best. We figure out their eval by offering trades and seeing what they
 * say yes and no to. If we find a net positive diff in our eval vs what they
 * say yes and no to, that's when we get them."
 *
 * Implementation: We use OUR positionValue to compute what a trade is worth to
 * each opponent. We then learn each opponent's ACCEPT_MARGIN — the minimum
 * positionValue delta they'll accept. claude-v36 assumes a fixed ACCEPT_MARGIN
 * for all opponents; trade-v2 LEARNS it per opponent from trade history.
 *
 * This is NOT using another bot's logic — positionValue is our own valuation
 * function. We're applying it to predict what opponents will do, then refining
 * from observations.
 */

interface Observation {
  /** Our positionValue delta for the opponent on this trade. */
  ourEvalDelta: number;
  /** Did they accept? */
  accepted: boolean;
  turn: number;
}

interface PlayerModel {
  observations: Observation[];
  /** Learned accept margin. Starts at claude-v36's default (30). */
  acceptMargin: number;
}

/** claude-v36's ACCEPT_MARGIN — the default we start from. */
const DEFAULT_MARGIN = 30;
const MIN_MARGIN = 1;
const MAX_OBS = 20;

export class OpponentModel {
  private models = new Map<string, PlayerModel>();

  /** Reconstruct models from the game's trade history. */
  reconstruct(state: GameState, pid: string): void {
    this.models.clear();
    for (const turn of state.turns) {
      for (const event of turn.events) {
        if (event.kind === "trade") {
          // Completed trade — all participants accepted.
          // Record for each property recipient.
          for (const [, toId] of Object.entries(event.propertyTo)) {
            if (toId === pid) continue;
            const terms = this.eventToTerms(event);
            this.observe(state, toId, terms, turn.turn, true);
          }
          // Also record for cash recipients who didn't get property
          for (const [cashId] of Object.entries(event.cashDelta)) {
            if (cashId === pid) continue;
            const terms = this.eventToTerms(event);
            this.observe(state, cashId, terms, turn.turn, true);
          }
        } else if (event.kind === "trade-declined") {
          const decliner = event.declinedBy;
          if (decliner === pid) continue;
          const terms = this.eventToTerms(event);
          this.observe(state, decliner, terms, turn.turn, false);
        }
      }
    }
  }

  /** Convert a GameEvent into TradeTerms. */
  private eventToTerms(event: GameEvent): TradeTerms {
    const e = event as Extract<GameEvent, { kind: "trade" | "trade-declined" }>;
    return {
      propertyTo: { ...e.propertyTo } as Record<number, string>,
      gojfTo: { ...e.gojfTo } as Partial<Record<CardSource, string>>,
      cashDelta: { ...e.cashDelta } as Record<string, number>,
    };
  }

  /** Record an observation and recalibrate. */
  private observe(
    state: GameState,
    playerId: string,
    terms: TradeTerms,
    turn: number,
    accepted: boolean,
  ): void {
    const ourEvalDelta = this.ourEvalFor(state, playerId, terms);
    let model = this.models.get(playerId);
    if (!model) {
      model = { observations: [], acceptMargin: DEFAULT_MARGIN };
      this.models.set(playerId, model);
    }
    model.observations.push({ ourEvalDelta, accepted, turn });
    if (model.observations.length > MAX_OBS) {
      model.observations.shift();
    }
    this.recalibrate(playerId);
  }

  /** What OUR positionValue says a trade is worth to a given player. */
  ourEvalFor(state: GameState, playerId: string, terms: TradeTerms): number {
    const after = this.postTradeState(state, terms);
    return positionValue(after, playerId) - positionValue(state, playerId);
  }

  /** Apply trade terms to state (clone). */
  private postTradeState(state: GameState, terms: TradeTerms): GameState {
    const ownership = { ...state.ownership };
    for (const [posStr, toId] of Object.entries(terms.propertyTo)) {
      ownership[Number(posStr)] = toId;
    }
    const players = state.players.map((p) => ({
      ...p,
      cash: p.cash + (terms.cashDelta[p.id] ?? 0),
    }));
    return { ...state, ownership, players };
  }

  /** Adjust acceptMargin based on observations.
   *  An accepted trade at delta D means their margin <= D.
   *  A rejected trade at delta D means their margin > D. */
  private recalibrate(playerId: string): void {
    const model = this.models.get(playerId);
    if (!model || model.observations.length === 0) return;

    let highestAccept = -Infinity;
    let lowestReject = Infinity;

    for (const obs of model.observations) {
      if (obs.accepted) {
        highestAccept = Math.max(highestAccept, obs.ourEvalDelta);
      } else {
        lowestReject = Math.min(lowestReject, obs.ourEvalDelta);
      }
    }

    // If we've seen both, the margin sits between highest accept and lowest reject.
    if (highestAccept > -Infinity && lowestReject < Infinity) {
      // Margin is just above the highest delta they accepted.
      model.acceptMargin = Math.max(MIN_MARGIN, Math.round(highestAccept));
    } else if (highestAccept > -Infinity) {
      // Only accepts — they're at least as loose as the lowest delta accepted.
      const lowestAccept = Math.min(
        ...model.observations.filter((o) => o.accepted).map((o) => o.ourEvalDelta),
      );
      // Lower the margin toward what we've observed, but stay conservative.
      model.acceptMargin = Math.max(MIN_MARGIN, Math.min(lowestAccept, DEFAULT_MARGIN));
    }
    // If only rejects, keep the default — don't raise based on limited data.
  }

  /** Would this player accept a trade with the given OUR-eval delta? */
  wouldAccept(playerId: string, ourEvalDelta: number): boolean {
    const model = this.models.get(playerId);
    const margin = model ? model.acceptMargin : DEFAULT_MARGIN;
    return ourEvalDelta >= margin;
  }

  /** Get the learned accept margin for a player. */
  getAcceptMargin(playerId: string): number {
    const model = this.models.get(playerId);
    return model ? model.acceptMargin : DEFAULT_MARGIN;
  }
}
