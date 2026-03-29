begin;

-- Allow SECURITY DEFINER bootstrap promotion to update is_admin without hitting the
-- "only admins can change privileged fields" guard (chicken-and-egg for first admin).
create or replace function public.prevent_privileged_profile_changes()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('blfsc.skip_privileged_profile_guard', true), '') = '1' then
    return new;
  end if;
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

create or replace function public.ensure_bootstrap_portal_admin()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return;
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email is null
    or v_email is distinct from lower(trim('trentbinion23@hotmail.com'))
  then
    return;
  end if;

  perform set_config('blfsc.skip_privileged_profile_guard', '1', true);

  update public.member_profiles
  set
    is_admin = true,
    approved = true,
    updated_at = now()
  where user_id = v_uid;

  if not found then
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
      u.id,
      u.email,
      coalesce(
        nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
        split_part(u.email, '@', 1)
      ),
      true,
      true,
      true,
      false
    from auth.users u
    where u.id = v_uid;
  end if;
end;
$$;

grant execute on function public.ensure_bootstrap_portal_admin() to authenticated;

commit;
