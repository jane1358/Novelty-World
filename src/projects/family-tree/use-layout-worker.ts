"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMPTY_LAYOUT,
  diffTree,
  optimisticPatch,
} from "./logic";
import type { LayoutRequest, LayoutResponse } from "./layout.worker";
import type { Layout, Tree } from "./types";

// "none"   — no layout yet (cold load before first worker reply).
// "simple" — main-thread optimistic patch; placed near a relative.
// "nice"   — fast heuristic from the worker; real sugiyama, suboptimal crossings.
// "fancy"  — optimal layout from the worker; minimal crossings.
export type LayoutKind = "none" | "simple" | "nice" | "fancy";

interface UseLayoutWorker {
  layout: Layout;
  kind: LayoutKind;
  computing: boolean;
}

// Owns the layout worker and produces three progressively-better layouts per
// tree change:
//   1. "simple" — optimistic patch (sync, ~0ms). Only useful for single-node
//      edits; bulk changes (hydration) skip straight to "none" + worker.
//   2. "nice"   — heuristic worker pass (~tens of ms). First real layout the
//      user sees on cold load.
//   3. "fancy"  — optimal worker pass (seconds for large n). Replaces "nice".
//
// The optimistic patch runs synchronously *during render* so the layout we
// return always matches the tree we were called with — otherwise a deletion
// would render once with a stale layout still containing the deleted node,
// and node lookups in the parent would crash. React's "deriving state from
// props" pattern: https://react.dev/reference/react/useState#storing-information-from-previous-renders
//
// Rapid edits terminate the in-flight worker (its remaining "fancy" pass
// would otherwise tie up the queue for seconds with a stale result).
export function useLayoutWorker(tree: Tree): UseLayoutWorker {
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
  const [kind, setKind] = useState<LayoutKind>("none");
  const [prevTree, setPrevTree] = useState<Tree | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const generationRef = useRef(0);
  const latestRequestedRef = useRef(0);
  // Bumped whenever a real (non-rename) tree change happens. The dispatch
  // effect depends on this so it doesn't fire for cosmetic-only edits.
  const [dispatchTick, setDispatchTick] = useState(0);

  let currentLayout = layout;
  let currentKind = kind;

  if (prevTree !== tree) {
    setPrevTree(tree);
    if (prevTree === null) {
      currentLayout = EMPTY_LAYOUT;
      currentKind = "none";
      setLayout(currentLayout);
      setKind(currentKind);
      setDispatchTick((n) => n + 1);
    } else {
      const diff = diffTree(prevTree, tree);
      if (!diff.structurallyEqual) {
        // Optimistic patch only makes sense for one-at-a-time user edits — it
        // places a new node next to a relative whose position is already
        // known. For bulk changes (hydration, restore-from-local) most new
        // nodes have no placed relative yet and pile up at the origin;
        // better to blank the canvas and let the heuristic worker pass
        // produce the first real layout.
        const isIncrementalEdit =
          diff.added.length <= 1 && diff.removed.length <= 1;
        const haveExistingLayout = currentLayout.nodes.length > 0;
        if (isIncrementalEdit && haveExistingLayout) {
          currentLayout = optimisticPatch(currentLayout, tree, diff);
          currentKind = "simple";
        } else {
          currentLayout = EMPTY_LAYOUT;
          currentKind = "none";
        }
        setLayout(currentLayout);
        setKind(currentKind);
        setDispatchTick((n) => n + 1);
      }
      // structurallyEqual: rename/gender — leave layout/kind alone, no dispatch.
    }
  }

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (dispatchTick === 0) return;
    // Tear down any in-flight worker. Its pending "fancy" pass could be
    // seconds away from finishing on a now-stale tree; letting it run
    // would block this new request and burn CPU on a result we'd ignore.
    workerRef.current?.terminate();
    const worker = new Worker(
      new URL("./layout.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e: MessageEvent<LayoutResponse>) => {
      const msg = e.data;
      if (msg.id !== latestRequestedRef.current) return;
      if (msg.ok) {
        setLayout(msg.layout);
        setKind(msg.kind);
      } else {
        // Worker errored — pretend we're done so the spinner stops. Layout
        // stays at whatever was last rendered. The graph code has its own
        // fallback layout so this branch should be unreachable in practice.
        setKind("fancy");
      }
    };
    workerRef.current = worker;

    const id = generationRef.current + 1;
    generationRef.current = id;
    latestRequestedRef.current = id;
    const req: LayoutRequest = { id, tree };
    worker.postMessage(req);
  }, [dispatchTick, tree]);

  return {
    layout: currentLayout,
    kind: currentKind,
    // "fancy" is the terminal state — anything else means a worker pass is
    // in flight (or about to be: cold-load before the dispatch effect runs).
    computing: currentKind !== "fancy",
  };
}
