// Pixel-exact snapshot of computeLayout against productionTree, nice/two-layer
// pass only. Intentionally brittle: any change in the algorithm's output
// (including ones that produce equally-optimal layouts via different
// tie-breaking) breaks this test. That's the point — the snapshot is a
// tripwire so you see exactly what moved when you tweak the algorithm.
//
// On intentional changes: re-pin with `vitest -u` and eyeball the diff.
//
// The fancy/opt pass is in layout-snapshot.slow.test.ts — same idea, but
// excluded from the default suite because it takes ~50s. Run it with
// `npm run test:slow`.

import { describe, it, expect } from "vitest";
import { computeLayout } from "./logic";
import { productionTree } from "./__fixtures__/trees";
import { serializeLayout } from "./layout-snapshot.helpers";

describe("productionTree layout — nice (decross=two-layer)", () => {
  it("matches the pinned snapshot", async () => {
    const layout = computeLayout(productionTree(), { decross: "two-layer" });
    await expect(serializeLayout(layout)).toMatchFileSnapshot(
      "./__snapshots__/production-tree.nice.json",
    );
  });
});
