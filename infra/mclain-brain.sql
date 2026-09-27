-- McLain System Second Brain: private source store, project links, search index, and processing leases.
-- Production migration originally applied as Supabase migration 20260927031724 (mclain_brain_private_sources).
-- Browser roles intentionally receive no table grants. The Edge Function uses service_role after custom McLain session verification.

create table public.mclain_brain_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  filename text not null,
  mime text not null,
  byte_count integer not null check (byte_count between 1 and 3145728),
  sha256 text not null unique check (sha256 ~ '^[a-f0-9]{64}$'),
  object_path text not null unique,
  source_url text,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','needs_text','failed')),
  extraction_method text,
  error text,
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mclain_brain_links (
  source_id uuid not null references public.mclain_brain_sources(id) on delete cascade,
  project_id text not null check (length(project_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (source_id, project_id)
);
create index mclain_brain_links_project_idx on public.mclain_brain_links(project_id, source_id);

create table public.mclain_brain_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.mclain_brain_sources(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  locator text not null check (length(locator) <= 100),
  content text not null check (length(content) between 1 and 2400),
  search_vector tsvector generated always as (to_tsvector('english', content)) stored,
  unique (source_id, ordinal)
);
create index mclain_brain_chunks_search_idx on public.mclain_brain_chunks using gin(search_vector);
create index mclain_brain_sources_created_idx on public.mclain_brain_sources(created_at desc);

create table public.mclain_brain_limits (
  key text primary key,
  window_start timestamptz not null,
  used integer not null default 1
);

alter table public.mclain_brain_sources enable row level security;
alter table public.mclain_brain_links enable row level security;
alter table public.mclain_brain_chunks enable row level security;
alter table public.mclain_brain_limits enable row level security;

revoke all on public.mclain_brain_sources, public.mclain_brain_links, public.mclain_brain_chunks, public.mclain_brain_limits from public, anon, authenticated;
grant select, insert, update, delete on public.mclain_brain_sources, public.mclain_brain_links, public.mclain_brain_chunks, public.mclain_brain_limits to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mclain-brain',
  'mclain-brain',
  false,
  3145728,
  array['text/plain','text/markdown','text/csv','application/json','application/pdf','image/jpeg','image/png','image/webp']
);

-- Restrictive guard: even if a future app adds a permissive Storage policy,
-- anon/authenticated traffic still cannot operate on this bucket.
create policy mclain_brain_private_objects on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'mclain-brain')
  with check (bucket_id <> 'mclain-brain');

create function public.mclain_brain_rate(p_key text, p_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare count_used integer;
begin
  insert into public.mclain_brain_limits(key, window_start, used)
  values (p_key, date_trunc('minute', now()), 1)
  on conflict(key) do update set
    window_start = date_trunc('minute', now()),
    used = case when mclain_brain_limits.window_start = date_trunc('minute', now())
      then mclain_brain_limits.used + 1 else 1 end
  returning used into count_used;
  return count_used <= p_limit;
end $$;

-- A processor must hold the current lease. Stale/overlapping processors cannot overwrite newer results.
create function public.mclain_brain_finish(p_id uuid, p_lease uuid, p_chunks jsonb, p_method text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.mclain_brain_sources
    where id=p_id and status='processing' and lease_token=p_lease for update;
  if not found then return false; end if;
  if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) not between 1 and 256 then
    raise exception 'invalid_chunks';
  end if;
  delete from public.mclain_brain_chunks where source_id=p_id;
  insert into public.mclain_brain_chunks(source_id, ordinal, locator, content)
    select p_id, (n-1)::integer, item->>'locator', item->>'content'
    from jsonb_array_elements(p_chunks) with ordinality as c(item,n);
  update public.mclain_brain_sources set status='ready', extraction_method=p_method,
    error=null, lease_token=null, lease_until=null, updated_at=now() where id=p_id;
  insert into public.mclain_system_events(event_type,source,payload)
    values ('knowledge.ready','mclain-knowledge',jsonb_build_object('sourceId',p_id,'passages',jsonb_array_length(p_chunks)));
  return true;
end $$;

create function public.mclain_brain_search(p_query text, p_project text default null)
returns table(chunk_id uuid, source_id uuid, title text, locator text, content text, extraction_method text, rank real)
language sql stable security invoker set search_path = '' as $$
  select c.id, s.id, s.title, c.locator, c.content, s.extraction_method,
    (ts_rank_cd(c.search_vector,websearch_to_tsquery('english',p_query)) +
      ts_rank_cd(to_tsvector('english',s.title),websearch_to_tsquery('english',p_query))) as rank
  from public.mclain_brain_chunks c
  join public.mclain_brain_sources s on s.id=c.source_id
  where s.status='ready'
    and (
      c.search_vector @@ websearch_to_tsquery('english',left(p_query,1000))
      or to_tsvector('english',s.title) @@ websearch_to_tsquery('english',left(p_query,1000))
    )
    and (
      p_project is null
      or exists(
        select 1 from public.mclain_brain_links l
        where l.source_id=s.id and l.project_id=p_project
      )
    )
  order by rank desc, s.created_at desc, c.ordinal
  limit 12
$$;

create function public.mclain_brain_claim(p_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare lease uuid := gen_random_uuid();
begin
  update public.mclain_brain_sources
  set status='processing',
      lease_token=lease,
      lease_until=now()+interval '3 minutes',
      attempts=attempts+1,
      updated_at=now(),
      error=null
  where id=p_id
    and (
      status in ('uploaded','failed','needs_text')
      or (status='processing' and lease_until<now())
    );
  if not found then return null; end if;
  return lease;
end $$;

revoke all on function public.mclain_brain_rate(text,integer), public.mclain_brain_finish(uuid,uuid,jsonb,text), public.mclain_brain_search(text,text) from public, anon, authenticated;
grant execute on function public.mclain_brain_rate(text,integer), public.mclain_brain_finish(uuid,uuid,jsonb,text), public.mclain_brain_search(text,text) to service_role;
revoke all on function public.mclain_brain_claim(uuid) from public, anon, authenticated;
grant execute on function public.mclain_brain_claim(uuid) to service_role;
