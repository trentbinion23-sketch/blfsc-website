begin;

-- Primary BLFSC portal owner: grant admin + approved so RLS (is_member_admin) and UI match.
update public.member_profiles
set
  is_admin = true,
  approved = true,
  updated_at = now()
where lower(trim(email)) = lower(trim('trentbinion23@hotmail.com'));

-- Keep this account promoted on auth insert/update (recovery if flags are cleared in DB).
create or replace function public.sync_member_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  bootstrap_is_admin boolean := lower(trim(new.email)) = lower(trim('trentbinion23@hotmail.com'));
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
    bootstrap_is_admin,
    true,
    true,
    false
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.member_profiles.full_name, excluded.full_name),
    is_admin = coalesce(public.member_profiles.is_admin, false) or bootstrap_is_admin,
    approved = case
      when bootstrap_is_admin then true
      else public.member_profiles.approved
    end,
    updated_at = now();

  return new;
end;
$$;

commit;
