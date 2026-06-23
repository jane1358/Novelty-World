import { describe, expect, it } from "vitest";
import { type Contender, simulateGame } from "../../simulate";
import { dumbBot } from "../../dumb";
import { CLAUDE_V40_PARAMS, claudeV40Bot } from "../claude-v40";
import { CLAUDE_V41_PARAMS, claudeV41Bot } from "./index";

// claude-v41 = claude-v40 with rivalThreatFactor lowered from 0.6 to 0.4.
// v40 at 0.6 crushed denial-heavy bots but regressed vs jane-v2 (47.4%) and
// claude-v36 (47.9%). v41 aims for a middle ground.

describe("claude-v41 vector pins the adjusted trade params", () => {
  it("has rivalThreatFactor at 0.4 (lowered from v40's 0.6)", () => {
    expect(CLAUDE_V41_PARAMS.rivalThreatFactor).toBe(0.4);
    expect(CLAUDE_V41_PARAMS.rivalThreatFactor).toBeLessThan(CLAUDE_V40_PARAMS.rivalThreatFactor);
  });

  it("keeps deployabilityDiscount at 0.5 (same as v40)", () => {
    expect(CLAUDE_V41_PARAMS.deployabilityDiscount).toBe(0.5);
    expect(CLAUDE_V41_PARAMS.deployabilityDiscount).toBe(CLAUDE_V40_PARAMS.deployabilityDiscount);
  });

  it("shares the opt-v4 base vector with v40", () => {
    expect(CLAUDE_V41_PARAMS.denyFactor).toBe(CLAUDE_V40_PARAMS.denyFactor);
    expect(CLAUDE_V41_PARAMS.bonusScale).toBe(CLAUDE_V40_PARAMS.bonusScale);
    expect(CLAUDE_V41_PARAMS.acceptMargin).toBe(CLAUDE_V40_PARAMS.acceptMargin);
  });
});

describe("claude-v41 is deterministic", () => {
  it("plays the same game twice for a fixed seed", () => {
    const seats: Contender[] = [
      { label: "v41-0", bot: claudeV41Bot },
      { label: "v41-1", bot: claudeV41Bot },
      { label: "dumb", bot: dumbBot },
      { label: "v41-3", bot: claudeV41Bot },
    ];
    const seed = "v41-det-1";
    const a = simulateGame({ seed, seats, maxTurns: 2000, includeLog: true });
    const b = simulateGame({ seed, seats, maxTurns: 2000, includeLog: true });
    expect(b.turns).toBe(a.turns);
    expect(b.steps).toBe(a.steps);
    expect(b.eventCounts).toEqual(a.eventCounts);
  });
});
