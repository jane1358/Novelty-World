import { SPACES } from "./data";
import { hasMonopoly } from "./logic";
import type { GameState, PropertyColor } from "./types";

/** Standard US Monopoly building bank: 32 houses, 12 hotels. The remaining
 *  count is always derived from the board (`bankSupply`) — no separate counter
 *  is stored in `GameState`. */
export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;

/** Cost of one development tier (a house, or the hotel) by color group, per the
 *  official board. Every tier in a group costs the same, and the hotel is just
 *  the fifth tier — so developing a property from bare lot to hotel costs
 *  `5 * HOUSE_COST[color]`. Selling a tier back refunds half (`buildingRefundAt`). */
const HOUSE_COST: Readonly<Record<PropertyColor, number>> = {
  brown: 50,
  "light-blue": 50,
  pink: 100,
  orange: 100,
  red: 150,
  yellow: 150,
  green: 200,
  "dark-blue": 200,
};

/** Board positions of every property in each color group, in board order.
 *  Precomputed once — used to enforce the monopoly + even-build rules. */
const GROUP_POSITIONS: Readonly<Record<PropertyColor, readonly number[]>> =
  (() => {
    const groups: Record<PropertyColor, number[]> = {
      brown: [],
      "light-blue": [],
      pink: [],
      orange: [],
      red: [],
      yellow: [],
      green: [],
      "dark-blue": [],
    };
    SPACES.forEach((space, pos) => {
      if (space.kind === "property") groups[space.color].push(pos);
    });
    return groups;
  })();

/** Development level at a position: 0 bare lot, 1-4 houses, 5 hotel. */
export function developmentLevel(state: GameState, position: number): number {
  return state.houses[position] ?? 0;
}

/** Cost to add one tier (a house, or the hotel) on this property; null if the
 *  space isn't a property. */
export function houseCostAt(position: number): number | null {
  const space = SPACES[position];
  return space.kind === "property" ? HOUSE_COST[space.color] : null;
}

/** Cash refunded for selling one tier (house or hotel) back to the bank: half
 *  the tier cost, floored. Null for non-properties. */
export function buildingRefundAt(position: number): number | null {
  const cost = houseCostAt(position);
  return cost === null ? null : Math.floor(cost / 2);
}

/** The color group a position belongs to, or null if it isn't a property. */
export function colorAt(position: number): PropertyColor | null {
  const space = SPACES[position];
  return space.kind === "property" ? space.color : null;
}

/** Board positions of a color group, in board order. */
export function groupPositions(color: PropertyColor): readonly number[] {
  return GROUP_POSITIONS[color];
}

/** Houses and hotels still available in the bank, derived from the board: a
 *  level of 1-4 holds that many houses; a hotel (5) holds one hotel and zero
 *  houses (the four it replaced went back to the bank when it was built). */
export function bankSupply(state: GameState): {
  houses: number;
  hotels: number;
} {
  let housesUsed = 0;
  let hotelsUsed = 0;
  for (const level of Object.values(state.houses)) {
    if (level === 5) hotelsUsed += 1;
    else housesUsed += level;
  }
  return {
    houses: TOTAL_HOUSES - housesUsed,
    hotels: TOTAL_HOTELS - hotelsUsed,
  };
}

/** One concrete building transaction in a committed plan, mapped to engine
 *  intents at commit time. `build` and `sell` move a single tier; `liquidate`
 *  is the whole-hotel shortage escape — a hotel goes straight to a bare lot in
 *  one step, used when the bank can't supply the houses to break it down
 *  evenly. The official rule for a house shortage (see `monopoly/CLAUDE.md`). */
export type DevStep =
  | { kind: "build"; position: number; toLevel: number; cost: number }
  | { kind: "sell"; position: number; toLevel: number; refund: number }
  | { kind: "liquidate"; position: number; refund: number };

/** Per-set advisory surfaced in the develop/sell panel. Currently the only
 *  note is that a set's hotels had to be liquidated (and possibly rebuilt)
 *  because of a house shortage, so the elevated cash cost reads as explained
 *  rather than surprising. */
export interface DevelopmentNote {
  color: PropertyColor;
  kind: "shortage-liquidation";
}

