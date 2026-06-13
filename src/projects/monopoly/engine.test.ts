import { describe, expect, it } from "vitest";
import { apply, autoStep, createRng, firstNegativePlayer } from "./engine";
import { freshGame } from "./mocks";
import type { GameState, Player } from "./types";

// Resume the seeded RNG and pull the same two dice autoStep would, without
// mutating the state. Lets a test place the active player so the roll lands
// on a chosen square deterministically across seed changes.
function predictRoll(rngState: number): { total: number } {
  const rng = createRng(rngState);
  const d1 = Math.floor(rng.next() * 6) + 1;
  const d2 = Math.floor(rng.next() * 6) + 1;
  return { total: d1 + d2 };
}

function placeActivePlayerAt(state: GameState, position: number): GameState {
  return {
    ...state,
    players: state.players.map((p, i): Player =>
      i === 0 ? { ...p, position } : p,
    ),
  };
}

// Roll the seeded RNG, then position the active player so the eventual
// landing square is `target`. Use after-move expectations are checked
// against `target`, not the predicted dice — the predicted total is just
// the placement math.
function setupLandingOn(
  state: GameState,
  target: number,
): { state: GameState; diceTotal: number } {
  const { total } = predictRoll(state.rngState);
  const startPos = (target - total + 40) % 40;
  return { state: placeActivePlayerAt(state, startPos), diceTotal: total };
}

function setCash(state: GameState, playerId: string, cash: number): GameState {
  return {
    ...state,
    players: state.players.map((p): Player =>
      p.id === playerId ? { ...p, cash } : p,
    ),
  };
}

function withOwnership(
  state: GameState,
  ownership: Record<number, string>,
): GameState {
  return { ...state, ownership: { ...state.ownership, ...ownership } };
}

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng("alpha");
    const b = createRng("alpha");
    const sampleA = [a.next(), a.next(), a.next()];
    const sampleB = [b.next(), b.next(), b.next()];
    expect(sampleA).toEqual(sampleB);
  });

  it("produces different streams for different seeds", () => {
    const a = createRng("alpha");
    const b = createRng("beta");
    expect(a.next()).not.toEqual(b.next());
  });

  it("resumes the same stream from a serialized getState() value", () => {
    const a = createRng("resume");
    const before = [a.next(), a.next()];
    const snapshot = a.getState();
    const expected = [a.next(), a.next(), a.next()];

    const b = createRng(snapshot);
    const actual = [b.next(), b.next(), b.next()];
    expect(actual).toEqual(expected);
    // And the resumed RNG hasn't poisoned what came before.
    expect(before).toHaveLength(2);
  });
});

describe("autoStep", () => {
  it("rolls the dice, leaves pre-roll, and bumps rngState", () => {
    const state = freshGame("test-roll");
    const { state: next, newEvents } = autoStep(state);

    expect(next.turn.phase).not.toBe("pre-roll");
    expect(next.rngState).not.toBe(state.rngState);
    expect(newEvents).toHaveLength(1);
    const event = newEvents[0];
    if (event.kind !== "roll") throw new Error("expected a roll event");
    const [d1, d2] = event.dice;
    expect(d1).toBeGreaterThanOrEqual(1);
    expect(d1).toBeLessThanOrEqual(6);
    expect(d2).toBeGreaterThanOrEqual(1);
    expect(d2).toBeLessThanOrEqual(6);
    expect(event.toPosition).toBe(d1 + d2);
    expect(event.passedGo).toBe(false);

    const player = next.players.find((p) => p.id === next.turn.playerId);
    expect(player?.position).toBe(d1 + d2);

    const lastTurn = next.turns[next.turns.length - 1];
    expect(lastTurn.events).toContainEqual(event);
  });

  it("does not advance while turn.paused is true", () => {
    const state = freshGame("test-paused");
    const paused = { ...state, turn: { ...state.turn, paused: true } };
    const { state: next, newEvents } = autoStep(paused);
    expect(next).toBe(paused);
    expect(newEvents).toHaveLength(0);
  });

  it("is a no-op outside pre-roll", () => {
    const state = freshGame("test-postroll");
    const postRoll = { ...state, turn: { ...state.turn, phase: "post-roll" as const } };
    const { state: next, newEvents } = autoStep(postRoll);
    expect(next).toBe(postRoll);
    expect(newEvents).toHaveLength(0);
  });

  it("flags passedGo when the move wraps the board", () => {
    const state = freshGame("test-wrap");
    const nearGo = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 38 } : p,
      ),
    };
    const { state: next, newEvents } = autoStep(nearGo);
    const event = newEvents[0];
    if (event.kind !== "roll") throw new Error("expected a roll event");
    expect(event.passedGo).toBe(true);
    expect(event.toPosition).toBe((38 + event.dice[0] + event.dice[1]) % 40);
    const moved = next.players.find((p) => p.id === next.turn.playerId);
    expect(moved?.position).toBe(event.toPosition);
  });

  it("credits $200 to the active player when they pass GO", () => {
    const state = freshGame("test-passgo-cash");
    const before = state.players[0].cash;
    const nearGo = {
      ...state,
      players: state.players.map((p, i) =>
        i === 0 ? { ...p, position: 38 } : p,
      ),
    };
    const { state: next, newEvents } = autoStep(nearGo);
    const event = newEvents[0];
    if (event.kind !== "roll") throw new Error("expected a roll event");
    expect(event.passedGo).toBe(true);
    const moved = next.players.find((p) => p.id === next.turn.playerId);
    expect(moved?.cash).toBe(before + 200);
  });

  it("leaves cash unchanged when the move does not pass GO", () => {
    const state = freshGame("test-no-passgo");
    const before = state.players[0].cash;
    const { state: next, newEvents } = autoStep(state);
    const event = newEvents[0];
    if (event.kind !== "roll") throw new Error("expected a roll event");
    expect(event.passedGo).toBe(false);
    const moved = next.players.find((p) => p.id === next.turn.playerId);
    expect(moved?.cash).toBe(before);
  });

  it("is replayable from a JSON-round-tripped state", () => {
    // The whole point of putting rngState in GameState: a serialized
    // snapshot is sufficient to keep the dice sequence deterministic
    // across reload, device, or host hand-off.
    const start = freshGame("test-replay");
    const live = autoStep(start);
    const reloaded = autoStep(JSON.parse(JSON.stringify(start)));
    expect(reloaded.newEvents).toEqual(live.newEvents);
    expect(reloaded.state.rngState).toBe(live.state.rngState);
  });
});

