// Same invariants as layout-invariants.test.ts but applied to the
// production-tree fixture, which is large enough that the HiGHS solve
// takes ~3s. Run with `npm run test:slow`.

import { describe } from "vitest";
import { productionTree } from "./__fixtures__/trees";
import { defineLayoutInvariants } from "./layout-invariants.test";

describe("computeLayout invariants — productionTree", () => {
  defineLayoutInvariants("productionTree", productionTree);
});
