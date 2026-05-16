import type { GameState, Player } from "./types";

const PLAYERS: readonly Player[] = [
  { id: "p1", name: "Kyle",   color: "crimson", icon: "dog",   cash: 1240, position: 10, inJail: true  },
  { id: "p2", name: "Alex",   color: "violet",  icon: "car",   cash: 850,  position: 10, inJail: false },
  { id: "p3", name: "Sam",    color: "teal",    icon: "ship",  cash: 1450, position: 10, inJail: true  },
  { id: "p4", name: "Jordan", color: "amber",   icon: "crown", cash: 2890, position: 10, inJail: false },
];

/** Hardcoded GameState for visual development. All 4 players are at JAIL
 *  (2 actually in, 2 just visiting) so the layout demonstrates the all-on-
 *  one-square case and the jailed/visiting distinction in one row. */
export const MOCK_STATE: GameState = {
  players: PLAYERS,
  ownership: {
    // Browns — Kyle holds the monopoly (one mortgaged)
    1: "p1",
    3: "p1",
    // Light blues — Alex holds the monopoly
    6: "p2",
    8: "p2",
    9: "p2",
    // Pinks — Alex holds the monopoly (hotels on all three)
    11: "p2",
    13: "p2",
    14: "p2",
    // Oranges — Sam holds the monopoly (1, 2, 3 houses)
    16: "p3",
    18: "p3",
    19: "p3",
    // Reds — Jordan holds the monopoly (hotels on all three)
    21: "p4",
    23: "p4",
    24: "p4",
    // Yellows — Jordan has 2 of 3
    26: "p4",
    27: "p4",
    // Greens — Jordan holds the monopoly (4 houses on each)
    31: "p4",
    32: "p4",
    34: "p4",
    // Dark blues — Jordan has Boardwalk
    39: "p4",
    // Railroads
    5: "p1",
    15: "p3",
    25: "p4",
    // Utilities
    12: "p1",
    28: "p4",
  },
  mortgaged: {
    3: true, // Baltic Avenue
  },
  houses: {
    // Pinks — hotels
    11: 5, // St. Charles Place
    13: 5, // States Avenue
    14: 5, // Virginia Avenue
    // Oranges — 1, 2, 3 houses
    16: 1, // St. James Place
    18: 2, // Tennessee Avenue
    19: 3, // New York Avenue
    // Reds — hotels
    21: 5, // Kentucky Avenue
    23: 5, // Indiana Avenue
    24: 5, // Illinois Avenue
    // Greens — 4 houses on each
    31: 4, // Pacific Avenue
    32: 4, // North Carolina Avenue
    34: 4, // Pennsylvania Avenue
  },
};
