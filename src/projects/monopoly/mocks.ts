import type { GameState, Player } from "./types";

const PLAYERS: readonly Player[] = [
  { id: "p1", name: "Kyle",   color: "crimson", icon: "dog",    cash: 1240, position: 10, inJail: true  },
  { id: "p2", name: "Alex",   color: "violet",  icon: "car",    cash: 850,  position: 10, inJail: false },
  { id: "p3", name: "Sam",    color: "teal",    icon: "ship",   cash: 1450, position: 10, inJail: true  },
  { id: "p4", name: "Jordan", color: "amber",   icon: "crown",  cash: 2890, position: 10, inJail: false },
  { id: "p5", name: "Riley",  color: "emerald", icon: "cat",    cash: 670,  position: 11, inJail: false },
  { id: "p6", name: "Casey",  color: "indigo",  icon: "plane",  cash: 1820, position: 11, inJail: false },
  { id: "p7", name: "Morgan", color: "magenta", icon: "rocket", cash: 410,  position: 11, inJail: false },
  { id: "p8", name: "Drew",   color: "slate",   icon: "bird",   cash: 3210, position: 12, inJail: false },
];

/** Hardcoded GameState for visual development. 4 players at JAIL (2 jailed,
 *  2 visiting), 3 on St. Charles Place, and 1 on the Electric Company —
 *  exercises the no-cost crowded square, the property crowded square, and
 *  a solo token on a cost-bearing utility row all in one view. */
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
    3: true,  // Baltic Avenue (property)
    9: true,  // Connecticut Avenue (property in monopoly)
    15: true, // Pennsylvania Railroad
    28: true, // Water Works (utility)
    39: true, // Boardwalk (dark blue)
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
