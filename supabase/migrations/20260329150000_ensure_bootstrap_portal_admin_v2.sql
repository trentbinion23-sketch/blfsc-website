begin;

drop function if exists public.ensure_bootstrap_portal_admin();

-- Reliable bootstrap: prefer JWT email (matches the live session), single upsert, JSON diagnostics.
create function public.ensure_bootstrap_portal_admin()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_email text := nullif(lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(auth.jwt() #>> '{user_metadata,email}', '')
  ))), '');
  v_users_email text;
  v_email text;
  allow_email constant text := lower(trim('trentbinion23@hotmail.com'));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_uid');
  end if;

  select nullif(lower(trim(coalesce(u.email, ''))), '') into v_users_email
  from auth.users u
  where u.id = v_uid;

  v_email := coalesce(v_jwt_email, v_users_email);

  if v_email is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'no_email',
      'jwt_email', v_jwt_email,
      'users_email', v_users_email
    );
  end if;

  if v_email is distinct from allow_email then
    return jsonb_build_object(
      'ok', true,
      'skipped', true,
      'reason', 'email_not_allowlisted',
      'resolved_email', v_email
    );
  end if;

  perform set_config('blfsc.skip_privileged_profile_guard', '1', true);

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
  where u.id = v_uid
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.member_profiles.full_name, excluded.full_name),
    is_admin = true,
    approved = true,
    updated_at = now();

  return jsonb_build_object('ok', true, 'action', 'upserted');
exception
  when others then
    return jsonb_build_object('ok', false, 'reason', 'exception', 'detail', sqlerrm);
end;
$$;

grant execute on function public.ensure_bootstrap_portal_admin() to authenticated;

commit;
