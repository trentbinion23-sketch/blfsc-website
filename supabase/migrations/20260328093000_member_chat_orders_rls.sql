begin;

create table if not exists public.member_chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  display_name text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint member_chat_messages_display_name_check
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint member_chat_messages_message_check
    check (char_length(btrim(message)) between 1 and 500)
);

create index if not exists member_chat_messages_created_at_idx
  on public.member_chat_messages(created_at desc);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'submitted',
  items jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (char_length(btrim(status)) between 1 and 40)
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.member_chat_messages enable row level security;
alter table public.orders enable row level security;

drop policy if exists "member_chat_messages_select_approved_members" on public.member_chat_messages;
drop policy if exists "member_chat_messages_insert_approved_members" on public.member_chat_messages;
drop policy if exists "member_chat_messages_delete_own_or_admin" on public.member_chat_messages;
drop policy if exists "orders_select_own_or_admin" on public.orders;
drop policy if exists "orders_insert_own_approved" on public.orders;
drop policy if exists "orders_update_own_or_admin" on public.orders;
drop policy if exists "orders_delete_admin_only" on public.orders;

create policy "member_chat_messages_select_approved_members"
on public.member_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.member_profiles as profile
    where profile.user_id = auth.uid()
      and profile.approved = true
  )
);

create policy "member_chat_messages_insert_approved_members"
on public.member_chat_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.member_profiles as profile
    where profile.user_id = auth.uid()
      and profile.approved = true
  )
);

create policy "member_chat_messages_delete_own_or_admin"
on public.member_chat_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_member_admin()
);

create policy "orders_select_own_or_admin"
on public.orders
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_member_admin()
);

create policy "orders_insert_own_approved"
on public.orders
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.member_profiles as profile
    where profile.user_id = auth.uid()
      and profile.approved = true
  )
);

create policy "orders_update_own_or_admin"
on public.orders
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_member_admin()
)
with check (
  user_id = auth.uid()
  or public.is_member_admin()
);

create policy "orders_delete_admin_only"
on public.orders
for delete
to authenticated
using (public.is_member_admin());

commit;
