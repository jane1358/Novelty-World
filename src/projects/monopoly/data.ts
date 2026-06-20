import type {
  Card,
  CardSource,
  PlayerColor,
  PlayerIcon,
  PropertyColor,
  Space,
} from "./types";

/** Canonical assignment order for player seats. The lobby hands out the first
 *  free color / icon in these orders, so seat N defaults to the Nth entry —
 *  matching the pairing the mock roster uses (crimson/dog, violet/car, …).
 *  `satisfies` keeps each array in sync with its union type (a typo or a hue
 *  dropped from `PlayerColor` fails the build). */
export const PLAYER_COLORS = [
  "crimson",
  "violet",
  "teal",
  "amber",
  "emerald",
  "indigo",
  "magenta",
  "slate",
] as const satisfies readonly PlayerColor[];

export const PLAYER_ICONS = [
  "dog",
  "car",
  "ship",
  "crown",
  "cat",
  "plane",
  "rocket",
  "bird",
] as const satisfies readonly PlayerIcon[];

/** The 40 spaces of a standard US Monopoly board, in order starting from GO
 *  and proceeding clockwise (GO is the bottom-right corner). */
export const SPACES: readonly Space[] = [
  { kind: "go" },
  {
    kind: "property",
    name: "Mediterranean Avenue",
    price: 60,
    color: "brown",
    rent: { base: 2, houses: [10, 30, 90, 160], hotel: 250 },
  },
  { kind: "community-chest" },
  {
    kind: "property",
    name: "Baltic Avenue",
    price: 60,
    color: "brown",
    rent: { base: 4, houses: [20, 60, 180, 320], hotel: 450 },
  },
  { kind: "tax", name: "Income Tax", amount: 200 },
  { kind: "railroad", name: "Reading Railroad", price: 200 },
  {
    kind: "property",
    name: "Oriental Avenue",
    price: 100,
    color: "light-blue",
    rent: { base: 6, houses: [30, 90, 270, 400], hotel: 550 },
  },
  { kind: "chance" },
  {
    kind: "property",
    name: "Vermont Avenue",
    price: 100,
    color: "light-blue",
    rent: { base: 6, houses: [30, 90, 270, 400], hotel: 550 },
  },
  {
    kind: "property",
    name: "Connecticut Avenue",
    price: 120,
    color: "light-blue",
    rent: { base: 8, houses: [40, 100, 300, 450], hotel: 600 },
  },
  { kind: "jail" },
  {
    kind: "property",
    name: "St. Charles Place",
    price: 140,
    color: "pink",
    rent: { base: 10, houses: [50, 150, 450, 625], hotel: 750 },
  },
  { kind: "utility", name: "Electric Company", price: 150 },
  {
    kind: "property",
    name: "States Avenue",
    price: 140,
    color: "pink",
    rent: { base: 10, houses: [50, 150, 450, 625], hotel: 750 },
  },
  {
    kind: "property",
    name: "Virginia Avenue",
    price: 160,
    color: "pink",
    rent: { base: 12, houses: [60, 180, 500, 700], hotel: 900 },
  },
  { kind: "railroad", name: "Pennsylvania Railroad", price: 200 },
  {
    kind: "property",
    name: "St. James Place",
    price: 180,
    color: "orange",
    rent: { base: 14, houses: [70, 200, 550, 750], hotel: 950 },
  },
  { kind: "community-chest" },
  {
    kind: "property",
    name: "Tennessee Avenue",
    price: 180,
    color: "orange",
    rent: { base: 14, houses: [70, 200, 550, 750], hotel: 950 },
  },
  {
    kind: "property",
    name: "New York Avenue",
    price: 200,
    color: "orange",
    rent: { base: 16, houses: [80, 220, 600, 800], hotel: 1000 },
  },
  { kind: "free-parking" },
  {
    kind: "property",
    name: "Kentucky Avenue",
    price: 220,
    color: "red",
    rent: { base: 18, houses: [90, 250, 700, 875], hotel: 1050 },
  },
  { kind: "chance" },
  {
    kind: "property",
    name: "Indiana Avenue",
    price: 220,
    color: "red",
    rent: { base: 18, houses: [90, 250, 700, 875], hotel: 1050 },
  },
  {
    kind: "property",
    name: "Illinois Avenue",
    price: 240,
    color: "red",
    rent: { base: 20, houses: [100, 300, 750, 925], hotel: 1100 },
  },
  { kind: "railroad", name: "B. & O. Railroad", price: 200 },
  {
    kind: "property",
    name: "Atlantic Avenue",
    price: 260,
    color: "yellow",
    rent: { base: 22, houses: [110, 330, 800, 975], hotel: 1150 },
  },
  {
    kind: "property",
    name: "Ventnor Avenue",
    price: 260,
    color: "yellow",
    rent: { base: 22, houses: [110, 330, 800, 975], hotel: 1150 },
  },
  { kind: "utility", name: "Water Works", price: 150 },
  {
    kind: "property",
    name: "Marvin Gardens",
    price: 280,
    color: "yellow",
    rent: { base: 24, houses: [120, 360, 850, 1025], hotel: 1200 },
  },
  { kind: "go-to-jail" },
  {
    kind: "property",
    name: "Pacific Avenue",
    price: 300,
    color: "green",
    rent: { base: 26, houses: [130, 390, 900, 1100], hotel: 1275 },
  },
  {
    kind: "property",
    name: "North Carolina Avenue",
    price: 300,
    color: "green",
    rent: { base: 26, houses: [130, 390, 900, 1100], hotel: 1275 },
  },
  { kind: "community-chest" },
  {
    kind: "property",
    name: "Pennsylvania Avenue",
    price: 320,
    color: "green",
    rent: { base: 28, houses: [150, 450, 1000, 1200], hotel: 1400 },
  },
  { kind: "railroad", name: "Short Line", price: 200 },
  { kind: "chance" },
  {
    kind: "property",
    name: "Park Place",
    price: 350,
    color: "dark-blue",
    rent: { base: 35, houses: [175, 500, 1100, 1300], hotel: 1500 },
  },
  { kind: "tax", name: "Luxury Tax", amount: 100 },
  {
    kind: "property",
    name: "Boardwalk",
    price: 400,
    color: "dark-blue",
    rent: { base: 50, houses: [200, 600, 1400, 1700], hotel: 2000 },
  },
];

