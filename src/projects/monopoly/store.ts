"use client";

import { create } from "zustand";
import type { PlayerProfile } from "@/shared/lib/profile";
import { botIntent } from "./bots/policy";
import { driverRole } from "./driver";
import { freshGame } from "./mocks";
import type { DevCommand, MonopolyAction, MonopolyResult } from "./protocol";
import { loadGame, submitAction, subscribeGame, type LoadedGame } from "./sync";
import type {
  ApplyResult,
  CardSource,
  GameState,
  Intent,
  PlayerColor,
  PlayerIcon,
} from "./types";

/** Staged mortgage toggles the user has clicked but not yet committed.
 *  Maps position -> target mortgaged-flag. Entries that match the current
 *  authoritative `state.mortgaged[pos]` are removed (no-op) by
 *  `toggleMortgageStage`, so a stale "no change" key never leaks through to
 *  the commit step. Per-client UI state — never synced. */
export type MortgageStaged = Readonly<Record<number, boolean>>;

// Visible pause between mechanical steps so the user can read each roll land
// in the log and watch the camera glide + token slide settle before the next
// one. Slow enough to follow; fast enough that a no-op loop isn't sluggish.
const STEP_DELAY_MS = 2000;

interface MonopolyActions {
  /** Set this client's player id (assigned during lobby join). */
  setMyPlayer: (playerId: string) => void;

  /** Lobby: seat the local profile in the connected lobby, auto-assigning
   *  the first free color + icon. No-op offline or without a connected game.
   *  Server-validated (lobby still open, not full); the authoritative seat
   *  arrives via the route response / subscription. */
  joinGame: () => void;

  /** Lobby: add a bot seat to the connected lobby. */
  addBot: () => void;

  /** Lobby: remove a seat — a leaving human or a kicked bot. */
  removePlayer: (playerId: string) => void;

  /** Lobby: change a seat's token color (rejected server-side if taken). */
  setColor: (playerId: string, color: PlayerColor) => void;

  /** Lobby: change a seat's token icon (rejected server-side if taken). */
  setIcon: (playerId: string, icon: PlayerIcon) => void;

  /** Lobby: rename a seat. */
  setName: (playerId: string, name: string) => void;

  /** Lobby: flip the connected lobby into play (≥2 players, ≥1 human). */
  startGame: () => void;

  /** Open the mortgage staging panel (voluntary entry from a paused turn).
   *  No-op if the panel is already open. Forced entries (must-raise-cash
   *  phase) show the panel implicitly — toggleMortgageStage initializes
   *  staged from null on the first click, so no explicit open is required. */
  openMortgagePanel: () => void;

  /** Toggle the staged mortgage flag for a position. Cycles between "no
   *  change" and "stage flip" — clicking once stages the opposite of the
   *  current mortgaged state, clicking again reverts to no change. Rejects
   *  positions the local player doesn't own. */
  toggleMortgageStage: (position: number) => void;

  /** Close the voluntary mortgage panel, discarding any staged changes.
   *  No-op while in the must-raise-cash phase — the player can't back out
   *  of paying a debt. */
  closeMortgagePanel: () => void;

  /** Commit staged mortgage / unmortgage changes by submitting one intent
   *  per staged flip. Mortgages run first so any cash needed for a same-
   *  batch unmortgage is in hand by the time the unmortgage submits.
   *  Engine auto-settles a must-raise-cash debt mid-batch if a mortgage
   *  brings cash up to the threshold; remaining staged ops still try to
   *  apply against the post-settle state. Clears the staged map at the end
   *  regardless of per-intent outcomes — UI re-derives from authoritative
   *  state on the next render. */
  commitMortgageStaging: () => void;

  /** Toggle "I want to trade" for the local player — arms/disarms a spot in
   *  the FIFO trade queue. Fires at the next unpaused pre-roll. */
  requestTrade: () => void;

  /** Trade-building (proposer only): cycle a property's staged owner through
   *  the players and back to no-change, submitting the updated draft. The
   *  board row IS the control, mirroring mortgage staging. */
  cycleTradeProperty: (position: number) => void;

  /** Trade-building (proposer only): cycle a held Get-Out-of-Jail card's
   *  staged holder, submitting the updated draft. */
  cycleTradeGojf: (source: CardSource) => void;

  /** Trade-building (proposer only): add `step` (may be negative) to a
   *  player's staged net cash delta, submitting the updated draft. */
  bumpTradeCash: (playerId: string, step: number) => void;

  /** Trade-building (proposer only): finalize the current draft into a
   *  proposal awaiting approval. */
  proposeTrade: () => void;

