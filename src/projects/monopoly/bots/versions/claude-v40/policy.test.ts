import { describe, expect, it } from "vitest";
import { type Contender, simulateGame } from "../../simulate";
import { dumbBot } from "../../dumb";
import { CLAUDE_V39_PARAMS, claudeV39Bot } from "../claude-v39";
import { CLAUDE_V40_PARAMS, claudeV40Bot } from "./index";

// claude-v40 = claude-v39 substrate + Kyle's seller-side trade pricing thesis
// (bots/CLAUDE.md Refinement #3): (b) decoupled rivalThreatFactor raised to 0.6,
// (c) deployability discount on incoming cash (0.5) when the bot has no productive
// outlet. These tests pin the vector and the divergence from v39.

describe("claude-v40 vector pins the two new trade params", () => {
  it("has rivalThreatFactor decoupled from denyFactor (0.6 vs 0.317)", () => {
    expect(CLAUDE_V40_PARAMS.rivalThreatFactor).toBe(0.6);
    expect(CLAUDE_V40_PARAMS.denyFactor).toBe(CLAUDE_V39_PARAMS.denyFactor);
    expect(CLAUDE_V40_PARAMS.rivalThreatFactor).not.toBe(CLAUDE_V40_PARAMS.denyFactor);
  });

  it("has deployabilityDiscount set to 0.5", () => {
    expect(CLAUDE_V40_PARAMS.deployabilityDiscount).toBe(0.5);
  });

  it("shares the opt-v4 base vector with v39 (only 2 new params differ)", () => {
    expect(CLAUDE_V40_PARAMS.denyFactor).toBe(CLAUDE_V39_PARAMS.denyFactor);
    expect(CLAUDE_V40_PARAMS.bonusScale).toBe(CLAUDE_V39_PARAMS.bonusScale);
    expect(CLAUDE_V40_PARAMS.acceptMargin).toBe(CLAUDE_V39_PARAMS.acceptMargin);
    expect(CLAUDE_V40_PARAMS.survivalFactor).toBe(CLAUDE_V39_PARAMS.survivalFactor);
  });
});

describe("claude-v40 is deterministic", () => {
  it("plays the same game twice for a fixed seed", () => {
    const seats: Contender[] = [
      { label: "v40-0", bot: claudeV40Bot },
      { label: "v40-1", bot: claudeV40Bot },
      { label: "dumb", bot: dumbBot },
      { label: "v40-3", bot: claudeV40Bot },
    ];
    const seed = "v40-det-1";
    const a = simulateGame({ seed, seats, maxTurns: 2000, includeLog: true });
    const b = simulateGame({ seed, seats, maxTurns: 2000, includeLog: true });
    expect(b.turns).toBe(a.turns);
    expect(b.steps).toBe(a.steps);
    expect(b.eventCounts).toEqual(a.eventCounts);
  });
});

describe("claude-v40 does not deadlock trades (rivalThreatFactor < 1.0)", () => {
  it("completes games within the turn cap in a mixed seat", () => {
    const seats: Contender[] = [
      { label: "v40-0", bot: claudeV40Bot },
      { label: "dumb", bot: dumbBot },
      { label: "v40-2", bot: claudeV40Bot },
      { label: "v40-3", bot: claudeV40Bot },
    ];
    const result = simulateGame({ seed: "v40-nodeadlock-1", seats, maxTurns: 2000 });
    expect(result.turns).toBeLessThan(2000);
  });
});
