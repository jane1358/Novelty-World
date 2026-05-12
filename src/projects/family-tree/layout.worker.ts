// Web Worker that runs the (potentially seconds-long) sugiyama layout off
// the main thread. Bundled by Next.js via `new Worker(new URL(...))`.
//
// One pass: the optimal HiGHS-backed sugiyama layout. The previous "nice"
// heuristic pass is gone — the main thread shows a cached layout (or an
// optimistic fast patch) in the meantime, so there's no value in posting a
// suboptimal intermediate result that would visibly downgrade the canvas
// before the fancy result lands.
//
// The worker stays dumb: it computes a Layout for the tree it's handed and
// posts it back. Staleness checks (did the DB change while we were solving?)
// live in the store; the worker itself is a pure compute pipe.

import { computeLayout } from "./logic";
import type { Layout, Tree } from "./types";

export interface LayoutRequest {
  id: number;
  tree: Tree;
}

export type LayoutResponse =
  | { id: number; ok: true; layout: Layout }
  | { id: number; ok: false; error: string };

interface WorkerScope {
  onmessage: ((e: MessageEvent<LayoutRequest>) => void) | null;
  postMessage: (msg: LayoutResponse) => void;
}

// `self` inside a Worker is a DedicatedWorkerGlobalScope, which isn't in our
// tsconfig lib (we only ship "dom"). Cast to a minimal local shape instead of
// pulling in the whole webworker lib.
const ctx = self as unknown as WorkerScope;

ctx.onmessage = (e) => {
  const { id, tree } = e.data;
  void (async () => {
    try {
      const layout = await computeLayout(tree);
      ctx.postMessage({ id, ok: true, layout });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.postMessage({ id, ok: false, error: message });
    }
  })();
};
