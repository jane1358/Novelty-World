// Pixel-exact snapshot of computeLayout against productionTree, fancy/opt
// pass. After the HiGHS-WASM swap (see decross-highs.ts) this runs in ~3s,
// but the snapshot itself remains a quality tripwire so we keep it in the
// slow suite. Run with `npm run test:slow`. See layout-snapshot.test.ts
// for the nice/two-layer counterpart.

import { describe, it, expect } from "vitest";
import { computeLayout } from "./logic";
import { productionTree } from "./__fixtures__/trees";
import { serializeLayout } from "./layout-snapshot.helpers";

describe("productionTree layout — fancy (decross=opt)", () => {
  it(
    "matches the pinned snapshot",
    { timeout: 180_000 },
    async () => {
      const layout = await computeLayout(productionTree(), { decross: "opt" });
      await expect(serializeLayout(layout)).toMatchFileSnapshot(
        "./__snapshots__/production-tree.fancy.json",
      );
    },
  );
});
