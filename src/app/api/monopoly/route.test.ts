// @vitest-environment node
//
// Route-level tests for the version-guarded write path. The focus is the
// optimistic-CAS conflict handling — specifically the write-race case (the row's
// version moved between the route's SELECT and its CAS UPDATE, so the update
// matched no row). That conflict MUST hand back the winning row so the client can
// rebase: without it a client whose racing winner was its OWN already-folded
// write (its Realtime echo is dropped as a duplicate) strands its pending outbox
// and freezes — the reported "auction soft-lock after dropping out".

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient } = vi.hoisted(() => ({ createAdminClient: vi.fn() }));
vi.mock("@/shared/lib/supabase/server-admin", () => ({ createAdminClient }));

import { freshGame } from "@/projects/monopoly/mocks";
import type { GameState, Intent } from "@/projects/monopoly/types";
import type { MonopolyResult } from "@/projects/monopoly/protocol";
import { POST } from "./route";

const HEAD: GameState = freshGame("route-conflict", undefined, 4);
const HUMAN = HEAD.turn.playerId;
// An arm is legal at any time, so `compute` always reaches the CAS write.
const ARM: Intent = { kind: "set-queue", playerId: HUMAN, queue: "manage", armed: true };

/** A fake Supabase client whose chained query builders resolve `maybeSingle()`
 *  to the queued results in call order. The route calls it for the initial read,
 *  the CAS write, and (on a write-race) the winner re-read. */
function fakeClient(results: { data: unknown; error: unknown }[]): unknown {
  const queue = [...results];
  const builder = {
    select: () => builder,
    update: () => builder,
    insert: () => builder,
    delete: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(queue.shift() ?? { data: null, error: null }),
  };
  return { from: () => builder };
}

function post(body: unknown): Promise<MonopolyResult> {
  const req = new Request("http://test/api/monopoly", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return POST(req).then((res) => res.json() as Promise<MonopolyResult>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("monopoly route — submit CAS conflicts", () => {
  it("commits a clean write and returns the new version", async () => {
    createAdminClient.mockReturnValue(
      fakeClient([
        { data: { state: HEAD, version: 5 }, error: null }, // initial read
        { data: { version: 6 }, error: null }, // CAS write succeeded
      ]),
    );

    const res = await post({
      gameId: "g",
      action: { type: "submit", intents: [ARM], fromVersion: 5 },
    });

    expect(res.ok).toBe(true);
    if (!res.ok || !("version" in res)) throw new Error("expected ok with version");
    expect(res.version).toBe(6);
  });

  it("rejects a stale fromVersion with the winning row to rebase on", async () => {
    const winner: GameState = { ...HEAD, rngState: HEAD.rngState + 1 };
    createAdminClient.mockReturnValue(
      fakeClient([
        { data: { state: winner, version: 7 }, error: null }, // read: already past 5
      ]),
    );

    const res = await post({
      gameId: "g",
      action: { type: "submit", intents: [ARM], fromVersion: 5 },
    });

    expect(res).toMatchObject({ ok: false, conflict: true, version: 7 });
  });

  it("hands back the winner on a write-race (CAS matched no row)", async () => {
    const winner: GameState = { ...HEAD, rngState: HEAD.rngState + 1 };
    createAdminClient.mockReturnValue(
      fakeClient([
        { data: { state: HEAD, version: 5 }, error: null }, // read: version matches
        { data: null, error: null }, // CAS UPDATE matched 0 rows — lost the race
        { data: { state: winner, version: 6 }, error: null }, // re-read the winner
      ]),
    );

    const res = await post({
      gameId: "g",
      action: { type: "submit", intents: [ARM], fromVersion: 5 },
    });

    // The fix: the write-race conflict now carries the winner so the client folds
    // + rebases immediately instead of stranding its outbox waiting for an echo.
    expect(res).toMatchObject({ ok: false, conflict: true, version: 6 });
    if (res.ok) throw new Error("expected conflict");
    expect(res.state).toBeDefined();
  });

  it("still returns a bare conflict if the row vanished mid-write", async () => {
    createAdminClient.mockReturnValue(
      fakeClient([
        { data: { state: HEAD, version: 5 }, error: null }, // read
        { data: null, error: null }, // CAS matched 0 rows
        { data: null, error: null }, // re-read finds nothing (row deleted)
      ]),
    );

    const res = await post({
      gameId: "g",
      action: { type: "submit", intents: [ARM], fromVersion: 5 },
    });

    expect(res).toMatchObject({ ok: false, conflict: true });
    if (res.ok) throw new Error("expected conflict");
    expect(res.state).toBeUndefined();
  });
});
