begin;

alter table public.products add column if not exists category text;
alter table public.products alter column active set default true;
alter table public.products alter column "hasSizes" set default false;

update public.products
set active = true
where active is null;

update public.products
set "hasSizes" = false
where "hasSizes" is null;

update public.products
set category = case
  when lower(coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce("desc", '')) ~ '(tee|shirt|singlet|jersey)'
    then 'shirts'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce("desc", '')) ~ '(hoodie|jumper|jacket|outerwear|crew)'
    then 'outerwear'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce("desc", '')) ~ '(pant|pants|short|shorts|jogger|track)'
    then 'pants'
  when lower(coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce("desc", '')) ~ '(cap|hat|beanie|mug|sticker|stubby|mat|accessor|bag|patch|keyring)'
    then 'accessories'
  else 'other'
end
where category is null
   or btrim(category) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_category_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_category_check
      check (category is null or category in ('shirts', 'outerwear', 'pants', 'accessories', 'other'));
  end if;
end
$$;

create index if not exists products_active_idx on public.products(active);
create index if not exists products_category_idx on public.products(category);

alter table public.products enable row level security;

drop policy if exists "products_read_authenticated" on public.products;
drop policy if exists "products_select_live_or_admin" on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;

create policy "products_select_live_or_admin"
on public.products
for select
to authenticated
using (coalesce(active, true) = true or public.is_member_admin());

create policy "products_admin_insert"
on public.products
for insert
to authenticated
with check (public.is_member_admin());

create policy "products_admin_update"
on public.products
for update
to authenticated
using (public.is_member_admin())
with check (public.is_member_admin());

create policy "products_admin_delete"
on public.products
for delete
to authenticated
using (public.is_member_admin());

commit;
