import { describe, expect, it } from "vitest";
import { hasMonopoly, mortgageValueAt, unmortgageCostAt } from "./logic";
import { MOCK_STATE } from "./mocks";

describe("hasMonopoly", () => {
  it("returns true when the player owns every property of a color", () => {
    // p2 owns Oriental (6), Vermont (8), and Connecticut (9) in MOCK_STATE.
    expect(hasMonopoly(MOCK_STATE, "light-blue", "p2")).toBe(true);
  });

  it("returns false when the player does not own the full set", () => {
    expect(hasMonopoly(MOCK_STATE, "light-blue", "p1")).toBe(false);
  });
});

describe("mortgageValueAt", () => {
  it("returns half the printed price for a property", () => {
    // Mediterranean (pos 1) costs $60 -> mortgage value $30.
    expect(mortgageValueAt(1)).toBe(30);
    // Boardwalk (pos 39) costs $400 -> mortgage value $200.
    expect(mortgageValueAt(39)).toBe(200);
  });

  it("returns half the printed price for railroads and utilities", () => {
    // Reading Railroad (pos 5) costs $200 -> $100.
    expect(mortgageValueAt(5)).toBe(100);
    // Electric Company (pos 12) costs $150 -> $75.
    expect(mortgageValueAt(12)).toBe(75);
  });

  it("returns null for non-ownable spaces", () => {
    expect(mortgageValueAt(0)).toBe(null); // GO
    expect(mortgageValueAt(4)).toBe(null); // Income Tax
    expect(mortgageValueAt(10)).toBe(null); // Jail
  });
});

describe("unmortgageCostAt", () => {
  it("returns mortgage value plus 10% interest, rounded up", () => {
    // Mediterranean mortgage $30 * 1.10 = $33.
    expect(unmortgageCostAt(1)).toBe(33);
    // Boardwalk mortgage $200 * 1.10 = $220.
    expect(unmortgageCostAt(39)).toBe(220);
    // Electric Co mortgage $75 * 1.10 = $82.5 -> $83 rounded up.
    expect(unmortgageCostAt(12)).toBe(83);
  });

  it("returns null for non-ownable spaces", () => {
    expect(unmortgageCostAt(0)).toBe(null);
    expect(unmortgageCostAt(20)).toBe(null); // Free Parking
  });
});
