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

create or replace function public.guard_member_profile_admin_access()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  approved_admins_remaining integer := 0;
begin
  if old.is_admin = true and old.approved = true then
    if new.is_admin is distinct from true or new.approved is distinct from true then
      select count(*)
      into approved_admins_remaining
      from public.member_profiles
      where user_id <> old.user_id
        and is_admin = true
        and approved = true;

      if approved_admins_remaining = 0 then
        raise exception 'At least one approved admin must remain.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

commit;