/** Result of planning a staged develop/sell commit. On success, `steps` is the
 *  ordered list of single-tier transactions to submit (already sequenced so the
 *  bank never runs dry mid-commit), `netCash` is the player's net change
 *  (positive = refund, negative = spend), and `notes` flags any set forced
 *  through the shortage escape. On failure, `reason` explains why the staged
 *  target can't be reached (uneven, not a monopoly, mortgaged, or not enough
 *  buildings in the bank). Cash-on-hand is NOT checked here — the caller gates
 *  Confirm on `netCash` against the player's balance. */
export type DevelopmentPlan =
  | {
      ok: true;
      steps: readonly DevStep[];
      netCash: number;
      notes: readonly DevelopmentNote[];
    }
  | { ok: false; reason: string };

/** Mutable per-position level map for the affected color groups, threaded
 *  through the simulation. */
type Levels = Map<number, number>;

/** Plan a develop/sell commit: turn a staged target (position -> desired level)
 *  into an ordered, supply-safe list of single-tier transactions, or explain
 *  why it can't be done.
 *
 *  The hard part is the bank: hotels are the fifth tier built on four houses,
 *  and the even-build rule forces a hotel to break down *through* four houses
 *  before it can drop further — so selling a hotel can transiently *demand*
 *  houses from the bank. When the bank can't supply them, the set falls back to
 *  the whole-hotel liquidation escape (and rebuilds if the target keeps houses).
 *  Sets are processed freeing-first so houses one set returns are available to
 *  another set that needs them in the same commit. */
export function planDevelopment(
  state: GameState,
  playerId: string,
  target: Readonly<Record<number, number>>,
): DevelopmentPlan {
  // 1. Which positions actually change, and which color groups they touch.
  const changed: number[] = [];
  for (const [posStr, level] of Object.entries(target)) {
    const pos = Number(posStr);
    if (level !== developmentLevel(state, pos)) changed.push(pos);
  }
  if (changed.length === 0) {
    return { ok: true, steps: [], netCash: 0, notes: [] };
  }

  // 2. Every changed position must be a property the player owns.
  for (const pos of changed) {
    if (colorAt(pos) === null) {
      return { ok: false, reason: "only properties can be developed" };
    }
    if (state.ownership[pos] !== playerId) {
      return { ok: false, reason: "you don't own that property" };
    }
    const level = target[pos];
    if (level < 0 || level > 5 || !Number.isInteger(level)) {
      return { ok: false, reason: "invalid development level" };
    }
  }

  const affectedColors = new Set<PropertyColor>();
  for (const pos of changed) {
    // colorAt is non-null here (checked above).
    affectedColors.add(colorAt(pos)!);
  }

  // 3. Build the working level map: every position of every affected group,
  //    at its current level, plus the per-position target.
  const levels: Levels = new Map();
  const targets: Levels = new Map();
  for (const color of affectedColors) {
    for (const pos of groupPositions(color)) {
      levels.set(pos, developmentLevel(state, pos));
      targets.set(pos, target[pos] ?? developmentLevel(state, pos));
    }
  }

  // 4. Per-group legality: building requires a full, unmortgaged monopoly; the
  //    final config of every affected group must be even (within one tier).
  for (const color of affectedColors) {
    const positions = groupPositions(color);
    const building = positions.some(
      (pos) => targets.get(pos)! > levels.get(pos)!,
    );
    if (building) {
      if (!hasMonopoly(state, color, playerId)) {
        return { ok: false, reason: "you must own the whole color set to build" };
      }
      if (positions.some((pos) => state.mortgaged[pos])) {
        return { ok: false, reason: "unmortgage the whole set before building" };
      }
    }
    const finalLevels = positions.map((pos) => targets.get(pos)!);
    if (Math.max(...finalLevels) - Math.min(...finalLevels) > 1) {
      return { ok: false, reason: "houses must be even across the color set" };
    }
  }

  // 5. Run the simulation, freeing-first across groups.
  const bank = bankSupply(state);
  const steps: DevStep[] = [];
  const notes: DevelopmentNote[] = [];

  for (const color of orderGroups(affectedColors, levels, targets)) {
    const result = processGroup(color, levels, targets, bank);
    if (!result.ok) return { ok: false, reason: result.reason };
    steps.push(...result.steps);
    if (result.usedEscape) notes.push({ color, kind: "shortage-liquidation" });
  }

  const netCash = steps.reduce((sum, step) => {
    return step.kind === "build" ? sum - step.cost : sum + step.refund;
  }, 0);

  return { ok: true, steps, netCash, notes };
}

