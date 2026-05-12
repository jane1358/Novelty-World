-- Family Tree project: single-row global tree storage.
-- Run this once in the Supabase SQL editor.

create table if not exists public.family_tree (
  id text primary key,
  data jsonb not null,
  -- Cached optimal layout for `data`'s current topology, plus the hash that
  -- identifies which tree topology it was solved against. Clients render the
  -- cached layout directly when the current tree's `topologyHash` matches
  -- `layout_tree_hash`, skipping the seconds-long HiGHS IP solve. Otherwise
  -- they show a fast local-shift layout and prompt the user to click
  -- "Optimize", which spawns the solver in a worker and writes the result
  -- back here (conditional on the hash still matching to avoid trampling
  -- another contributor's edit).
  layout jsonb,
  layout_tree_hash text,
  updated_at timestamptz not null default now()
);

-- Existing rows from before the layout columns existed: add them in-place.
alter table public.family_tree add column if not exists layout jsonb;
alter table public.family_tree add column if not exists layout_tree_hash text;

alter table public.family_tree enable row level security;

-- Open read/write for v1 (wiki-style). Tighten later if vandalism becomes an issue.
drop policy if exists "family_tree read" on public.family_tree;
create policy "family_tree read"
  on public.family_tree for select
  using (true);

drop policy if exists "family_tree write" on public.family_tree;
create policy "family_tree write"
  on public.family_tree for insert
  with check (true);

drop policy if exists "family_tree update" on public.family_tree;
create policy "family_tree update"
  on public.family_tree for update
  using (true) with check (true);
