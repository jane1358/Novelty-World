import { fitElo, type PairResult } from "./elo";
import { pairingSpecs, type WorkerPool } from "./parallel";
import { walkGauntletSprt, type GauntletSprtConfig, type GauntletVerdict } from "./sprt";

// ---------------------------------------------------------------------------
// The gauntlet — the selection half of the evolution loop (see EVOLUTION.md
// "Measurement"). A candidate doesn't just face its predecessor; it plays the
// whole FIELD (v1 … latest, floored at v1 — NEVER `dumb`, a null stub that
// measures nothing). Each candidate-vs-opponent pairing is decided by SPRT, so
// strong edges resolve in dozens of games and marginal ones play long or are
// rejected. The bar to accept a candidate as the new champion:
//
//     IMPROVES vs its base   AND   REGRESSES against none.
//
// On top of accept/reject we fit an Elo rating across the whole field, so
// "champion" means HIGHEST Elo (robust to non-transitivity), not "beat the last
// guy". Games run on the parallel pool; the math here is pure.
// ---------------------------------------------------------------------------

/** A decision-ready reading of a single pairing's SPRT outcome. `even` is a
 *  CONFIDENT tie (both one-sided tests rejected ±E); `inconclusive` ran out of
 *  games. Both mean "not an improvement and not a regression". */
export type PairVerdict = "better" | "worse" | "even" | "inconclusive";

function classify(v: GauntletVerdict): PairVerdict {
  if (v === "better" || v === "worse" || v === "even") return v;
  return "inconclusive"; // inconclusive or (defensively) need-more
}

/** One candidate-vs-opponent SPRT pairing, fully resolved. */
export interface PairingRun {
  opponent: string;
  verdict: PairVerdict;
  /** Candidate wins / losses AT the SPRT stop point (the sample the verdict and
   *  the Elo estimate are built from). */
  wins: number;
  losses: number;
  decisive: number;
  /** Capped games seen across the whole run — discarded from the test, reported
   *  as the deadlock health metric. */
  draws: number;
  errors: number;
  /** Total games generated (including any past the stop point and any draws). */
  generated: number;
  /** LLRs of the improvement ([0,+E]) and regression ([0,−E]) tests at the stop. */
  llrImprove: number;
  llrRegress: number;
}

export interface GauntletOptions {
  candidate: string;
  /** The version the candidate must beat to be promoted (its predecessor / the
   *  current loop champion). Must be one of `field`. */
  base: string;
  /** Every opponent to test against — v1 … latest, excluding the candidate and
   *  `dumb`. */
  field: readonly string[];
  /** Seed-stream namespace; use a distinct prefix for the held-out set so a
   *  candidate is confirmed on seeds it wasn't tuned on (e.g. "train" / "holdout"). */
  prefix: string;
  /** SPRT indifference margin E (Elo): improvement test [0,+E], regression [0,−E]. */
  margin: number;
  alpha: number;
  beta: number;
  /** Decisive-game cap per candidate pairing before declaring it inconclusive. */
  maxDecisive: number;
  /** Fixed games per field-internal pairing, played only to anchor the Elo fit
   *  (those pairings aren't under test). */
  fieldGames: number;
  maxTurns: number;
  /** Games generated per SPRT round; bigger = fewer round-trips, more overshoot
   *  past the crossing. Defaults to a few per worker. */
  batchGames?: number;
  pool: WorkerPool;
}

export interface GauntletReport {
  candidate: string;
  base: string;
  field: readonly string[];
  pairings: readonly PairingRun[];
  /** Elo across [candidate, ...field], anchored so v1 = 0. */
  elo: Record<string, number>;
  /** Highest-Elo label — the field's champion. */
  champion: string;
  improvesVsBase: boolean;
  /** Opponents the candidate significantly REGRESSED against (regression test). */
  regressions: readonly string[];
  /** The promotion verdict: improves vs base AND regresses against none. */
  accepted: boolean;
}

/** Run one candidate-vs-opponent pairing to an SPRT verdict, generating games in
 *  batches until the test crosses a boundary or hits the decisive cap. The stop
 *  point is a deterministic function of the (seeded) game stream, so the verdict
 *  reproduces regardless of `batchGames` or pool size. */
async function sprtPairing(
  pool: WorkerPool,
  candidate: string,
  opponent: string,
  cfg: GauntletSprtConfig,
  prefix: string,
  maxDecisive: number,
  maxTurns: number,
  batchGames: number,
): Promise<PairingRun> {
  const seedPrefix = `${prefix}:${candidate}-vs-${opponent}`;
  const aWon: boolean[] = [];
  let draws = 0;
  let errors = 0;
  let generated = 0;
  // Bound generation so an all-draws pathology can't loop forever; ~0% cap among
  // real bots means this is only a safety net.
  const hardCap = maxDecisive * 3 + 300;

  let walk = walkGauntletSprt(aWon, cfg, maxDecisive);
  while (walk.verdict === "need-more") {
    const specs = pairingSpecs(candidate, opponent, seedPrefix, generated, batchGames, maxTurns);
    generated += batchGames;
    const results = await pool.run(specs);
    for (const r of results) {
      if (r.error !== undefined) errors++;
      else if (r.winnerLabel === candidate) aWon.push(true);
      else if (r.winnerLabel === opponent) aWon.push(false);
      else draws++;
    }
    walk = walkGauntletSprt(aWon, cfg, maxDecisive);
    if (walk.verdict === "need-more" && generated >= hardCap) break;
  }

  return {
    opponent,
    verdict: classify(walk.verdict),
    wins: walk.wins,
    losses: walk.losses,
    decisive: walk.decisive,
    draws,
    errors,
    generated,
    llrImprove: walk.llrImprove,
    llrRegress: walk.llrRegress,
  };
}

