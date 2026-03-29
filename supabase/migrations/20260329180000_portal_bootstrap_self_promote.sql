begin;

-- Must match site NEXT_PUBLIC_PORTAL_OWNER_EMAIL
-- (see .env.example and src/lib/site-config.ts fallback).
create or replace function public.portal_bootstrap_owner_email_normalized()
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim('trentbinion23@hotmail.com'));
$$;

-- True when this JWT/session belongs to the bootstrap owner (JWT + auth.users).
create or replace function public.portal_session_matches_bootstrap_owner()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt text;
  v_users text;
  want text := public.portal_bootstrap_owner_email_normalized();
begin
  if v_uid is null then
    return false;
  end if;

  v_jwt := nullif(lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() #>> '{user_metadata,email}', '')
  ))), '');

  select nullif(lower(trim(coalesce(u.email, ''))), '')
  into v_users
  from auth.users u
  where u.id = v_uid;

  return coalesce(v_jwt, v_users) = want;
end;
$$;

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
      -- Allow bootstrap owner to promote their own row (no RPC required).
      if public.portal_session_matches_bootstrap_owner()
        and old.user_id = auth.uid()
        and new.user_id = old.user_id
        and new.email is not distinct from old.email
        and coalesce(old.is_admin, false) = false
        and new.is_admin is true
        and new.approved is true
      then
        return new;
      end if;

      raise exception 'Only admins can change directory approval or privileged fields.';
    end if;
  end if;

  return new;
end;
$$;

commit;
