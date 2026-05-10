import type { Layout } from "./types";

// Stable, human-readable serialization for snapshot tests. Sorts nodes and
// edges so unrelated bookkeeping order changes (e.g. iteration order of
// Object.values) don't produce noisy diffs. Coordinates round to 4 decimal
// places to absorb LP solver float jitter while still catching real
// geometry shifts (sub-pixel changes are not visually meaningful).
export function serializeLayout(layout: Layout): string {
  const round = (n: number): number => Math.round(n * 10000) / 10000;
  const nodes = layout.nodes
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((n) => ({ id: n.id, x: round(n.x), y: round(n.y), w: n.w, h: n.h }));
  const edges = layout.edges
    .map((e) =>
      e.kind === "spouse"
        ? { kind: e.kind, aId: e.aId, bId: e.bId }
        : {
            kind: e.kind,
            parentAId: e.parentAId,
            parentBId: e.parentBId,
            childId: e.childId,
            elbowY: round(e.elbowY),
          },
    )
    .sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return JSON.stringify(
    { width: round(layout.width), height: round(layout.height), nodes, edges },
    null,
    2,
  );
}
