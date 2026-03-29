begin;

create table if not exists public.edge_rate_limits (
  bucket_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint edge_rate_limits_pkey primary key (bucket_key, window_started_at)
);

create index if not exists edge_rate_limits_updated_at_idx
on public.edge_rate_limits (updated_at desc);

create or replace function public.consume_edge_rate_limit(
  p_key text,
  p_window_ms integer,
  p_max_requests integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  request_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  window_seconds numeric := greatest(1, p_window_ms) / 1000.0;
  window_start timestamptz;
  next_window timestamptz;
  current_count integer;
begin
  if p_key is null or btrim(p_key) = '' then
    raise exception 'p_key is required';
  end if;

  if p_window_ms <= 0 then
    raise exception 'p_window_ms must be > 0';
  end if;

  if p_max_requests <= 0 then
    raise exception 'p_max_requests must be > 0';
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from now_ts) / window_seconds) * window_seconds
  );
  next_window := window_start + (p_window_ms || ' milliseconds')::interval;

  insert into public.edge_rate_limits (bucket_key, window_started_at, request_count, updated_at)
  values (p_key, window_start, 1, now_ts)
  on conflict (bucket_key, window_started_at)
  do update set
    request_count = public.edge_rate_limits.request_count + 1,
    updated_at = excluded.updated_at
  returning public.edge_rate_limits.request_count into current_count;

  allowed := current_count <= p_max_requests;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (next_window - now_ts))))::integer
  end;
  request_count := current_count;

  return next;
end;
$$;

grant execute on function public.consume_edge_rate_limit(text, integer, integer) to service_role;

commit;
