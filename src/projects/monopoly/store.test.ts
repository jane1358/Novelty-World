import { beforeEach, describe, expect, it, vi } from "vitest";
import { freshGame } from "./mocks";
import type { MonopolyAction, MonopolyResult } from "./protocol";
import type { GameState } from "./types";

// Capture route actions instead of hitting Supabase. `commitManage` /
// `cancelManage` POST through `submitAction`; everything else under test only
// mutates local staging.
const submitted: { id: string; action: MonopolyAction }[] = [];
vi.mock("./sync", () => ({
  submitAction: (id: string, action: MonopolyAction): Promise<MonopolyResult> => {
    submitted.push({ id, action });
    return Promise.resolve({ ok: false, conflict: true });
  },
  loadGame: () => Promise.resolve(null),
  listGames: () => Promise.resolve([]),
  subscribeGame: () => () => {
    // no-op unsubscribe
  },
}));

const { useMonopolyStore } = await import("./store");

/** A `managing` intermission state with p1 as the off-turn manager, owning the
 *  full orange monopoly (and the browns, used for mortgage tests). */
function managingState(overrides: Partial<GameState> = {}): GameState {
  const base = freshGame("store-test");
  return {
    ...base,
    ownership: {
      16: "p1",
      18: "p1",
      19: "p1",
      1: "p1",
      3: "p1",
      ...(overrides.ownership ?? {}),
    },
    houses: overrides.houses ?? {},
    mortgaged: overrides.mortgaged ?? {},
    turn: {
      playerId: "p2",
      phase: "managing",
      doublesStreak: 0,
      managerId: "p1",
    },
    ...overrides,
  };
}

function setup(state: GameState): void {
  submitted.length = 0;
  useMonopolyStore.setState({
    state,
    version: 1,
    gameId: "dev",
    myPlayerId: "p1",
    manageStaged: null,
  });
}

beforeEach(() => {
  submitted.length = 0;
});

describe("cycleBuild", () => {
  it("cycles a buildable property 0 → 1 → … → 5 → 0", () => {
    setup(managingState());
    const { cycleBuild } = useMonopolyStore.getState();
    const levelOf = (pos: number): number =>
      useMonopolyStore.getState().manageStaged?.build[pos] ?? 0;

    for (const expected of [1, 2, 3, 4, 5]) {
      cycleBuild(16);
      expect(levelOf(16)).toBe(expected);
    }
    // 5 → 0 wraps back to the live level, which prunes the entry.
    cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged?.build[16]).toBeUndefined();
  });

  it("prunes the entry when it lands back on the committed level", () => {
    setup(managingState({ houses: { 16: 2, 18: 2, 19: 2 } }));
    const { cycleBuild } = useMonopolyStore.getState();
    // Live level is 2; one cycle goes to 3, staged.
    cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged?.build[16]).toBe(3);
    // 3 → 4 → 5 → 0 → 1 → 2: five more cycles return to live 2, which prunes.
    for (let i = 0; i < 5; i++) cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged?.build[16]).toBeUndefined();
  });

  it("rejects building without the full monopoly", () => {
    setup(managingState({ ownership: { 16: "p1", 18: "p1" } })); // missing 19
    useMonopolyStore.getState().cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged).toBeNull();
  });

  it("rejects a property the actor doesn't own", () => {
    setup(managingState({ ownership: { 16: "p2", 18: "p1", 19: "p1" } }));
    useMonopolyStore.getState().cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged).toBeNull();
  });

  it("does nothing when the local player isn't the manage actor", () => {
    setup(managingState());
    useMonopolyStore.setState({ myPlayerId: "p2" });
    useMonopolyStore.getState().cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged).toBeNull();
  });

  it("only sells down in the forced must-raise-cash branch", () => {
    const state = managingState({ houses: { 16: 2, 18: 2, 19: 2 } });
    // p1 is in the red, forced to raise cash.
    const forced: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.id === "p1" ? { ...p, cash: -50 } : p,
      ),
      turn: { playerId: "p1", phase: "must-raise-cash", doublesStreak: 0, raiseCash: "after-landing" },
    };
    setup(forced);
    const { cycleBuild } = useMonopolyStore.getState();
    const levelOf = (): number =>
      useMonopolyStore.getState().manageStaged?.build[16] ?? 2;
    // From live 2: decrements down toward 0, never up to 3.
    cycleBuild(16);
    expect(levelOf()).toBe(1);
    cycleBuild(16);
    expect(levelOf()).toBe(0);
    // 0 wraps back to live (2), pruning the entry.
    cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged?.build[16]).toBeUndefined();
  });
});

