import { simulateGame, type Contender, type SimResult } from "./simulate";
import { versionBot } from "./versions";

// Manual single-threaded gauntlet — runs the candidate against key field members.
// Avoids the worker thread module resolution issue.

const candidate: Contender = { label: "v28", bot: versionBot("v28") };
const field = ["v2", "v5", "v14", "v17", "v19", "v24"];
const numSeeds = 30;
const seeds = Array.from({ length: numSeeds }, (_, i) => `gauntlet-${i + 1}`);
const maxTurns = 2000;

console.log(`\nManual Gauntlet — v28 vs field (${numSeeds} games each, alternating seats)\n`);

interface PairResult { opp: string; wins: number; losses: number; draws: number; pct: number }
const results: PairResult[] = [];

for (const oppLabel of field) {
  const opp: Contender = { label: oppLabel, bot: versionBot(oppLabel) };
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    // 4-player game: 2 candidate + 2 opponent, alternating seats
    const seats: Contender[] = i % 2 === 0
      ? [candidate, opp, candidate, opp]
      : [opp, candidate, opp, candidate];

    const result: SimResult = simulateGame({
      seats,
      seed,
      maxTurns,
    });

    if (!result.terminated) {
      draws++;
    } else {
      // Find the winner label
      const winnerStanding = result.standings.find((s) => !s.bankrupt);
      const winnerLabel = winnerStanding?.label ?? "";
      if (winnerLabel === "v28") {
        wins++;
      } else {
        losses++;
      }
    }
  }

  const decisive = wins + losses;
  const pct = decisive > 0 ? (100 * wins) / decisive : 0;
  results.push({ opp: oppLabel, wins, losses, draws, pct });
  console.log(`  v28 vs ${oppLabel.padEnd(5)}: ${wins}W-${losses}L-${draws}D  → ${pct.toFixed(1)}%`);
}

console.log("\nSummary:");
console.log("  Opponent   W   L   D   Win%");
console.log("  " + "-".repeat(35));
for (const r of results) {
  console.log(`  ${r.opp.padEnd(10)} ${String(r.wins).padStart(2)}  ${String(r.losses).padStart(2)}  ${String(r.draws).padStart(2)}   ${r.pct.toFixed(1)}%`);
}
const totalWins = results.reduce((a, r) => a + r.wins, 0);
const totalLosses = results.reduce((a, r) => a + r.losses, 0);
const totalDraws = results.reduce((a, r) => a + r.draws, 0);
const totalDecisive = totalWins + totalLosses;
const overallPct = totalDecisive > 0 ? (100 * totalWins) / totalDecisive : 0;
console.log("  " + "-".repeat(35));
console.log(`  ${"TOTAL".padEnd(10)} ${String(totalWins).padStart(2)}  ${String(totalLosses).padStart(2)}  ${String(totalDraws).padStart(2)}   ${overallPct.toFixed(1)}%`);

// Check for regressions — any opponent where v28 < 45%
const regressions = results.filter((r) => r.pct < 45 && (r.wins + r.losses) >= 10);
if (regressions.length > 0) {
  console.log(`\n  ⚠ REGRESSION detected vs: ${regressions.map((r) => `${r.opp} (${r.pct.toFixed(1)}%)`).join(", ")}`);
} else {
  console.log(`\n  ✅ No regressions — v28 beats or holds vs every field member`);
}
console.log("");
