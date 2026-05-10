// Benches for computeLayout. Two groups:
//   - productionTree: live snapshot of the real family_tree row. The
//     authoritative real-world number to track for regressions. The opt
//     pass takes ~50s, so it gets a relaxed iteration budget.
//   - synthetic sweep: parameterized shapes that vary L (chain depth),
//     pedigree depth, sibling-fan width K, and recursive branching. Used
//     to validate the complexity story.
//
// Note: the synthetic sweeps systematically *underestimate* real cost
// because none of them produce the "two adjacent wide layers densely
// interconnected" pattern that triggers decrossOpt's worst case. They
// validate the W-dominates trend; productionTree is what tells you the
// absolute number.
//
// Run with `npm run bench`.

import { bench, describe } from "vitest";
import { computeLayout } from "./logic";
import {
  ancestorPedigree,
  branching,
  chain,
  kitchenSink,
  productionTree,
  siblingFanOfWidth,
} from "./__fixtures__/trees";

describe("productionTree (real family_tree row)", () => {
  const tree = productionTree();
  // Single-iteration by default — opt pass averages ~60s/run, and one
  // sample is enough to tell whether a tweak moved things in the right
  // direction. Re-run the bench a few times and average if the change
  // looks marginal and you need to defeat run-to-run variance.
  bench(
    "decross=opt (fancy)",
    () => {
      computeLayout(tree, { decross: "opt" });
    },
    { time: 0, iterations: 1 },
  );
});

describe("kitchenSink (synthetic ~50 ppl, narrower than production)", () => {
  const tree = kitchenSink();
  bench("decross=opt (fancy)", () => {
    computeLayout(tree, { decross: "opt" });
  });
  bench("decross=two-layer (nice)", () => {
    computeLayout(tree, { decross: "two-layer" });
  });
});

// Sweep L holding W=1: should be ~flat; isolates pre/post-process cost.
describe("chain — depth sweep (W=1)", () => {
  for (const L of [5, 20, 50]) {
    const tree = chain(L);
    bench(`L=${L} (N=${L})`, () => {
      computeLayout(tree, { decross: "opt" });
    });
  }
});

// Sweep pedigree depth: every step doubles W. depth=6 has 32 grandparent
// couples in the deepest layer — this is where decrossOpt starts to feel it.
describe("ancestorPedigree — width sweep", () => {
  for (const depth of [3, 4, 5, 6]) {
    const tree = ancestorPedigree(depth);
    const N = (1 << depth) - 1;
    const W = depth >= 2 ? 1 << (depth - 2) : 1;
    bench(`depth=${depth} (N=${N}, W=${W})`, () => {
      computeLayout(tree, { decross: "opt" });
    });
  }
});

// Sweep sibling-fan width K: 1 + K layer-1 couples under a single layer-0
// couple. decrossOpt has nothing to permute against, so this should stay
// cheap even at large W.
describe("siblingFan — width sweep (single parent couple)", () => {
  for (const K of [5, 15, 30]) {
    const tree = siblingFanOfWidth(K);
    const N = Object.keys(tree.persons).length;
    bench(`K=${K} (N=${N})`, () => {
      computeLayout(tree, { decross: "opt" });
    });
  }
});

// Recursive branching grows W and L jointly; person count = b^d. Keep
// (b, d) modest to avoid >100k-person trees in the bench.
describe("branching — joint W/L sweep", () => {
  for (const [b, d] of [
    [2, 3],
    [2, 4],
    [3, 3],
    [3, 4],
  ] as const) {
    const tree = branching(b, d);
    const N = Object.keys(tree.persons).length;
    bench(`b=${b}, d=${d} (N=${N})`, () => {
      computeLayout(tree, { decross: "opt" });
    });
  }
});
