import { describe, expect, it } from "vitest";
import { apply, autoStep, createRng } from "./engine";
import { freshGame } from "./mocks";

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
  it("rolls the dice, advances pre-roll → post-roll, and bumps rngState", () => {
    const state = freshGame("test-roll");
    const { state: next, newEvents } = autoStep(state);

    expect(next.turn.phase).toBe("post-roll");
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
    const rolled = autoStep(start).state;
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
    const result = apply(state, { kind: "buy", playerId: "p1" });
    expect(result.ok).toBe(false);
  });
});
