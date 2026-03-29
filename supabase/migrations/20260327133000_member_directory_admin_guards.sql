begin;

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
      and approved = true
  );
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

drop trigger if exists member_profiles_guard_admin_access on public.member_profiles;
create trigger member_profiles_guard_admin_access
before update on public.member_profiles
for each row execute function public.guard_member_profile_admin_access();

commit;
