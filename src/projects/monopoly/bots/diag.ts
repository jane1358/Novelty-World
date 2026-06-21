import { simulateGame, type Contender } from "./simulate";
import { versionBot } from "./versions";

// ---------------------------------------------------------------------------
// Diagnostic: play N games of v33 vs v29 and collect statistics on HOW games
// are won/lost — to find failure modes rather than guessing.
// ---------------------------------------------------------------------------

const N = 200;
const seeds: string[] = [];
for (let i = 0; i < N; i++) seeds.push(`diag:${i}`);

interface GameStats {
  winnerLabel: string | null;
  turns: number;
  terminated: boolean;
  v33Trades: number;
  v29Trades: number;
  v33Monopolies: number;
  v29Monopolies: number;
  v33MaxDev: number;
  v29MaxDev: number;
  v33FinalCash: number;
  v29FinalCash: number;
  v33Properties: number;
  v29Properties: number;
  v33Bankrupt: boolean;
  v29Bankrupt: boolean;
}

// Track which properties each player owns at end of game
function countMonopolies(ownership: Record<number, string>, pid: string): number {
  // Group by color set and check monopolies
  const colorSets: Record<string, number[]> = {
    brown: [1, 3],
    lightblue: [6, 8, 9],
    pink: [11, 13, 14],
    orange: [16, 18, 19],
    red: [21, 23, 24],
    yellow: [26, 27, 29],
    green: [31, 32, 34],
    darkblue: [37, 39],
  };
  let count = 0;
  for (const positions of Object.values(colorSets)) {
    if (positions.every((p) => ownership[p] === pid)) count++;
  }
  return count;
}

function countProperties(ownership: Record<number, string>, pid: string): number {
  return Object.values(ownership).filter((o) => o === pid).length;
}

const stats: GameStats[] = [];

for (let i = 0; i < N; i++) {
  // Alternate seating
  const v33First = i % 2 === 0;
  const labels = v33First ? ["v33", "v29", "v33", "v29"] : ["v29", "v33", "v29", "v33"];
  const seats: Contender[] = labels.map((l) => ({ label: l, bot: versionBot(l) }));

  const result = simulateGame({ seats, seed: seeds[i], maxTurns: 2000, includeLog: false });

  // Find v33 and v29 player IDs (first of each)
  const v33Pids = result.standings.filter((s) => s.label === "v33").map((s) => s.id);
  const v29Pids = result.standings.filter((s) => s.label === "v29").map((s) => s.id);
  const v33Pid = v33Pids[0];
  const v29Pid = v29Pids[0];

  // We need the final state — but simulateGame doesn't return it.
  // Use standings and event counts instead.
  const v33Standing = result.standings.find((s) => s.id === v33Pid);
  const v29Standing = result.standings.find((s) => s.id === v29Pid);

  stats.push({
    winnerLabel: result.terminated ? (result.standings.find((s) => !s.bankrupt)?.label ?? null) : null,
    turns: result.turns,
    terminated: result.terminated,
    v33Trades: 0, // from eventCounts
    v29Trades: 0,
    v33Monopolies: 0,
    v29Monopolies: 0,
    v33MaxDev: 0,
    v29MaxDev: 0,
    v33FinalCash: v33Standing?.cash ?? 0,
    v29FinalCash: v29Standing?.cash ?? 0,
    v33Properties: 0,
    v29Properties: 0,
    v33Bankrupt: v33Standing?.bankrupt ?? false,
    v29Bankrupt: v29Standing?.bankrupt ?? false,
  });
}

// Aggregate
const v33Wins = stats.filter((s) => s.winnerLabel === "v33").length;
const v29Wins = stats.filter((s) => s.winnerLabel === "v29").length;
const draws = stats.filter((s) => !s.terminated).length;
const avgTurns = stats.reduce((a, s) => a + s.turns, 0) / stats.length;

// When v33 LOSES, how far into the game?
const v33Losses = stats.filter((s) => s.winnerLabel === "v29");
const avgLossTurn = v33Losses.reduce((a, s) => a + s.turns, 0) / (v33Losses.length || 1);

// Cash differential
const v33WinsStats = stats.filter((s) => s.winnerLabel === "v33");
const v29WinsStats = stats.filter((s) => s.winnerLabel === "v29");
const avgV33CashWin = v33WinsStats.reduce((a, s) => a + s.v33FinalCash, 0) / (v33WinsStats.length || 1);
const avgV29CashWin = v29WinsStats.reduce((a, s) => a + s.v29FinalCash, 0) / (v29WinsStats.length || 1);

console.log(`\n=== DIAGNOSTIC: v33 vs v29 (${N} games) ===\n`);
console.log(`v33 wins: ${v33Wins} (${((100 * v33Wins) / N).toFixed(1)}%)`);
console.log(`v29 wins: ${v29Wins} (${((100 * v29Wins) / N).toFixed(1)}%)`);
console.log(`Draws (capped): ${draws}`);
console.log(`Avg game length: ${avgTurns.toFixed(0)} turns`);
console.log(`\nWhen v33 LOSES, avg game length: ${avgLossTurn.toFixed(0)} turns`);
console.log(`\nWinner avg cash — v33 wins: $${avgV33CashWin.toFixed(0)}, v29 wins: $${avgV29CashWin.toFixed(0)}`);

// Game length distribution
const shortGames = stats.filter((s) => s.turns < 100).length;
const medGames = stats.filter((s) => s.turns >= 100 && s.turns < 300).length;
const longGames = stats.filter((s) => s.turns >= 300).length;
console.log(`\nGame length: <100 turns: ${shortGames}, 100-300: ${medGames}, 300+: ${longGames}`);

// Do short games favor one side?
const shortV33 = stats.filter((s) => s.turns < 100 && s.winnerLabel === "v33").length;
const shortV29 = stats.filter((s) => s.turns < 100 && s.winnerLabel === "v29").length;
console.log(`Short games (<100): v33=${shortV33}, v29=${shortV29}`);

const longV33 = stats.filter((s) => s.turns >= 300 && s.winnerLabel === "v33").length;
const longV29 = stats.filter((s) => s.turns >= 300 && s.winnerLabel === "v29").length;
console.log(`Long games (300+): v33=${longV33}, v29=${longV29}`);
