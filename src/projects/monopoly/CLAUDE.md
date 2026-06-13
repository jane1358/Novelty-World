# Monopoly — Project Guide

This file is loaded into Claude's context for any work inside `src/projects/monopoly/`. Read it before touching code here.

## Philosophy: built for pros

This is Monopoly for players who know the game cold. They don't need explanations, animations, or confirmations — they need fast, dense access to the few decisions the game actually presents.

**The whole game collapses to a small set of real decisions:**
- Buy a landed-on property at face price, or send it to auction.
- During auction: when to bid, when to stop.
- Build / sell houses and hotels.
- Mortgage / unmortgage.
- Propose, accept, decline trades — what, with whom, how much.
- Jail: leave ASAP or stay (typically a stance, not a per-turn prompt).

**Everything else is mechanical and should run on its own:**
- Rolling dice, moving the token, passing GO, paying rent, paying tax, drawing and resolving Chance/Community Chest, going to jail on three doubles, busting at the end of a turn — none of this is a decision. The engine does it automatically.

**Auto-play is a spectrum, set by the player:**
- Default: pause only at real decision points.
- Opt-in pauses: a player can request a pause **before their roll** (to mortgage) or **after their roll** (to buy or send to auction).
- Threshold policies (later): "auto-buy until cash < $X", "stay in jail while late-game", etc. The engine should not preclude these; per-player preferences live in state.
- **Trades happen at a turn boundary, not mid-turn.** Any player can arm "I want to trade" (the action-bar Trade checkbox) at any time; the game pauses at the next unpaused **pre-roll** — the single point that is both "right after a turn ends" and "right before the next begins" — and opens that player's trade builder. Several armed players form a FIFO queue, each resolved in turn before the roll. See "Trades" below. (This supersedes an earlier "interrupt the active turn mid-move" idea — the boundary model is simpler and deterministic.)

**UI consequence:** no "press to roll" button by default. No "you landed on Boardwalk, pay $50 rent — click to continue." The screen updates, the event log scrolls, the turn advances. Buttons exist only for actual decisions (and for explicitly requesting a pause).

## Engine model: hybrid, state-authoritative

State is the single source of truth (one Supabase row per game). Events are folded into state as they happen; the log is derived, not authoritative.

**Two entry points to the engine — and only two:**

```ts
// External decisions only — humans, bots, future RL agent.
apply(state, intent, rng): { ok: true, state, newEvents } | { ok: false, reason }

// Mechanical transitions — runs until the next decision point or opt-in pause.
autoStep(state, rng): { state, newEvents }
```

The authoritative route applies **one unit per call**: an `apply` for an external intent (no auto-drain), or a single `autoStep` per `step` request. Clients subscribe to the row and re-render as each unit lands. See the "Multiplayer / networking" section below.

### Intents vs mechanics — the line

**Intents (external API, small surface):**
- `buy`, `decline-buy` (declining sends to auction)
- `bid`, `pass-bid` (during auction)
- `build`, `sell-building`
- `mortgage`, `unmortgage`
- `request-trade` (toggle the trade queue), `update-trade-draft` (proposer edits the live draft), `cancel-trade`, `propose-trade`, `accept-trade`, `decline-trade` (`counter-trade` is a documented TODO, not wired)
- `pay-to-leave-jail`, `use-jail-card`
- `set-armed-pause` (anyone flags their own pre-roll / post-roll pause), `resume`
- `end-turn`

**Mechanics (internal to `autoStep`, never an intent):**
- Roll dice, move token, pass-GO credit
- Pay rent, pay tax
- Draw card, apply card effects (including recursive move + tile resolution)
- Go-to-jail (tile / card / three doubles)
- Detect bankruptcy, transfer assets to creditor or bank
- Detect winner

If something feels borderline (e.g. is "leave jail by paying $50" an intent or a mechanic?) — if the player could rationally choose either way, it's an intent. If the only "choice" is the obvious one, it's a mechanic gated by player preferences.

### State shape

Extend `GameState` with a `turn` block that captures **whose turn it is, what we're waiting on, and any in-flight sub-game** (auction, trade):