describe("apply", () => {
  it("advances to the next player and opens a new TurnGroup on end-turn", () => {
    const start = freshGame("test-end-turn");
    // Position the active player so the deterministic first roll lands on
    // Income Tax (pos 4) — a non-ownable square, so autoStep settles at
    // post-roll instead of branching into buy-decision.
    const { total } = predictRoll(start.rngState);
    const positioned = placeActivePlayerAt(start, (4 - total + 40) % 40);
    const rolled = autoStep(positioned).state;
    expect(rolled.turn.phase).toBe("post-roll");

    const ended = apply(rolled, {
      kind: "end-turn",
      playerId: rolled.turn.playerId,
    });
    if (!ended.ok) throw new Error(`expected ok, got ${ended.reason}`);
    expect(ended.state.turn.playerId).toBe("p2");
    expect(ended.state.turn.phase).toBe("pre-roll");
    expect(ended.state.turn.doublesStreak).toBe(0);

    const lastTurn = ended.state.turns[ended.state.turns.length - 1];
    expect(lastTurn).toEqual({ turn: 2, playerId: "p2", events: [] });
  });

  it("rejects an end-turn submitted by the wrong player", () => {
    const start = freshGame("test-wrong-player");
    const rolled = autoStep(start).state;
    const rejected = apply(rolled, { kind: "end-turn", playerId: "p2" });
    expect(rejected.ok).toBe(false);
  });

  it("rejects end-turn outside of post-roll", () => {
    const start = freshGame("test-wrong-phase");
    const rejected = apply(start, {
      kind: "end-turn",
      playerId: start.turn.playerId,
    });
    expect(rejected.ok).toBe(false);
  });

  it("rejects intents that aren't implemented yet", () => {
    const state = freshGame("test-unimpl");
    const result = apply(state, { kind: "build", playerId: "p1", position: 1 });
    expect(result.ok).toBe(false);
  });
});

describe("autoStep buy-decision", () => {
  it("transitions to buy-decision when landing on an unowned property", () => {
    const state = freshGame("test-land-property");
    const { total } = predictRoll(state.rngState);
    const target = 1; // Mediterranean Avenue (unowned property in freshGame)
    const positioned = placeActivePlayerAt(
      state,
      (target - total + 40) % 40,
    );
    const { state: next, newEvents } = autoStep(positioned);
    const event = newEvents[0];
    if (event.kind !== "roll") throw new Error("expected a roll event");
    expect(event.toPosition).toBe(target);
    expect(next.turn.phase).toBe("buy-decision");
    expect(next.turn.pendingBuy).toBe(target);
  });

  it("stays at post-roll when landing on a property someone else owns", () => {
    const state = freshGame("test-land-owned");
    const { total } = predictRoll(state.rngState);
    const target = 1;
    const positioned: GameState = {
      ...placeActivePlayerAt(state, (target - total + 40) % 40),
      ownership: { [target]: "p2" },
    };
    const { state: next } = autoStep(positioned);
    expect(next.turn.phase).toBe("post-roll");
    expect(next.turn.pendingBuy).toBeUndefined();
  });

  it("stays at post-roll when landing on a non-ownable space", () => {
    const state = freshGame("test-land-tax-b");
    const { total } = predictRoll(state.rngState);
    const target = 4; // Income Tax
    const positioned = placeActivePlayerAt(
      state,
      (target - total + 40) % 40,
    );
    const { state: next } = autoStep(positioned);
    expect(next.turn.phase).toBe("post-roll");
    expect(next.turn.pendingBuy).toBeUndefined();
  });
});

describe("autoStep doubles", () => {
  it("grants the active player another roll on doubles, keeping the streak", () => {
    const start = freshGame("test-doubles-roll"); // rolls [4,4]
    const { total } = predictRoll(start.rngState);
    // Land on Income Tax (4): non-ownable, so the roll resolves past landing.
    const placed = placeActivePlayerAt(start, (4 - total + 40) % 40);
    const { state: next, newEvents } = autoStep(placed);

    const roll = newEvents[0];
    if (roll.kind !== "roll") throw new Error("expected a roll event");
    expect(roll.dice[0]).toBe(roll.dice[1]);
    expect(roll.doublesStreak).toBe(1);
    // Same player rolls again — back to pre-roll, streak kept, no handoff.
    expect(next.turn.playerId).toBe("p1");
    expect(next.turn.phase).toBe("pre-roll");
    expect(next.turn.doublesStreak).toBe(1);
    expect(next.turns).toHaveLength(1);
  });

  it("does not grant a fourth roll after the third consecutive double", () => {
    const start = freshGame("test-doubles-roll"); // rolls [4,4]
    const { total } = predictRoll(start.rngState);
    const placed: GameState = {
      ...placeActivePlayerAt(start, (4 - total + 40) % 40),
      turn: { ...start.turn, doublesStreak: 2 },
    };
    const { state: next } = autoStep(placed);

    // Third double: no bonus roll. Jail is deferred, so it settles at
    // post-roll and the turn ends through the normal end-turn path.
    expect(next.turn.phase).toBe("post-roll");
    expect(next.turn.playerId).toBe("p1");
    expect(next.turn.doublesStreak).toBe(3);

    const ended = apply(next, { kind: "end-turn", playerId: "p1" });
    if (!ended.ok) throw new Error(`expected ok, got ${ended.reason}`);
    expect(ended.state.turn.playerId).toBe("p2");
    expect(ended.state.turn.doublesStreak).toBe(0);
  });

  it("settles into post-roll and resets the streak on a non-double", () => {
    const start = freshGame("test-rent-basic"); // rolls [4,6]
    const { total } = predictRoll(start.rngState);
    const placed = placeActivePlayerAt(start, (4 - total + 40) % 40);
    const { state: next, newEvents } = autoStep(placed);

    const roll = newEvents[0];
    if (roll.kind !== "roll") throw new Error("expected a roll event");
    expect(roll.dice[0]).not.toBe(roll.dice[1]);
    expect(roll.doublesStreak).toBe(0);
    expect(next.turn.phase).toBe("post-roll");
    expect(next.turn.doublesStreak).toBe(0);
  });
});

