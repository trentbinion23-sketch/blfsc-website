begin;

create table if not exists public.site_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

insert into public.site_content (id, content)
values (
  'public_site',
  jsonb_build_object(
    'announcement', jsonb_build_object(
      'enabled', true,
      'title', 'Next ride',
      'message', 'Sunday hills run leaves Gepps Cross at 8:30 AM. Coffee stop in Hahndorf, regroup on arrival, then an easy roll back into town.',
      'linkLabel', 'Ride details',
      'linkHref', '/events'
    ),
    'hero', jsonb_build_object(
      'title', 'B.L.F. Social Club. Adelaide rides, club nights, and a strong social side.',
      'description', 'BLFSC is a motorcycle social club built on turnout, respect, and time together on and off the bike. Find the next run, get in touch, or head to the members portal.',
      'noticeTitle', 'Sunday hills run',
      'noticeCopy', 'Meet at Gepps Cross, wheels up 8:30 AM. Coffee in Hahndorf, then lunch back toward town.'
    ),
    'story', jsonb_build_object(
      'title', 'Built around the ride and the people who show up.',
      'paragraphOne', 'BLFSC is about bikes, mateship, and the kind of club culture that comes from turning up properly. The runs matter, the social side matters, and the people in it matter.',
      'paragraphTwo', 'Visitors can follow the rides, the club story, and the contact points here. Approved members use the portal for merch, notices, and private club business.'
    ),
    'contact', jsonb_build_object(
      'email', 'blfsc.merch@outlook.com',
      'phone', '0417 113 366',
      'instagramUrl', 'https://instagram.com/blfsc_official',
      'facebookUrl', 'https://facebook.com/blfsc',
      'tiktokUrl', 'https://tiktok.com/@blfsc'
    ),
    'footer', jsonb_build_object(
      'title', 'B.L.F. Social Club. Adelaide rides, club nights, member access.',
      'copy', 'See what''s on, get in touch, or head to the members portal.',
      'note', 'Ride together. Show up properly. Keep the club moving.'
    )
  )
)
on conflict (id) do nothing;

update public.site_content
set content = jsonb_set(
  content,
  '{announcement}',
  coalesce(
    content->'announcement',
    jsonb_build_object(
      'enabled', true,
      'title', 'Next ride',
      'message', 'Sunday hills run leaves Gepps Cross at 8:30 AM. Coffee stop in Hahndorf, regroup on arrival, then an easy roll back into town.',
      'linkLabel', 'Ride details',
      'linkHref', '/events'
    )
  ),
  true
)
where id = 'public_site';

alter table public.site_content enable row level security;

drop policy if exists "site_content_public_read" on public.site_content;
create policy "site_content_public_read"
on public.site_content
for select
to anon, authenticated
using (id = 'public_site');

drop policy if exists "site_content_admin_insert" on public.site_content;
create policy "site_content_admin_insert"
on public.site_content
for insert
to authenticated
with check (public.is_member_admin());

drop policy if exists "site_content_admin_update" on public.site_content;
create policy "site_content_admin_update"
on public.site_content
for update
to authenticated
using (public.is_member_admin())
with check (public.is_member_admin());

commit;
