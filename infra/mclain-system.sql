-- McLain System v2 control-plane schema.
-- Private seed data intentionally does not belong in source control.

create table if not exists public.mclain_system_state (
  id text primary key default 'primary' check (id = 'primary'),
  version bigint not null default 1 check (version > 0),
  state jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'system'
);

alter table public.mclain_system_state enable row level security;
revoke all on table public.mclain_system_state from public, anon, authenticated;
grant select, insert, update, delete on table public.mclain_system_state to service_role;

create table if not exists public.mclain_system_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  venture_id text,
  source text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mclain_system_events enable row level security;
revoke all on table public.mclain_system_events from public, anon, authenticated;
grant select, insert, update, delete on table public.mclain_system_events to service_role;

create index if not exists mclain_system_events_created_idx
  on public.mclain_system_events(created_at desc);

create index if not exists mclain_system_events_venture_idx
  on public.mclain_system_events(venture_id, created_at desc);

create table if not exists public.mclain_system_snapshots (
  id uuid primary key default gen_random_uuid(),
  version bigint not null,
  state jsonb not null,
  reason text not null default 'update',
  created_at timestamptz not null default now()
);

alter table public.mclain_system_snapshots enable row level security;
revoke all on table public.mclain_system_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.mclain_system_snapshots to service_role;

create index if not exists mclain_system_snapshots_version_idx
  on public.mclain_system_snapshots(version desc);
