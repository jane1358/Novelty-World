import { describe, expect, it } from "vitest";
import { createRng } from "./engine";

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
});

describe("apply", () => {
  it.todo("applies a buy intent and produces a buy event");
  it.todo("rejects an intent submitted by the wrong player");
});

describe("autoStep", () => {
  it.todo("rolls the dice and advances pre-roll → post-roll");
  it.todo("stops at buy-decision when landing on an unowned ownable");
  it.todo("does not advance while turn.paused is true");
});
