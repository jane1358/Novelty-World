"use client";

import { useMemo, useState } from "react";
import { useFamilyTreeStore } from "./store";
import {
  EMPTY_LAYOUT,
  diffTree,
  optimisticPatch,
  topologyHash,
} from "./logic";
import type { Layout, Tree } from "./types";
import type { TreeDiff } from "./logic";

// "cached" — the layout came from a previous fancy solve cached in Supabase
//   and the current tree's topology still matches. This is the terminal,
//   optimal state — nothing to compute.
// "fast"   — local-shift derived: surviving nodes keep their cached positions,
//   new arrivals slotted in via overlap-avoiding placement. Visible
//   immediately, but not crossing-minimized. The user clicks "Optimize" to
//   upgrade to "cached".
// "none"   — never reached in practice: there is always at least an empty
//   layout (which is itself a valid LayoutKind). Kept as the typed default
//   for the initial render before the first tree mutation lands.
export type LayoutKind = "cached" | "fast" | "none";

interface UseLayoutWorker {
  layout: Layout;
  kind: LayoutKind;
  // Tree topology matches the cached layout's hash — nothing for the user
  // to do. When false, clicking Optimize is meaningful.
  inSync: boolean;
  // A worker is currently solving. Triggers spinner + cancel affordance.
  optimizing: boolean;
  // Spawn the worker. No-op if already optimizing or already in sync.
  optimize: () => void;
  // Terminate the in-flight worker. Used by the cancel UI; the store
  // separately auto-cancels when the user edits the tree.
  cancelOptimize: () => void;
}

// Render-time derivation of the on-screen layout from the store's tree +
// cached layout. The hook itself owns NO async work — the worker lives in
// the store so a single global `optimize()` call coordinates compute,
// conditional upload, and state updates.
//
// State machine:
//   - tree hash matches the cached hash      → render the cached layout.
//   - tree changed and topology drifted      → optimisticPatch on the prior
//                                              layout (cached or last fast).
//   - cache landed and now matches the tree  → swap to the cached layout
//                                              (e.g. solve just completed).
//
// The "derive state from props" branch below follows React's recommended
// pattern for resetting derived state without an effect:
// https://react.dev/reference/react/useState#storing-information-from-previous-renders
export function useLayoutWorker(): UseLayoutWorker {
  const tree = useFamilyTreeStore((s) => s.tree);
  const cachedLayout = useFamilyTreeStore((s) => s.cachedLayout);
  const cachedLayoutHash = useFamilyTreeStore((s) => s.cachedLayoutHash);
  const optimizing = useFamilyTreeStore((s) => s.optimizing);
  const optimize = useFamilyTreeStore((s) => s.optimize);
  const cancelOptimize = useFamilyTreeStore((s) => s.cancelOptimize);

  // Memoize by tree identity. Cosmetic edits (rename, gender) still produce
  // a new tree reference; the recomputed hash will simply equal the previous
  // one and inSync stays true — no cascade.
  const currentHash = useMemo(() => topologyHash(tree), [tree]);
  const inSync =
    cachedLayoutHash !== null && cachedLayoutHash === currentHash;

  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
  const [kind, setKind] = useState<LayoutKind>("none");
  const [prevTree, setPrevTree] = useState<Tree | null>(null);
  const [prevCachedHash, setPrevCachedHash] = useState<string | null>(null);

  let currentLayout = layout;
  let currentKind = kind;

  const treeChanged = prevTree !== tree;
  const cacheChanged = prevCachedHash !== cachedLayoutHash;

  if (treeChanged || cacheChanged) {
    if (inSync && cachedLayout !== null) {
      currentLayout = cachedLayout;
      currentKind = "cached";
    } else if (treeChanged && prevTree !== null) {
      const diff = diffTree(prevTree, tree);
      if (!diff.structurallyEqual) {
        currentLayout = optimisticPatch(layout, tree, diff);
        currentKind = "fast";
      }
      // structurallyEqual: rename/gender — leave layout/kind alone.
    } else if (treeChanged && prevTree === null) {
      // Cold load. Diff the cached layout's node set against the current
      // tree so optimisticPatch knows which IDs to slot in — works the
      // same whether the cache is fresh-but-mismatched, missing entirely
      // (treats every person as newly added), or perfectly aligned with
      // the tree (handled by the inSync branch above).
      const base = cachedLayout ?? EMPTY_LAYOUT;
      const baseIds = new Set(base.nodes.map((n) => n.id));
      const added = Object.keys(tree.persons).filter(
        (id) => !baseIds.has(id),
      );
      const removed = [...baseIds].filter((id) => !(id in tree.persons));
      const diff: TreeDiff = {
        added,
        removed,
        structurallyEqual: added.length === 0 && removed.length === 0,
      };
      currentLayout = optimisticPatch(base, tree, diff);
      currentKind = "fast";
    }

    if (currentLayout !== layout) setLayout(currentLayout);
    if (currentKind !== kind) setKind(currentKind);
    if (treeChanged) setPrevTree(tree);
    if (cacheChanged) setPrevCachedHash(cachedLayoutHash);
  }

  return {
    layout: currentLayout,
    kind: currentKind,
    inSync,
    optimizing,
    optimize,
    cancelOptimize,
  };
}