/** Order affected groups so the ones that *return* buildings to the bank run
 *  before the ones that *consume* them — a group selling down frees houses a
 *  later group's build can reuse in the same commit. Pure sell-downs first,
 *  then groups that break hotels (which transiently need houses), then builds. */
function orderGroups(
  colors: ReadonlySet<PropertyColor>,
  levels: Levels,
  targets: Levels,
): PropertyColor[] {
  const rank = (color: PropertyColor): number => {
    const positions = groupPositions(color);
    const anyBuild = positions.some((p) => targets.get(p)! > levels.get(p)!);
    const anySell = positions.some((p) => targets.get(p)! < levels.get(p)!);
    const breaksHotel = positions.some(
      (p) => levels.get(p)! === 5 && targets.get(p)! < 5,
    );
    if (anySell && !anyBuild && !breaksHotel) return 0; // pure house frees
    if (breaksHotel) return 1; // hotel breakdown (may need houses)
    return 2; // builds
  };
  return [...colors].sort((a, b) => rank(a) - rank(b));
}

type GroupResult =
  | { ok: true; steps: DevStep[]; usedEscape: boolean }
  | { ok: false; reason: string };

/** Resolve one color group to its target. Tries the pure even-build path
 *  first (cheapest); if the bank can't supply the houses a hotel breakdown
 *  needs, retries with the whole-hotel liquidation escape. Mutates `levels` and
 *  `bank` to the post-group state on success. */
function processGroup(
  color: PropertyColor,
  levels: Levels,
  targets: Levels,
  bank: { houses: number; hotels: number },
): GroupResult {
  const positions = groupPositions(color);

  const pure = simulateGroup(positions, levels, targets, bank, false);
  if (pure.ok) {
    commitSim(pure, levels, bank);
    return { ok: true, steps: pure.steps, usedEscape: false };
  }

  const escape = simulateGroup(positions, levels, targets, bank, true);
  if (escape.ok) {
    commitSim(escape, levels, bank);
    return { ok: true, steps: escape.steps, usedEscape: escape.usedEscape };
  }

  return { ok: false, reason: escape.reason };
}

type SimResult =
  | {
      ok: true;
      steps: DevStep[];
      usedEscape: boolean;
      endLevels: Map<number, number>;
      endBank: { houses: number; hotels: number };
    }
  | { ok: false; reason: string };

/** Fold a successful simulation's end state back into the live `levels` map
 *  and `bank` counter. */
function commitSim(
  sim: Extract<SimResult, { ok: true }>,
  levels: Levels,
  bank: { houses: number; hotels: number },
): void {
  for (const [pos, level] of sim.endLevels) levels.set(pos, level);
  bank.houses = sim.endBank.houses;
  bank.hotels = sim.endBank.hotels;
}

/** Walk one group from its current levels to its target, one legal tier at a
 *  time, against a copy of the bank. Prefers moves that *free* buildings
 *  (selling houses, building hotels) over moves that consume them, so the bank
 *  stays as full as possible. When `allowEscape` is set and the group is stuck
 *  on a hotel breakdown the bank can't fund, it liquidates every hotel in the
 *  group to a bare lot at once (the official shortage rule) and continues.
 *  Returns the full step list + end state, or a failure reason. */
function simulateGroup(
  positions: readonly number[],
  liveLevels: Levels,
  targets: Levels,
  liveBank: { houses: number; hotels: number },
  allowEscape: boolean,
): SimResult {
  const levels = new Map<number, number>();
  for (const pos of positions) levels.set(pos, liveLevels.get(pos)!);
  const bank = { ...liveBank };
  const steps: DevStep[] = [];
  let usedEscape = false;

  const atTarget = (): boolean =>
    positions.every((pos) => levels.get(pos) === targets.get(pos));

  // Does moving `pos` to `next` keep the group within one tier of itself?
  const evenAfter = (pos: number, next: number): boolean => {
    let min = next;
    let max = next;
    for (const other of positions) {
      if (other === pos) continue;
      const lvl = levels.get(other)!;
      if (lvl < min) min = lvl;
      if (lvl > max) max = lvl;
    }
    return max - min <= 1;
  };

  // Guard against a pathological non-terminating loop: each tier change moves
  // a position one step closer to its target, bounded by 5 tiers per position.
  const maxSteps = positions.length * 6 + 2;
  let guard = 0;

  while (!atTarget()) {
    if (guard++ > maxSteps) {
      return { ok: false, reason: "could not resolve the build evenly" };
    }

    const move = pickMove(positions, levels, targets, bank, evenAfter);
    if (move) {
      applyMove(move, levels, bank, steps);
      continue;
    }

    // Stuck: the only remaining progress is a hotel breakdown the bank can't
    // fund. Escape — but only if the group hasn't already started breaking
    // down (otherwise liquidating the survivors would leave it uneven).
    const hotelsToDrop = positions.filter(
      (pos) => levels.get(pos) === 5 && targets.get(pos)! < 5,
    );
    const everyDownTargetStillHotel = positions.every(
      (pos) => targets.get(pos)! >= levels.get(pos)! || levels.get(pos) === 5,
    );
    if (allowEscape && hotelsToDrop.length > 0 && everyDownTargetStillHotel) {
      for (const pos of hotelsToDrop) {
        const refund = (buildingRefundAt(pos) ?? 0) * 5;
        steps.push({ kind: "liquidate", position: pos, refund });
        levels.set(pos, 0);
        bank.hotels += 1;
      }
      usedEscape = true;
      continue;
    }

    return { ok: false, reason: "not enough houses in the bank" };
  }

  return {
    ok: true,
    steps,
    usedEscape,
    endLevels: levels,
    endBank: bank,
  };
}