```ts
interface TurnState {
  playerId: string;
  phase:
    | "pre-roll"             // can roll or take pre-roll actions
    | "post-roll"            // moved + tile resolved; can build/end
    | "buy-decision"         // landed on unowned ownable; buy or auction
    | "must-raise-cash"      // someone is in the red; settle before continuing
    | "auction"              // auction in progress (see `auction` field)
    | "jail-decision"        // active player in jail, deciding pay/card/roll
    | "trade-building"       // a queued player is assembling a proposal
    | "trade-pending"        // a proposal is awaiting approval votes
    | "game-over";
  doublesStreak: number;     // 0-3
  paused: boolean;           // active player has requested a pause point
  pendingBuy?: number;       // position of property awaiting buy decision
  raiseCash?: "after-landing" | "pre-roll";  // where to resume after must-raise-cash
  auction?: AuctionState;
  tradeDraft?: TradeDraft;   // present during trade-building
  pendingTrade?: PendingTrade;  // present during trade-pending
}

interface GameState {
  ...existing fields,
  status: "lobby" | "active" | "finished";  // lifecycle (see "Lobby")
  turn: TurnState;
  tradeQueue: readonly string[];  // FIFO of players who armed "I want to trade"
  preferences: Readonly<Record<string, PlayerPreferences>>;
  rngSeed: string;           // for deterministic replay + RL training
}
```

`autoStep` only progresses when `turn.phase` allows it and `turn.paused === false`. It exits the moment it lands on a real decision phase. At an unpaused `pre-roll` it first checks `tradeQueue` and opens a `trade-building` phase instead of rolling if anyone is queued.

### Debt — one path, may go negative (`must-raise-cash`)

Every charge a player can't cover from cash on hand resolves the same way, whether it's rent, a tax/fine (later), or the 10% mortgage interest from a trade:

- The charge is applied **immediately** — the debtor's cash can go **negative**.
- If `cash + raisable < 0` (raisable = mortgaging building-free properties; later also selling buildings at half), they can't recover → **bankruptcy** at charge time.
- Otherwise the engine parks in `must-raise-cash` and the **current debtor — whoever is below zero, in seat order (`firstNegativePlayer`), not necessarily the active player** — must mortgage back to ≥ 0. Multiple debtors (from a trade) settle one at a time. `turn.raiseCash` records where play resumes: `after-landing` (rent/tax — continue the active player's landing) or `pre-roll` (a trade — return to the boundary and re-check the queue).

This is why a trade can put an off-turn player into `must-raise-cash`: the UI (board-tap mortgage, mortgage panel) and the bot policy key the forced settler off `firstNegativePlayer`, not `turn.playerId`.

### Trades

Permissive by design: a **proposer (who need not be a party)** reassigns any **owned** (building-free) properties and held Get-Out-of-Jail-Free cards between any players, plus per-player **cash deltas that must net to zero** (money only moves between players; the bank is never a party). Shape is `TradeTerms` (`propertyTo` / `gojfTo` / `cashDelta`, storing only entries that change).

- **The draft lives in synced `GameState`** (`turn.tradeDraft`), edited via `update-trade-draft` snapshots, so **every player watches it take shape in real time** — a deliberate departure from mortgage staging, which is local-only client state. The board rows are the property surface (tap to cycle the recipient); cash steppers + card rows live in the trade panel; the log is hidden while a trade is up to make room.
- `propose-trade` validates (moves something, ≥2 named parties, cash balances, and every resulting debtor could recover) and flips to `trade-pending` with an `approvals` map over the **named** parties (the proposer auto-approves iff named). **All approve → execute; any decline cancels.**
- **Mortgaged properties transfer still-mortgaged**, and the receiver owes the bank **10% interest** on each (official rule), charged through the `must-raise-cash` path above.
- **Counters are not built** — decline and re-propose. The `TradeTerms` model + `update-trade-draft` are shaped so a counter can be added later (see the `counter-trade` TODO on `Intent`).

### RNG: always injected, never `Math.random()`

Every randomness call goes through an injected RNG. Engine functions take an `rng` argument; the host advances it. This is non-negotiable — it's what makes deterministic replay, regression tests, and future headless RL training possible.

### Bot interface

```ts
type Bot = (state: GameState, playerId: string) => Intent;
```

The bot is given the full state (Monopoly is open-information) and returns one intent. The engine handles everything else. The same shape works for the dumb early bot, the rule-based bot, and an eventual learned policy.

The baseline lives in `bots/policy.ts` as `botIntent(state, playerId): Intent | null` — pure, returning the intent bot `playerId` should submit **right now**, or `null` if it isn't this bot's move. It covers the proxy-driven decision phases: `buy-decision` (buy when affordable), `must-raise-cash` (if this bot is the current debtor — `firstNegativePlayer`, possibly off-turn — mortgage the cheapest free property), and `trade-pending` (if this bot is an un-voted named party, **accept** — a permissive v1 placeholder; `TODO` real valuation). The store's auto-pacer **iterates the bot seats** for decision phases and submits the first non-null intent (a human's own decisions are left to their UI); the universal mechanical beats (`pre-roll` → step, `post-roll` → end-turn) run for whoever drives the active seat (`driver.ts`). **Bots never *initiate* trades** — nothing queues a bot, so the proposer is always human. Swap in a smarter policy here without touching the pacer.

