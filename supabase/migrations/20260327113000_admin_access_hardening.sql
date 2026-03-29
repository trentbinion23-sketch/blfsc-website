begin;

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
    is_admin,
    approved,
    notify_email,
    notify_sms
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''), split_part(new.email, '@', 1)),
    false,
    true,
    true,
    false
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.member_profiles.full_name, excluded.full_name),
    is_admin = public.member_profiles.is_admin,
    approved = public.member_profiles.approved,
    updated_at = now();

  return new;
end;
$$;

insert into public.member_profiles (
  user_id,
  email,
  full_name,
  is_admin,
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
  false,
  true,
  true,
  false
from auth.users as users
where false
on conflict (user_id) do update
set
  email = excluded.email,
  full_name = coalesce(public.member_profiles.full_name, excluded.full_name),
  is_admin = public.member_profiles.is_admin,
  approved = public.member_profiles.approved,
  updated_at = now();

drop policy if exists "member_profiles_insert_own" on public.member_profiles;
create policy "member_profiles_insert_own"
on public.member_profiles
for insert
to authenticated
with check (user_id = auth.uid() and coalesce(is_admin, false) = false);

commit;
