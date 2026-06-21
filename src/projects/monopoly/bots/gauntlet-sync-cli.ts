import process from "node:process";
import { simulateGame, type Contender } from "./simulate";
import { formatGauntlet, type GauntletProgress, runGauntlet } from "./gauntlet";
import { versionBot } from "./versions";
import type { GameResult, GameSpec } from "./parallel";

// ---------------------------------------------------------------------------
// Single-threaded gauntlet runner — same SPRT + Elo logic as sim:gauntlet but
// runs games in-process instead of worker threads. Works around the tsx
// worker-thread module resolution issue on the sandbox.
//
// Usage (same as sim:gauntlet):
//   npx tsx src/projects/monopoly/bots/gauntlet-sync-cli.ts v33 --base v29 --field v29
//   npx tsx src/projects/monopoly/bots/gauntlet-sync-cli.ts v33 --base v29 --field v29 --prefix holdout
// ---------------------------------------------------------------------------

/** A single-threaded pool that runs games synchronously. Same interface as
 *  WorkerPool (run + close + size) so runGauntlet can use it. */
class SyncPool {
  readonly size = 1;

  run(specs: readonly GameSpec[]): Promise<GameResult[]> {
    const results: GameResult[] = [];
    for (const spec of specs) {
      const seats: Contender[] = spec.labels.map((label) => ({
        label,
        bot: versionBot(label),
      }));
      const result = simulateGame({ seats, seed: spec.seed, maxTurns: spec.maxTurns });
      const winnerStanding = result.standings.find((s) => !s.bankrupt);
      const winnerLabel = result.terminated ? (winnerStanding?.label ?? null) : null;
      results.push({
        index: spec.index,
        seed: spec.seed,
        labels: spec.labels,
        winnerLabel,
        terminated: result.terminated,
        turns: result.turns,
        trades: result.eventCounts["trade"] ?? 0,
        declines: result.eventCounts["trade-declined"] ?? 0,
        bankruptcies: result.eventCounts["bankrupt"] ?? 0,
      });
    }
    return Promise.resolve(results);
  }

  async close(): Promise<void> {}
}

function makeProgressReporter(): (p: GauntletProgress) => void {
  let lastPrint = 0;
  return (p) => {
    const now = Date.now();
    if (!p.done && now - lastPrint < 3000) return;
    lastPrint = now;
    const phase = p.kind === "candidate" ? "pairing" : "field  ";
    const winPct = p.decisive > 0 ? `${((100 * p.wins) / p.decisive).toFixed(1)}%` : "—";
    const frac = p.maxDecisive > 0 ? p.decisive / p.maxDecisive : 0;
    const bar = "#".repeat(Math.round(frac * 16)).padEnd(16, "-");
    let line =
      `  ${phase} ${p.pairIndex}/${p.pairTotal} vs ${p.opponent.padEnd(11)} ` +
      `[${bar}] ${String(p.decisive).padStart(4)}/${p.maxDecisive}  win ${winPct.padStart(6)}`;
    if (p.kind === "candidate") {
      line += `  LLR impr ${p.llrImprove.toFixed(1)} regr ${p.llrRegress.toFixed(1)}`;
    }
    if (p.verdict !== undefined) line += `  -> ${p.verdict.toUpperCase()}`;
    process.stderr.write(`${line}\n`);
  };
}

function num(argv: readonly string[], i: number, fallback: number): number {
  const n = Number(argv[i]);
  return Number.isNaN(n) ? fallback : n;
}

interface Args {
  candidate: string;
  base?: string;
  field?: string[];
  prefix: string;
  margin: number;
  alpha: number;
  beta: number;
  maxDecisive: number;
  fieldGames: number;
  maxTurns: number;
}

function parseArgs(argv: readonly string[]): Args {
  const positional: string[] = [];
  const a: Args = {
    candidate: "",
    prefix: "train",
    margin: 20,
    alpha: 0.05,
    beta: 0.05,
    maxDecisive: 4000,
    fieldGames: 200,
    maxTurns: 2000,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--base") a.base = argv[++i];
    else if (arg === "--field") a.field = argv[++i].split(",").map((s) => s.trim());
    else if (arg === "--prefix") a.prefix = argv[++i];
    else if (arg === "--margin") a.margin = num(argv, ++i, a.margin);
    else if (arg === "--alpha") a.alpha = num(argv, ++i, a.alpha);
    else if (arg === "--beta") a.beta = num(argv, ++i, a.beta);
    else if (arg === "--max") a.maxDecisive = num(argv, ++i, a.maxDecisive);
    else if (arg === "--field-games") a.fieldGames = num(argv, ++i, a.fieldGames);
    else if (arg === "--turns") a.maxTurns = num(argv, ++i, a.maxTurns);
    else if (arg.startsWith("--")) throw new Error(`unknown flag "${arg}"`);
    else positional.push(arg);
  }
  if (positional.length !== 1) {
    throw new Error(`need exactly one candidate version (got ${positional.length}).`);
  }
  a.candidate = positional[0];
  return a;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const known = Object.keys(versionBot.length > 0 ? { dummy: null } : {});
  const VERSIONS_LIST = [
    "v1","v2","v3","v4","v5","v6","v7","v8","v9","v10","v11","v12","v13","v14",
    "v15","v16","v17","v18","v19","v20","v21","v22","v23","v24","v25","v26","v27",
    "v28","v29","v30","v31","v32","v33",
  ];
  void known;

  const field =
    args.field ??
    VERSIONS_LIST.filter((v) => v !== "dumb" && v !== args.candidate && v !== "v1");
  if (field.length === 0) throw new Error("empty field");
  const base = args.base ?? field[field.length - 1];
  if (!field.includes(base)) throw new Error(`base "${base}" must be one of the field`);

  console.log(
    `\nMonopoly — gauntlet (single-threaded)\n` +
      `Candidate: ${args.candidate}   Base: ${base}   Field: [${field.join(", ")}]\n` +
      `SPRT: H0=${-args.margin} Elo, H1=+${args.margin} Elo, α=${args.alpha}, β=${args.beta}, ` +
      `max ${args.maxDecisive} decisive/pairing\n` +
      `Seeds: "${args.prefix}:*"   Workers: 1 (sync)   Max turns: ${args.maxTurns}\n`,
  );

  const pool = new SyncPool();
  const start = process.hrtime.bigint();
  try {
    const report = await runGauntlet({
      candidate: args.candidate,
      base,
      field,
      prefix: args.prefix,
      margin: args.margin,
      alpha: args.alpha,
      beta: args.beta,
      maxDecisive: args.maxDecisive,
      fieldGames: args.fieldGames,
      maxTurns: args.maxTurns,
      pool: pool as unknown as import("./parallel").WorkerPool,
      onProgress: makeProgressReporter(),
    });
    const secs = Number(process.hrtime.bigint() - start) / 1e9;
    console.log(formatGauntlet(report));
    console.log(`\n  (${secs.toFixed(1)}s single-threaded)\n`);
  } finally {
    await pool.close();
  }
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