## Lobby

A game row carries a `GameState.status` of `lobby` | `active` | `finished`. The lifecycle:

- `createLobby(host, rngSeed)` seeds a `lobby` row seating the host alone. Other clients `joinLobby` (auto-assigned the first free color + icon), `addBot`, `removePlayer`, and tweak seats via `setPlayerColor` / `setPlayerIcon` / `setPlayerName`. `startGame` validates the roster (≥2 players, ≥1 human) and flips `status` to `active`.
- These **lobby ops live in `lobby.ts` and are pure** (same discipline as the engine: no side effects, no `Math.random`/`Date.now` — the rng seed and any ids are injected or derived from the roster). Color/icon uniqueness is enforced on every seat and edit. They are wired through the authoritative route (the `join` … `start` actions in `protocol.ts`, applied version-guarded in `route.ts`) and surfaced by the seat-room UI (`components/seat-room.tsx`).
- The auto-pacer only runs while `status === "active"`, so a lobby (or a finished game) sits at rest. The immediate-play seed (`freshGame`, used by the local `dev` sandbox and the current online seed) skips the lobby and starts `active`; the engine flips `status` to `finished` when a winner is declared.

## Multiplayer / networking

**This project does not use the shared multiplayer stack.** Do **not** import from
`src/shared/lib/webrtc/` or `src/shared/lib/multiplayer/`, and do not use
`useLobbyRoom` / `useWorldRoom`. Those are peer-to-peer WebRTC meshes built for
real-time co-presence; Monopoly is turn-based and runs on a single authoritative
server row instead. (The shared **profile** helper, `@/shared/lib/profile`, is
fine — that's just local player identity, not networking.)

**There is no local/in-process mode.** Every game — including the `dev` sandbox —
runs on the authoritative route against a Supabase row. `dev` is just a reserved
game id that additionally accepts the debug actions (see "Dev sandbox" below);
it is otherwise a normal backend game.

**How networking actually works here — server-authoritative, one row per game:**

- **State is a single Supabase row** in `monopoly_games` holding the entire
  authoritative `GameState` plus an optimistic-concurrency `version`. Events
  live inline in `state.turns` (`TurnGroup[]`); the log is derived, not a
  separate table. Revisit if rows get fat over very long games.
- **The only writer is a Next.js Route Handler** — `src/app/api/monopoly/route.ts`
  — using the service-role client (`@/shared/lib/supabase/server-admin`). RLS
  locks the table to **read-only** for clients, so the route is structurally the
  sole writer. It runs the engine itself (`apply` / `autoStep`), so the stored
  state can never be set to anything illegal. The request/response contract is
  `protocol.ts`.
- **Clients never touch the DB directly.** They POST actions through
  `sync.ts:submitAction` — `create` (seed a lobby on first open), the lobby ops
  (`join` / `addBot` / `removePlayer` / `setColor` / `setIcon` / `setName` /
  `start`), the play ops (`submit` / `step`), and the dev-only `reset` — read
  the row via `loadGame`, list joinable games via `listGames`, and subscribe to
  changes via `subscribeGame` (Supabase Realtime postgres-changes on the anon
  key). Incoming state is folded in through the store's `applyStateUpdate`.
  There is **no client-to-client channel** — every message is an HTTPS call to
  the route plus the read-only subscription. The route shares one
  version-guarded write path (`mutate`) across every lobby and play op; only
  `create` (insert-only) and `reset` (upsert) seed without a version.
- **Writes are version-guarded** (optimistic CAS: `update … where version =
  fromVersion`). A stale write is rejected as a `conflict` no-op and the client
  resyncs from the subscription. This is what makes it safe for more than one
  client to drive the same game at once: duplicate requests collapse to no-ops.
- **No server timer; the backend is delay-agnostic.** The route applies exactly
  **one unit of progress per call** — an intent `apply` (no auto-drain) or one
  `autoStep` per `step`. Pacing and animation are entirely client-side; the
  engine only advances when a client asks it to.
- **No host.** Every client POSTs actions to the route. The active player's own
  client drives its turn; **bot or disconnected-player turns are driven by any
  connected client** (the version guard dedupes the redundant writes). Whether a
  seat is a bot is read from `Player.isBot` in the state — no presence/online
  tracking. A turn belonging to a *disconnected human* simply waits until they
  return (AFK timers are out of scope).

**URL / routing** (`components/monopoly.tsx`): no `?game=` param shows the lobby
browser (`components/lobby-browser.tsx`); `?game=<id>` connects to that row —
while it's a `lobby` the seat room renders, once it's `active`/`finished` the
board does. `?game=dev` is the same path: it connects to the `dev` row (seeded
as an immediate-play game, so it lands on the board). The id is read from the
URL via `useSyncExternalStore` and changed with `history.pushState`, so browser
back/forward works. In the store, `gameId` is `null` while parked (the lobby
browser — the pacer is idle), or the row id (including `"dev"`) once connected.

**Dev sandbox.** The `dev` game accepts debug actions that no other game does:
the route only applies a `dev`-type action when `gameId === "dev"` (otherwise it
ignores it). The hotkeys (`dev.ts`) submit these like any move; the route runs
the pure transforms in `dev-ops.ts` (`restart` N-player, `own-all`,
`random-own` — randomness from `rngState`, never `Math.random`) and writes the
result, so they round-trip through the same version-guarded path + subscription.
`?game=dev`'s seed is `freshGame` (1 human + 3 bots, immediate play).

## File layout

```
src/projects/monopoly/
  CLAUDE.md            ← this file
  index.tsx            ← re-export of the root component
  types.ts             ← GameState, Intent, GameEvent, TurnState, GameStatus, PlayerCount, etc.
  protocol.ts          ← route transport contract (MonopolyAction incl. lobby + dev ops, DevCommand)
  sync.ts              ← client DB access: submitAction, loadGame, listGames, subscribeGame
  data.ts              ← static board data (SPACES, cards, PLAYER_COLORS/ICONS palette)
  theme.ts             ← color tokens, theming
  logic.ts             ← pure helpers (hasMonopoly, rentAt, isLegal*, ...)
  lobby.ts             ← pure lobby ops (createLobby, joinLobby, addBot, startGame, ...) + setup constants
  lobby.test.ts        ← unit tests for lobby ops (uniqueness, start validation)
  engine.ts            ← apply(intent), autoStep, applyXxx per-intent reducers
  engine.test.ts       ← unit tests for apply / autoStep
  logic.test.ts        ← unit tests for pure helpers
  driver.ts            ← driverRole(state, myId): self | proxy | none
  driver.test.ts       ← unit tests for driver role
  store.ts             ← Zustand store, "use client", route client + auto-pacer for the UI
  mocks.ts             ← MOCK_STATE (test fixture) + freshGame (immediate-play seed)
  dev-ops.ts           ← pure dev state transforms (own-all, random-own, restart) (+ dev-ops.test.ts)
  dev.ts               ← debug-only hotkeys that submit dev commands to the route
  bots/
    policy.ts          ← botIntent baseline policy (+ policy.test.ts)
  components/          ← React components (monopoly root, lobby-browser, seat-room, board)
```

**Engine code (`engine.ts`, `logic.ts`) must be pure and free of React, side effects, and `Math.random`.** Components consume state via the store; they do not mutate it.

## Things to keep right

- **No legacy / back-fill handling (pre-launch).** The game is still in dev, so treat all stored data as disposable: a `GameState` may be assumed to match the *current* type exactly. Do **not** write migration shims, default-filling of newly added fields, or any code that tolerates an old row shape — when a field is added, wipe the rows instead (delete from `public.monopoly_games` via the psql one-liner in the root CLAUDE.md, then refresh). **Remove this allowance once the game goes live** — at that point real rows must be migrated, not deleted.
- **No hidden state in components.** All gameplay state lives in `store` or props derived from it. Local `useState` is fine for transient UI (open menus, hover) only.
- **Don't add buttons for non-decisions.** A button for "pay rent" or "continue" is a philosophy violation. If you're tempted to add one, the engine probably needs to take that step on its own.
- **The intent surface is small on purpose.** Resist growing it. New mechanics belong inside `autoStep`.
- **Events are derived.** Don't write code that synthesizes an event without the corresponding state change — that's how state and log drift apart.
- **Debug helpers stay in `dev.ts` / `dev-ops.ts`.** Never in the component. The hotkeys (`2`/`4`/`8` restart with N players, `0`/`1` ownership overrides, `n` new game) live in `dev.ts` behind a dev guard and submit `dev` actions; the pure state transforms live in `dev-ops.ts` and are applied server-side, gated to the `dev` game id.

## Testing

- `logic.test.ts` for pure helpers (`hasMonopoly`, `rentAt`, legality checks).
- `engine.test.ts` for `apply` and `autoStep` — feed a state + intent, assert the new state and event list. Use a seeded RNG. These tests are the regression net for the rules.
- E2E tests (Playwright) live in `e2e/`, exercise the multiplayer flow end-to-end, and assume the dev server on :3001.

When fixing a rule bug, add a failing engine test first. The bug + fix should be one PR.