/** Play a fixed number of games for a field-internal pairing — not under test,
 *  just enough to give the Elo fit a real edge between two field members. */
async function fixedPairing(
  pool: WorkerPool,
  a: string,
  b: string,
  prefix: string,
  games: number,
  maxTurns: number,
): Promise<PairResult> {
  const specs = pairingSpecs(a, b, `${prefix}:field:${a}-vs-${b}`, 0, games, maxTurns);
  const results = await pool.run(specs);
  let aWins = 0;
  let bWins = 0;
  for (const r of results) {
    if (r.error !== undefined) continue;
    if (r.winnerLabel === a) aWins++;
    else if (r.winnerLabel === b) bWins++;
  }
  return { a, b, aWins, bWins };
}

export async function runGauntlet(opts: GauntletOptions): Promise<GauntletReport> {
  const cfg: GauntletSprtConfig = {
    margin: opts.margin,
    alpha: opts.alpha,
    beta: opts.beta,
  };
  const batchGames = opts.batchGames ?? Math.max(8, opts.pool.size * 8);

  // 1. Candidate vs every field member — the tests that decide promotion.
  const pairings: PairingRun[] = [];
  for (const opponent of opts.field) {
    pairings.push(
      await sprtPairing(
        opts.pool,
        opts.candidate,
        opponent,
        cfg,
        opts.prefix,
        opts.maxDecisive,
        opts.maxTurns,
        batchGames,
      ),
    );
  }

  // 2. Field-internal pairings, only to anchor the Elo fit (a star graph centred
  //    on the candidate would leave field members' relative ratings ill-pinned).
  const fieldResults: PairResult[] = [];
  for (let i = 0; i < opts.field.length; i++) {
    for (let j = i + 1; j < opts.field.length; j++) {
      fieldResults.push(
        await fixedPairing(
          opts.pool,
          opts.field[i],
          opts.field[j],
          opts.prefix,
          opts.fieldGames,
          opts.maxTurns,
        ),
      );
    }
  }

  // 3. Elo across the whole field, anchored at the floor (v1 if present).
  const labels = [opts.candidate, ...opts.field];
  const pairResults: PairResult[] = [
    ...pairings.map((p) => ({
      a: opts.candidate,
      b: p.opponent,
      aWins: p.wins,
      bWins: p.losses,
    })),
    ...fieldResults,
  ];
  const anchor = opts.field.includes("v1") ? "v1" : opts.base;
  const elo = fitElo(labels, pairResults, { anchor });
  const champion = labels.reduce((best, l) => (elo[l] > elo[best] ? l : best), labels[0]);

  // 4. The promotion bar.
  const baseRun = pairings.find((p) => p.opponent === opts.base);
  const improvesVsBase = baseRun?.verdict === "better";
  const regressions = pairings.filter((p) => p.verdict === "worse").map((p) => p.opponent);
  const accepted = improvesVsBase && regressions.length === 0;

  return {
    candidate: opts.candidate,
    base: opts.base,
    field: opts.field,
    pairings,
    elo,
    champion,
    improvesVsBase,
    regressions,
    accepted,
  };
}

/** A compact console summary of a gauntlet run. */
export function formatGauntlet(r: GauntletReport): string {
  const pct = (w: number, l: number): string =>
    w + l === 0 ? "—" : `${((100 * w) / (w + l)).toFixed(1)}%`;
  const lines: string[] = [];
  lines.push(`Gauntlet: ${r.candidate} vs field [${r.field.join(", ")}]   base = ${r.base}`);
  lines.push("");
  const marks: Record<PairVerdict, string> = {
    better: "✓",
    worse: "✗",
    even: "=",
    inconclusive: "≈",
  };
  for (const p of r.pairings) {
    const isBase = p.opponent === r.base ? " (base)" : "";
    lines.push(
      `  ${marks[p.verdict]} vs ${p.opponent}${isBase}: ${p.verdict.toUpperCase()}` +
        `  win share ${pct(p.wins, p.losses)}  (${p.wins}–${p.losses}, ${p.decisive} decisive` +
        `, ${p.draws} draws, LLR impr ${p.llrImprove.toFixed(2)} regr ${p.llrRegress.toFixed(2)})`,
    );
  }
  lines.push("");
  const eloLine = Object.entries(r.elo)
    .sort((a, b) => b[1] - a[1])
    .map(([l, e]) => `${l} ${e >= 0 ? "+" : ""}${e.toFixed(1)}`)
    .join("   ");
  lines.push(`  Elo (v1 = 0):  ${eloLine}`);
  lines.push(`  Champion (highest Elo): ${r.champion}`);
  lines.push("");
  lines.push(
    `  Improves vs base (${r.base}): ${r.improvesVsBase ? "YES" : "no"}` +
      `   Regressions: ${r.regressions.length === 0 ? "none" : r.regressions.join(", ")}`,
  );
  lines.push(`  → ${r.accepted ? "✅ ACCEPT as new champion" : "❌ REJECT"}`);
  return lines.join("\n");
}
