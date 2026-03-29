begin;

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  approved boolean not null default true,
  notify_email boolean not null default true,
  notify_sms boolean not null default false,
  sms_opted_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_profiles_email_check check (position('@' in email) > 1)
);

create table if not exists public.member_broadcasts (
  id bigint generated always as identity primary key,
  created_by uuid references auth.users(id) on delete set null,
  subject text not null,
  message text not null,
  channels text[] not null default array['email']::text[],
  audience text not null default 'approved_members',
  status text not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_broadcasts_subject_check check (char_length(btrim(subject)) between 1 and 160),
  constraint member_broadcasts_message_check check (char_length(btrim(message)) between 1 and 2000),
  constraint member_broadcasts_status_check check (status in ('draft', 'queued', 'sending', 'sent', 'partial', 'failed')),
  constraint member_broadcasts_audience_check check (audience in ('approved_members', 'all_members')),
  constraint member_broadcasts_channels_check check (channels <@ array['email', 'sms']::text[] and cardinality(channels) > 0)
);

create table if not exists public.member_broadcast_deliveries (
  id bigint generated always as identity primary key,
  broadcast_id bigint not null references public.member_broadcasts(id) on delete cascade,
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  channel text not null,
  delivery_target text not null,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_broadcast_deliveries_channel_check check (channel in ('email', 'sms')),
  constraint member_broadcast_deliveries_status_check check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint member_broadcast_deliveries_unique unique (broadcast_id, user_id, channel)
);

create index if not exists member_profiles_email_idx on public.member_profiles(email);
create index if not exists member_profiles_approved_idx on public.member_profiles(approved);
create index if not exists member_broadcasts_created_at_idx on public.member_broadcasts(created_at desc);
create index if not exists member_broadcast_deliveries_broadcast_idx on public.member_broadcast_deliveries(broadcast_id);
create index if not exists member_broadcast_deliveries_user_idx on public.member_broadcast_deliveries(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_member_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_profiles
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.prevent_privileged_profile_changes()
returns trigger
language plpgsql
as $$
begin
  if not public.is_member_admin() then
    if new.user_id is distinct from old.user_id
      or new.email is distinct from old.email
      or new.is_admin is distinct from old.is_admin
      or new.approved is distinct from old.approved
    then
      raise exception 'Only admins can change directory approval or privileged fields.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_member_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.member_profiles (
    user_id,
    email,
    full_name,
    approved,
    notify_email,
    notify_sms
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''), split_part(new.email, '@', 1)),
    true,
    true,
    false
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.member_profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$;

insert into public.member_profiles (
  user_id,
  email,
  full_name,
  approved,
  notify_email,
  notify_sms
)
select
  users.id,
  users.email,
  coalesce(
    nullif(trim(coalesce(users.raw_user_meta_data->>'full_name', '')), ''),
    split_part(users.email, '@', 1)
  ),
  true,
  true,
  false
from auth.users as users
where users.email is not null
on conflict (user_id) do update
set
  email = excluded.email,
  full_name = coalesce(public.member_profiles.full_name, excluded.full_name),
  updated_at = now();

drop trigger if exists member_profiles_set_updated_at on public.member_profiles;
create trigger member_profiles_set_updated_at
before update on public.member_profiles
for each row execute function public.set_updated_at();

drop trigger if exists member_profiles_block_privileged_changes on public.member_profiles;
create trigger member_profiles_block_privileged_changes
before update on public.member_profiles
for each row execute function public.prevent_privileged_profile_changes();

drop trigger if exists on_auth_user_created_member_profile on auth.users;
create trigger on_auth_user_created_member_profile
after insert on auth.users
for each row execute function public.sync_member_profile_from_auth();

drop trigger if exists on_auth_user_updated_member_profile on auth.users;
create trigger on_auth_user_updated_member_profile
after update on auth.users
for each row execute function public.sync_member_profile_from_auth();

drop trigger if exists member_broadcasts_set_updated_at on public.member_broadcasts;
create trigger member_broadcasts_set_updated_at
before update on public.member_broadcasts
for each row execute function public.set_updated_at();

alter table public.member_profiles enable row level security;
alter table public.member_broadcasts enable row level security;
alter table public.member_broadcast_deliveries enable row level security;

drop policy if exists "member_profiles_select_own" on public.member_profiles;
drop policy if exists "member_profiles_select_admin" on public.member_profiles;
drop policy if exists "member_profiles_insert_own" on public.member_profiles;
drop policy if exists "member_profiles_update_own" on public.member_profiles;
drop policy if exists "member_profiles_update_admin" on public.member_profiles;

create policy "member_profiles_select_own"
on public.member_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "member_profiles_select_admin"
on public.member_profiles
for select
to authenticated
using (public.is_member_admin());

create policy "member_profiles_insert_own"
on public.member_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "member_profiles_update_own"
on public.member_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "member_profiles_update_admin"
on public.member_profiles
for update
to authenticated
using (public.is_member_admin())
with check (public.is_member_admin());

drop policy if exists "member_broadcasts_admin_only" on public.member_broadcasts;
create policy "member_broadcasts_admin_only"
on public.member_broadcasts
for all
to authenticated
using (public.is_member_admin())
with check (public.is_member_admin());

drop policy if exists "member_broadcast_deliveries_admin_only" on public.member_broadcast_deliveries;
create policy "member_broadcast_deliveries_admin_only"
on public.member_broadcast_deliveries
for select
to authenticated
using (public.is_member_admin());

drop policy if exists "member_broadcast_deliveries_admin_write" on public.member_broadcast_deliveries;
create policy "member_broadcast_deliveries_admin_write"
on public.member_broadcast_deliveries
for insert
to authenticated
with check (public.is_member_admin());

drop policy if exists "member_broadcast_deliveries_admin_update" on public.member_broadcast_deliveries;
create policy "member_broadcast_deliveries_admin_update"
on public.member_broadcast_deliveries
for update
to authenticated
using (public.is_member_admin())
with check (public.is_member_admin());

commit;
