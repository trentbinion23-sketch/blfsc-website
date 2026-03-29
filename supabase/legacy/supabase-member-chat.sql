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

alter table public.member_chat_messages enable row level security;

drop policy if exists "member_chat_messages_read_authenticated" on public.member_chat_messages;
drop policy if exists "member_chat_messages_insert_own" on public.member_chat_messages;
drop policy if exists "member_chat_messages_delete_own" on public.member_chat_messages;

create policy "member_chat_messages_read_authenticated"
on public.member_chat_messages
for select
to authenticated
using (true);

create policy "member_chat_messages_insert_own"
on public.member_chat_messages
for insert
to authenticated
with check (user_id = auth.uid());

create policy "member_chat_messages_delete_own"
on public.member_chat_messages
for delete
to authenticated
using (user_id = auth.uid());

commit;
