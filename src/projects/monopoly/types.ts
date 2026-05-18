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
}