/** The 16 Chance cards (classic US standard deck). `name` is the pro shorthand
 *  the log shows; `effect` is what the engine runs. The two "advance to nearest
 *  railroad" cards are distinct entries with their own ids. */
export const CHANCE: readonly Card[] = [
  { id: "chance-go", name: "GO", effect: { kind: "advance-to", position: 0 } },
  { id: "chance-illinois", name: "Illinois", effect: { kind: "advance-to", position: 24 } },
  { id: "chance-st-charles", name: "St. Charles", effect: { kind: "advance-to", position: 11 } },
  { id: "chance-boardwalk", name: "Boardwalk", effect: { kind: "advance-to", position: 39 } },
  { id: "chance-reading", name: "Reading", effect: { kind: "advance-to", position: 5 } },
  { id: "chance-nearest-rr-a", name: "Nearest RR", effect: { kind: "advance-nearest", target: "railroad" } },
  { id: "chance-nearest-rr-b", name: "Nearest RR", effect: { kind: "advance-nearest", target: "railroad" } },
  { id: "chance-nearest-util", name: "Nearest Util", effect: { kind: "advance-nearest", target: "utility" } },
  { id: "chance-back-3", name: "Back 3", effect: { kind: "back-three" } },
  { id: "chance-jail", name: "Go to Jail", effect: { kind: "go-to-jail" } },
  { id: "chance-gojf", name: "GOJF", effect: { kind: "jail-free" } },
  { id: "chance-dividend", name: "Dividend", effect: { kind: "collect", amount: 50 } },
  { id: "chance-loan", name: "Loan", effect: { kind: "collect", amount: 150 } },
  { id: "chance-speeding", name: "Speeding", effect: { kind: "pay", amount: 15 } },
  { id: "chance-chairman", name: "Chairman", effect: { kind: "pay-each", amount: 50 } },
  { id: "chance-repairs", name: "Repairs", effect: { kind: "repairs", perHouse: 25, perHotel: 100 } },
];