interface Move {
  position: number;
  next: number;
  /** Lower runs first: frees before consumes. */
  priority: number;
}

/** Pick the next single-tier move toward target that the bank can fund,
 *  preferring building-freeing moves. Returns null when no funded legal move
 *  remains (the caller then tries the escape). */
function pickMove(
  positions: readonly number[],
  levels: Levels,
  targets: Levels,
  bank: { houses: number; hotels: number },
  evenAfter: (pos: number, next: number) => boolean,
): Move | null {
  let best: Move | null = null;
  for (const pos of positions) {
    const level = levels.get(pos)!;
    const want = targets.get(pos)!;
    if (level === want) continue;
    const next = level + (want > level ? 1 : -1);
    if (!evenAfter(pos, next)) continue;

    let priority: number;
    let funded: boolean;
    if (next > level) {
      if (next === 5) {
        // Build a hotel: needs a hotel, returns four houses (a net freer).
        priority = 1;
        funded = bank.hotels >= 1;
      } else {
        // Build a house: consumes one (the most deferrable move).
        priority = 3;
        funded = bank.houses >= 1;
      }
    } else if (level === 5) {
      // Break a hotel down to four houses: needs four houses from the bank.
      priority = 2;
      funded = bank.houses >= 4;
    } else {
      // Sell a house: always returns one to the bank (do these first).
      priority = 0;
      funded = true;
    }
    if (!funded) continue;
    if (best === null || priority < best.priority) {
      best = { position: pos, next, priority };
    }
  }
  return best;
}

/** Apply a chosen move to the working levels + bank and append its step. */
function applyMove(
  move: Move,
  levels: Levels,
  bank: { houses: number; hotels: number },
  steps: DevStep[],
): void {
  const { position, next } = move;
  const level = levels.get(position)!;
  if (next > level) {
    const cost = houseCostAt(position) ?? 0;
    steps.push({ kind: "build", position, toLevel: next, cost });
    if (next === 5) {
      bank.hotels -= 1;
      bank.houses += 4; // the four houses it replaced go back
    } else {
      bank.houses -= 1;
    }
  } else {
    const refund = buildingRefundAt(position) ?? 0;
    steps.push({ kind: "sell", position, toLevel: next, refund });
    if (level === 5) {
      bank.hotels += 1;
      bank.houses -= 4; // four houses placed to replace the hotel
    } else {
      bank.houses += 1;
    }
  }
  levels.set(position, next);
}

/** Maximum cash a player could raise from selling every building they own back
 *  to the bank at half price, ignoring even-build ordering (the raise-cash
 *  ceiling, paired with mortgage value in `maxRaisableCash`). Each tier on a
 *  property — houses and the hotel alike — refunds half its cost. */
export function maxBuildingSaleValue(state: GameState, ownerId: string): number {
  let total = 0;
  for (const [posStr, oid] of Object.entries(state.ownership)) {
    if (oid !== ownerId) continue;
    const pos = Number(posStr);
    const level = developmentLevel(state, pos);
    if (level === 0) continue;
    const refund = buildingRefundAt(pos);
    if (refund === null) continue;
    // A hotel is five tiers (four houses + the hotel); houses are `level` tiers.
    const tiers = level === 5 ? 5 : level;
    total += refund * tiers;
  }
  return total;
}
