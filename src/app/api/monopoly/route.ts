import { NextResponse } from "next/server";
import { createAdminClient } from "@/shared/lib/supabase/server-admin";
import { apply, autoStep } from "@/projects/monopoly/engine";
import { freshGame } from "@/projects/monopoly/mocks";
import type { GameState, Intent } from "@/projects/monopoly/types";
import type { MonopolyAction, MonopolyResult } from "@/projects/monopoly/protocol";
import type { PlayerProfile } from "@/shared/lib/profile";

// One row per game in public.monopoly_games. This route is the ONLY writer:
// RLS denies client writes, the route writes with the service role and runs
// the engine, so the authoritative state can't be set to anything illegal.
const TABLE = "monopoly_games";

type Db = ReturnType<typeof createAdminClient>;

// Shape of the columns we read back. Supplying it to maybeSingle<T>() keeps
// the result strongly typed instead of `any` (there's no generated Database
// type in this repo).
interface GameRow {
  state: GameState;
  version: number;
}

function json(body: MonopolyResult, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseProfile(v: unknown): PlayerProfile | null {
  if (!isRecord(v)) return null;
  const { id, name } = v;
  if (typeof id === "string" && typeof name === "string") return { id, name };
  return null;
}

function parseAction(v: unknown): MonopolyAction | null {
  if (!isRecord(v)) return null;
  const type = v.type;
  if (type === "create" || type === "reset") {
    const profile = parseProfile(v.profile);
    return profile ? { type, profile } : null;
  }
  if (type === "submit") {
    const { intents, fromVersion } = v;
    if (!Array.isArray(intents) || typeof fromVersion !== "number") return null;
    // The engine validates each intent semantically (turn ownership, phase,
    // affordability); the transport only asserts the array shape. The cast is
    // contained to this boundary.
    return { type, intents: intents as Intent[], fromVersion };
  }
  if (type === "step") {
    const { fromVersion } = v;
    if (typeof fromVersion !== "number") return null;
    return { type, fromVersion };
  }
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, reason: "invalid JSON" }, 400);
  }
  if (!isRecord(raw)) return json({ ok: false, reason: "invalid body" }, 400);

  const gameId = typeof raw.gameId === "string" ? raw.gameId : null;
  const action = parseAction(raw.action);
  if (!gameId || !action) return json({ ok: false, reason: "invalid request" }, 400);
  // "dev" is the local sandbox — it must never touch the database.
  if (gameId === "dev") {
    return json({ ok: false, reason: "dev game is local-only" }, 400);
  }

  let supabase: Db;
  try {
    supabase = createAdminClient();
  } catch (err) {
    return json({ ok: false, reason: errMessage(err) }, 500);
  }

  if (action.type === "create" || action.type === "reset") {
    return seed(supabase, gameId, action);
  }
  return advance(supabase, gameId, action);
}

async function seed(
  supabase: Db,
  gameId: string,
  action: Extract<MonopolyAction, { type: "create" | "reset" }>,
): Promise<NextResponse> {
  const seeded = freshGame(`${gameId}-${Date.now().toString()}`, action.profile);

  if (action.type === "reset") {
    const { error } = await supabase.from(TABLE).upsert({
      id: gameId,
      state: seeded,
      version: 0,
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ ok: false, reason: error.message }, 500);
    return json({ ok: true, state: seeded, version: 0 });
  }

  // create: insert only, so a concurrent creator can't clobber an in-progress
  // game. A duplicate-key error means someone created it first — surface it as
  // a conflict and let the client re-load the existing row.
  const { error } = await supabase
    .from(TABLE)
    .insert({ id: gameId, state: seeded, version: 0 });
  if (error) return json({ ok: false, conflict: true, reason: error.message });
  return json({ ok: true, state: seeded, version: 0 });
}

async function advance(
  supabase: Db,
  gameId: string,
  action: Extract<MonopolyAction, { type: "submit" | "step" }>,
): Promise<NextResponse> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("state, version")
    .eq("id", gameId)
    .maybeSingle<GameRow>();
  if (error) return json({ ok: false, reason: error.message }, 500);
  if (!data) return json({ ok: false, reason: "game not found" }, 404);

  // The caller advances from the version it last saw. If the DB has moved on,
  // its view is stale — reject so it resyncs from the subscription rather than
  // computing against an old snapshot.
  if (data.version !== action.fromVersion) {
    return json({ ok: false, conflict: true });
  }

  let next: GameState;
  if (action.type === "submit") {
    // Apply-only: intents do NOT auto-drain mechanics. One unit of progress
    // per call is the contract — a separate `step` runs each `autoStep`, which
    // re-opens the off-turn interject windows between mechanical beats. See
    // monopoly/CLAUDE.md "Multiplayer / networking".
    let working = data.state;
    for (const intent of action.intents) {
      const result = apply(working, intent);
      if (!result.ok) return json({ ok: false, reason: result.reason });
      working = result.state;
    }
    next = working;
  } else {
    const stepped = autoStep(data.state);
    if (stepped.state === data.state) {
      // Already at a decision point / paused / game over — nothing to do.
      return json({ ok: true, state: data.state, version: data.version });
    }
    next = stepped.state;
  }

  const newVersion = data.version + 1;
  const { data: updated, error: writeErr } = await supabase
    .from(TABLE)
    .update({
      state: next,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .eq("version", data.version)
    .select("version")
    .maybeSingle<{ version: number }>();
  if (writeErr) return json({ ok: false, reason: writeErr.message }, 500);
  // Lost the optimistic race between our read and write — a no-op, the winner
  // broadcast its state to every subscriber.
  if (!updated) return json({ ok: false, conflict: true });
  return json({ ok: true, state: next, version: newVersion });
}
