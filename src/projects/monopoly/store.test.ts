import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAYER_COLORS } from "./data";
import { createLobby, joinLobby } from "./lobby";
import { freshGame } from "./mocks";
import type { MonopolyAction, MonopolyResult } from "./protocol";
import type { AuctionState, GameState, ManageStaged } from "./types";

// Capture route actions instead of hitting Supabase. Manage staging now lives in
// synced state, so every staging tap (`cycleBuild` / `toggleMortgage`) POSTs an
// `update-manage-staging` intent through `predict`, alongside the `manage` /
// `cancel-manage` commits. By default the mock resolves to a BARE conflict (a
// no-op that carries no winner), so the optimistic overlay we assert on is never
// disturbed within a synchronous test. Tests that exercise reconcile push
// specific responses onto `responses` (e.g. a conflict carrying a winning state)
// and await the async reconcile.
const submitted: { id: string; action: MonopolyAction }[] = [];
const responses: MonopolyResult[] = [];
vi.mock("./sync", () => ({
  submitAction: (id: string, action: MonopolyAction): Promise<MonopolyResult> => {
    submitted.push({ id, action });
    return Promise.resolve(responses.shift() ?? { ok: false, conflict: true });
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

// The staging the local client renders is the optimistic display head's
// `turn.manageStaged`, not a top-level store field any more.
const stagedNow = (): ManageStaged | undefined =>
  useMonopolyStore.getState().state.turn.manageStaged;

/** Seed both the playback head and the display state — `predict` folds each
 *  staging tap onto the optimistic overlay built off `headState`. */
function setup(state: GameState): void {
  submitted.length = 0;
  useMonopolyStore.setState({
    state,
    headState: state,
    version: 1,
    gameId: "dev",
    myPlayerId: "p1",
    // A connected client always has a profile; without it the pump re-derives
    // myPlayerId as null on every head advance (not a member), which silently
    // stops the pacer from driving — and would make the drive-guard test vacuous.
    profile: { id: "p1", name: "P1" },
    optimistic: null,
    outbox: [],
    lobbyOutbox: [],
    buffer: [],
  });
}

/** Stamp staging directly onto the display state, as if a peer's snapshot (or a
 *  prior local tap) had set it — used to set up commit / cancel cases. */
function stage(staged: ManageStaged): void {
  useMonopolyStore.setState((s) => ({
    state: { ...s.state, turn: { ...s.state.turn, manageStaged: staged } },
  }));
}

beforeEach(() => {
  submitted.length = 0;
  responses.length = 0;
});

describe("cycleBuild", () => {
  it("cycles a buildable property 0 → 1 → … → 5 → 0", () => {
    setup(managingState());
    const { cycleBuild } = useMonopolyStore.getState();
    const levelOf = (pos: number): number => stagedNow()?.build[pos] ?? 0;

    for (const expected of [1, 2, 3, 4, 5]) {
      cycleBuild(16);
      expect(levelOf(16)).toBe(expected);
    }
    // 5 → 0 wraps back to the live level, which prunes the entry.
    cycleBuild(16);
    expect(stagedNow()?.build[16]).toBeUndefined();
  });

  it("prunes the entry when it lands back on the committed level", () => {
    setup(managingState({ houses: { 16: 2, 18: 2, 19: 2 } }));
    const { cycleBuild } = useMonopolyStore.getState();
    // Live level is 2; one cycle goes to 3, staged.
    cycleBuild(16);
    expect(stagedNow()?.build[16]).toBe(3);
    // 3 → 4 → 5 → 0 → 1 → 2: five more cycles return to live 2, which prunes.
    for (let i = 0; i < 5; i++) cycleBuild(16);
    expect(stagedNow()?.build[16]).toBeUndefined();
  });

  it("rejects building without the full monopoly", () => {
    setup(managingState({ ownership: { 16: "p1", 18: "p1" } })); // missing 19
    useMonopolyStore.getState().cycleBuild(16);
    expect(stagedNow()?.build[16]).toBeUndefined();
  });

  it("rejects a property the actor doesn't own", () => {
    setup(managingState({ ownership: { 16: "p2", 18: "p1", 19: "p1" } }));
    useMonopolyStore.getState().cycleBuild(16);
    expect(stagedNow()?.build[16]).toBeUndefined();
  });

  it("does nothing when the local player isn't the manage actor", () => {
    setup(managingState());
    useMonopolyStore.setState({ myPlayerId: "p2" });
    useMonopolyStore.getState().cycleBuild(16);
    expect(stagedNow()?.build[16]).toBeUndefined();
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
    const levelOf = (): number => stagedNow()?.build[16] ?? 2;
    // From live 2: decrements down toward 0, never up to 3.
    cycleBuild(16);
    expect(levelOf()).toBe(1);
    cycleBuild(16);
    expect(levelOf()).toBe(0);
    // 0 wraps back to live (2), pruning the entry.
    cycleBuild(16);
    expect(stagedNow()?.build[16]).toBeUndefined();
  });
});

describe("toggleMortgage", () => {
  it("stages a mortgage on an owned bare lot and reverts on a second tap", () => {
    setup(managingState());
    const { toggleMortgage } = useMonopolyStore.getState();
    toggleMortgage(1);
    expect(stagedNow()?.mortgage[1]).toBe(true);
    toggleMortgage(1);
    expect(stagedNow()?.mortgage[1]).toBeUndefined();
  });

  it("stages an unmortgage on an already-mortgaged property", () => {
    setup(managingState({ mortgaged: { 1: true } }));
    useMonopolyStore.getState().toggleMortgage(1);
    expect(stagedNow()?.mortgage[1]).toBe(false);
  });

  it("refuses to mortgage a property that still has buildings", () => {
    setup(managingState({ houses: { 16: 2, 18: 2, 19: 2 } }));
    useMonopolyStore.getState().toggleMortgage(16);
    expect(stagedNow()?.mortgage[16]).toBeUndefined();
  });

  it("allows mortgaging once buildings are staged down to 0", () => {
    setup(managingState({ houses: { 16: 1, 18: 1, 19: 1 } }));
    const { cycleBuild, toggleMortgage } = useMonopolyStore.getState();
    // Voluntary cycle goes up and wraps: from live 1, five cycles reach 0
    // (1→2→3→4→5→0).
    for (let i = 0; i < 5; i++) cycleBuild(16);
    expect(stagedNow()?.build[16]).toBe(0);
    // The toggle gate checks only this lot's staged level — now 0 — so
    // mortgaging it is offered (even-build legality is the engine's concern).
    toggleMortgage(16);
    expect(stagedNow()?.mortgage[16]).toBe(true);
  });
});

describe("commitManage", () => {
  it("submits only the entries that differ from the live state", () => {
    setup(managingState({ houses: { 16: 1, 18: 1, 19: 1 }, mortgaged: { 1: true } }));
    // Stage an even build-up to 2, unmortgage 1 (true → false), and a no-op flip
    // on 3 (already unmortgaged) that must be pruned.
    stage({
      build: { 16: 2, 18: 2, 19: 2 },
      mortgage: { 1: false, 3: false },
    });
    useMonopolyStore.getState().commitManage();
    expect(submitted).toHaveLength(1);
    const action = submitted[0].action;
    expect(action.type).toBe("submit");
    if (action.type !== "submit") throw new Error("expected submit");
    const intent = action.intents[0];
    if (intent.kind !== "manage") throw new Error("expected manage intent");
    expect(intent.build).toEqual({ 16: 2, 18: 2, 19: 2 });
    expect(intent.mortgage).toEqual({ 1: false });
    // The successful commit's phase transition (pre-roll) drops the synced
    // staging — no separate local clear.
    expect(stagedNow()).toBeUndefined();
  });
});

describe("buyProperty", () => {
  /** A `buy-decision` for p1 (the active buyer) landing on Oriental (pos 6),
   *  owning Mediterranean (pos 1) as a building-free lot to mortgage. */
  function buyDecisionState(overrides: Partial<GameState> = {}): GameState {
    const base = freshGame("store-buy-test");
    return {
      ...base,
      players: base.players.map((p) =>
        p.id === "p1" ? { ...p, cash: 75 } : p,
      ),
      ownership: { 1: "p1", ...(overrides.ownership ?? {}) },
      turn: {
        playerId: "p1",
        phase: "buy-decision",
        doublesStreak: 0,
        pendingBuy: 6,
        manageStaged: { build: {}, mortgage: {} },
      },
      ...overrides,
    };
  }

  it("bakes the staged raise (diffed against live state) into the buy intent", () => {
    setup(buyDecisionState());
    stage({ build: {}, mortgage: { 1: true } });
    useMonopolyStore.getState().buyProperty();
    expect(submitted).toHaveLength(1);
    const action = submitted[0].action;
    if (action.type !== "submit") throw new Error("expected submit");
    const intent = action.intents[0];
    if (intent.kind !== "buy") throw new Error("expected buy intent");
    expect(intent.raise).toEqual({ build: {}, mortgage: { 1: true } });
  });

  it("omits the raise entirely when nothing is staged", () => {
    setup(buyDecisionState());
    useMonopolyStore.getState().buyProperty();
    expect(submitted).toHaveLength(1);
    const action = submitted[0].action;
    if (action.type !== "submit") throw new Error("expected submit");
    const intent = action.intents[0];
    if (intent.kind !== "buy") throw new Error("expected buy intent");
    expect(intent.raise).toBeUndefined();
  });
});

describe("cancelManage", () => {
  it("fires the cancel intent and drops the staging", () => {
    setup(managingState());
    stage({ build: { 16: 3 }, mortgage: {} });
    useMonopolyStore.getState().cancelManage();
    expect(submitted).toHaveLength(1);
    const action = submitted[0].action;
    if (action.type !== "submit") throw new Error("expected submit");
    expect(action.intents[0].kind).toBe("cancel-manage");
    // cancel-manage returns to pre-roll, which drops the synced staging.
    expect(stagedNow()).toBeUndefined();
  });
});

describe("optimistic reconcile", () => {
  // setTimeout(0) flushes the resolved-promise microtasks (the flush `.then`)
  // plus the pump's zero-dwell timers, so the async reconcile fully settles.
  const tick = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 0));

  const armed = (kind: "trade" | "manage"): boolean =>
    useMonopolyStore
      .getState()
      .state.boundaryQueue.some((e) => e.playerId === "p1" && e.kind === kind);

  function auctionHead(seed: string, highBid: number, leaderId: string): GameState {
    const base = freshGame(seed);
    const auction: AuctionState = {
      position: 1,
      active: ["p1", "p2", "p3", "p4"],
      highBid,
      leaderId,
      bids: { [leaderId]: highBid },
      resume: { kind: "landing" },
    };
    return { ...base, turn: { ...base.turn, phase: "auction", auction } };
  }

  it("keeps a Manage arm when a competing write wins the version race", async () => {
    // p1 arms Manage; before it lands, the auto-roll wins the CAS and the route
    // hands back a post-roll winner WITHOUT the arm. Dropping the prediction (the
    // old behavior) unchecked the box — the flicker. Rebase re-arms it onto the
    // new head so the checkbox stays lit, queued for the next boundary.
    const head = freshGame("rebase-arm");
    setup(head);
    const winner: GameState = {
      ...head,
      turn: { ...head.turn, phase: "post-roll" },
    };
    responses.push({ ok: false, conflict: true, state: winner, version: 2 });

    useMonopolyStore.getState().toggleQueue("manage");
    expect(armed("manage")).toBe(true); // optimistically armed at once

    await tick();
    await tick();
    expect(armed("manage")).toBe(true); // still armed after losing the race
  });

  it("keeps the arm when an armed snapshot echoes back while it's still pending", async () => {
    // The "removed every time" regression: once the row reflects the arm, the
    // overlay replays the pending intent on it. A relative toggle flipped it back
    // off; the absolute (idempotent) set-queue keeps it armed.
    const head = freshGame("echo-arm");
    setup(head);

    useMonopolyStore.getState().toggleQueue("manage");
    expect(armed("manage")).toBe(true); // optimistically armed, flush in flight

    // An authoritative snapshot that ALREADY reflects the arm lands while the
    // flush is still pending — the overlay replays the set-queue onto it.
    const armedSnap: GameState = {
      ...head,
      boundaryQueue: [{ playerId: "p1", kind: "manage" }],
    };
    useMonopolyStore.getState().applyStateUpdate(armedSnap, 2);
    expect(armed("manage")).toBe(true);

    await tick();
    await tick();
    expect(armed("manage")).toBe(true);
  });

  it("counts a bid that loses the version race, never zeroing the bar", async () => {
    // p1 bids $110 against a stale $100; by the time it lands a bot has reached
    // $200. The bid is still COUNTED on p1's bar ($110) while the high/leader
    // reflect the winner — no snap-to-zero, no auto-escalation.
    const head = auctionHead("rebase-bid", 100, "p2");
    setup(head);
    const winnerAuction: AuctionState = {
      position: 1,
      active: ["p1", "p2", "p3", "p4"],
      highBid: 200,
      leaderId: "p3",
      bids: { p2: 100, p3: 200 },
      resume: { kind: "landing" },
    };
    const winner: GameState = {
      ...head,
      turn: { ...head.turn, phase: "auction", auction: winnerAuction },
    };
    responses.push({ ok: false, conflict: true, state: winner, version: 2 });

    useMonopolyStore.getState().submit({ kind: "bid", playerId: "p1", amount: 110 });
    // Optimistically leading at $110 right away.
    expect(useMonopolyStore.getState().state.turn.auction?.bids.p1).toBe(110);

    await tick();
    await tick();
    const auction = useMonopolyStore.getState().state.turn.auction;
    expect(auction?.bids).toEqual({ p2: 100, p3: 200, p1: 110 }); // counted
    expect(auction?.highBid).toBe(200);
    expect(auction?.leaderId).toBe("p3");
  });

  // NOTE: the pacer drive-guard ("don't drive a mechanical step while a local
  // prediction is outstanding") lives in the playback pump, which is gated on
  // `typeof window !== "undefined"` and so never runs under the node test
  // environment. A store-level unit test of it is therefore vacuous (verified:
  // it passes even with the guard removed). The guard is exercised by the e2e
  // suite instead; unit-testing it here would require jsdom + fake-timer
  // orchestration of the pump, which isn't worth the flakiness for one branch.

  it("preserves a second action queued while the first is in flight", async () => {
    // Outbox bookkeeping: act twice rapidly; confirming the first batch must keep
    // the second (sliced from the front), re-flush ONLY it, and never re-send the
    // first. A broken slice would drop or duplicate an action.
    const head = freshGame("interleave");
    setup(head);
    await tick(); // settle the initial auto-roll

    // The first flush confirms with the manage arm landed on the row.
    const winner: GameState = {
      ...head,
      boundaryQueue: [{ playerId: "p1", kind: "manage" }],
    };
    responses.push({ ok: true, state: winner, version: 2 });

    useMonopolyStore.getState().toggleQueue("manage"); // A — in flight
    useMonopolyStore.getState().toggleQueue("trade"); // B — queued behind A
    submitted.length = 0;

    await tick();
    await tick();

    // A confirmed (in the head), B still pending (in the overlay).
    expect(armed("manage")).toBe(true);
    expect(armed("trade")).toBe(true);
    // The re-flush after confirming A carries ONLY B.
    const submits = submitted.filter((s) => s.action.type === "submit");
    expect(submits).toHaveLength(1);
    const action = submits[0].action;
    if (action.type !== "submit") throw new Error("expected submit");
    expect(action.intents).toEqual([
      { kind: "set-queue", playerId: "p1", queue: "trade", armed: true },
    ]);
  });
});

describe("optimistic lobby", () => {
  const tick = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 0));

  /** A lobby seating the host (color 0) plus one joined player (color 1). */
  function twoSeatLobby(): GameState {
    const base = createLobby({ id: "host", name: "Host" }, "store-lobby");
    const joined = joinLobby(base, { id: "p2", name: "Alex" });
    if (!joined.ok) throw new Error("join failed");
    return joined.state;
  }

  /** Seat the store in a connected lobby as the host. */
  function setupLobby(state: GameState): void {
    submitted.length = 0;
    useMonopolyStore.setState({
      state,
      headState: state,
      version: 1,
      gameId: "lobby-1",
      myPlayerId: "host",
      profile: { id: "host", name: "Host" },
      optimistic: null,
      outbox: [],
      lobbyOutbox: [],
      buffer: [],
    });
  }

  const hostColor = (): string =>
    useMonopolyStore.getState().state.players[0].color;

  it("paints a color pick instantly, before the route confirms", () => {
    setupLobby(twoSeatLobby());
    useMonopolyStore.getState().setColor("host", PLAYER_COLORS[2]);
    // Synchronously painted and queued — no round-trip wait.
    expect(hostColor()).toBe(PLAYER_COLORS[2]);
    expect(useMonopolyStore.getState().lobbyOutbox).toHaveLength(1);
    const action = submitted[0].action;
    expect(action.type).toBe("setColor");
  });

  it("reverts a color pick that lost the race to another seat", async () => {
    const head = twoSeatLobby();
    setupLobby(head);
    // The route hands back a winner where p2 grabbed the hue the host just picked.
    const winner: GameState = {
      ...head,
      players: head.players.map((p) =>
        p.id === "p2" ? { ...p, color: PLAYER_COLORS[2] } : p,
      ),
    };
    responses.push({ ok: false, conflict: true, state: winner, version: 2 });

    useMonopolyStore.getState().setColor("host", PLAYER_COLORS[2]);
    expect(hostColor()).toBe(PLAYER_COLORS[2]); // optimistic

    await tick();
    await tick();
    // The pick no longer applies (taken), so it's pruned: the host reverts to
    // their confirmed color and the outbox drains. The swatch greys out as taken.
    expect(hostColor()).toBe(PLAYER_COLORS[0]);
    expect(useMonopolyStore.getState().lobbyOutbox).toHaveLength(0);
  });

  it("keeps a still-valid pick when an unrelated change wins the race", async () => {
    const head = twoSeatLobby();
    setupLobby(head);
    // A racing write only renames p2 — the host's hue is still free, so the
    // rebased pick survives and re-flushes against the new version.
    const winner: GameState = {
      ...head,
      players: head.players.map((p) =>
        p.id === "p2" ? { ...p, name: "Renamed" } : p,
      ),
    };
    responses.push({ ok: false, conflict: true, state: winner, version: 2 });

    useMonopolyStore.getState().setColor("host", PLAYER_COLORS[2]);
    await tick();
    await tick();
    expect(hostColor()).toBe(PLAYER_COLORS[2]); // still applied
    expect(useMonopolyStore.getState().state.players[1].name).toBe("Renamed");
  });

  it("ignores a stale snapshot that would snap the display backwards", () => {
    // The brief-revert flash: once a predicted edit confirms and drains from the
    // outbox, a late / out-of-order Realtime echo of the PRE-edit row must not
    // snap the display back. Without the version guard it would, until the fresh
    // echo re-arrived.
    const head = twoSeatLobby();
    const redHead: GameState = {
      ...head,
      players: head.players.map((p) =>
        p.id === "host" ? { ...p, color: PLAYER_COLORS[2] } : p,
      ),
    };
    setupLobby(head); // version 1
    // The edit is confirmed at version 2 and already drained from the outbox.
    useMonopolyStore.setState({
      state: redHead,
      headState: redHead,
      version: 2,
      lobbyOutbox: [],
    });
    // A late echo of the pre-edit row (version 1) arrives out of order.
    useMonopolyStore.getState().applyStateUpdate(head, 1);
    // It's stale, so it's dropped — the display holds the confirmed edit.
    expect(hostColor()).toBe(PLAYER_COLORS[2]);
    expect(useMonopolyStore.getState().version).toBe(2);
  });

  it("drops a locally-illegal pick to the route, unpredicted", () => {
    const head = twoSeatLobby();
    setupLobby(head);
    const taken = head.players[1].color; // p2 already holds it
    useMonopolyStore.getState().setColor("host", taken);
    // No optimistic paint (it can't apply locally) and nothing queued; the route
    // arbitrates the rejected pick.
    expect(hostColor()).toBe(PLAYER_COLORS[0]);
    expect(useMonopolyStore.getState().lobbyOutbox).toHaveLength(0);
    expect(submitted).toHaveLength(1);
    expect(submitted[0].action.type).toBe("setColor");
  });
});
