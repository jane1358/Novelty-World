// Pixel-exact snapshot of computeLayout against productionTree. After the
// HiGHS-WASM swap (see decross-highs.ts) this runs in ~3s, which is still
// too long for the default suite — kept here as a quality tripwire. Run
// with `npm run test:slow`.

import { describe, it, expect } from "vitest";
import { computeLayout } from "./logic";
import { productionTree } from "./__fixtures__/trees";
import { serializeLayout } from "./layout-snapshot.helpers";

describe("productionTree layout — fancy", () => {
  it(
    "matches the pinned snapshot",
    { timeout: 180_000 },
    async () => {
      const layout = await computeLayout(productionTree());
      await expect(serializeLayout(layout)).toMatchFileSnapshot(
        "./__snapshots__/production-tree.fancy.json",
      );
    },
  );
});