describe("toggleMortgage", () => {
  it("stages a mortgage on an owned bare lot and reverts on a second tap", () => {
    setup(managingState());
    const { toggleMortgage } = useMonopolyStore.getState();
    toggleMortgage(1);
    expect(useMonopolyStore.getState().manageStaged?.mortgage[1]).toBe(true);
    toggleMortgage(1);
    expect(useMonopolyStore.getState().manageStaged?.mortgage[1]).toBeUndefined();
  });

  it("stages an unmortgage on an already-mortgaged property", () => {
    setup(managingState({ mortgaged: { 1: true } }));
    useMonopolyStore.getState().toggleMortgage(1);
    expect(useMonopolyStore.getState().manageStaged?.mortgage[1]).toBe(false);
  });

  it("refuses to mortgage a property that still has buildings", () => {
    setup(managingState({ houses: { 16: 2, 18: 2, 19: 2 } }));
    useMonopolyStore.getState().toggleMortgage(16);
    expect(useMonopolyStore.getState().manageStaged).toBeNull();
  });

  it("allows mortgaging once buildings are staged down to 0", () => {
    setup(managingState({ houses: { 16: 1, 18: 1, 19: 1 } }));
    const { cycleBuild, toggleMortgage } = useMonopolyStore.getState();
    // Voluntary cycle goes up and wraps: from live 1, five cycles reach 0
    // (1→2→3→4→5→0).
    for (let i = 0; i < 5; i++) cycleBuild(16);
    expect(useMonopolyStore.getState().manageStaged?.build[16]).toBe(0);
    // The toggle gate checks only this lot's staged level — now 0 — so
    // mortgaging it is offered (even-build legality is the engine's concern).
    toggleMortgage(16);
    expect(useMonopolyStore.getState().manageStaged?.mortgage[16]).toBe(true);
  });
});

describe("commitManage", () => {
  it("submits only the entries that differ from the live state", () => {
    setup(managingState({ houses: { 16: 1, 18: 1, 19: 1 }, mortgaged: { 1: true } }));
    useMonopolyStore.setState({
      manageStaged: {
        // 16 staged to its live level (1) — a no-op that must be pruned.
        build: { 16: 1, 18: 2 },
        // 3 staged to its live flag (false) — pruned; 1 flips true → false.
        mortgage: { 1: false, 3: false },
      },
    });
    useMonopolyStore.getState().commitManage();
    expect(submitted).toHaveLength(1);
    const action = submitted[0].action;
    expect(action.type).toBe("submit");
    if (action.type !== "submit") throw new Error("expected submit");
    const intent = action.intents[0];
    if (intent.kind !== "manage") throw new Error("expected manage intent");
    expect(intent.build).toEqual({ 18: 2 });
    expect(intent.mortgage).toEqual({ 1: false });
    // Staging is cleared after commit.
    expect(useMonopolyStore.getState().manageStaged).toBeNull();
  });
});

describe("cancelManage", () => {
  it("clears staging and fires the cancel intent", () => {
    setup(managingState());
    useMonopolyStore.setState({ manageStaged: { build: { 16: 3 }, mortgage: {} } });
    useMonopolyStore.getState().cancelManage();
    expect(useMonopolyStore.getState().manageStaged).toBeNull();
    expect(submitted).toHaveLength(1);
    const action = submitted[0].action;
    if (action.type !== "submit") throw new Error("expected submit");
    expect(action.intents[0].kind).toBe("cancel-manage");
  });
});