/** The 16 Community Chest cards (classic US standard deck). */
export const COMMUNITY_CHEST: readonly Card[] = [
  { id: "cc-go", name: "GO", effect: { kind: "advance-to", position: 0 } },
  { id: "cc-bank-error", name: "Bank Error", effect: { kind: "collect", amount: 200 } },
  { id: "cc-doctor", name: "Doctor", effect: { kind: "pay", amount: 50 } },
  { id: "cc-stock", name: "Stock", effect: { kind: "collect", amount: 50 } },
  { id: "cc-gojf", name: "GOJF", effect: { kind: "jail-free" } },
  { id: "cc-jail", name: "Go to Jail", effect: { kind: "go-to-jail" } },
  { id: "cc-holiday", name: "Holiday Fund", effect: { kind: "collect", amount: 100 } },
  { id: "cc-tax-refund", name: "Tax Refund", effect: { kind: "collect", amount: 20 } },
  { id: "cc-birthday", name: "Birthday", effect: { kind: "collect-each", amount: 10 } },
  { id: "cc-life-insurance", name: "Life Insurance", effect: { kind: "collect", amount: 100 } },
  { id: "cc-hospital", name: "Hospital", effect: { kind: "pay", amount: 100 } },
  { id: "cc-school", name: "School", effect: { kind: "pay", amount: 50 } },
  { id: "cc-consultancy", name: "Consultancy", effect: { kind: "collect", amount: 25 } },
  { id: "cc-beauty", name: "Beauty", effect: { kind: "collect", amount: 10 } },
  { id: "cc-inheritance", name: "Inheritance", effect: { kind: "collect", amount: 100 } },
  { id: "cc-street-repairs", name: "Street Repairs", effect: { kind: "repairs", perHouse: 40, perHotel: 115 } },
];

/** The static deck for a card source, in canonical (unshuffled) order. */
export function deckFor(source: CardSource): readonly Card[] {
  return source === "chance" ? CHANCE : COMMUNITY_CHEST;
}

// ---------------------------------------------------------------------------
// Game rules & constants
//
// The tunable numbers of the ruleset, kept here as DATA rather than baked into
// the engine. Two payoffs: a bot has the complete information set in one place
// (the board above + these numbers = everything needed to value any decision),
// and a future rule variant (house rules, a short game, a different edition) is
// a variant of THIS file, not a fork of the engine. The engine, the build
// planner, and the rent/mortgage helpers all read these — nothing redefines
// them. Percentage rules are integer percents on purpose (see the mortgage note).
// ---------------------------------------------------------------------------

/** Salary paid to a player whose move passes (or lands on) GO. */
export const PASS_GO_SALARY = 200;

/** Fixed fee to buy out of jail. Charged to the bank on a voluntary
 *  `pay-to-leave-jail` and on the forced exit after a failed third jail roll. */
export const JAIL_FEE = 50;

/** The fixed step every auction bid raises the high by. A bid carries an
 *  absolute amount; this is the increment a client adds to the standing high. */
export const BID_INCREMENT = 10;

/** The building bank: a standard board ships 32 houses and 12 hotels. The
 *  remaining supply is always derived from the board (`bankSupply`), never
 *  stored in `GameState`. */
export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;

/** Cost of one development tier (a house, or the hotel) by color group. Every
 *  tier in a group costs the same, and the hotel is just the fifth tier — so
 *  developing a property from bare lot to hotel costs `5 * HOUSE_COST[color]`.
 *  Selling a tier back refunds `BUILDING_REFUND_PERCENT`% of this. */
export const HOUSE_COST: Readonly<Record<PropertyColor, number>> = {
  brown: 50,
  "light-blue": 50,
  pink: 100,
  orange: 100,
  red: 150,
  yellow: 150,
  green: 200,
  "dark-blue": 200,
};

/** Rent for a railroad by how many railroads its owner holds (1-4), indexed
 *  `[ownedCount - 1]`: $25, doubling per railroad held. */
export const RAILROAD_RENT: readonly [number, number, number, number] = [
  25, 50, 100, 200,
];

/** Utility rent as a multiplier on the dice roll: 4× when the owner holds one
 *  utility, 10× when they hold both. */
export const UTILITY_MULT_PARTIAL = 4;
export const UTILITY_MULT_FULL = 10;

/** Mortgage economics, as integer percentages of a square's printed price:
 *  a player collects `MORTGAGE_VALUE_PERCENT`% when mortgaging (floored), and
 *  pays the mortgage value back plus `UNMORTGAGE_INTEREST_PERCENT`% interest
 *  (ceiled) to lift it. A receiver who takes on a still-mortgaged property in a
 *  trade owes that interest to the bank.
 *
 *  Integer percents (computed as `value * (100 + pct) / 100`) on purpose: a
 *  float rate like `value * 1.1` drifts in IEEE 754 — `200 * 1.1` is
 *  `220.00000000000003`, which `Math.ceil` would round up to 221 — producing an
 *  off-by-one on round-number rents. */
export const MORTGAGE_VALUE_PERCENT = 50;
export const UNMORTGAGE_INTEREST_PERCENT = 10;

/** Cash refunded for selling one building tier back to the bank, as a percent
 *  of its `HOUSE_COST` (floored). */
export const BUILDING_REFUND_PERCENT = 50;
