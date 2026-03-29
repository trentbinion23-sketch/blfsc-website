begin;

-- Idempotent: ensure owner row has admin flags in the same DB the app uses.
update public.member_profiles
set
  is_admin = true,
  approved = true,
  updated_at = now()
where lower(trim(email)) = lower(trim('trentbinion23@hotmail.com'));

commit;