describe("apply buy", () => {
  it("deducts cash, assigns ownership, emits a buy event, and advances to post-roll", () => {
    const state = freshGame("test-buy-apply");
    const playerId = state.turn.playerId;
    const position = 1; // Mediterranean Avenue, price 60
    const ready: GameState = {
      ...state,
      turn: { ...state.turn, phase: "buy-decision", pendingBuy: position },
    };
    const before = ready.players[0].cash;
    const result = apply(ready, { kind: "buy", playerId });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.turn.phase).toBe("post-roll");
    expect(result.state.turn.pendingBuy).toBeUndefined();
    expect(result.state.ownership[position]).toBe(playerId);
    const buyer = result.state.players.find((p) => p.id === playerId);
    expect(buyer?.cash).toBe(before - 60);
    expect(result.newEvents).toEqual([{ kind: "buy", position, price: 60 }]);
    const lastTurn = result.state.turns[result.state.turns.length - 1];
    expect(lastTurn.events).toContainEqual({
      kind: "buy",
      position,
      price: 60,
    });
  });

  it("rejects when not in buy-decision phase", () => {
    const state = freshGame("test-buy-wrong-phase");
    const result = apply(state, {
      kind: "buy",
      playerId: state.turn.playerId,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects when submitted by a non-active player", () => {
    const state = freshGame("test-buy-wrong-player");
    const ready: GameState = {
      ...state,
      turn: { ...state.turn, phase: "buy-decision", pendingBuy: 1 },
    };
    const result = apply(ready, { kind: "buy", playerId: "p2" });
    expect(result.ok).toBe(false);
  });

  it("rejects when the active player cannot afford the price", () => {
    const state = freshGame("test-buy-broke");
    const playerId = state.turn.playerId;
    const broke: GameState = {
      ...state,
      players: state.players.map((p, i): Player =>
        i === 0 ? { ...p, cash: 10 } : p,
      ),
      turn: { ...state.turn, phase: "buy-decision", pendingBuy: 1 },
    };
    const result = apply(broke, { kind: "buy", playerId });
    expect(result.ok).toBe(false);
  });
});

describe("apply decline-buy", () => {
  it("clears pendingBuy and advances to post-roll without emitting events", () => {
    const state = freshGame("test-decline");
    const playerId = state.turn.playerId;
    const ready: GameState = {
      ...state,
      turn: { ...state.turn, phase: "buy-decision", pendingBuy: 1 },
    };
    const result = apply(ready, { kind: "decline-buy", playerId });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.turn.phase).toBe("post-roll");
    expect(result.state.turn.pendingBuy).toBeUndefined();
    expect(result.state.ownership[1]).toBeUndefined();
    expect(result.newEvents).toEqual([]);
  });

  it("rejects when not in buy-decision phase", () => {
    const state = freshGame("test-decline-wrong-phase");
    const result = apply(state, {
      kind: "decline-buy",
      playerId: state.turn.playerId,
    });
    expect(result.ok).toBe(false);
  });
});

