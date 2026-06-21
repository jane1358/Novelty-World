import { simulateGame, type Contender } from "./simulate";
import { versionBot } from "./versions";

// ---------------------------------------------------------------------------
// Diagnostic 2: Track trade dynamics + development in v33 vs v29 games
// ---------------------------------------------------------------------------

const N = 100;
const games: {
  winner: string | null;
  turns: number;
  totalTrades: number;
  totalDeclines: number;
  v33Trades: number;
  v29Trades: number;
  v33Declines: number;
  v29Declines: number;
  buildEvents: number;
  bankruptEvents: number;
}[] = [];

for (let i = 0; i < N; i++) {
  const v33First = i % 2 === 0;
  const labels = v33First ? ["v33", "v29", "v33", "v29"] : ["v29", "v33", "v29", "v33"];
  const seats: Contender[] = labels.map((l) => ({ label: l, bot: versionBot(l) }));
  const result = simulateGame({ seats, seed: `diag2:${i}`, maxTurns: 2000, includeLog: false });

  const ec = result.eventCounts;
  const winner = result.terminated ? (result.standings.find((s) => !s.bankrupt)?.label ?? null) : null;

  games.push({
    winner,
    turns: result.turns,
    totalTrades: ec["trade"] ?? 0,
    totalDeclines: ec["trade-declined"] ?? 0,
    v33Trades: 0,
    v29Trades: 0,
    v33Declines: 0,
    v29Declines: 0,
    buildEvents: ec["build"] ?? 0,
    bankruptEvents: ec["bankrupt"] ?? 0,
  });
}

const v33Wins = games.filter((g) => g.winner === "v33").length;
const v29Wins = games.filter((g) => g.winner === "v29").length;
const draws = games.filter((g) => !g.winner).length;

console.log(`\n=== TRADE/DEVELOPMENT DIAGNOSTIC (${N} games) ===\n`);
console.log(`v33: ${v33Wins} wins, v29: ${v29Wins} wins, draws: ${draws}`);
console.log(`\nAvg trades/game: ${(games.reduce((a, g) => a + g.totalTrades, 0) / N).toFixed(1)}`);
console.log(`Avg declines/game: ${(games.reduce((a, g) => a + g.totalDeclines, 0) / N).toFixed(1)}`);
console.log(`Trade success rate: ${((games.reduce((a, g) => a + g.totalTrades, 0) /
  (games.reduce((a, g) => a + g.totalTrades, 0) + games.reduce((a, g) => a + g.totalDeclines, 0) || 1)) * 100).toFixed(1)}%`);
console.log(`Avg builds/game: ${(games.reduce((a, g) => a + g.buildEvents, 0) / N).toFixed(1)}`);
console.log(`Avg bankruptcies/game: ${(games.reduce((a, g) => a + g.bankruptEvents, 0) / N).toFixed(1)}`);

// Games with NO trades — how common?
const noTrade = games.filter((g) => g.totalTrades === 0).length;
console.log(`\nGames with ZERO trades: ${noTrade}/${N} (${((100 * noTrade) / N).toFixed(0)}%)`);

// Correlation: do more trades help v33 or v29?
const manyTrades = games.filter((g) => g.totalTrades >= 3);
const fewTrades = games.filter((g) => g.totalTrades < 3);
console.log(`\nGames with 3+ trades: ${manyTrades.length} → v33 wins ${manyTrades.filter((g) => g.winner === "v33").length}, v29 wins ${manyTrades.filter((g) => g.winner === "v29").length}`);
console.log(`Games with <3 trades: ${fewTrades.length} → v33 wins ${fewTrades.filter((g) => g.winner === "v33").length}, v29 wins ${fewTrades.filter((g) => g.winner === "v29").length}`);

// Build correlation
const manyBuilds = games.filter((g) => g.buildEvents >= 10);
const fewBuilds = games.filter((g) => g.buildEvents < 10);
console.log(`\nGames with 10+ builds: ${manyBuilds.length} → v33 wins ${manyBuilds.filter((g) => g.winner === "v33").length}, v29 wins ${manyBuilds.filter((g) => g.winner === "v29").length}`);
console.log(`Games with <10 builds: ${fewBuilds.length} → v33 wins ${fewBuilds.filter((g) => g.winner === "v33").length}, v29 wins ${fewBuilds.filter((g) => g.winner === "v29").length}`);

// Turns at first bankruptcy
console.log(`\nGame length distribution:`);
for (const [lo, hi] of [[0, 50], [50, 100], [100, 150], [150, 200], [200, 999]]) {
  const bucket = games.filter((g) => g.turns >= lo && g.turns < hi);
  if (bucket.length === 0) continue;
  const v33w = bucket.filter((g) => g.winner === "v33").length;
  const v29w = bucket.filter((g) => g.winner === "v29").length;
  console.log(`  ${lo}-${hi === 999 ? "∞" : hi} turns: ${bucket.length} games → v33 ${v33w} / v29 ${v29w} (v33 winrate ${((100 * v33w) / (v33w + v29w || 1)).toFixed(0)}%)`);
}
