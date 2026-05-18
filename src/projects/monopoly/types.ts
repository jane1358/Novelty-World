export type PropertyColor =
  | "brown"
  | "light-blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark-blue";

export type Side = "bottom" | "left" | "top" | "right";

export type Space =
  | { kind: "go" }
  | { kind: "jail" }
  | { kind: "free-parking" }
  | { kind: "go-to-jail" }
  | {
      kind: "property";
      name: string;
      price: number;
      color: PropertyColor;
      /** Rent ladder. `base` is bare-property rent; monopoly bonus is base*2 at
       *  runtime. `houses[0..3]` are rents with 1-4 houses; `hotel` is the
       *  5-development tier. */
      rent: {
        base: number;
        houses: readonly [number, number, number, number];
        hotel: number;
      };
    }
  | { kind: "railroad"; name: string; price: number }
  | { kind: "utility"; name: "Electric Company" | "Water Works"; price: number }
  | { kind: "chance" }
  | { kind: "community-chest" }
  | { kind: "tax"; name: string; amount: number };

/** Eight distinct player hues. Sized for the UI target upper bound of 8
 *  concurrent players; the palette deliberately avoids the property-color
 *  hues so a token never reads as "owns this set." */
export type PlayerColor =
  | "crimson"
  | "violet"
  | "teal"
  | "amber"
  | "emerald"
  | "indigo"
  | "magenta"
  | "slate";

export type PlayerIcon =
  | "dog"
  | "car"
  | "ship"
  | "crown"
  | "cat"
  | "plane"
  | "rocket"
  | "bird";

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  icon: PlayerIcon;
  cash: number;
  /** Board position 0-39, where 0 is GO. */
  position: number;
  /** True iff the player is locked in jail. Just-visiting players sit at
   *  position 10 with `inJail: false`; jailed players sit at the same position
   *  with `inJail: true`. */
  inJail: boolean;
  /** Which turn of the jail sentence the player is on (1–3 in standard rules).
   *  Ignored when `inJail` is false. */
  jailTurns: number;
}

export type CardSource = "chance" | "communityChest";

/** Set of assets one side of a trade is giving up. `gojf` lists the deck
 *  sources of any Get Out of Jail Free cards included. */
export interface TradePayload {
  positions: readonly number[];
  cash: number;
  gojf: readonly CardSource[];
}

/** Single recorded action in the play log. Every kind that mutates the
 *  authoritative state has a corresponding event so the log is a faithful
 *  replay of the game so far. */
export type GameEvent =
  | {
      kind: "roll";
      dice: readonly [number, number];
      /** Count of consecutive doubles INCLUDING this roll (1, 2, or 3). 0 for
       *  a non-doubles roll. Three doubles sends you to jail — that emits a
       *  separate `go-to-jail` event with reason "three-doubles". */
      doublesStreak: number;
      toPosition: number;
      passedGo: boolean;
    }
  | { kind: "buy"; position: number; price: number }
  | {
      kind: "rent";
      ownerId: string;
      position: number;
      amount: number;
    }
  | { kind: "tax"; taxName: string; amount: number }
  | {
      kind: "build";
      position: number;
      /** New development level after the build: 1-4 houses, 5 hotel. */
      toLevel: number;
      cost: number;
    }
  | {
      kind: "sell-building";
      position: number;
      /** New development level after selling: 0-4 houses, 5 means "still a
       *  hotel" (a hotel sale yields toLevel 4). */
      toLevel: number;
      refund: number;
    }
  | { kind: "mortgage"; position: number; received: number }
  | { kind: "unmortgage"; position: number; cost: number }
  | {
      kind: "trade";
      /** The other party in the trade. The active player (turn owner) is the
       *  initiator; this is whoever they traded with. */
      withId: string;
      gave: TradePayload;
      received: TradePayload;
    }
  | { kind: "go-to-jail"; reason: "tile" | "card" | "three-doubles" }
  | {
      kind: "jail-roll";
      dice: readonly [number, number];
      /** True if the roll was doubles (player leaves jail). */
      escaped: boolean;
      /** 1-indexed jail turn (1, 2, or 3). A failed third roll forces a $50
       *  payout — emitted as a separate `jail-pay` event. */
      jailTurn: number;
    }
  | { kind: "jail-pay" }
  | { kind: "jail-card"; source: CardSource }
  | {
      kind: "card-drawn";
      source: CardSource;
      /** Card flavor text exactly as printed on the card. */
      text: string;
    }
  | {
      kind: "auction";
      position: number;
      /** Null if the auction passed unsold (no one bid). */
      winnerId: string | null;
      price: number;
    }
  | {
      kind: "bankrupt";
      /** Null if the player went bankrupt to the bank (no single creditor),
       *  otherwise the creditor who receives the estate. */
      creditorId: string | null;
    }
  | { kind: "winner"; winnerId: string };

/** One full play turn, grouping every event that happened while a single
 *  player held the dice. A turn ends when the player ends it (or busts to
 *  jail on three doubles). */
export interface TurnGroup {
  /** 1-indexed turn number. Each player's turn is its own number — the count
   *  is across the whole game, not per-player. */
  turn: number;
  /** Player whose turn this is. */
  playerId: string;
  events: readonly GameEvent[];
}

/** Authoritative game state. Once the multiplayer wiring lands this will be
 *  driven by the host; for now it's a static mock for visual development. */
export interface GameState {
  players: readonly Player[];
  /** position -> player id; absent means unowned. */
  ownership: Readonly<Record<number, string>>;
  /** position -> true if the property is mortgaged. */
  mortgaged: Readonly<Record<number, boolean>>;
  /** position -> developed structures. 1-4 are houses, 5 is a hotel. */
  houses: Readonly<Record<number, number>>;
  /** Holder of each Get Out of Jail Free card, keyed by deck source. Absent
   *  means the card sits at the bottom of its deck. */
  jailFreeCards: Readonly<{ chance?: string; communityChest?: string }>;
  /** Chronological play log, grouped by turn. Newest turn last. */
  turns: readonly TurnGroup[];
}