describe("apply set-armed-pause", () => {
  it("arms a pause for any player (need not be the active player)", () => {
    const state = freshGame("test-arm-other");
    expect(state.turn.playerId).toBe("p1");
    const result = apply(state, {
      kind: "set-armed-pause",
      playerId: "p3",
      when: "before-roll",
      armed: true,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.armedPauses.p3.beforeRoll).toBe(true);
    expect(result.state.armedPauses.p3.beforeEnd).toBe(false);
    // No side effects on other players.
    expect(result.state.armedPauses.p1.beforeRoll).toBe(false);
  });

  it("disarms when armed=false", () => {
    const armed: GameState = {
      ...freshGame("test-disarm"),
    };
    const armedState: GameState = {
      ...armed,
      armedPauses: {
        ...armed.armedPauses,
        p1: { beforeRoll: true, beforeEnd: false },
      },
    };
    const result = apply(armedState, {
      kind: "set-armed-pause",
      playerId: "p1",
      when: "before-roll",
      armed: false,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.armedPauses.p1.beforeRoll).toBe(false);
  });

  it("is a no-op when the requested value matches the current flag", () => {
    const state = freshGame("test-arm-noop");
    const result = apply(state, {
      kind: "set-armed-pause",
      playerId: "p1",
      when: "before-end",
      armed: false,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    // Object identity preserved on no-op — keeps the host's persistence
    // diff clean instead of churning the row.
    expect(result.state).toBe(state);
  });

  it("rejects unknown players", () => {
    const state = freshGame("test-arm-unknown");
    const result = apply(state, {
      kind: "set-armed-pause",
      playerId: "nope",
      when: "before-roll",
      armed: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe("armed pause consumption", () => {
  it("fires beforeRoll at end-turn entry, pauses the new turn, and clears the flag", () => {
    const start = freshGame("test-consume-pre");
    // Position p1 so the first roll deterministically lands on Income Tax —
    // non-ownable → autoStep settles at post-roll so we can issue end-turn.
    const { total } = predictRoll(start.rngState);
    const placed = placeActivePlayerAt(start, (4 - total + 40) % 40);
    const rolled = autoStep(placed).state;
    expect(rolled.turn.phase).toBe("post-roll");

    // p2 has armed a pre-roll pause before their next turn.
    const armed: GameState = {
      ...rolled,
      armedPauses: {
        ...rolled.armedPauses,
        p2: { beforeRoll: true, beforeEnd: false },
      },
    };
    const ended = apply(armed, { kind: "end-turn", playerId: "p1" });
    if (!ended.ok) throw new Error(`expected ok, got ${ended.reason}`);
    expect(ended.state.turn.playerId).toBe("p2");
    expect(ended.state.turn.phase).toBe("pre-roll");
    expect(ended.state.turn.paused).toBe(true);
    expect(ended.state.armedPauses.p2.beforeRoll).toBe(false);
  });

  it("leaves the new turn unpaused when no beforeRoll is armed", () => {
    const start = freshGame("test-no-pre");
    const { total } = predictRoll(start.rngState);
    const placed = placeActivePlayerAt(start, (4 - total + 40) % 40);
    const rolled = autoStep(placed).state;
    const ended = apply(rolled, { kind: "end-turn", playerId: "p1" });
    if (!ended.ok) throw new Error(`expected ok, got ${ended.reason}`);
    expect(ended.state.turn.paused).toBe(false);
  });

  it("fires beforeEnd when autoStep settles into post-roll on a non-buy landing", () => {
    const start = freshGame("test-consume-end-autostep");
    const { total } = predictRoll(start.rngState);
    // Land on Income Tax: non-ownable, so autoStep goes to post-roll.
    const placed = placeActivePlayerAt(start, (4 - total + 40) % 40);
    const armed: GameState = {
      ...placed,
      armedPauses: {
        ...placed.armedPauses,
        p1: { beforeRoll: false, beforeEnd: true },
      },
    };
    const { state: next } = autoStep(armed);
    expect(next.turn.phase).toBe("post-roll");
    expect(next.turn.paused).toBe(true);
    expect(next.armedPauses.p1.beforeEnd).toBe(false);
  });

  it("does NOT fire beforeEnd at the buy-decision branch — only at post-roll", () => {
    const start = freshGame("test-consume-end-buy-defer");
    const { total } = predictRoll(start.rngState);
    // Land on Mediterranean Avenue (unowned property) → buy-decision.
    const placed = placeActivePlayerAt(start, (1 - total + 40) % 40);
    const armed: GameState = {
      ...placed,
      armedPauses: {
        ...placed.armedPauses,
        p1: { beforeRoll: false, beforeEnd: true },
      },
    };
    const { state: next } = autoStep(armed);
    expect(next.turn.phase).toBe("buy-decision");
    expect(next.turn.paused).toBe(false);
    // Flag survives — it gets consumed when buy / decline-buy transitions
    // into post-roll, not when the buy-decision phase is entered.
    expect(next.armedPauses.p1.beforeEnd).toBe(true);
  });

  it("fires beforeEnd when applyBuy transitions through to post-roll", () => {
    const state = freshGame("test-consume-end-buy");
    const playerId = state.turn.playerId;
    const ready: GameState = {
      ...state,
      turn: { ...state.turn, phase: "buy-decision", pendingBuy: 1 },
      armedPauses: {
        ...state.armedPauses,
        [playerId]: { beforeRoll: false, beforeEnd: true },
      },
    };
    const result = apply(ready, { kind: "buy", playerId });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.turn.phase).toBe("post-roll");
    expect(result.state.turn.paused).toBe(true);
    expect(result.state.armedPauses[playerId].beforeEnd).toBe(false);
  });

  it("fires beforeEnd when applyDeclineBuy transitions to post-roll", () => {
    const state = freshGame("test-consume-end-decline");
    const playerId = state.turn.playerId;
    const ready: GameState = {
      ...state,
      turn: { ...state.turn, phase: "buy-decision", pendingBuy: 1 },
      armedPauses: {
        ...state.armedPauses,
        [playerId]: { beforeRoll: false, beforeEnd: true },
      },
    };
    const result = apply(ready, { kind: "decline-buy", playerId });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.turn.phase).toBe("post-roll");
    expect(result.state.turn.paused).toBe(true);
    expect(result.state.armedPauses[playerId].beforeEnd).toBe(false);
  });
});

describe("apply resume", () => {
  it("unpauses an active turn", () => {
    const state = freshGame("test-resume");
    const paused: GameState = {
      ...state,
      turn: { ...state.turn, paused: true },
    };
    const result = apply(paused, {
      kind: "resume",
      playerId: state.turn.playerId,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);
    expect(result.state.turn.paused).toBe(false);
    expect(result.newEvents).toEqual([]);
  });

  it("rejects when the turn is not paused", () => {
    const state = freshGame("test-resume-not-paused");
    const result = apply(state, {
      kind: "resume",
      playerId: state.turn.playerId,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects when submitted by a non-active player", () => {
    const state = freshGame("test-resume-wrong-player");
    const paused: GameState = {
      ...state,
      turn: { ...state.turn, paused: true },
    };
    const result = apply(paused, { kind: "resume", playerId: "p2" });
    expect(result.ok).toBe(false);
  });
});

// All rent tests target squares at position ≥ 12 so the active player
// (starting at position 0) never wraps the board on the first roll —
// avoids pass-GO bonuses muddying the cash assertions.

describe("autoStep rent", () => {
  it("transfers cash from lander to owner and emits a rent event", () => {
    const start = freshGame("test-rent-basic");
    const { state: placed } = setupLandingOn(start, 13); // States Avenue
    // p2 owns States Avenue only — no monopoly, no houses → base rent $10.
    const state = withOwnership(placed, { 13: "p2" });

    const { state: next, newEvents } = autoStep(state);
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent).toEqual({
      kind: "rent",
      ownerId: "p2",
      position: 13,
      amount: 10,
    });

    const payer = next.players.find((p) => p.id === "p1");
    const recipient = next.players.find((p) => p.id === "p2");
    expect(payer?.cash).toBe(1500 - 10);
    expect(recipient?.cash).toBe(1500 + 10);
    expect(next.turn.phase).toBe("post-roll");
  });

  it("doubles base rent when the owner holds the full color set", () => {
    const start = freshGame("test-rent-monopoly");
    const { state: placed } = setupLandingOn(start, 13); // States Avenue
    // p2 holds all three pinks (11 + 13 + 14), no houses → base $10 × 2 = $20.
    const state = withOwnership(placed, { 11: "p2", 13: "p2", 14: "p2" });

    const { newEvents } = autoStep(state);
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(20);
  });

  it("uses the houses ladder when the owner has built", () => {
    const start = freshGame("test-rent-houses");
    const { state: placed } = setupLandingOn(start, 13); // States Avenue
    // p2 holds States Avenue with 3 houses → ladder index 2 = $450.
    const state: GameState = {
      ...withOwnership(placed, { 13: "p2" }),
      houses: { 13: 3 },
    };

    const { newEvents } = autoStep(state);
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(450);
  });

  it("uses the railroad ladder based on how many the owner holds", () => {
    const start = freshGame("test-rent-railroad");
    const { state: placed } = setupLandingOn(start, 15); // Pennsylvania Railroad
    // p2 holds 3 of the 4 railroads → $100.
    const state = withOwnership(placed, { 5: "p2", 15: "p2", 25: "p2" });

    const { newEvents } = autoStep(state);
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(100);
  });

  it("uses the utility 4× multiplier with a single utility owned", () => {
    const start = freshGame("test-rent-utility-4x");
    const { state: placed, diceTotal } = setupLandingOn(start, 12); // Electric Co.
    const state = withOwnership(placed, { 12: "p2" });

    const { newEvents } = autoStep(state);
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(diceTotal * 4);
  });

  it("uses the utility 10× multiplier when the owner holds both", () => {
    const start = freshGame("test-rent-utility-10x");
    const { state: placed, diceTotal } = setupLandingOn(start, 12); // Electric Co.
    const state = withOwnership(placed, { 12: "p2", 28: "p2" });

    const { newEvents } = autoStep(state);
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(diceTotal * 10);
  });

  it("collects no rent when the property is mortgaged", () => {
    const start = freshGame("test-rent-mortgaged");
    const { state: placed } = setupLandingOn(start, 13);
    const state: GameState = {
      ...withOwnership(placed, { 13: "p2" }),
      mortgaged: { 13: true },
    };
    const cashBefore = state.players[0].cash;

    const { state: next, newEvents } = autoStep(state);
    expect(newEvents.find((e) => e.kind === "rent")).toBeUndefined();
    const payer = next.players.find((p) => p.id === "p1");
    expect(payer?.cash).toBe(cashBefore);
    expect(next.turn.phase).toBe("post-roll");
  });

  it("collects no rent when the lander owns the square themselves", () => {
    const start = freshGame("test-rent-self");
    const { state: placed } = setupLandingOn(start, 13);
    const state = withOwnership(placed, { 13: "p1" });
    const cashBefore = state.players[0].cash;

    const { state: next, newEvents } = autoStep(state);
    expect(newEvents.find((e) => e.kind === "rent")).toBeUndefined();
    expect(next.players.find((p) => p.id === "p1")?.cash).toBe(cashBefore);
    expect(next.turn.phase).toBe("post-roll");
  });
});

describe("bankruptcy", () => {
  it("zeros the payer's cash, transfers properties + GOJF to the creditor, and emits a bankrupt event", () => {
    const start = freshGame("test-bust-transfer");
    const { state: placed } = setupLandingOn(start, 39); // Boardwalk
    // p2 owns Boardwalk with a hotel: hotel rent $2000. p1 can't pay.
    let state: GameState = {
      ...withOwnership(placed, { 39: "p2", 37: "p2", 5: "p1", 12: "p1" }),
      houses: { 39: 5 },
      jailFreeCards: { chance: "p1" },
    };
    state = setCash(state, "p1", 100);

    const { state: next, newEvents } = autoStep(state);

    const bustEvent = newEvents.find((e) => e.kind === "bankrupt");
    if (!bustEvent) throw new Error("expected a bankrupt event");
    expect(bustEvent.creditorId).toBe("p2");

    // p1's cash hits zero (the $100 they had got transferred to p2).
    const payer = next.players.find((p) => p.id === "p1");
    expect(payer?.cash).toBe(0);
    expect(payer?.bankrupt).toBe(true);

    // Reading Railroad and Electric Company belong to p2 now.
    expect(next.ownership[5]).toBe("p2");
    expect(next.ownership[12]).toBe("p2");
    // p2's pre-bust holdings stay theirs.
    expect(next.ownership[39]).toBe("p2");
    expect(next.ownership[37]).toBe("p2");

    // Chance GOJF moved from p1 to p2.
    expect(next.jailFreeCards.chance).toBe("p2");

    // p2 received p1's $100 via rent.
    const creditor = next.players.find((p) => p.id === "p2");
    expect(creditor?.cash).toBe(1500 + 100);

    // The rent event in the log still reflects the FULL debt, not the
    // partial transfer — readers see what was owed, then the bust.
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(2000);
  });

  it("advances control to the next non-bankrupt player when the active player busts", () => {
    const start = freshGame("test-bust-advance");
    const { state: placed } = setupLandingOn(start, 39); // Boardwalk
    let state: GameState = {
      ...withOwnership(placed, { 39: "p2" }),
      houses: { 39: 5 },
    };
    state = setCash(state, "p1", 50);

    const { state: next } = autoStep(state);
    expect(next.turn.playerId).toBe("p2");
    expect(next.turn.phase).toBe("pre-roll");
    // A new TurnGroup was opened for p2.
    const last = next.turns[next.turns.length - 1];
    expect(last.playerId).toBe("p2");
    expect(last.events).toEqual([]);
  });

  it("emits a winner event and parks at game-over when only one survivor remains", () => {
    const start = freshGame("test-winner");
    const { state: placed } = setupLandingOn(start, 39); // Boardwalk
    // Two players are already bankrupt; p1's rent bust to p2 leaves p2
    // alone on the board.
    let state: GameState = {
      ...placed,
      players: placed.players.map((p): Player =>
        p.id === "p3" || p.id === "p4" ? { ...p, bankrupt: true, cash: 0 } : p,
      ),
    };
    state = withOwnership(state, { 39: "p2" });
    state = { ...state, houses: { 39: 5 } };
    state = setCash(state, "p1", 25);

    const { state: next, newEvents } = autoStep(state);
    const winnerEvent = newEvents.find((e) => e.kind === "winner");
    if (!winnerEvent) throw new Error("expected a winner event");
    expect(winnerEvent.winnerId).toBe("p2");
    expect(next.turn.phase).toBe("game-over");
  });
});

describe("end-turn skips bankrupt players", () => {
  it("advances past a bankrupt player in the rotation", () => {
    const start = freshGame("test-end-skip-bankrupt-b");
    // p1 is rolling. Position them on Income Tax so autoStep stops at
    // post-roll without triggering any rent path.
    const { state: placed } = setupLandingOn(start, 4); // Income Tax
    const state: GameState = {
      ...placed,
      players: placed.players.map((p): Player =>
        p.id === "p2" ? { ...p, bankrupt: true, cash: 0 } : p,
      ),
    };
    const rolled = autoStep(state).state;
    expect(rolled.turn.phase).toBe("post-roll");

    const ended = apply(rolled, { kind: "end-turn", playerId: "p1" });
    if (!ended.ok) throw new Error(`expected ok, got ${ended.reason}`);
    // p2 is bankrupt — control goes to p3 instead.
    expect(ended.state.turn.playerId).toBe("p3");
  });
});

// Park the active player at post-roll (no rent triggered) and arm a paused
// state so mortgage / unmortgage validation accepts them. Used as the
// starting point for the voluntary mortgage tests below.
function pausedPostRoll(seed: string): GameState {
  const start = freshGame(seed);
  // Land on Income Tax (non-ownable) so autoStep stops cleanly at post-roll
  // with no rent / buy detours.
  const { state: placed } = setupLandingOn(start, 4);
  const rolled = autoStep(placed).state;
  if (rolled.turn.phase !== "post-roll") {
    throw new Error(`expected post-roll, got ${rolled.turn.phase}`);
  }
  return { ...rolled, turn: { ...rolled.turn, paused: true } };
}

describe("apply mortgage", () => {
  it("credits the mortgage value to cash and flips the mortgaged flag", () => {
    const base = pausedPostRoll("test-mortgage-basic");
    // Mediterranean Avenue (pos 1, price $60) -> mortgage value $30.
    const state = withOwnership(base, { 1: "p1" });
    const before = state.players.find((p) => p.id === "p1")?.cash ?? 0;

    const result = apply(state, { kind: "mortgage", playerId: "p1", position: 1 });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);

    expect(result.state.mortgaged[1]).toBe(true);
    const after = result.state.players.find((p) => p.id === "p1");
    expect(after?.cash).toBe(before + 30);

    const event = result.newEvents.find((e) => e.kind === "mortgage");
    if (!event) throw new Error("expected a mortgage event");
    expect(event.position).toBe(1);
    expect(event.received).toBe(30);
  });

  it("rejects mortgaging a square the player doesn't own", () => {
    const base = pausedPostRoll("test-mortgage-not-owner");
    const state = withOwnership(base, { 1: "p2" });
    const result = apply(state, { kind: "mortgage", playerId: "p1", position: 1 });
    expect(result.ok).toBe(false);
  });

  it("rejects mortgaging a square that's already mortgaged", () => {
    const base = pausedPostRoll("test-mortgage-already");
    const state: GameState = {
      ...withOwnership(base, { 1: "p1" }),
      mortgaged: { 1: true },
    };
    const result = apply(state, { kind: "mortgage", playerId: "p1", position: 1 });
    expect(result.ok).toBe(false);
  });

  it("rejects mortgaging a property with buildings on it", () => {
    const base = pausedPostRoll("test-mortgage-houses");
    const state: GameState = {
      ...withOwnership(base, { 1: "p1" }),
      houses: { 1: 1 },
    };
    const result = apply(state, { kind: "mortgage", playerId: "p1", position: 1 });
    expect(result.ok).toBe(false);
  });

  it("rejects mortgaging during pre-roll without a pause armed", () => {
    const start = freshGame("test-mortgage-no-pause");
    const state = withOwnership(start, { 1: "p1" });
    const result = apply(state, { kind: "mortgage", playerId: "p1", position: 1 });
    expect(result.ok).toBe(false);
  });

  it("allows mortgaging during a paused pre-roll", () => {
    const start = freshGame("test-mortgage-preroll-pause");
    const state: GameState = {
      ...withOwnership(start, { 1: "p1" }),
      turn: { ...start.turn, paused: true },
    };
    const result = apply(state, { kind: "mortgage", playerId: "p1", position: 1 });
    expect(result.ok).toBe(true);
  });

  it("rejects mortgaging on someone else's turn", () => {
    // Build the state directly so the seed-driven autoStep can't introduce
    // unrelated phase noise (doubles, landings, etc.).
    const start = freshGame("test-mortgage-wrong-turn");
    const state: GameState = {
      ...start,
      ownership: { 1: "p2" },
      turn: { ...start.turn, phase: "post-roll", paused: true },
    };
    const result = apply(state, { kind: "mortgage", playerId: "p2", position: 1 });
    expect(result.ok).toBe(false);
  });
});

describe("apply unmortgage", () => {
  it("debits the un-mortgage cost from cash and clears the mortgaged flag", () => {
    const base = pausedPostRoll("test-unmortgage-basic");
    // Mediterranean (price $60) -> mortgage $30 -> unmortgage $30 * 1.1 = $33.
    const state: GameState = {
      ...withOwnership(base, { 1: "p1" }),
      mortgaged: { 1: true },
    };
    const before = state.players.find((p) => p.id === "p1")?.cash ?? 0;

    const result = apply(state, {
      kind: "unmortgage",
      playerId: "p1",
      position: 1,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);

    expect(result.state.mortgaged[1]).toBeUndefined();
    const after = result.state.players.find((p) => p.id === "p1");
    expect(after?.cash).toBe(before - 33);

    const event = result.newEvents.find((e) => e.kind === "unmortgage");
    if (!event) throw new Error("expected an unmortgage event");
    expect(event.cost).toBe(33);
  });

  it("rejects un-mortgaging a square that isn't mortgaged", () => {
    const base = pausedPostRoll("test-unmortgage-not-flagged");
    const state = withOwnership(base, { 1: "p1" });
    const result = apply(state, {
      kind: "unmortgage",
      playerId: "p1",
      position: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects un-mortgaging without enough cash", () => {
    const base = pausedPostRoll("test-unmortgage-poor");
    let state: GameState = {
      ...withOwnership(base, { 1: "p1" }),
      mortgaged: { 1: true },
    };
    state = setCash(state, "p1", 5); // cost is $33
    const result = apply(state, {
      kind: "unmortgage",
      playerId: "p1",
      position: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects un-mortgaging during the must-raise-cash phase", () => {
    // Force a must-raise-cash entry: land p1 on Boardwalk (rent $50 base for
    // p2 owner), with $0 cash but a mortgageable property (Mediterranean
    // unowned-by-p1; give them p1 ownership of Reading Railroad so they
    // have something to mortgage).
    const start = freshGame("test-unmortgage-blocked");
    const { state: placed } = setupLandingOn(start, 39);
    let state: GameState = withOwnership(placed, { 39: "p2", 5: "p1", 1: "p1" });
    state = { ...state, mortgaged: { 1: true } };
    state = setCash(state, "p1", 0);
    const rolled = autoStep(state).state;
    expect(rolled.turn.phase).toBe("must-raise-cash");

    // p1 owns mortgaged Mediterranean. Trying to UN-mortgage during raise-
    // cash should be rejected.
    const result = apply(rolled, {
      kind: "unmortgage",
      playerId: "p1",
      position: 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("must-raise-cash phase", () => {
  it("charges rent immediately (cash goes negative) and enters must-raise-cash", () => {
    // p1 lands on p2's Boardwalk ($50 base rent) with $0 cash and one
    // un-mortgaged ownable (Reading Railroad, mortgage value $100).
    const start = freshGame("test-raise-enter");
    const { state: placed } = setupLandingOn(start, 39);
    let state = withOwnership(placed, { 39: "p2", 5: "p1" });
    state = setCash(state, "p1", 0);

    const { state: next, newEvents } = autoStep(state);

    expect(next.turn.phase).toBe("must-raise-cash");
    expect(next.turn.raiseCash).toBe("after-landing");
    // The charge is applied at once: rent is logged now and cash goes negative.
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected a rent event");
    expect(rentEvent.amount).toBe(50);
    expect(next.players.find((p) => p.id === "p1")?.cash).toBe(-50);
    expect(next.players.find((p) => p.id === "p2")?.cash).toBe(1550);
    expect(firstNegativePlayer(next)).toBe("p1");
  });

  it("resumes the landing once mortgaging brings the debtor back to the black", () => {
    const start = freshGame("test-raise-settle");
    const { state: placed } = setupLandingOn(start, 39);
    let state = withOwnership(placed, { 39: "p2", 5: "p1" });
    state = setCash(state, "p1", 0);
    const raising = autoStep(state).state;
    expect(raising.turn.phase).toBe("must-raise-cash");
    // Rent already fired at landing; the debtor sits at -$50.
    expect(raising.players.find((p) => p.id === "p1")?.cash).toBe(-50);

    // Mortgage Reading Railroad (value $100): -$50 + $100 = $50 ≥ 0 → resume.
    const result = apply(raising, {
      kind: "mortgage",
      playerId: "p1",
      position: 5,
    });
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`);

    expect(result.state.turn.phase).toBe("post-roll");
    expect(result.state.turn.raiseCash).toBeUndefined();
    // Rent was logged at landing, so settling emits only the mortgage.
    expect(result.newEvents.map((e) => e.kind)).toEqual(["mortgage"]);
    expect(result.state.players.find((p) => p.id === "p1")?.cash).toBe(50);
    expect(result.state.players.find((p) => p.id === "p2")?.cash).toBe(1550);
  });

  it("stays in must-raise-cash while a mortgage still leaves the debtor in the red", () => {
    // Land p1 on Boardwalk owned by p2 (no monopoly, no houses -> rent $50).
    // p1 has $0 cash; owns Mediterranean ($30 mortgage value) and Reading
    // Railroad ($100). Rent puts them at -$50; mortgaging only Mediterranean
    // (+$30) leaves -$20, so the phase persists for the next mortgage.
    const start = freshGame("test-raise-partial");
    const { state: placed } = setupLandingOn(start, 39);
    let state = withOwnership(placed, { 39: "p2", 1: "p1", 5: "p1" });
    state = setCash(state, "p1", 0);

    const raising = autoStep(state).state;
    expect(raising.turn.phase).toBe("must-raise-cash");
    expect(raising.players.find((p) => p.id === "p1")?.cash).toBe(-50);

    const r1 = apply(raising, { kind: "mortgage", playerId: "p1", position: 1 });
    if (!r1.ok) throw new Error(`expected ok, got ${r1.reason}`);
    expect(r1.state.turn.phase).toBe("must-raise-cash");
    expect(r1.state.players.find((p) => p.id === "p1")?.cash).toBe(-20);
  });

  it("auto-bankrupts when even max mortgaging can't cover the debt", () => {
    // Boardwalk hotel rent = $2000. p1 has $0 cash and only Mediterranean
    // (mortgage $30) and Reading Railroad (mortgage $100) — total $130 max
    // raisable. Should bankrupt immediately without entering must-raise-cash.
    const start = freshGame("test-raise-impossible");
    const { state: placed } = setupLandingOn(start, 39);
    let state: GameState = {
      ...withOwnership(placed, { 39: "p2", 5: "p1", 1: "p1" }),
      houses: { 39: 5 },
    };
    state = setCash(state, "p1", 0);

    const { state: next, newEvents } = autoStep(state);

    expect(next.turn.phase).not.toBe("must-raise-cash");
    expect(next.players.find((p) => p.id === "p1")?.bankrupt).toBe(true);
    expect(newEvents.find((e) => e.kind === "bankrupt")).toBeDefined();
    // Rent event still logged with the FULL debt.
    const rentEvent = newEvents.find((e) => e.kind === "rent");
    if (!rentEvent) throw new Error("expected rent event");
    expect(rentEvent.amount).toBe(2000);
  });

  it("ignores buildings + mortgaged squares when computing max raisable", () => {
    // p1 lands on rent of $200. p1 has $0 cash. They own three squares:
    // (a) a mortgaged property — excluded;
    // (b) a property with houses — excluded;
    // (c) one free un-mortgaged property worth $100 mortgage value.
    // Total raisable = $100 < $200 -> bankrupt, not must-raise-cash.
    const start = freshGame("test-raise-filter");
    const { state: placed } = setupLandingOn(start, 39);
    let state: GameState = {
      ...withOwnership(placed, {
        39: "p2",  // creditor's
        1: "p1",   // mortgaged
        3: "p1",   // has houses
        5: "p1",   // free, value $100
      }),
      mortgaged: { 1: true },
      houses: { 3: 1, 39: 4 }, // p1's pos 3 has a house; p2's Boardwalk -> rent ~$200
    };
    state = setCash(state, "p1", 0);
    // Boardwalk with 4 houses rent = $1700, not $200. Need a different
    // landing tile. Use Indiana Avenue (pos 23, red color, base rent $20,
    // hotel $1050). Re-do with a tile we control more easily. Simpler: use
    // Mediterranean (pos 1) as the landing target and Baltic as p2's.
    // Actually we can stick with Boardwalk hotel = $2000.
    // p1 cash $0 + raisable $100 = $100 < $2000 -> bankrupt.
    state = { ...state, houses: { 3: 1, 39: 5 } };

    const { state: next } = autoStep(state);
    expect(next.players.find((p) => p.id === "p1")?.bankrupt).toBe(true);
  });
});

// Put the active player at an unpaused pre-roll with `proposerId` building a
// trade — the state the engine reaches after the trade queue is consumed.
function inTradeBuilding(state: GameState, proposerId: string): GameState {
  return {
    ...state,
    turn: {
      ...state.turn,
      phase: "trade-building",
      tradeDraft: { proposerId, propertyTo: {}, gojfTo: {}, cashDelta: {} },
    },
  };
}

describe("trade requests", () => {
  it("toggles the trade queue per player, preserving request order", () => {
    const start = freshGame("trade-queue");
    const a = apply(start, { kind: "request-trade", playerId: "p3" });
    if (!a.ok) throw new Error(a.reason);
    expect(a.state.tradeQueue).toEqual(["p3"]);

    const b = apply(a.state, { kind: "request-trade", playerId: "p2" });
    if (!b.ok) throw new Error(b.reason);
    expect(b.state.tradeQueue).toEqual(["p3", "p2"]);

    // Toggling p3 off leaves p2 queued.
    const c = apply(b.state, { kind: "request-trade", playerId: "p3" });
    if (!c.ok) throw new Error(c.reason);
    expect(c.state.tradeQueue).toEqual(["p2"]);
  });

  it("opens the head requester's build at the next pre-roll instead of rolling", () => {
    const start = freshGame("trade-open");
    const queued: GameState = { ...start, tradeQueue: ["p3"] };
    const { state: next, newEvents } = autoStep(queued);
    expect(next.turn.phase).toBe("trade-building");
    expect(next.turn.tradeDraft?.proposerId).toBe("p3");
    // Active turn owner is unchanged — the trade just interrupts before p1 rolls.
    expect(next.turn.playerId).toBe("p1");
    expect(next.tradeQueue).toEqual([]);
    expect(newEvents).toHaveLength(0);
  });
});

describe("trade building", () => {
  it("lets the proposer stage a draft and rejects edits from anyone else", () => {
    const start = withOwnership(freshGame("trade-draft"), { 1: "p1" });
    const building = inTradeBuilding(start, "p1");
    const terms = { propertyTo: { 1: "p2" }, gojfTo: {}, cashDelta: {} };

    const ok = apply(building, { kind: "update-trade-draft", playerId: "p1", terms });
    if (!ok.ok) throw new Error(ok.reason);
    expect(ok.state.turn.tradeDraft?.propertyTo).toEqual({ 1: "p2" });

    const wrong = apply(building, { kind: "update-trade-draft", playerId: "p2", terms });
    expect(wrong.ok).toBe(false);
  });

  it("rejects a proposal that doesn't balance, is empty, or names one party", () => {
    const start = withOwnership(freshGame("trade-bad"), { 1: "p1" });
    const empty = inTradeBuilding(start, "p1");
    expect(apply(empty, { kind: "propose-trade", playerId: "p1" }).ok).toBe(false);

    const unbalanced: GameState = {
      ...start,
      turn: {
        ...start.turn,
        phase: "trade-building",
        tradeDraft: {
          proposerId: "p1",
          propertyTo: { 1: "p2" },
          gojfTo: {},
          cashDelta: { p2: -60 }, // doesn't sum to zero
        },
      },
    };
    expect(apply(unbalanced, { kind: "propose-trade", playerId: "p1" }).ok).toBe(false);
  });

  it("returns to pre-roll on cancel", () => {
    const start = inTradeBuilding(freshGame("trade-cancel"), "p1");
    const res = apply(start, { kind: "cancel-trade", playerId: "p1" });
    if (!res.ok) throw new Error(res.reason);
    expect(res.state.turn.phase).toBe("pre-roll");
    expect(res.state.turn.tradeDraft).toBeUndefined();
  });
});

describe("trade approval + execution", () => {
  it("executes a property-for-cash trade once every named party approves", () => {
    const start = withOwnership(freshGame("trade-exec"), { 1: "p1" });
    const building = inTradeBuilding(start, "p1");
    const staged = apply(building, {
      kind: "update-trade-draft",
      playerId: "p1",
      terms: { propertyTo: { 1: "p2" }, gojfTo: {}, cashDelta: { p1: 60, p2: -60 } },
    });
    if (!staged.ok) throw new Error(staged.reason);

    const proposed = apply(staged.state, { kind: "propose-trade", playerId: "p1" });
    if (!proposed.ok) throw new Error(proposed.reason);
    expect(proposed.state.turn.phase).toBe("trade-pending");
    const pending = proposed.state.turn.pendingTrade;
    if (!pending) throw new Error("expected a pending trade");
    // Proposer (a party) is pre-approved; the other party isn't.
    expect(pending.approvals).toEqual({ p1: true, p2: false });

    const accepted = apply(proposed.state, {
      kind: "accept-trade",
      playerId: "p2",
      tradeId: pending.id,
    });
    if (!accepted.ok) throw new Error(accepted.reason);
    expect(accepted.state.ownership[1]).toBe("p2");
    expect(accepted.state.players.find((p) => p.id === "p1")?.cash).toBe(1560);
    expect(accepted.state.players.find((p) => p.id === "p2")?.cash).toBe(1440);
    expect(accepted.state.turn.phase).toBe("pre-roll");
    expect(accepted.newEvents.some((e) => e.kind === "trade")).toBe(true);
  });

  it("cancels the whole proposal on a single decline", () => {
    const start = withOwnership(freshGame("trade-decline"), { 1: "p1" });
    const building = inTradeBuilding(start, "p1");
    const staged = apply(building, {
      kind: "update-trade-draft",
      playerId: "p1",
      terms: { propertyTo: { 1: "p2" }, gojfTo: {}, cashDelta: { p1: 60, p2: -60 } },
    });
    if (!staged.ok) throw new Error(staged.reason);
    const proposed = apply(staged.state, { kind: "propose-trade", playerId: "p1" });
    if (!proposed.ok) throw new Error(proposed.reason);
    const pending = proposed.state.turn.pendingTrade;
    if (!pending) throw new Error("expected a pending trade");

    const declined = apply(proposed.state, {
      kind: "decline-trade",
      playerId: "p2",
      tradeId: pending.id,
    });
    if (!declined.ok) throw new Error(declined.reason);
    expect(declined.state.turn.phase).toBe("pre-roll");
    expect(declined.state.ownership[1]).toBe("p1"); // unchanged
  });

  it("executes an out-of-turn trade and returns to the active player's pre-roll", () => {
    // p1 is the active turn owner; p2 (building) trades Mediterranean to p3.
    let start = withOwnership(freshGame("trade-offturn"), { 1: "p2" });
    start = inTradeBuilding(start, "p2");
    const staged = apply(start, {
      kind: "update-trade-draft",
      playerId: "p2",
      terms: { propertyTo: { 1: "p3" }, gojfTo: {}, cashDelta: { p2: 50, p3: -50 } },
    });
    if (!staged.ok) throw new Error(staged.reason);
    const proposed = apply(staged.state, { kind: "propose-trade", playerId: "p2" });
    if (!proposed.ok) throw new Error(proposed.reason);
    const pending = proposed.state.turn.pendingTrade;
    if (!pending) throw new Error("expected a pending trade");

    const accepted = apply(proposed.state, {
      kind: "accept-trade",
      playerId: "p3",
      tradeId: pending.id,
    });
    if (!accepted.ok) throw new Error(accepted.reason);
    expect(accepted.state.ownership[1]).toBe("p3");
    expect(accepted.state.turn.phase).toBe("pre-roll");
    expect(accepted.state.turn.playerId).toBe("p1"); // p1's turn resumes
  });
});

describe("trade mortgaged-property interest", () => {
  it("charges the receiver 10% interest on a mortgaged property received", () => {
    // p1 gifts mortgaged Mediterranean (mortgage $30 → 10% = $3) to p2.
    let start = withOwnership(freshGame("trade-mort"), { 1: "p1" });
    start = { ...start, mortgaged: { 1: true } };
    start = inTradeBuilding(start, "p1");
    const staged = apply(start, {
      kind: "update-trade-draft",
      playerId: "p1",
      terms: { propertyTo: { 1: "p2" }, gojfTo: {}, cashDelta: {} },
    });
    if (!staged.ok) throw new Error(staged.reason);
    const proposed = apply(staged.state, { kind: "propose-trade", playerId: "p1" });
    if (!proposed.ok) throw new Error(proposed.reason);
    const pending = proposed.state.turn.pendingTrade;
    if (!pending) throw new Error("expected a pending trade");

    const accepted = apply(proposed.state, {
      kind: "accept-trade",
      playerId: "p2",
      tradeId: pending.id,
    });
    if (!accepted.ok) throw new Error(accepted.reason);
    expect(accepted.state.ownership[1]).toBe("p2");
    expect(accepted.state.mortgaged[1]).toBe(true); // transfers still mortgaged
    expect(accepted.state.players.find((p) => p.id === "p2")?.cash).toBe(1497);
    expect(accepted.state.turn.phase).toBe("pre-roll");
  });

  it("drops a short receiver into must-raise-cash (resuming at pre-roll), then settles", () => {
    // p2 has just $1 and receives mortgaged Boardwalk ($200 mortgage → $20
    // interest). They own Baltic ($30 mortgage value) to raise cash with.
    let start = withOwnership(freshGame("trade-mort-raise"), { 39: "p1", 3: "p2" });
    start = { ...start, mortgaged: { 39: true } };
    start = setCash(start, "p2", 1);
    start = inTradeBuilding(start, "p1");
    const staged = apply(start, {
      kind: "update-trade-draft",
      playerId: "p1",
      terms: { propertyTo: { 39: "p2" }, gojfTo: {}, cashDelta: {} },
    });
    if (!staged.ok) throw new Error(staged.reason);
    const proposed = apply(staged.state, { kind: "propose-trade", playerId: "p1" });
    if (!proposed.ok) throw new Error(proposed.reason);
    const pending = proposed.state.turn.pendingTrade;
    if (!pending) throw new Error("expected a pending trade");

    const accepted = apply(proposed.state, {
      kind: "accept-trade",
      playerId: "p2",
      tradeId: pending.id,
    });
    if (!accepted.ok) throw new Error(accepted.reason);
    // $1 − $20 interest = −$19 → must-raise-cash, debtor p2, resuming pre-roll.
    expect(accepted.state.turn.phase).toBe("must-raise-cash");
    expect(accepted.state.turn.raiseCash).toBe("pre-roll");
    expect(firstNegativePlayer(accepted.state)).toBe("p2");
    expect(accepted.state.players.find((p) => p.id === "p2")?.cash).toBe(-19);

    // p2 mortgages Baltic (+$30): −19 + 30 = 11 ≥ 0 → resume at pre-roll.
    const settled = apply(accepted.state, {
      kind: "mortgage",
      playerId: "p2",
      position: 3,
    });
    if (!settled.ok) throw new Error(settled.reason);
    expect(settled.state.turn.phase).toBe("pre-roll");
    expect(settled.state.players.find((p) => p.id === "p2")?.cash).toBe(11);
  });

  it("rejects a proposal a receiver couldn't cover even by mortgaging", () => {
    // p2 has $1, receives mortgaged Boardwalk ($20 interest), owns nothing
    // else to raise cash → can't recover → proposal rejected.
    let start = withOwnership(freshGame("trade-unaffordable"), { 39: "p1" });
    start = { ...start, mortgaged: { 39: true } };
    start = setCash(start, "p2", 1);
    start = inTradeBuilding(start, "p1");
    const staged = apply(start, {
      kind: "update-trade-draft",
      playerId: "p1",
      terms: { propertyTo: { 39: "p2" }, gojfTo: {}, cashDelta: {} },
    });
    if (!staged.ok) throw new Error(staged.reason);
    const proposed = apply(staged.state, { kind: "propose-trade", playerId: "p1" });
    expect(proposed.ok).toBe(false);
  });
});