  /** Abandon the trade being built or proposed (proposer only), returning to
   *  the pre-roll boundary. */
  cancelTrade: () => void;

  /** Approve / reject the pending proposal as the local player (must be a
   *  named party). All approvals execute it; any decline cancels it. */
  acceptTrade: () => void;
  declineTrade: () => void;

  /** Submit an intent to the authoritative route; the real state arrives via
   *  the route response / subscription, so the synchronous return is an
   *  optimistic stub (callers don't read it). Needs a connected game id; the
   *  route-side engine enforces turn ownership, so the store doesn't gate on
   *  seat — a misdirected intent is simply rejected by `apply`. */
  submit: (intent: Intent) => ApplyResult;

  /** Advance mechanics by one unit without an intent — the paced loop's
   *  heartbeat. POSTs a `step` to the route. No-op without a connected game
   *  id. Driver eligibility is decided by the pacer, not here. */
  step: () => void;

  /** Submit a debug command (the `dev` hotkeys). The route applies it only
   *  for the reserved `dev` game; any other game ignores it. */
  devCommand: (command: DevCommand) => void;

  /** Replace local state with authoritative state (from the subscription or
   *  a route response) at the given version. Re-derives membership from the
   *  incoming roster — a reseated game may change who the local user is. */
  applyStateUpdate: (state: GameState, version: number) => void;

  /** Connect to a game. If the row is absent the caller seeds it — a fresh
   *  **lobby** seating themselves, or (for the reserved `dev` id) an
   *  immediate-play game. If the row exists, it loads as is — membership
   *  (whether the profile id matches a seated player) decides `myPlayerId`;
   *  non-members subscribe as read-only spectators and can `joinGame` while
   *  it's still a lobby. */
  connect: (opts: { gameId: string; profile: PlayerProfile }) => Promise<void>;

  /** Tear down any subscription and park the store with no game selected
   *  (the lobby browser's resting state). Safe to call when already parked. */
  disconnect: () => void;
}

export type MonopolyStore = {
  myPlayerId: string | null;
  /** Authoritative game state. The parked default (no game selected) is a
   *  throwaway `freshGame()` that is never shown; `connect()` replaces it from
   *  Supabase and postgres-changes keep it current. */
  state: GameState;
  /** Which game this client is in:
   *  - `null` — no game selected (the lobby browser); the pacer is idle.
   *  - `"dev"` — the backend dev sandbox (also accepts the debug hotkeys).
   *  - any other string — an online row in `monopoly_games`.
   *  Every game runs through `/api/monopoly`; there is no local-only mode. */
  gameId: string | null;
  /** Optimistic-concurrency version of the connected row — the value the
   *  next route write must match. Tracked from every authoritative update so
   *  `submit` / `step` can advance from the version this client last saw. 0
   *  when parked. */
  version: number;
  /** The local user's profile. Determines which seat (if any) this client
   *  owns — see `myPlayerId`. */
  profile: PlayerProfile | null;
  /** Last persistence/subscription error, if any. Surfaces sync failures
   *  for debugging without breaking the play loop. */
  syncError: string | null;
  /** True from the moment `connect()` is called until the first
   *  authoritative state lands (load, create, or subscription). Lets the UI
   *  show a "Connecting…" placeholder instead of briefly flashing the stale
   *  default game while the row loads. False while parked. */
  connecting: boolean;
  /** Staged mortgage toggles awaiting commit. `null` when the panel is
   *  closed (voluntary mode). Always treated as `{}` for rendering when
   *  the turn is in `must-raise-cash` so the panel is implicitly open.
   *  Cleared on disconnect. */
  mortgageStaged: MortgageStaged | null;
} & MonopolyActions;

// Module-scoped because Realtime channels aren't serializable into zustand
// state. `activeUnsub` tears down the current postgres-changes subscription;
// `activeGameId` is the in-flight connect target and lets async load handlers
// detect a newer connect that took over mid-await.
let activeUnsub: (() => void) | null = null;
let activeGameId: string | null = null;

function teardownSubscription(): void {
  if (activeUnsub) {
    activeUnsub();
    activeUnsub = null;
  }
  activeGameId = null;
}

