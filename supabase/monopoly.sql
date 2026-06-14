-- Monopoly project: one row per game, holding the authoritative GameState.
-- Run this once in the Supabase SQL editor.

create table if not exists public.monopoly_games (
  -- Game id. `"dev"` is a reserved id for the debug sandbox (it additionally
  -- accepts dev-only actions) but is otherwise a normal persisted row; lobby
  -- games use minted ids. Every game — dev included — runs on the
  -- authoritative route and lives here; there is no local-only mode.
  id text primary key,
  -- The serialized GameState (see src/projects/monopoly/types.ts). Written
  -- only by the authoritative server route (/api/monopoly) using the service
  -- role; clients are read-only (see RLS below). All clients subscribe to
  -- changes via Realtime.
  state jsonb not null,
  -- Optimistic-concurrency counter. The server route applies one unit per
  -- call and writes with `update ... where version = <client's version>`, so
  -- redundant/racing advances become harmless no-ops. Bumped on every write.
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Backfill for an existing table created before the version column landed.
alter table public.monopoly_games
  add column if not exists version integer not null default 0;

alter table public.monopoly_games enable row level security;

-- Clients are read-only: every mutation goes through the server route, which
-- runs the engine and writes with the service role (service role bypasses
-- RLS). There are deliberately NO insert/update/delete policies for anon —
-- with RLS enabled and no permissive policy, those operations are denied.
-- Reads stay open so clients can load and subscribe.
drop policy if exists "monopoly_games read" on public.monopoly_games;
create policy "monopoly_games read"
  on public.monopoly_games for select
  using (true);

-- Drop the old open write policies from the client-writer era. The server
-- route holds the only write path now.
drop policy if exists "monopoly_games write" on public.monopoly_games;
drop policy if exists "monopoly_games update" on public.monopoly_games;

-- Postgres-changes subscriptions only fire for tables in this publication.
-- Guarded so re-running the migration doesn't error if it's already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'monopoly_games'
  ) then
    alter publication supabase_realtime add table public.monopoly_games;
  end if;
end $$;