function isMember(state: GameState, profile: PlayerProfile): boolean {
  return state.players.some((p) => p.id === profile.id);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useMonopolyStore = create<MonopolyStore>((set, get) => {
  // Fold an authoritative route response back into the store. A success
  // applies the new state + version (and re-derives membership); a conflict
  // is a no-op — the subscription will deliver the winning state — and a
  // genuine rejection surfaces as a sync error.
  function handleResult(res: MonopolyResult): void {
    if (res.ok) {
      get().applyStateUpdate(res.state, res.version);
    } else if (!res.conflict && res.reason !== undefined) {
      set({ syncError: res.reason });
    }
  }

  // POST a version-guarded op and fold the authoritative result back in.
  // `make` receives the version this client last saw so the route can reject a
  // stale write as a conflict. No-op when parked (no connected game id).
  function versionedOp(make: (fromVersion: number) => MonopolyAction): void {
    const { gameId, version } = get();
    if (!gameId) return;
    void submitAction(gameId, make(version)).then(handleResult);
  }

  // Run a batch of intents: POST to the authoritative route as one atomic,
  // single-version write and let the result arrive async. The synchronous
  // return is an unread optimistic stub.
  function runIntents(intents: readonly Intent[]): ApplyResult {
    const { state, gameId, version } = get();
    if (!gameId) return { ok: false, reason: "not connected" };
    void submitAction(gameId, {
      type: "submit",
      intents,
      fromVersion: version,
    }).then(handleResult);
    return { ok: true, state, newEvents: [] };
  }

  return {
    myPlayerId: null,
    state: freshGame(),
    gameId: null,
    version: 0,
    profile: null,
    syncError: null,
    connecting: false,
    mortgageStaged: null,

    setMyPlayer: (playerId) => { set({ myPlayerId: playerId }); },

    joinGame: () => {
      const { profile } = get();
      if (!profile) return;
      versionedOp((fromVersion) => ({ type: "join", profile, fromVersion }));
    },

    addBot: () => {
      versionedOp((fromVersion) => ({ type: "addBot", fromVersion }));
    },

    removePlayer: (playerId) => {
      versionedOp((fromVersion) => ({ type: "removePlayer", playerId, fromVersion }));
    },

    setColor: (playerId, color) => {
      versionedOp((fromVersion) => ({ type: "setColor", playerId, color, fromVersion }));
    },

    setIcon: (playerId, icon) => {
      versionedOp((fromVersion) => ({ type: "setIcon", playerId, icon, fromVersion }));
    },

    setName: (playerId, name) => {
      versionedOp((fromVersion) => ({ type: "setName", playerId, name, fromVersion }));
    },

    startGame: () => {
      versionedOp((fromVersion) => ({ type: "start", fromVersion }));
    },

    devCommand: (command) => {
      versionedOp((fromVersion) => ({ type: "dev", command, fromVersion }));
    },

    openMortgagePanel: () => {
      if (get().mortgageStaged !== null) return;
      set({ mortgageStaged: {} });
    },

    toggleMortgageStage: (position) => {
      const { state, myPlayerId, mortgageStaged } = get();
      if (!myPlayerId) return;
      if (state.ownership[position] !== myPlayerId) return;
      const current = mortgageStaged ?? {};
      const currentlyMortgaged = state.mortgaged[position] === true;
      const next: Record<number, boolean> = { ...current };
      if (position in next) {
        delete next[position];
      } else {
        next[position] = !currentlyMortgaged;
      }
      set({ mortgageStaged: next });
    },

    closeMortgagePanel: () => {
      // Forced (must-raise-cash) entry: no Cancel — the player must pay.
      if (get().state.turn.phase === "must-raise-cash") return;
      set({ mortgageStaged: null });
    },

    commitMortgageStaging: () => {
      const { mortgageStaged, myPlayerId } = get();
      const staged = mortgageStaged ?? {};
      if (!myPlayerId) {
        set({ mortgageStaged: null });
        return;
      }
      // Mortgages first, then un-mortgages, so any cash raised is in hand
      // before an un-mortgage in the same batch tries to spend it. Batched
      // into one runIntents call so online it lands as a single atomic write.
      const intents: Intent[] = [];
      for (const [posStr, target] of Object.entries(staged)) {
        if (target !== true) continue;
        intents.push({ kind: "mortgage", playerId: myPlayerId, position: Number(posStr) });
      }
      for (const [posStr, target] of Object.entries(staged)) {
        if (target !== false) continue;
        intents.push({ kind: "unmortgage", playerId: myPlayerId, position: Number(posStr) });
      }
      if (intents.length > 0) runIntents(intents);
      set({ mortgageStaged: null });
    },

    requestTrade: () => {
      const { myPlayerId } = get();
      if (!myPlayerId) return;
      runIntents([{ kind: "request-trade", playerId: myPlayerId }]);
    },

    cycleTradeProperty: (position) => {
      const { state, myPlayerId } = get();
      const draft = state.turn.tradeDraft;
      if (!myPlayerId || !draft || draft.proposerId !== myPlayerId) return;
      const base = state.ownership[position];
      if (!base) return; // only owned properties can move
      const owners = state.players.filter((p) => !p.bankrupt).map((p) => p.id);
      const current = draft.propertyTo[position] ?? base;
      const next = owners[(owners.indexOf(current) + 1) % owners.length];
      const propertyTo = { ...draft.propertyTo };
      if (next === base) delete propertyTo[position];
      else propertyTo[position] = next;
      runIntents([
        {
          kind: "update-trade-draft",
          playerId: myPlayerId,
          terms: { propertyTo, gojfTo: draft.gojfTo, cashDelta: draft.cashDelta },
        },
      ]);
    },

    cycleTradeGojf: (source) => {
      const { state, myPlayerId } = get();
      const draft = state.turn.tradeDraft;
      if (!myPlayerId || !draft || draft.proposerId !== myPlayerId) return;
      const base = state.jailFreeCards[source];
      if (!base) return; // only held cards can move
      const owners = state.players.filter((p) => !p.bankrupt).map((p) => p.id);
      const current = draft.gojfTo[source] ?? base;
      const next = owners[(owners.indexOf(current) + 1) % owners.length];
      const gojfTo = { ...draft.gojfTo };
      if (next === base) delete gojfTo[source];
      else gojfTo[source] = next;
      runIntents([
        {
          kind: "update-trade-draft",
          playerId: myPlayerId,
          terms: { propertyTo: draft.propertyTo, gojfTo, cashDelta: draft.cashDelta },
        },
      ]);
    },

    bumpTradeCash: (playerId, step) => {
      const { state, myPlayerId } = get();
      const draft = state.turn.tradeDraft;
      if (!myPlayerId || !draft || draft.proposerId !== myPlayerId) return;
      const nextAmount = (draft.cashDelta[playerId] ?? 0) + step;
      const cashDelta = { ...draft.cashDelta };
      if (nextAmount === 0) delete cashDelta[playerId];
      else cashDelta[playerId] = nextAmount;
      runIntents([
        {
          kind: "update-trade-draft",
          playerId: myPlayerId,
          terms: { propertyTo: draft.propertyTo, gojfTo: draft.gojfTo, cashDelta },
        },
      ]);
    },

    proposeTrade: () => {
      const { myPlayerId } = get();
      if (!myPlayerId) return;
      runIntents([{ kind: "propose-trade", playerId: myPlayerId }]);
    },

    cancelTrade: () => {
      const { myPlayerId } = get();
      if (!myPlayerId) return;
      runIntents([{ kind: "cancel-trade", playerId: myPlayerId }]);
    },

    acceptTrade: () => {
      const { state, myPlayerId } = get();
      const pending = state.turn.pendingTrade;
      if (!myPlayerId || !pending) return;
      runIntents([{ kind: "accept-trade", playerId: myPlayerId, tradeId: pending.id }]);
    },

    declineTrade: () => {
      const { state, myPlayerId } = get();
      const pending = state.turn.pendingTrade;
      if (!myPlayerId || !pending) return;
      runIntents([{ kind: "decline-trade", playerId: myPlayerId, tradeId: pending.id }]);
    },

    submit: (intent) => runIntents([intent]),

    step: () => {
      versionedOp((fromVersion) => ({ type: "step", fromVersion }));
    },

    applyStateUpdate: (next, version) => {
      const { profile } = get();
      const seated = profile ? isMember(next, profile) : false;
      set({
        state: next,
        version,
        myPlayerId: seated && profile ? profile.id : null,
        // First authoritative state has landed — drop the connecting gate.
        connecting: false,
      });
    },

    connect: async ({ gameId, profile }) => {
      teardownSubscription();
      activeGameId = gameId;
      set({
        gameId,
        profile,
        // Seat unknown until the row loads. Null myPlayerId means the pacer
        // can't claim "self" against the stale default state during the load
        // gap, so it stays idle until applyStateUpdate fills the seat.
        myPlayerId: null,
        syncError: null,
        // Gate the UI on a "Connecting…" placeholder until the first
        // authoritative state lands, so the stale default game never flashes.
        connecting: true,
      });

      // Subscribe before loading so an update landing in the gap isn't
      // missed. Everyone subscribes — the route is the sole writer, so a
      // member receives its own writes back here just like anyone else.
      activeUnsub = subscribeGame(gameId, (next, version) => {
        if (activeGameId !== gameId) return;
        useMonopolyStore.getState().applyStateUpdate(next, version);
      });

      let loaded: LoadedGame | null;
      try {
        loaded = await loadGame(gameId);
      } catch (err: unknown) {
        set({ syncError: errorMessage(err), connecting: false });
        return;
      }
      // A newer connect() may have superseded us mid-await.
      if (activeGameId !== gameId) return;

      // applyStateUpdate re-derives the seat and clears `connecting`, so each
      // success branch funnels through it rather than repeating that logic.
      if (loaded) {
        get().applyStateUpdate(loaded.state, loaded.version);
        return;
      }

      // First open of this game: ask the route to seed and insert it (a lobby,
      // or an immediate-play game for the `dev` id). On a create conflict
      // (someone created it first) fall back to loading the existing row.
      const res = await submitAction(gameId, { type: "create", profile });
      if (activeGameId !== gameId) return;
      if (res.ok) {
        get().applyStateUpdate(res.state, res.version);
        return;
      }
      if (res.conflict) {
        const row = await loadGame(gameId);
        if (activeGameId !== gameId || !row) return;
        get().applyStateUpdate(row.state, row.version);
        return;
      }
      set({ syncError: res.reason ?? "failed to create game", connecting: false });
    },

    disconnect: () => {
      teardownSubscription();
      set({
        gameId: null,
        version: 0,
        profile: null,
        state: freshGame(),
        myPlayerId: null,
        syncError: null,
        connecting: false,
        mortgageStaged: null,
      });
    },
  };
});

// Auto-pacing lives in the store, not the component. Each state change is
// observed once: if pacing is currently enabled, schedule the next
// mechanical step on a delay; otherwise leave the game at rest until an
// intent, connect/disconnect, or role change wakes it back up. Guarded on
// `window` so importing this module under SSR or test runners (no DOM, no
// timers wanted) is a no-op.
/** One unit of automated progress this client should make, or null to wait.
 *  Mechanical beats (`pre-roll` step, `post-roll` end-turn) run for whoever
 *  drives the active seat — "self" or "proxy". Real decisions are only ever
 *  proxied for BOT seats here (a human's own buy / raise-cash / trade-approval
 *  is left to their UI), so the loop iterates bot seats and submits the first
 *  intent their policy returns. Trade-building is human-only (no bot proposer)
 *  so it has no op. */
type PacerOp = { kind: "step" } | { kind: "intent"; intent: Intent };

function pacerOp(state: GameState, myPlayerId: string | null): PacerOp | null {
  if (state.status !== "active") return null;
  if (state.turn.paused) return null;
  const { phase, playerId } = state.turn;

  if (phase === "pre-roll") {
    return driverRole(state, myPlayerId) === "none" ? null : { kind: "step" };
  }
  if (phase === "post-roll") {
    return driverRole(state, myPlayerId) === "none"
      ? null
      : { kind: "intent", intent: { kind: "end-turn", playerId } };
  }
  if (
    phase === "buy-decision" ||
    phase === "must-raise-cash" ||
    phase === "trade-pending"
  ) {
    for (const p of state.players) {
      if (!p.isBot) continue;
      const intent = botIntent(state, p.id);
      if (intent) return { kind: "intent", intent };
    }
  }
  return null;
}

if (typeof window !== "undefined") {
  let pacingTimer: ReturnType<typeof setTimeout> | null = null;

  const tick = (): void => {
    pacingTimer = null;
    const store = useMonopolyStore.getState();
    if (!store.gameId) return;
    const op = pacerOp(store.state, store.myPlayerId);
    if (!op) return;
    if (op.kind === "step") store.step();
    else store.submit(op.intent);
  };

  const schedule = (): void => {
    if (pacingTimer !== null) return;
    const store = useMonopolyStore.getState();
    if (!store.gameId || !pacerOp(store.state, store.myPlayerId)) return;
    pacingTimer = setTimeout(tick, STEP_DELAY_MS);
  };

  const cancel = (): void => {
    if (pacingTimer === null) return;
    clearTimeout(pacingTimer);
    pacingTimer = null;
  };

  useMonopolyStore.subscribe((next, prev) => {
    if (
      next.state === prev.state &&
      next.gameId === prev.gameId &&
      next.myPlayerId === prev.myPlayerId
    ) {
      return;
    }
    // State, game id, or seat changed — drop any pending tick scheduled
    // against the old context, then re-evaluate from scratch. All feed
    // `driverRole`/`pacerEnabled`, so any of them changing can wake or sleep
    // the pacer.
    cancel();
    schedule();
  });

  schedule();
}
